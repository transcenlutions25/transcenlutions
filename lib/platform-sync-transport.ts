/** Same-origin cookie transport. This does not supply a login provider or authenticate the server. */
import type { PlatformIdentity } from "./platform-identity";
import { parseSyncAccount, parseSyncMutation, sameAccount, type SyncMutation, type SyncPage, type SyncReceipt } from "./platform-sync-contract";

export class SyncTransportError extends Error {
  constructor(public readonly code: "unauthenticated" | "forbidden" | "unconfigured" | "network" | "protocol" | "cancelled") {
    super(`Sync transport: ${code}`); this.name = "SyncTransportError";
  }
}
export type AuthenticatedSyncIdentity = PlatformIdentity & { source: "authenticated" };
export function parseAuthenticatedSyncIdentity(value: unknown): AuthenticatedSyncIdentity {
  const identity = value as AuthenticatedSyncIdentity;
  try {
    parseSyncAccount({ tenantId: identity.tenantId, userId: identity.userId });
    if (identity.source !== "authenticated" || !["owner", "admin", "member", "learner", "child"].includes(identity.role)
      || typeof identity.sessionId !== "string" || !/^[a-zA-Z0-9_-]{1,128}$/.test(identity.sessionId)
      || Object.keys(identity).some(key => !["tenantId", "userId", "sessionId", "role", "source"].includes(key))) throw new Error();
    return { tenantId: identity.tenantId, userId: identity.userId, sessionId: identity.sessionId,
      role: identity.role, source: "authenticated" };
  } catch { throw new SyncTransportError("unauthenticated"); }
}
export interface SyncTransport {
  identity(signal: AbortSignal): Promise<AuthenticatedSyncIdentity>;
  push(identity: AuthenticatedSyncIdentity, mutation: SyncMutation, signal: AbortSignal): Promise<SyncReceipt>;
  pull(identity: AuthenticatedSyncIdentity, sequence: number, signal: AbortSignal): Promise<SyncPage>;
}
export class SameOriginSyncTransport implements SyncTransport {
  constructor(private readonly fetcher: typeof fetch = globalThis.fetch.bind(globalThis)) {}
  private async request(path: string, signal: AbortSignal, init: RequestInit = {}): Promise<Record<string, unknown>> {
    if (signal.aborted) throw new SyncTransportError("cancelled");
    const timeout = new AbortController();
    const cancel = () => timeout.abort();
    signal.addEventListener("abort", cancel, { once: true });
    const timer = setTimeout(cancel, 15000);
    try {
      const response = await this.fetcher(path, { ...init, mode: "same-origin", credentials: "same-origin",
        redirect: "error", cache: "no-store", referrerPolicy: "no-referrer", signal: timeout.signal,
        headers: { Accept: "application/json", ...init.headers } });
      if (signal.aborted) throw new SyncTransportError("cancelled");
      if ([401, 403].includes(response.status)) throw new SyncTransportError(response.status === 401 ? "unauthenticated" : "forbidden");
      if ([404, 503].includes(response.status)) throw new SyncTransportError("unconfigured");
      if (!response.ok) throw new SyncTransportError(response.status === 429 || response.status >= 500 ? "network" : "protocol");
      if (response.redirected || !response.headers.get("content-type")?.toLowerCase().startsWith("application/json") || !response.body)
        throw new SyncTransportError("protocol");
      const reader = response.body.getReader();
      const chunks: Uint8Array[] = [];
      let length = 0;
      try {
        while (true) {
          const part = await reader.read();
          if (part.done) break;
          length += part.value.byteLength;
          if (length > 8 * 1024 * 1024) throw new SyncTransportError("protocol");
          chunks.push(part.value);
        }
      } finally { await reader.cancel().catch(() => undefined); reader.releaseLock(); }
      const bytes = new Uint8Array(length);
      let offset = 0;
      for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength; }
      const data = JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(bytes));
      if (!data || Array.isArray(data) || typeof data !== "object" || data.ok !== true)
        throw new SyncTransportError("protocol");
      return data;
    } catch (error) {
      if (signal.aborted) throw new SyncTransportError("cancelled");
      if (error instanceof SyncTransportError) throw error;
      if (error instanceof SyntaxError) throw new SyncTransportError("protocol");
      throw new SyncTransportError("network");
    } finally { clearTimeout(timer); signal.removeEventListener("abort", cancel); }
  }
  async identity(signal: AbortSignal) {
    const data = await this.request("/api/platform/identity", signal);
    if (Object.keys(data).some(key => !["ok", "authenticated", "identity", "warning"].includes(key)))
      throw new SyncTransportError("protocol");
    if (data.authenticated !== true) throw new SyncTransportError("unauthenticated");
    return parseAuthenticatedSyncIdentity(data.identity);
  }
  private bound(data: Record<string, unknown>, expected: AuthenticatedSyncIdentity): void {
    const identity = parseAuthenticatedSyncIdentity(data.identity);
    if (!sameAccount(identity, expected) || identity.sessionId !== expected.sessionId)
      throw new SyncTransportError("unauthenticated");
  }
  async push(identity: AuthenticatedSyncIdentity, mutation: SyncMutation, signal: AbortSignal) {
    mutation = parseSyncMutation(mutation);
    if (!sameAccount(identity, mutation.account)) throw new SyncTransportError("forbidden");
    const data = await this.request("/api/platform/sync", signal, { method: "POST",
      headers: { "Content-Type": "application/json", "X-Tay-Sync-Session": identity.sessionId }, body: JSON.stringify(mutation) });
    this.bound(data, identity);
    if (Object.keys(data).some(key => !["ok", "identity", "receipt"].includes(key))) throw new SyncTransportError("protocol");
    return data.receipt as SyncReceipt; // Persistence validates the exact request/receipt before clearing the outbox.
  }
  async pull(identity: AuthenticatedSyncIdentity, sequence: number, signal: AbortSignal) {
    if (!Number.isSafeInteger(sequence) || sequence < 0) throw new SyncTransportError("protocol");
    const query = new URLSearchParams({ tenantId: identity.tenantId, userId: identity.userId, sequence: String(sequence) });
    const data = await this.request(`/api/platform/sync?${query}`, signal,
      { headers: { "X-Tay-Sync-Session": identity.sessionId } });
    this.bound(data, identity);
    if (Object.keys(data).some(key => !["ok", "identity", "page"].includes(key))) throw new SyncTransportError("protocol");
    return data.page as SyncPage;
  }
}
