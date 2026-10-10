/**
 * Conservative, browser-local workspace persistence. Hydrate from the same exact
 * initialRaw passed here; a second storage read is not a hydration baseline.
 *
 * All participating tabs must use this guard and its shared Web Lock. The lock
 * serializes their compare/write operations; localStorage itself has no atomic
 * compare-and-swap and cannot protect against old/nonparticipating writers.
 * Without Web Locks (or when locking fails), persistence stays disabled. There
 * is deliberately no racy optimistic fallback, merge, deletion, or auto-retry.
 * The caller owns the live state and export, which this helper never changes.
 */

export type WorkspaceStorageBlockReason =
  | "conflict"
  | "unreadable"
  | "storage-unavailable"
  | "lock-unavailable"
  | "invalid-write";

export type WorkspaceStorageWriteResult = "saved" | "unchanged" | "blocked" | "disposed";

export type WorkspaceStorageStatus =
  | { state: "ready" }
  | { state: "blocked"; reason: WorkspaceStorageBlockReason }
  | { state: "disposed" };

type WorkspaceStorage = Pick<Storage, "getItem" | "setItem">;

export interface WorkspaceStorageGuardOptions {
  storage: WorkspaceStorage;
  key: string;
  initialRaw: string | null;
  locks?: Pick<LockManager, "request"> | null;
  onBlocked?: (reason: WorkspaceStorageBlockReason) => void;
  /** Additional domain checks; false or a thrown error fails closed. */
  isReadable?: (record: Record<string, unknown>) => boolean;
  /** Bounded acquisition wait; clamped to 50–10,000 ms. Default: 2,000 ms. */
  lockWaitMs?: number;
}

export interface WorkspaceStorageGuard {
  /** Coalesces unsaved snapshots. Callers share the pending flush result. */
  queueWrite: (raw: string) => Promise<WorkspaceStorageWriteResult>;
  /** Feed native storage events, including clear() events with a null key. */
  observeStorage: (event: { key: string | null; storageArea?: WorkspaceStorage | null }) => void;
  /** Permanent for this instance; create a new guard only after fresh hydration. */
  stop: (reason: WorkspaceStorageBlockReason) => void;
  /** Cancel queued/awaiting writes on unmount, including Strict Mode cleanup. */
  dispose: () => void;
  getStatus: () => WorkspaceStorageStatus;
}

export interface BrowserRecordStorageGuardOptions extends Omit<WorkspaceStorageGuardOptions, "isReadable"> {
  isReadable: (record: unknown) => boolean;
  /** A surrounding workspace can pause all of its writes without discarding local edits. */
  canWrite?: () => boolean;
}

export function createWorkspaceStorageGuard(options: WorkspaceStorageGuardOptions): WorkspaceStorageGuard {
  return createBrowserRecordStorageGuard({ ...options, isReadable(record) {
    if (!record || typeof record !== "object" || Array.isArray(record)) return false;
    const value = record as Record<string, unknown>;
    return value.version === 1 && Array.isArray(value.conversations)
      && (!options.isReadable || options.isReadable(value));
  } });
}

/** The same exact-baseline/lock protocol protects writing records and asset lists. */
export function createBrowserRecordStorageGuard(options: BrowserRecordStorageGuardOptions): WorkspaceStorageGuard {
  const { storage, key, locks, onBlocked, isReadable, canWrite } = options;
  let expectedRaw = options.initialRaw;
  let status: WorkspaceStorageStatus = { state: "ready" };
  let pendingRaw: string | undefined;
  let inFlight: Promise<WorkspaceStorageWriteResult> | null = null;
  let activeLockRequest: AbortController | null = null;
  const lockWaitMs = Number.isFinite(options.lockWaitMs)
    ? Math.min(10_000, Math.max(50, options.lockWaitMs!)) : 2_000;

  function readable(raw: string): boolean {
    try {
      return isReadable(JSON.parse(raw));
    } catch { return false; }
  }

  function stop(reason: WorkspaceStorageBlockReason): void {
    if (status.state !== "ready") return;
    status = { state: "blocked", reason };
    pendingRaw = undefined;
    activeLockRequest?.abort();
    // A view callback must not turn a stopped guard into an unhandled rejection.
    try { onBlocked?.(reason); } catch { /* Persistence remains stopped. */ }
  }

  function inactiveResult(): "blocked" | "disposed" {
    return status.state === "disposed" ? "disposed" : "blocked";
  }

  function matchesExpected(): boolean {
    try {
      if (canWrite && !canWrite()) { stop("conflict"); return false; }
      if (storage.getItem(key) !== expectedRaw) { stop("conflict"); return false; }
      return true;
    } catch { stop("storage-unavailable"); return false; }
  }

  async function save(raw: string): Promise<WorkspaceStorageWriteResult> {
    if (status.state !== "ready") return inactiveResult();
    if (!locks || typeof locks.request !== "function") { stop("lock-unavailable"); return "blocked"; }
    const controller = new AbortController();
    activeLockRequest = controller;
    const timeout = setTimeout(() => stop("lock-unavailable"), lockWaitMs);
    try {
      return await locks.request(`tay:workspace-storage:${key}`, {
        mode: "exclusive", signal: controller.signal,
      }, () => {
        // No await between this comparison and setItem. Every participating tab
        // uses the same lock, including first writes to an absent record.
        if (status.state !== "ready") return inactiveResult();
        if (!matchesExpected()) return "blocked";
        if (raw === expectedRaw) return "unchanged";
        try {
          storage.setItem(key, raw);
          expectedRaw = raw;
          return "saved";
        } catch { stop("storage-unavailable"); return "blocked"; }
      });
    } catch {
      // Never silently fall back to unlocked writes after a request rejection.
      stop("lock-unavailable");
      return inactiveResult();
    } finally {
      clearTimeout(timeout);
      if (activeLockRequest === controller) activeLockRequest = null;
    }
  }

  async function drain(): Promise<WorkspaceStorageWriteResult> {
    let result: WorkspaceStorageWriteResult = "unchanged";
    while (pendingRaw !== undefined && status.state === "ready") {
      const raw = pendingRaw;
      pendingRaw = undefined;
      result = await save(raw);
    }
    // Clear synchronously before resolving, so a new edit cannot be stranded
    // between an already-finished drain and a separate promise.finally handler.
    inFlight = null;
    return status.state === "ready" ? result : inactiveResult();
  }

  const guard: WorkspaceStorageGuard = {
    queueWrite(raw) {
      if (status.state !== "ready") return Promise.resolve(inactiveResult());
      if (!readable(raw)) { stop("invalid-write"); return Promise.resolve("blocked"); }
      pendingRaw = raw;
      if (!inFlight) inFlight = drain();
      return inFlight;
    },
    observeStorage(event) {
      if (status.state !== "ready" || (event.key !== key && event.key !== null)) return;
      if (event.storageArea && event.storageArea !== storage) return;
      // Events can arrive after several writes. Compare current bytes instead
      // of treating a delayed event.newValue as the authoritative record.
      matchesExpected();
    },
    stop,
    dispose() {
      status = { state: "disposed" };
      pendingRaw = undefined;
      activeLockRequest?.abort();
    },
    getStatus: () => ({ ...status }),
  };

  if (expectedRaw !== null && !readable(expectedRaw)) stop("unreadable");
  else if (!locks || typeof locks.request !== "function") stop("lock-unavailable");
  return guard;
}
