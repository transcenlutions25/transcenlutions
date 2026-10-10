/** Pure client reconciliation contract; no localStorage, credentials, network, timers or execution. */
import { parseSyncAccount, parseSyncMutation, sameAccount, SyncError, type SyncAccount,
  type SyncEvent, type SyncMutation, type SyncPage, type SyncReceipt } from "./platform-sync-contract";

function record(value: unknown, keys: readonly string[]): void {
  if (!value || typeof value !== "object" || Array.isArray(value)
    || ![Object.prototype, null].includes(Object.getPrototypeOf(value))
    || Object.keys(value).some(key => !keys.includes(key))) throw new SyncError("invalid");
}

export interface PendingSyncMutation { mutation: SyncMutation; state: "pending" | "conflict" }
export interface SyncClientState {
  account: SyncAccount;
  appliedThrough: number;
  events: SyncEvent[];
  buffered: SyncEvent[];
  outbox: PendingSyncMutation[];
  acknowledged: { mutation: SyncMutation; receipt: SyncReceipt }[];
}
export function emptySyncClient(account: SyncAccount): SyncClientState {
  return { account: parseSyncAccount(account), appliedThrough: 0, events: [], buffered: [], outbox: [], acknowledged: [] };
}
export function enqueueSyncMutation(state: SyncClientState, input: unknown): SyncClientState {
  const mutation = parseSyncMutation(input);
  if (!sameAccount(state.account, mutation.account)) throw new SyncError("scope");
  const existing = [...state.outbox, ...state.acknowledged, ...state.events, ...state.buffered]
    .find(item => item.mutation.mutationId === mutation.mutationId);
  if (existing) {
    if (JSON.stringify(existing.mutation) !== JSON.stringify(mutation)) throw new SyncError("idempotency");
    return state;
  }
  return { ...state, outbox: [...state.outbox, { mutation, state: "pending" }] };
}
function parseReceipt(receipt: SyncReceipt): SyncReceipt {
  record(receipt, ["mutationId", "outcome", "sequence", "entityVersion"]);
  if (!receipt || !["accepted", "conflict"].includes(receipt.outcome)
    || typeof receipt.mutationId !== "string"
    || !Number.isSafeInteger(receipt.sequence) || receipt.sequence < 1
    || !Number.isSafeInteger(receipt.entityVersion) || receipt.entityVersion < 0) throw new SyncError("invalid");
  return { mutationId: receipt.mutationId, outcome: receipt.outcome, sequence: receipt.sequence, entityVersion: receipt.entityVersion };
}
/** Supply the exact original submitted mutation with the authenticated response. A bare mutation ID
 * cannot acknowledge writing: another device may have collided with or reused that ID. */
export function acknowledgeSyncMutation(state: SyncClientState, account: SyncAccount, input: SyncMutation, receipt: SyncReceipt): SyncClientState {
  if (!sameAccount(state.account, account)) throw new SyncError("scope");
  const mutation = parseSyncMutation(input);
  if (!sameAccount(state.account, mutation.account)) throw new SyncError("scope");
  receipt = parseReceipt(receipt);
  if (receipt.mutationId !== mutation.mutationId) throw new SyncError("invalid");
  for (const existing of [...state.outbox, ...state.acknowledged, ...state.events, ...state.buffered]) {
    if (existing.mutation.mutationId === mutation.mutationId && JSON.stringify(existing.mutation) !== JSON.stringify(mutation))
      throw new SyncError("idempotency");
  }
  const acknowledged = state.acknowledged.find(item => item.mutation.mutationId === mutation.mutationId);
  if (acknowledged && JSON.stringify(acknowledged.receipt) !== JSON.stringify(receipt)) throw new SyncError("idempotency");
  return { ...state, acknowledged: acknowledged ? state.acknowledged : [...state.acknowledged, { mutation, receipt: structuredClone(receipt) }],
    outbox: state.outbox.flatMap(item => item.mutation.mutationId !== receipt.mutationId ? [item]
    : receipt.outcome === "conflict" ? [{ ...item, state: "conflict" as const }] : []) };
}
/** Accept only complete, validated pages from the authenticated transport. Out-of-order events wait
 * for every missing sequence. Wall-clock timestamps never decide winners or advance this cursor. */
export function receiveSyncPage(state: SyncClientState, page: SyncPage): SyncClientState {
  record(page, ["account", "events", "cursor", "hasMore"]);
  record(page.cursor, ["account", "sequence"]);
  if (!sameAccount(state.account, parseSyncAccount(page.account))
    || !sameAccount(state.account, parseSyncAccount(page.cursor.account))) throw new SyncError("scope");
  if (!Array.isArray(page.events) || page.events.length > 100 || typeof page.hasMore !== "boolean"
    || !Number.isSafeInteger(page.cursor.sequence) || page.cursor.sequence < 0) throw new SyncError("invalid");
  // Validate the entire batch before acknowledging anything, so malformed tails are atomic failures.
  const events = page.events.map(event => {
    record(event, ["sequence", "mutation", "receipt"]);
    const mutation = parseSyncMutation(event.mutation);
    const receipt = parseReceipt(event.receipt);
    if (!sameAccount(state.account, mutation.account)) throw new SyncError("scope");
    if (event.sequence !== receipt.sequence || receipt.mutationId !== mutation.mutationId
      || event.sequence > page.cursor.sequence) throw new SyncError("invalid");
    return { sequence: event.sequence, mutation, receipt };
  });
  let next = structuredClone(state);
  for (const event of events) {
    const existing = [...next.events, ...next.buffered].find(item => item.sequence === event.sequence);
    if (existing && JSON.stringify(existing) !== JSON.stringify(event)) throw new SyncError("idempotency");
    if (!existing) next.buffered.push(event);
    next = acknowledgeSyncMutation(next, page.account, event.mutation, event.receipt);
  }
  next.buffered.sort((a, b) => a.sequence - b.sequence);
  while (next.buffered[0]?.sequence === next.appliedThrough + 1) {
    const event = next.buffered.shift()!;
    next.events.push(event);
    next.appliedThrough = event.sequence;
  }
  return next;
}
/** Caller retains the prior state in an account-partitioned, protected store. Never rebind or send
 * another account's outbox. Login on the new device creates its own session; tokens are never synced. */
export function switchSyncAccount(state: SyncClientState, account: SyncAccount): SyncClientState {
  return sameAccount(state.account, parseSyncAccount(account)) ? state : emptySyncClient(account);
}
