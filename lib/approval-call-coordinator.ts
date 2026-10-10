/** Pure approval-contact planning only. No notification, microphone, approval grant or execution. */
import type { PlatformIdentity } from "./platform-identity";
import type { GovernanceRiskTier } from "./types";

export interface ApprovalAccount { tenantId: string; userId: string }
export interface ReviewItem {
  id: string; version: number; actionId: string; payloadDigest: string;
  createdAt: number; expiresAt: number;
  contact: "batch" | "per-item" | "chat-only";
  confirmation: "per-action" | "handoff";
  preview: {
    action: string; destination: string; scope: string; dataSummary: string;
    risk: GovernanceRiskTier; consequences: string;
    cost: { maxMinor: number | null; currency: string | null; commitment: "none" | "one-time" | "recurring" | "unknown"; terms: string };
  };
}
export interface LocalWindow { weekdays: number[]; startMinute: number; endMinute: number }
export interface ApprovalCallPolicy {
  enabled: boolean; mode: "per-item" | "batch"; threshold: number;
  minIntervalMs: number; repeatAfterMs: number | null; maxCallsPerDay: number;
  timeZone: string; allowedWindows: LocalWindow[]; quietWindows: LocalWindow[];
}
/** ONLY the server authority adapter may supply these facts, from current authenticated state. */
export interface VerifiedApprovalSnapshot {
  identity: PlatformIdentity; deviceId: string; ownerVerified: boolean;
  sessionActive: boolean; deviceActive: boolean; membershipActive: boolean;
  authorityExpiresAt: number; observedAt: number; revision: number;
  policy: ApprovalCallPolicy; pending: ReviewItem[];
}
export interface ApprovalAuthority {
  /** Resolve on EVERY operation, including duplicate/empty requests. Never from client role/approval JSON. */
  resolve(requestContext: unknown): Promise<VerifiedApprovalSnapshot | null>;
}
export interface ContactAvailability { online: boolean; notificationsAllowed: boolean; voiceAvailable: boolean; busy: boolean }
export interface ReviewInvitation {
  id: string; sessionId: string; deviceId: string; expiresAt: number;
  status: "offered" | "reviewing"; items: { id: string; binding: string }[];
}
export interface DecisionIntent {
  kind: "uncommitted-approval-choice"; requestId: string; account: ApprovalAccount;
  sessionId: string; deviceId: string; approvalId: string; itemBinding: string;
  choice: "approve" | "reject"; expiresAt: number;
  // This is a proposal to the real server approval service, never an execution credential.
}
export interface ApprovalCallState {
  account: ApprovalAccount; stateVersion: number; revision: number; snapshotBinding: string; lastNow: number;
  nextInvitation: number; snoozedUntil: number; resumeBindings: string[]; active: ReviewInvitation | null;
  contacts: { binding: string; at: number }[]; offeredAt: number[]; intents: DecisionIntent[];
}
export type ContactEffect =
  | { kind: "offer-review-call"; invitationId: string; count: number; expiresAt: number; notificationText: "Open Tay to review pending approvals." }
  | { kind: "cancel-invitation"; invitationId: string }
  | { kind: "chat-fallback"; count: number; reason: string }
  | { kind: "open-review"; invitationId: string; items: ReviewItem[]; microphone: "off" }
  | { kind: "decision-intent"; intent: DecisionIntent }
  | { kind: "review-updated"; invitationId: string; items: ReviewItem[] };
export type ContactEvent =
  | { kind: "tick"; availability: ContactAvailability }
  | { kind: "invitation-response"; invitationId: string; response: "accept" | "decline" | "snooze"; snoozeMs?: number }
  | { kind: "item-choice"; invitationId: string; requestId: string; approvalId: string; itemBinding: string; choice: "approve" | "reject" };
export interface ContactTransition { state: ApprovalCallState; effects: ContactEffect[] }
export class ApprovalCallError extends Error {
  /** Server-internal cleanup only. Never serialize state/history/previews in a public error response. */
  declare readonly reconciliation?: ContactTransition;
  constructor(public readonly code: "invalid" | "unauthenticated" | "scope" | "stale" | "clock" | "capacity" | "handoff" | "idempotency", reconciliation?: ContactTransition) {
    super(`Approval contact: ${code}`); this.name = "ApprovalCallError";
    if (reconciliation) Object.defineProperty(this, "reconciliation", { value: reconciliation, enumerable: false });
  }
}
const fail = (code: ApprovalCallError["code"]): never => { throw new ApprovalCallError(code); };
function object(value: unknown, keys: string[]): Record<string, unknown> {
  if (!value || Array.isArray(value) || typeof value !== "object" || ![Object.prototype, null].includes(Object.getPrototypeOf(value))
    || Object.keys(value).some(k => !keys.includes(k))) return fail("invalid");
  return value as Record<string, unknown>;
}
function id(value: unknown): string { if (typeof value !== "string" || !/^[A-Za-z0-9_-]{1,128}$/.test(value)) return fail("invalid"); return value; }
function integer(value: unknown, min = 0, max = Number.MAX_SAFE_INTEGER): number {
  if (!Number.isSafeInteger(value) || (value as number) < min || (value as number) > max) return fail("invalid"); return value as number;
}
function text(value: unknown, max = 4000): string { if (typeof value !== "string" || !value.trim() || value.length > max) return fail("invalid"); return value; }
function member<T extends string>(value: unknown, values: T[]): T { if (!values.includes(value as T)) return fail("invalid"); return value as T; }
function boolean(value: unknown): boolean { if (typeof value !== "boolean") return fail("invalid"); return value; }
function account(value: unknown): ApprovalAccount { const v = object(value, ["tenantId", "userId"]); return { tenantId: id(v.tenantId), userId: id(v.userId) }; }
function sameAccount(a: ApprovalAccount, b: ApprovalAccount) { return a.tenantId === b.tenantId && a.userId === b.userId; }
function window(value: unknown): LocalWindow {
  const v = object(value, ["weekdays", "startMinute", "endMinute"]);
  if (!Array.isArray(v.weekdays) || !v.weekdays.length || v.weekdays.length > 7) return fail("invalid");
  const weekdays = v.weekdays.map(d => integer(d, 0, 6));
  if (new Set(weekdays).size !== weekdays.length) return fail("invalid");
  const result = { weekdays, startMinute: integer(v.startMinute, 0, 1439), endMinute: integer(v.endMinute, 0, 1439) };
  if (result.startMinute === result.endMinute) return fail("invalid"); // Empty is never interpreted as all-day.
  return result;
}
function policy(value: unknown): ApprovalCallPolicy {
  const v = object(value, ["enabled", "mode", "threshold", "minIntervalMs", "repeatAfterMs", "maxCallsPerDay", "timeZone", "allowedWindows", "quietWindows"]);
  if (!Array.isArray(v.allowedWindows) || !Array.isArray(v.quietWindows) || v.allowedWindows.length > 32 || v.quietWindows.length > 32) return fail("invalid");
  const zone = text(v.timeZone, 80);
  try { new Intl.DateTimeFormat("en-US", { timeZone: zone }).format(0); } catch { return fail("invalid"); }
  const gap = integer(v.minIntervalMs, 0, 7 * 86400000);
  const repeat = v.repeatAfterMs === null ? null : integer(v.repeatAfterMs, Math.max(gap, 60000), 30 * 86400000);
  return { enabled: boolean(v.enabled), mode: member(v.mode, ["per-item", "batch"]), threshold: integer(v.threshold, 1, 1000),
    minIntervalMs: gap, repeatAfterMs: repeat, maxCallsPerDay: integer(v.maxCallsPerDay, 1, 1000), timeZone: zone,
    allowedWindows: v.allowedWindows.map(window), quietWindows: v.quietWindows.map(window) };
}
export function parseReviewItem(value: unknown): ReviewItem {
  const v = object(value, ["id", "version", "actionId", "payloadDigest", "createdAt", "expiresAt", "contact", "confirmation", "preview"]);
  const p = object(v.preview, ["action", "destination", "scope", "dataSummary", "risk", "consequences", "cost"]);
  const c = object(p.cost, ["maxMinor", "currency", "commitment", "terms"]);
  const cost = { maxMinor: c.maxMinor === null ? null : integer(c.maxMinor), currency: c.currency === null ? null : text(c.currency, 3),
    commitment: member(c.commitment, ["none", "one-time", "recurring", "unknown"]), terms: text(c.terms) };
  if (cost.currency !== null && !/^[A-Z]{3}$/.test(cost.currency)) return fail("invalid");
  if (cost.commitment === "none" && cost.maxMinor !== 0) return fail("invalid");
  if (["one-time", "recurring"].includes(cost.commitment) && (cost.maxMinor === null || cost.currency === null)) return fail("invalid");
  if (typeof v.payloadDigest !== "string" || !/^[a-f0-9]{64}$/.test(v.payloadDigest)) return fail("invalid");
  const createdAt = integer(v.createdAt), expiresAt = integer(v.expiresAt);
  if (expiresAt <= createdAt) return fail("invalid");
  return { id: id(v.id), version: integer(v.version, 1), actionId: id(v.actionId), payloadDigest: v.payloadDigest, createdAt, expiresAt,
    contact: member(v.contact, ["batch", "per-item", "chat-only"]), confirmation: member(v.confirmation, ["per-action", "handoff"]),
    preview: { action: text(p.action), destination: text(p.destination), scope: text(p.scope), dataSummary: text(p.dataSummary),
      risk: member(p.risk, ["none", "low", "medium", "high", "critical"]), consequences: text(p.consequences), cost } };
}
/** Exact normalized record comparison, not a cryptographic signature or authorization token. */
export function reviewItemBinding(item: ReviewItem): string { return JSON.stringify(parseReviewItem(item)); }
export function emptyApprovalCallState(value: ApprovalAccount): ApprovalCallState {
  return { account: account(value), stateVersion: 0, revision: -1, snapshotBinding: "", lastNow: 0, nextInvitation: 1, snoozedUntil: 0, resumeBindings: [],
    active: null, contacts: [], offeredAt: [], intents: [] };
}
function localTime(now: number, zone: string) {
  const parts = new Intl.DateTimeFormat("en-US", { timeZone: zone, year: "numeric", month: "2-digit", day: "2-digit", weekday: "short", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).formatToParts(now);
  const get = (type: string) => parts.find(p => p.type === type)!.value;
  return { day: ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].indexOf(get("weekday")),
    minute: Number(get("hour")) * 60 + Number(get("minute")), date: `${get("year")}-${get("month")}-${get("day")}` };
}
function inWindow(local: ReturnType<typeof localTime>, w: LocalWindow) {
  if (w.startMinute < w.endMinute) return w.weekdays.includes(local.day) && local.minute >= w.startMinute && local.minute < w.endMinute;
  return (w.weekdays.includes(local.day) && local.minute >= w.startMinute)
    || (w.weekdays.includes((local.day + 6) % 7) && local.minute < w.endMinute);
}
function authenticated(state: ApprovalCallState, snapshot: VerifiedApprovalSnapshot | null, now: number) {
  if (!snapshot || snapshot.identity?.source !== "authenticated" || snapshot.ownerVerified !== true || snapshot.sessionActive !== true
    || snapshot.deviceActive !== true || snapshot.membershipActive !== true || !Number.isSafeInteger(snapshot.authorityExpiresAt) || snapshot.authorityExpiresAt <= now)
    return fail("unauthenticated");
  id(snapshot.identity.sessionId); id(snapshot.deviceId);
  const scope = account({ tenantId: snapshot.identity.tenantId, userId: snapshot.identity.userId });
  if (!sameAccount(state.account, scope)) return fail("scope");
  if (!Number.isSafeInteger(snapshot.observedAt) || snapshot.observedAt > now + 5000 || now - snapshot.observedAt > 30000) return fail("clock");
  return snapshot;
}

/** Pure transition. Call only with a fresh SERVER-VERIFIED snapshot; clients cannot grant its authority.
 * Persist state and outgoing invitation/intent atomically with compare-and-swap BEFORE dispatch.
 * This function itself neither persists nor dispatches anything. */
export function transitionApprovalCalls(previous: ApprovalCallState, trusted: VerifiedApprovalSnapshot | null, event: ContactEvent, now: number): ContactTransition {
  integer(now);
  const snapshot = authenticated(previous, trusted, now);
  if (now < previous.lastNow) return fail("clock");
  const settings = policy(snapshot.policy), revision = integer(snapshot.revision);
  if (!Array.isArray(snapshot.pending) || snapshot.pending.length > 1000) return fail("capacity");
  const compareId = (a: ReviewItem, b: ReviewItem) => a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
  const all = snapshot.pending.map(parseReviewItem).sort(compareId);
  if (new Set(all.map(i => i.id)).size !== all.length) return fail("invalid");
  const snapshotBinding = JSON.stringify({ settings, all });
  if (revision < previous.revision || (revision === previous.revision && snapshotBinding !== previous.snapshotBinding)) return fail("stale");
  if (previous.contacts.length > 4096 || previous.offeredAt.length > 4096 || previous.intents.length > 4096) return fail("capacity");
  const state: ApprovalCallState = structuredClone(previous);
  state.stateVersion = integer(previous.stateVersion, 0, Number.MAX_SAFE_INTEGER - 1) + 1;
  state.revision = revision; state.snapshotBinding = snapshotBinding; state.lastNow = now;
  const pending = all.filter(i => i.expiresAt > now), effects: ContactEffect[] = [];
  state.resumeBindings = state.resumeBindings.filter(binding => pending.some(item => reviewItemBinding(item) === binding));
  const resume = (invitation: ReviewInvitation) => {
    state.resumeBindings = [...new Set([...state.resumeBindings, ...invitation.items
      .filter(ref => pending.some(item => item.id === ref.id && reviewItemBinding(item) === ref.binding)).map(ref => ref.binding)])];
  };
  const active = state.active;
  if (active) {
    const ended = active.expiresAt <= now;
    const invalidSession = active.sessionId !== snapshot.identity.sessionId || active.deviceId !== snapshot.deviceId;
    const remaining = active.items.filter(ref => pending.some(item => item.id === ref.id && reviewItemBinding(item) === ref.binding));
    if (!settings.enabled || ended || invalidSession || !remaining.length) {
      if (!ended) resume(active); // Missed/time-expired calls use explicit repeat policy, not automatic redial.
      effects.push({ kind: "cancel-invitation", invitationId: active.id }); state.active = null;
    } else if (remaining.length !== active.items.length) {
      if (active.status === "reviewing") {
        state.active!.items = remaining;
        effects.push({ kind: "review-updated", invitationId: active.id, items: remaining.map(ref => pending.find(item => item.id === ref.id)!) });
      } else {
        resume(active); effects.push({ kind: "cancel-invitation", invitationId: active.id }); state.active = null;
      }
    }
  }
  const reconciliation: ContactTransition = structuredClone({ state, effects });
  try {
    const e = object(event, event?.kind === "tick" ? ["kind", "availability"] : event?.kind === "invitation-response"
      ? ["kind", "invitationId", "response", "snoozeMs"] : ["kind", "invitationId", "requestId", "approvalId", "itemBinding", "choice"]);
    if (e.kind === "invitation-response") {
      if (!state.active || state.active.id !== id(e.invitationId)) return fail("stale");
      const response = member(e.response, ["accept", "decline", "snooze"]);
      if (response === "accept") {
        if (e.snoozeMs !== undefined) return fail("invalid");
        if (state.active.status === "offered") {
          state.active.status = "reviewing";
          state.active.expiresAt = now + 15 * 60000; // Item expiry is checked separately; it must not expire the whole batch.
          effects.push({ kind: "open-review", invitationId: state.active.id, microphone: "off",
            items: state.active.items.map(ref => pending.find(i => i.id === ref.id)!) });
        }
      } else {
        if (response === "snooze") {
          state.snoozedUntil = now + integer(e.snoozeMs, 60000, 7 * 86400000);
          resume(state.active);
        }
        else if (e.snoozeMs !== undefined) return fail("invalid");
        effects.push({ kind: "cancel-invitation", invitationId: state.active.id }); state.active = null;
        effects.push({ kind: "chat-fallback", count: pending.length, reason: response });
      }
      return { state, effects };
    }
    if (e.kind === "item-choice") {
      const requestId = id(e.requestId), choice = member(e.choice, ["approve", "reject"]);
      if (!state.active || state.active.status !== "reviewing" || state.active.id !== id(e.invitationId)) return fail("stale");
      const item = pending.find(i => i.id === id(e.approvalId));
      if (!item || typeof e.itemBinding !== "string" || reviewItemBinding(item) !== e.itemBinding
        || !state.active.items.some(ref => ref.id === item.id && ref.binding === e.itemBinding)) return fail("stale");
      if (choice === "approve" && (item.confirmation === "handoff" || item.preview.cost.commitment === "unknown")) return fail("handoff");
      const intent: DecisionIntent = { kind: "uncommitted-approval-choice", requestId, account: state.account,
        sessionId: snapshot.identity.sessionId, deviceId: snapshot.deviceId, approvalId: item.id, itemBinding: e.itemBinding, choice, expiresAt: item.expiresAt };
      const duplicate = state.intents.find(i => i.requestId === requestId);
      if (duplicate && JSON.stringify(duplicate) !== JSON.stringify(intent)) return fail("idempotency");
      if (!duplicate && state.intents.some(i => i.approvalId === item.id && i.itemBinding === e.itemBinding)) return fail("idempotency");
      if (!duplicate) {
        if (state.intents.length >= 4096) return fail("capacity");
        state.intents.push(intent); effects.push({ kind: "decision-intent", intent });
      }
      return { state, effects }; // Pending approval remains pending. No grant, execution or queue removal.
    }
    if (e.kind !== "tick") return fail("invalid");
    const a = object(e.availability, ["online", "notificationsAllowed", "voiceAvailable", "busy"]);
    for (const field of ["online", "notificationsAllowed", "voiceAvailable", "busy"]) boolean(a[field]);
    const local = localTime(now, settings.timeZone);
    const quiet = settings.quietWindows.some(w => inWindow(local, w));
    const outside = settings.allowedWindows.length > 0 && !settings.allowedWindows.some(w => inWindow(local, w));
    if (state.active && (!a.online || !a.voiceAvailable || (state.active.status === "offered" && (!a.notificationsAllowed || a.busy || quiet || outside)))) {
      resume(state.active); effects.push({ kind: "cancel-invitation", invitationId: state.active.id }); state.active = null;
    }
    if (state.active) return { state, effects };
    const fallback = (reason: string) => ({ state, effects: [...effects, { kind: "chat-fallback" as const, count: pending.length, reason }] });
    if (!pending.length) return { state, effects };
    if (!settings.enabled) return fallback("disabled");
    if (!a.online) return fallback("offline-queued");
    if (!a.notificationsAllowed || !a.voiceAvailable || a.busy) return fallback("voice-or-notification-unavailable");
    if (now < state.snoozedUntil) return fallback("snoozed");
    if (quiet) return fallback("quiet-hours");
    if (outside) return fallback("outside-schedule");
    const last = state.offeredAt.at(-1);
    if (last !== undefined && now - last < settings.minIntervalMs) return fallback("frequency-limit");
    if (state.offeredAt.filter(at => localTime(at, settings.timeZone).date === local.date).length >= settings.maxCallsPerDay) return fallback("daily-limit");
    const eligible = pending.filter(item => {
      if (item.contact === "chat-only") return false;
      if (state.resumeBindings.includes(reviewItemBinding(item)) && now >= state.snoozedUntil) return true;
      const contact = state.contacts.findLast(c => c.binding === reviewItemBinding(item));
      return !contact || (settings.repeatAfterMs !== null && now - contact.at >= settings.repeatAfterMs);
    }).sort((a, b) => a.createdAt - b.createdAt || compareId(a, b));
    const single = eligible.find(item => item.contact === "per-item" || settings.mode === "per-item");
    const resumed = eligible.filter(item => state.resumeBindings.includes(reviewItemBinding(item)));
    if (!single && !resumed.length && eligible.length < settings.threshold) return fallback("below-threshold-or-already-offered");
    const selected = single ? [single] : [...resumed, ...eligible.filter(item => !resumed.includes(item))].slice(0, settings.threshold);
    if (state.contacts.length + selected.length > 4096 || state.offeredAt.length >= 4096) return fail("capacity");
    const invitation: ReviewInvitation = { id: `review-${integer(state.nextInvitation, 1)}`, sessionId: snapshot.identity.sessionId,
      deviceId: snapshot.deviceId, expiresAt: now + 60000, status: "offered",
      items: selected.map(i => ({ id: i.id, binding: reviewItemBinding(i) })) };
    state.nextInvitation++; state.active = invitation; state.offeredAt.push(now);
    state.resumeBindings = state.resumeBindings.filter(binding => !invitation.items.some(item => item.binding === binding));
    state.contacts.push(...selected.map(i => ({ binding: reviewItemBinding(i), at: now })));
    effects.push({ kind: "offer-review-call", invitationId: invitation.id, count: selected.length, expiresAt: invitation.expiresAt,
      notificationText: "Open Tay to review pending approvals." });
    return { state, effects };
  } catch (error) {
    // A rejected choice must still permit already-computed expiry/revocation cleanup to be committed.
    // This copy predates the event: it cannot contain a new invitation or decision intent from it.
    if (error instanceof ApprovalCallError) throw new ApprovalCallError(error.code, reconciliation);
    throw error;
  }
}
/** The only adapter entrypoint: fresh authority even for duplicate events. No cached role grants. */
export async function evaluateApprovalCalls(state: ApprovalCallState, requestContext: unknown, event: ContactEvent, authority: ApprovalAuthority, serverNow: () => number) {
  const snapshot = await authority.resolve(requestContext);
  return transitionApprovalCalls(state, snapshot, event, serverNow()); // Read trusted time after asynchronous authorization.
}
