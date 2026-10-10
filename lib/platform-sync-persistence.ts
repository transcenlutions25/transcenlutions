/** Browser persistence for PR63. No credentials, native grants, execution or implicit data import. */
import { acknowledgeSyncMutation, emptySyncClient, enqueueSyncMutation, receiveSyncPage,
  type SyncClientState } from "./platform-sync-client";
import { parseSyncAccount, sameAccount, SyncError, type SyncAccount,
  type SyncMutation, type SyncPage, type SyncReceipt } from "./platform-sync-contract";

export class SyncStorageError extends Error {
  constructor(public readonly code: "unavailable" | "corrupt" | "capacity" | "cancelled") {
    super(`Local sync storage: ${code}`); this.name = "SyncStorageError";
  }
}
function stable(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stable).join(",")}]`;
  if (value && typeof value === "object") return `{${Object.keys(value).sort()
    .map(key => `${JSON.stringify(key)}:${stable((value as Record<string, unknown>)[key])}`).join(",")}}`;
  return JSON.stringify(value);
}
/** Rebuild and compare the complete ledger; a well-shaped mutation alone cannot validate a cache. */
export function restoreSyncClient(value: unknown, account: SyncAccount): SyncClientState {
  try {
    const raw = value as SyncClientState;
    if (!raw || !sameAccount(parseSyncAccount(raw.account), account)) throw new Error();
    for (const list of [raw.events, raw.buffered, raw.outbox, raw.acknowledged]) {
      if (!Array.isArray(list) || list.length > 2048) throw new SyncStorageError("capacity");
    }
    if (new TextEncoder().encode(JSON.stringify(raw)).byteLength > 8 * 1024 * 1024)
      throw new SyncStorageError("capacity");
    const sequences = new Map<number, string>();
    for (const item of [...raw.acknowledged, ...raw.events, ...raw.buffered]) {
      const payload = stable({ mutation: item.mutation, receipt: item.receipt });
      const previous = sequences.get(item.receipt.sequence);
      if (previous !== undefined && previous !== payload) throw new Error();
      sequences.set(item.receipt.sequence, payload);
    }
    let state = emptySyncClient(account);
    for (const item of raw.outbox) state = enqueueSyncMutation(state, item.mutation);
    for (const item of raw.acknowledged)
      state = acknowledgeSyncMutation(state, account, item.mutation, item.receipt);
    const events = [...raw.events, ...raw.buffered];
    for (let start = 0; start < events.length; start += 100) {
      const page = events.slice(start, start + 100);
      state = receiveSyncPage(state, { account, events: page,
        cursor: { account, sequence: Math.max(...page.map(event => event.sequence)) }, hasMore: false });
    }
    if (stable(state) !== stable(raw)) throw new Error();
    return state;
  } catch (error) {
    if (error instanceof SyncStorageError) throw error;
    throw new SyncStorageError("corrupt");
  }
}

export interface SyncPersistence {
  read(account: SyncAccount): Promise<SyncClientState>;
  enqueue(input: SyncMutation, current?: () => boolean): Promise<SyncClientState>;
  acknowledge(account: SyncAccount, input: SyncMutation, receipt: SyncReceipt, current?: () => boolean): Promise<SyncClientState>;
  receive(account: SyncAccount, page: SyncPage, current?: () => boolean): Promise<SyncClientState>;
}

/** Each update reads the latest row inside the SAME readwrite transaction. IndexedDB serializes
 * overlapping transactions across tabs. Resolve only on transaction completion, never put success. */
export class IndexedDbSyncPersistence implements SyncPersistence {
  private database: Promise<IDBDatabase>;
  constructor(factory: IDBFactory = globalThis.indexedDB, name = "tay-platform-sync-v1") {
    this.database = new Promise((resolve, reject) => {
      if (!factory) { reject(new SyncStorageError("unavailable")); return; }
      let settled = false;
      const request = factory.open(name, 1);
      request.onupgradeneeded = () => request.result.createObjectStore("accounts");
      request.onblocked = () => { settled = true; reject(new SyncStorageError("unavailable")); };
      request.onerror = () => { settled = true; reject(new SyncStorageError("unavailable")); };
      request.onsuccess = () => {
        if (settled) { request.result.close(); return; }
        request.result.onversionchange = () => request.result.close();
        resolve(request.result);
      };
    });
    // Callers receive the error from read/update, without an unhandled constructor rejection.
    void this.database.catch(() => undefined);
  }
  async close(): Promise<void> { (await this.database).close(); }
  private async transact(accountInput: SyncAccount, transform?: (state: SyncClientState) => SyncClientState,
    current: () => boolean = () => true): Promise<SyncClientState> {
    const account = parseSyncAccount(accountInput);
    const database = await this.database;
    return new Promise((resolve, reject) => {
      let result: SyncClientState;
      let failure: unknown;
      let transaction: IDBTransaction;
      try { transaction = database.transaction("accounts", transform ? "readwrite" : "readonly"); }
      catch { reject(new SyncStorageError("unavailable")); return; }
      transaction.oncomplete = () => resolve(result);
      transaction.onabort = () => reject(failure ?? new SyncStorageError("unavailable"));
      transaction.onerror = () => { /* onabort owns rejection; never log private cache contents. */ };
      const store = transaction.objectStore("accounts");
      const key = [account.tenantId, account.userId];
      const get = store.get(key);
      get.onsuccess = () => {
        try {
          if (!current()) throw new SyncStorageError("cancelled");
          const saved = get.result;
          if (saved !== undefined && (saved?.version !== 1 || Object.keys(saved).sort().join() !== "state,version"))
            throw new SyncStorageError("corrupt");
          const previous = saved === undefined ? emptySyncClient(account) : restoreSyncClient(saved.state, account);
          result = transform ? restoreSyncClient(transform(previous), account) : previous;
          if (!sameAccount(result.account, account)) throw new SyncError("scope");
          if (transform) store.put({ version: 1, state: result }, key);
        } catch (error) { failure = error; transaction.abort(); }
      };
    });
  }
  read(account: SyncAccount) { return this.transact(account); }
  enqueue(input: SyncMutation, current?: () => boolean) {
    return this.transact(input.account, state => enqueueSyncMutation(state, input), current);
  }
  acknowledge(account: SyncAccount, input: SyncMutation, receipt: SyncReceipt, current?: () => boolean) {
    return this.transact(account, state => acknowledgeSyncMutation(state, account, input, receipt), current);
  }
  receive(account: SyncAccount, page: SyncPage, current?: () => boolean) {
    return this.transact(account, state => receiveSyncPage(state, page), current);
  }
}
