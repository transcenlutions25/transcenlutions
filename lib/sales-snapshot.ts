/** Local reporting contract only. Imported assertions are not payment verification. */
export const SALES_SNAPSHOT_MAX_BYTES = 1_000_000;
export const SALES_SNAPSHOT_MAX_RECORDS = 500;
export const SALES_SNAPSHOT_MAX_CENTS = 1_000_000_000_000;
export const DEAL_STAGES = ["qualified", "proposal", "negotiation", "won", "lost"] as const;
export const LEAD_STAGES = ["new", "contacted", "qualified", "closed"] as const;
export type DealStage = typeof DEAL_STAGES[number];
export type LeadStage = typeof LEAD_STAGES[number];

export interface SalesPayment {
  id: string; label: string; sourceRef: string; updatedAt: string;
  status: "collected" | "pending"; amountCents: number; refundedCents: number;
  receivedAt: string | null;
}
export interface SalesDeal {
  id: string; name: string; sourceRef: string; updatedAt: string;
  stage: DealStage; valueCents: number;
}
export interface SalesLead {
  id: string; name: string; company: string; sourceRef: string;
  createdAt: string; stage: LeadStage;
}
export interface SalesSnapshot {
  schemaVersion: 1; currency: "USD";
  source: { name: string; exportedAt: string };
  payments: SalesPayment[]; deals: SalesDeal[]; leads: SalesLead[];
}
export type SalesSnapshotResult = { ok: true; snapshot: SalesSnapshot } | { ok: false; error: string };

function object(value: unknown, fields: string[], path: string): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error(`${path}: expected an object.`);
  const result = value as Record<string, unknown>;
  const keys = Object.keys(result);
  if (keys.length !== fields.length || fields.some(field => !Object.hasOwn(result, field)) || keys.some(key => !fields.includes(key))) {
    throw new Error(`${path}: use exactly the fields in the template.`);
  }
  return result;
}
function text(value: unknown, path: string, max = 160, allowEmpty = false): string {
  if (typeof value !== "string" || value.length > max || (!allowEmpty && !value.length) || value !== value.trim() || /[\u0000-\u001f\u007f]/.test(value)) {
    throw new Error(`${path}: expected ${allowEmpty ? "up to" : "1 to"} ${max} characters without control characters or outer spaces.`);
  }
  return value;
}
function timestamp(value: unknown, path: string, upper: number): string {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/.test(value)) throw new Error(`${path}: use a UTC ISO timestamp ending in Z.`);
  const ms = Date.parse(value);
  if (!Number.isFinite(ms) || ms > upper || new Date(ms).toISOString() !== value.replace(/(?<=:\d{2})Z$/, ".000Z")) throw new Error(`${path}: invalid or future timestamp.`);
  return value;
}
function cents(value: unknown, path: string): number {
  if (typeof value !== "number" || !Number.isSafeInteger(value) || value < 0 || value > SALES_SNAPSHOT_MAX_CENTS) throw new Error(`${path}: use whole USD cents from 0 to ${SALES_SNAPSHOT_MAX_CENTS}.`);
  return value;
}
function choice<T extends string>(value: unknown, choices: readonly T[], path: string): T {
  if (typeof value !== "string" || !choices.includes(value as T)) throw new Error(`${path}: choose ${choices.join(", ")}.`);
  return value as T;
}
function records<T extends { id: string; sourceRef: string }>(value: unknown, path: string, parse: (item: unknown, path: string) => T): T[] {
  if (!Array.isArray(value) || value.length > SALES_SNAPSHOT_MAX_RECORDS) throw new Error(`${path}: use an array with at most ${SALES_SNAPSHOT_MAX_RECORDS} records.`);
  const ids = new Set<string>(); const refs = new Set<string>();
  return value.map((item, index) => {
    const record = parse(item, `${path}[${index}]`);
    if (ids.has(record.id) || refs.has(record.sourceRef)) throw new Error(`${path}[${index}]: duplicate ID or source reference.`);
    ids.add(record.id); refs.add(record.sourceRef);
    return record;
  });
}

export function parseSalesSnapshot(json: string, now = Date.now()): SalesSnapshotResult {
  try {
    if (!Number.isFinite(now)) throw new Error("A valid current time is required.");
    if (typeof json !== "string" || json.length > SALES_SNAPSHOT_MAX_BYTES || new TextEncoder().encode(json).length > SALES_SNAPSHOT_MAX_BYTES) throw new Error("File exceeds the 1 MB limit.");
    let raw: unknown;
    try { raw = JSON.parse(json); } catch { throw new Error("File is not valid JSON. Use the empty template."); }
    const data = object(raw, ["schemaVersion", "currency", "source", "payments", "deals", "leads"], "snapshot");
    if (data.schemaVersion !== 1 || data.currency !== "USD") throw new Error("Use schemaVersion 1 and USD; currencies are never combined.");
    const source = object(data.source, ["name", "exportedAt"], "source");
    const exportedAt = timestamp(source.exportedAt, "source.exportedAt", now);
    const snapshotMs = Date.parse(exportedAt);
    const snapshot: SalesSnapshot = {
      schemaVersion: 1, currency: "USD", source: { name: text(source.name, "source.name"), exportedAt },
      payments: records(data.payments, "payments", (item, path) => {
        const p = object(item, ["id", "label", "sourceRef", "updatedAt", "status", "amountCents", "refundedCents", "receivedAt"], path);
        const status = choice(p.status, ["collected", "pending"], `${path}.status`);
        const amountCents = cents(p.amountCents, `${path}.amountCents`);
        const refundedCents = cents(p.refundedCents, `${path}.refundedCents`);
        const updatedAt = timestamp(p.updatedAt, `${path}.updatedAt`, snapshotMs);
        if (refundedCents > amountCents) throw new Error(`${path}: refunds cannot exceed the collected amount.`);
        if (status === "pending" && (refundedCents !== 0 || p.receivedAt !== null)) throw new Error(`${path}: pending payments cannot have refunds or a received timestamp.`);
        const receivedAt = status === "collected" ? timestamp(p.receivedAt, `${path}.receivedAt`, Date.parse(updatedAt)) : null;
        return { id: text(p.id, `${path}.id`, 100), label: text(p.label, `${path}.label`), sourceRef: text(p.sourceRef, `${path}.sourceRef`, 200), updatedAt, status, amountCents, refundedCents, receivedAt };
      }),
      deals: records(data.deals, "deals", (item, path) => {
        const d = object(item, ["id", "name", "sourceRef", "updatedAt", "stage", "valueCents"], path);
        return { id: text(d.id, `${path}.id`, 100), name: text(d.name, `${path}.name`), sourceRef: text(d.sourceRef, `${path}.sourceRef`, 200), updatedAt: timestamp(d.updatedAt, `${path}.updatedAt`, snapshotMs), stage: choice(d.stage, DEAL_STAGES, `${path}.stage`), valueCents: cents(d.valueCents, `${path}.valueCents`) };
      }),
      leads: records(data.leads, "leads", (item, path) => {
        const l = object(item, ["id", "name", "company", "sourceRef", "createdAt", "stage"], path);
        return { id: text(l.id, `${path}.id`, 100), name: text(l.name, `${path}.name`), company: text(l.company, `${path}.company`, 160, true), sourceRef: text(l.sourceRef, `${path}.sourceRef`, 200), createdAt: timestamp(l.createdAt, `${path}.createdAt`, snapshotMs), stage: choice(l.stage, LEAD_STAGES, `${path}.stage`) };
      }),
    };
    return { ok: true, snapshot };
  } catch (error) { return { ok: false, error: error instanceof Error ? error.message : "Unable to read this snapshot." }; }
}

export function summarizeSalesSnapshot(snapshot: SalesSnapshot) {
  const openDeals = snapshot.deals.filter(deal => !["won", "lost"].includes(deal.stage));
  return {
    collectedCents: snapshot.payments.reduce((total, p) => total + (p.status === "collected" ? p.amountCents - p.refundedCents : 0), 0),
    pendingCents: snapshot.payments.reduce((total, p) => total + (p.status === "pending" ? p.amountCents : 0), 0),
    pipelineCents: openDeals.reduce((total, d) => total + d.valueCents, 0),
    openDeals: [...openDeals].sort((a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt)),
    recentLeads: [...snapshot.leads].sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt)),
  };
}

/** Format in integer space so even the maximum permitted sum keeps every cent. */
export function formatSalesMoney(amountCents: number): string {
  if (!Number.isSafeInteger(amountCents) || amountCents < 0) throw new Error("Expected non-negative integer cents.");
  return `$${Math.floor(amountCents / 100).toLocaleString("en-US")}.${String(amountCents % 100).padStart(2, "0")}`;
}
export function emptySalesSnapshot(now = Date.now()): SalesSnapshot {
  return { schemaVersion: 1, currency: "USD", source: { name: "Replace with your export source", exportedAt: new Date(now).toISOString() }, payments: [], deals: [], leads: [] };
}
