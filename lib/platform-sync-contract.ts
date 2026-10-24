/** Provider-neutral reference contract only. No endpoint, authentication provider or durable store. */
import { agentRegistry, type AgentId } from "./agent-foundation";

export interface SyncAccount { tenantId: string; userId: string }
export interface VerifiedSyncContext {
  account: SyncAccount;
  sessionId: string;
  deviceId: string;
  expiresAt: number;
  sessionActive: boolean;
  deviceActive: boolean;
  membershipActive: boolean;
  canSyncOwnWorkspace: boolean;
}
/** Implement on the server. Revalidate session, device and membership on EVERY call.
 * Never construct this result from request JSON, editable profile claims or a client role. */
export interface SyncAuthority {
  resolve(requestContext: unknown): Promise<VerifiedSyncContext | null>;
}
export type SyncOperation =
  | { kind: "conversation.create"; agentId: AgentId; title: string }
  | { kind: "conversation.select-agent"; agentId: AgentId }
  | { kind: "conversation.archive" }
  | { kind: "message.append-user"; messageId: string; text: string }
  | { kind: "draft.replace"; text: string }
  | { kind: "task.save-draft"; taskId: string; text: string };
export interface SyncMutation {
  protocol: 1;
  account: SyncAccount;
  mutationId: string;
  conversationId: string;
  baseVersion: number;
  operation: SyncOperation;
}
export interface SyncReceipt {
  mutationId: string;
  outcome: "accepted" | "conflict";
  sequence: number;
  entityVersion: number;
}
export interface SyncConflict { mutation: SyncMutation; currentVersion: number; sequence: number }
export interface SyncedConversation {
  id: string;
  version: number;
  agentId: AgentId;
  title: string;
  archived: boolean;
  messages: { id: string; text: string; role: "user"; sequence: number }[];
  draft: { version: number; text: string };
  tasks: { id: string; version: number; text: string; status: "draft" }[];
}
export interface SyncEvent { sequence: number; mutation: SyncMutation; receipt: SyncReceipt }
export interface SyncState {
  protocol: 1;
  account: SyncAccount;
  sequence: number;
  conversations: SyncedConversation[];
  conflicts: SyncConflict[];
  events: SyncEvent[];
  receipts: { mutation: SyncMutation; receipt: SyncReceipt }[];
}
export class SyncError extends Error {
  constructor(public readonly code: "invalid" | "unauthenticated" | "forbidden" | "scope" | "missing" | "archived" | "idempotency" | "cursor") {
    super(`Sync request rejected: ${code}`);
    this.name = "SyncError";
  }
}
export function sameAccount(a: SyncAccount, b: SyncAccount): boolean {
  return a.tenantId === b.tenantId && a.userId === b.userId;
}
function object(value: unknown, keys: readonly string[]): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)
    || ![Object.prototype, null].includes(Object.getPrototypeOf(value))
    || Object.keys(value).some(key => !keys.includes(key))) throw new SyncError("invalid");
  return value as Record<string, unknown>;
}
function id(value: unknown): string {
  if (typeof value !== "string" || !/^[a-zA-Z0-9_-]{1,128}$/.test(value)) throw new SyncError("invalid");
  return value;
}
function text(value: unknown, max: number, empty = false): string {
  if (typeof value !== "string" || value.length > max || (!empty && !value.trim())) throw new SyncError("invalid");
  return value; // Preserve exact writing, including whitespace; never interpret it as instructions.
}
function version(value: unknown): number {
  if (typeof value !== "number" || !Number.isSafeInteger(value) || value < 0) throw new SyncError("invalid");
  return value;
}
function agent(value: unknown): AgentId {
  if (typeof value !== "string" || !Object.prototype.hasOwnProperty.call(agentRegistry, value)) throw new SyncError("invalid");
  return value as AgentId;
}
export function parseSyncAccount(value: unknown): SyncAccount {
  const item = object(value, ["tenantId", "userId"]);
  return { tenantId: id(item.tenantId), userId: id(item.userId) };
}
/** Strict allowlist deliberately excludes roles, approvals, agent replies, tool calls and task execution. */
export function parseSyncMutation(value: unknown): SyncMutation {
  const item = object(value, ["protocol", "account", "mutationId", "conversationId", "baseVersion", "operation"]);
  if (item.protocol !== 1) throw new SyncError("invalid");
  const raw = object(item.operation, ["kind", "agentId", "title", "messageId", "taskId", "text"]);
  let operation: SyncOperation;
  switch (raw.kind) {
    case "conversation.create":
      object(raw, ["kind", "agentId", "title"]);
      operation = { kind: raw.kind, agentId: agent(raw.agentId), title: text(raw.title, 160) }; break;
    case "conversation.select-agent":
      object(raw, ["kind", "agentId"]);
      operation = { kind: raw.kind, agentId: agent(raw.agentId) }; break;
    case "conversation.archive":
      object(raw, ["kind"]); operation = { kind: raw.kind }; break;
    case "message.append-user":
      object(raw, ["kind", "messageId", "text"]);
      operation = { kind: raw.kind, messageId: id(raw.messageId), text: text(raw.text, 16000) }; break;
    case "draft.replace":
      object(raw, ["kind", "text"]);
      operation = { kind: raw.kind, text: text(raw.text, 16000, true) }; break;
    case "task.save-draft":
      object(raw, ["kind", "taskId", "text"]);
      operation = { kind: raw.kind, taskId: id(raw.taskId), text: text(raw.text, 16000) }; break;
    default: throw new SyncError("invalid");
  }
  return { protocol: 1, account: parseSyncAccount(item.account), mutationId: id(item.mutationId),
    conversationId: id(item.conversationId), baseVersion: version(item.baseVersion), operation };
}
export function emptySyncState(account: SyncAccount): SyncState {
  return { protocol: 1, account: parseSyncAccount(account), sequence: 0, conversations: [], conflicts: [], events: [], receipts: [] };
}
async function authorize(authority: SyncAuthority, context: unknown, account: SyncAccount, now: number) {
  // This call occurs even for duplicate requests and empty pulls; cached receipts are not an auth bypass.
  const verified = await authority.resolve(context);
  if (!verified || !Number.isFinite(now) || !Number.isFinite(verified.expiresAt)
    || verified.expiresAt <= now || verified.sessionActive !== true) throw new SyncError("unauthenticated");
  if (verified.deviceActive !== true || verified.membershipActive !== true || verified.canSyncOwnWorkspace !== true) throw new SyncError("forbidden");
  id(verified.sessionId); id(verified.deviceId);
  if (!sameAccount(parseSyncAccount(verified.account), account)) throw new SyncError("scope");
}
function currentVersion(conversation: SyncedConversation | undefined, mutation: SyncMutation): number {
  const operation = mutation.operation;
  if (operation.kind === "draft.replace") return conversation?.draft.version ?? 0;
  if (operation.kind === "task.save-draft") return conversation?.tasks.find(task => task.id === operation.taskId)?.version ?? 0;
  if (operation.kind === "message.append-user") return conversation?.messages.some(message => message.id === operation.messageId) ? 1 : 0;
  return conversation?.version ?? 0;
}
/** Pure reference transition after fresh authority resolution. A production adapter MUST run the
 * authority checks, receipt lookup, expected-version check and all writes in one serialized transaction.
 * This function by itself provides neither database durability nor concurrent transaction isolation. */
export async function evaluateSyncMutation(state: SyncState, requestContext: unknown, input: unknown,
  authority: SyncAuthority, serverNow: number): Promise<{ state: SyncState; receipt: SyncReceipt }> {
  const mutation = parseSyncMutation(input);
  await authorize(authority, requestContext, state.account, serverNow);
  if (!sameAccount(state.account, mutation.account)) throw new SyncError("scope");
  const previous = state.receipts.find(item => item.mutation.mutationId === mutation.mutationId);
  if (previous) {
    if (JSON.stringify(previous.mutation) !== JSON.stringify(mutation)) throw new SyncError("idempotency");
    return { state, receipt: structuredClone(previous.receipt) };
  }
  const next = structuredClone(state);
  let conversation = next.conversations.find(item => item.id === mutation.conversationId);
  if (!conversation && mutation.operation.kind !== "conversation.create") throw new SyncError("missing");
  if (conversation?.archived) throw new SyncError("archived");
  const current = currentVersion(conversation, mutation);
  const operation = mutation.operation;
  // Append is create-only. An existing ID cannot replace an earlier message, even with baseVersion=1.
  const conflict = mutation.baseVersion !== current
    || (operation.kind === "conversation.create" && Boolean(conversation))
    || (operation.kind === "message.append-user" && current !== 0);
  if (!Number.isSafeInteger(next.sequence + 1)) throw new SyncError("invalid");
  next.sequence += 1;
  const receipt: SyncReceipt = { mutationId: mutation.mutationId, outcome: conflict ? "conflict" : "accepted",
    sequence: next.sequence, entityVersion: conflict ? current : current + 1 };
  if (conflict) {
    next.conflicts.push({ mutation, currentVersion: current, sequence: next.sequence });
  } else if (operation.kind === "conversation.create") {
    conversation = { id: mutation.conversationId, version: 1, agentId: operation.agentId, title: operation.title,
      archived: false, messages: [], draft: { version: 0, text: "" }, tasks: [] };
    next.conversations.push(conversation);
  } else if (conversation) {
    switch (operation.kind) {
      case "conversation.select-agent": conversation.agentId = operation.agentId; conversation.version += 1; break;
      case "conversation.archive": conversation.archived = true; conversation.version += 1; break;
      case "message.append-user": conversation.messages.push({ id: operation.messageId, text: operation.text, role: "user", sequence: next.sequence }); break;
      case "draft.replace": conversation.draft = { version: current + 1, text: operation.text }; break;
      case "task.save-draft": {
        const existing = conversation.tasks.find(task => task.id === operation.taskId);
        if (existing) { existing.text = operation.text; existing.version += 1; }
        else conversation.tasks.push({ id: operation.taskId, version: 1, text: operation.text, status: "draft" });
        break;
      }
    }
  }
  next.events.push({ sequence: next.sequence, mutation, receipt });
  next.receipts.push({ mutation, receipt });
  return { state: next, receipt: structuredClone(receipt) };
}
export interface SyncCursor { account: SyncAccount; sequence: number }
export interface SyncPage { account: SyncAccount; events: SyncEvent[]; cursor: SyncCursor; hasMore: boolean }
export async function evaluateSyncPull(state: SyncState, context: unknown, input: SyncCursor,
  authority: SyncAuthority, serverNow: number, limit = 100): Promise<SyncPage> {
  await authorize(authority, context, state.account, serverNow);
  const cursor = object(input, ["account", "sequence"]);
  if (!sameAccount(parseSyncAccount(cursor.account), state.account)) throw new SyncError("scope");
  const sequence = version(cursor.sequence);
  if (sequence > state.sequence || !Number.isSafeInteger(limit) || limit < 1 || limit > 100) throw new SyncError("cursor");
  const events = state.events.filter(event => event.sequence > sequence).slice(0, limit);
  const end = events.at(-1)?.sequence ?? sequence;
  return structuredClone({ account: state.account, events, cursor: { account: state.account, sequence: end }, hasMore: end < state.sequence });
}
