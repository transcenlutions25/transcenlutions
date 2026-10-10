/** Durable browser slice. No UI hookup, login substitute, retry timer, background sender or tool execution. */
import { sameAccount, type SyncMutation } from "./platform-sync-contract";
import type { SyncClientState } from "./platform-sync-client";
import type { SyncPersistence } from "./platform-sync-persistence";
import { SyncTransportError, type AuthenticatedSyncIdentity, type SyncTransport } from "./platform-sync-transport";

export interface PersistentSyncStatus {
  phase: "signed-out" | "syncing" | "synced" | "unsynced";
  reason: string | null;
  /** Local observation time only, never a version/conflict arbiter or server clock. */
  lastConfirmedAt: number | null;
  lastConfirmedSequence: number | null;
}
export class PersistentSyncSession {
  private principal: AuthenticatedSyncIdentity | null = null;
  private generation = 0;
  private controller = new AbortController();
  private runningGeneration: number | null = null;
  private status: PersistentSyncStatus = { phase: "signed-out", reason: null, lastConfirmedAt: null, lastConfirmedSequence: null };
  constructor(private readonly store: SyncPersistence, private readonly transport: SyncTransport) {}
  getStatus(): PersistentSyncStatus { return { ...this.status }; }
  /** Call synchronously on logout/account-switch BEFORE starting the next sign-in. Keeps old work partitioned. */
  disconnect(): void {
    this.generation += 1; this.controller.abort(); this.controller = new AbortController(); this.principal = null;
    this.status = { phase: "signed-out", reason: null, lastConfirmedAt: null, lastConfirmedSequence: null };
  }
  async connect(): Promise<SyncClientState> {
    this.disconnect();
    const generation = this.generation;
    const identity = await this.transport.identity(this.controller.signal);
    if (generation !== this.generation) throw new SyncTransportError("cancelled");
    const state = await this.store.read({ tenantId: identity.tenantId, userId: identity.userId });
    if (generation !== this.generation) throw new SyncTransportError("cancelled");
    this.principal = identity;
    this.status = { phase: "unsynced", reason: "sign-in-catch-up-pending", lastConfirmedAt: null, lastConfirmedSequence: null };
    // A real verified sign-in always attempts catch-up, but local use does not await network catch-up.
    queueMicrotask(() => { if (generation === this.generation) void this.synchronize().catch(() => undefined); });
    return state;
  }
  async enqueue(mutation: SyncMutation): Promise<SyncClientState> {
    const identity = this.principal;
    const generation = this.generation;
    if (!identity || !sameAccount(identity, mutation.account)) throw new SyncTransportError("unauthenticated");
    const state = await this.store.enqueue(mutation, () => generation === this.generation);
    if (generation !== this.generation) throw new SyncTransportError("cancelled");
    this.status = { ...this.status, phase: "unsynced", reason: "local-writing-pending" };
    return state;
  }
  async synchronize(): Promise<{ state: SyncClientState; complete: boolean }> {
    if (this.runningGeneration === this.generation) throw new SyncTransportError("protocol");
    const expected = this.principal;
    if (!expected) throw new SyncTransportError("unauthenticated");
    this.runningGeneration = this.generation;
    this.status = { ...this.status, phase: "syncing", reason: null };
    const generation = this.generation;
    const signal = this.controller.signal;
    const current = () => generation === this.generation;
    const check = () => { if (!current()) throw new SyncTransportError("cancelled"); };
    try {
      const identity = await this.transport.identity(signal);
      check();
      if (!sameAccount(identity, expected) || identity.sessionId !== expected.sessionId) {
        this.disconnect(); throw new SyncTransportError("unauthenticated");
      }
      const account = { tenantId: identity.tenantId, userId: identity.userId };
      const initial = await this.store.read(account);
      check();
      // One bounded pass. New concurrent writing remains durable and is sent by the next user-triggered pass.
      for (const pending of initial.outbox.filter(item => item.state === "pending").slice(0, 100)) {
        check();
        const receipt = await this.transport.push(identity, pending.mutation, signal);
        check();
        await this.store.acknowledge(account, pending.mutation, receipt, current);
      }
      let state = await this.store.read(account);
      for (let pageNumber = 0; pageNumber < 20; pageNumber += 1) {
        check();
        const before = state.appliedThrough;
        const page = await this.transport.pull(identity, before, signal);
        check();
        if (page?.cursor?.sequence < before) throw new SyncTransportError("protocol");
        state = await this.store.receive(account, page, current);
        check();
        if (!page.hasMore) {
          const gap = state.buffered.length > 0 || page.cursor.sequence > state.appliedThrough
            || state.acknowledged.some(item => item.receipt.sequence > state.appliedThrough);
          const complete = !gap && state.outbox.length === 0;
          this.status = complete
            ? { phase: "synced", reason: null, lastConfirmedAt: Date.now(), lastConfirmedSequence: state.appliedThrough }
            : { ...this.status, phase: "unsynced", reason: gap ? "catch-up-gap" : "pending-or-conflicting-writing" };
          return { state, complete };
        }
        if (state.appliedThrough === before) {
          this.status = { ...this.status, phase: "unsynced", reason: "catch-up-gap" };
          return { state, complete: false };
        }
      }
      this.status = { ...this.status, phase: "unsynced", reason: "catch-up-limit" };
      return { state, complete: false };
    } catch (error) {
      if (current() && error instanceof SyncTransportError && ["unauthenticated", "forbidden"].includes(error.code))
        this.disconnect();
      else if (current()) this.status = { ...this.status, phase: "unsynced",
        reason: error instanceof SyncTransportError ? error.code : "local-or-protocol-error" };
      throw error;
    } finally { if (this.runningGeneration === generation) this.runningGeneration = null; }
  }
}
