/**
 * Business records.
 *
 * Customer, delivery and payment records are real database rows scoped to one
 * project. Payment collection is the one part that can never be simulated:
 * until the owner configures Stripe, every invoice is reported as
 * `awaiting_configuration` and no amount is presented as collected revenue.
 */
import { getDatabase, type Database } from "./db";
import { newId, now } from "./auth";
import { audit } from "./audit";
import type { BusinessCustomer, BusinessDelivery, BusinessInvoice, BusinessState, UserRecord } from "./types";

const STAGES = new Set(["lead", "qualified", "buyer", "delivering", "delivered", "paused"]);
const DELIVERY_STATUSES = new Set(["not_started", "in_progress", "ready_for_review", "delivered"]);

export function paymentConfiguration() {
  const link = (process.env.TAY_STRIPE_PAYMENT_LINK || "").trim();
  const secret = (process.env.STRIPE_SECRET_KEY || "").trim();
  const mode = (process.env.APEX_STRIPE_MODE || process.env.NEXT_PUBLIC_STRIPE_MODE || "unconfigured").toLowerCase();
  const looksReal = (value: string) => value.length > 12 && !/^(sk_test_)?(changeme|placeholder|your|xxx)/i.test(value);
  if (looksReal(link)) {
    return {
      configured: true,
      mode: (mode === "live" ? "live" : "test") as "test" | "live",
      detail: "A Stripe payment link is configured. Payment links open on Stripe; this workspace never collects card data.",
      requiredEnv: [] as string[],
    };
  }
  if (looksReal(secret)) {
    return {
      configured: false,
      mode: (mode === "live" ? "live" : "test") as "test" | "live",
      detail: "A Stripe secret key is present but no payment link is configured, so checkout cannot be offered yet.",
      requiredEnv: ["TAY_STRIPE_PAYMENT_LINK"],
    };
  }
  return {
    configured: false,
    mode: "unconfigured" as const,
    detail:
      "Payment collection is not configured. Invoices record the intended amount and stay marked awaiting configuration; nothing was charged.",
    requiredEnv: ["TAY_STRIPE_PAYMENT_LINK or STRIPE_SECRET_KEY"],
  };
}

export function listCustomers(db: Database, projectId: string): BusinessCustomer[] {
  const rows = db.all<{
    id: string;
    project_id: string;
    name: string;
    email: string;
    stage: string;
    notes: string;
    created_at: string;
    updated_at: string;
  }>("SELECT * FROM customers WHERE project_id = ? ORDER BY updated_at DESC LIMIT 200", [projectId]);
  return rows.map((row) => ({
    id: row.id,
    projectId: row.project_id,
    name: row.name,
    email: row.email,
    stage: row.stage as BusinessCustomer["stage"],
    notes: row.notes,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }));
}

export function createCustomer(
  db: Database,
  projectId: string,
  user: UserRecord,
  input: { name: string; email: string; notes: string },
): BusinessCustomer {
  const id = newId("cus");
  const timestamp = now();
  db.run("INSERT INTO customers (id, project_id, name, email, stage, notes, created_at, updated_at) VALUES (?,?,?,?, 'lead', ?,?,?)", [
    id,
    projectId,
    input.name.slice(0, 120),
    input.email.slice(0, 190),
    input.notes.slice(0, 2000),
    timestamp,
    timestamp,
  ]);
  audit(db, { projectId, actorId: user.id, actorLabel: user.email, kind: "customer_recorded", detail: { customerId: id, name: input.name } });
  return {
    id,
    projectId,
    name: input.name,
    email: input.email,
    stage: "lead",
    notes: input.notes,
    createdAt: timestamp,
    updatedAt: timestamp,
  };
}

export function updateCustomerStage(
  db: Database,
  projectId: string,
  user: UserRecord,
  customerId: string,
  stage: string,
): BusinessCustomer | null {
  if (!STAGES.has(stage)) return null;
  const existing = db.get<{ id: string }>("SELECT id FROM customers WHERE id = ? AND project_id = ?", [customerId, projectId]);
  if (!existing) return null;
  db.run("UPDATE customers SET stage = ?, updated_at = ? WHERE id = ?", [stage, now(), customerId]);
  audit(db, { projectId, actorId: user.id, actorLabel: user.email, kind: "customer_stage_changed", detail: { customerId, stage } });
  return listCustomers(db, projectId).find((customer) => customer.id === customerId) ?? null;
}

export function listDeliveries(db: Database, projectId: string): BusinessDelivery[] {
  const rows = db.all<{
    id: string;
    project_id: string;
    customer_id: string;
    offer: string;
    status: string;
    artifact_path: string | null;
    created_at: string;
    updated_at: string;
  }>("SELECT * FROM deliveries WHERE project_id = ? ORDER BY updated_at DESC LIMIT 200", [projectId]);
  return rows.map((row) => ({
    id: row.id,
    projectId: row.project_id,
    customerId: row.customer_id,
    offer: row.offer,
    status: row.status as BusinessDelivery["status"],
    artifactPath: row.artifact_path,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }));
}

export function createDelivery(
  db: Database,
  projectId: string,
  user: UserRecord,
  input: { customerId: string; offer: string; artifactPath: string | null },
): BusinessDelivery | null {
  const customer = db.get<{ id: string }>("SELECT id FROM customers WHERE id = ? AND project_id = ?", [input.customerId, projectId]);
  if (!customer) return null;
  const id = newId("dlv");
  const timestamp = now();
  db.run(
    "INSERT INTO deliveries (id, project_id, customer_id, offer, status, artifact_path, created_at, updated_at) VALUES (?,?,?,?, 'not_started', ?,?,?)",
    [id, projectId, input.customerId, input.offer.slice(0, 160), input.artifactPath, timestamp, timestamp],
  );
  audit(db, { projectId, actorId: user.id, actorLabel: user.email, kind: "delivery_opened", detail: { deliveryId: id, offer: input.offer } });
  return {
    id,
    projectId,
    customerId: input.customerId,
    offer: input.offer,
    status: "not_started",
    artifactPath: input.artifactPath,
    createdAt: timestamp,
    updatedAt: timestamp,
  };
}

export function setDeliveryStatus(
  db: Database,
  projectId: string,
  user: UserRecord,
  deliveryId: string,
  status: string,
): boolean {
  if (!DELIVERY_STATUSES.has(status)) return false;
  const existing = db.get<{ id: string }>("SELECT id FROM deliveries WHERE id = ? AND project_id = ?", [deliveryId, projectId]);
  if (!existing) return false;
  db.run("UPDATE deliveries SET status = ?, updated_at = ? WHERE id = ?", [status, now(), deliveryId]);
  audit(db, { projectId, actorId: user.id, actorLabel: user.email, kind: "delivery_status_changed", detail: { deliveryId, status } });
  return true;
}

export function listInvoices(db: Database, projectId: string): BusinessInvoice[] {
  const rows = db.all<{
    id: string;
    project_id: string;
    customer_id: string;
    offer: string;
    amount_cents: number;
    currency: string;
    status: string;
    provider: string;
    provider_ref: string | null;
    created_at: string;
    updated_at: string;
  }>("SELECT * FROM invoices WHERE project_id = ? ORDER BY updated_at DESC LIMIT 200", [projectId]);
  return rows.map((row) => ({
    id: row.id,
    projectId: row.project_id,
    customerId: row.customer_id,
    offer: row.offer,
    amountCents: row.amount_cents,
    currency: row.currency,
    status: row.status as BusinessInvoice["status"],
    provider: "stripe",
    providerRef: row.provider_ref,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }));
}

export function createInvoice(
  db: Database,
  projectId: string,
  user: UserRecord,
  input: { customerId: string; offer: string; amountCents: number },
): BusinessInvoice | null {
  const customer = db.get<{ id: string }>("SELECT id FROM customers WHERE id = ? AND project_id = ?", [input.customerId, projectId]);
  if (!customer) return null;
  const id = newId("inv");
  const timestamp = now();
  db.run(
    "INSERT INTO invoices (id, project_id, customer_id, offer, amount_cents, currency, status, provider, provider_ref, created_at, updated_at) VALUES (?,?,?,?,?, 'usd', ?, 'stripe', NULL, ?, ?)",
    // An invoice never becomes payable without a recorded approval of the handoff.
    [id, projectId, input.customerId, input.offer.slice(0, 160), Math.max(0, Math.round(input.amountCents)), "awaiting_configuration", timestamp, timestamp],
  );
  audit(db, {
    projectId,
    actorId: user.id,
    actorLabel: user.email,
    kind: "invoice_recorded",
    detail: { invoiceId: id, amountCents: input.amountCents, status: "awaiting_configuration" },
  });
  return listInvoices(db, projectId).find((invoice) => invoice.id === id) ?? null;
}

/** Approving a payment handoff only records the link; no charge is made here. */
export function paymentHandoffPayload(invoiceId: string) {
  const config = paymentConfiguration();
  return {
    action: "record_payment_link",
    invoiceId,
    providerRef: config.configured ? (process.env.TAY_STRIPE_PAYMENT_LINK || "").slice(0, 200) : null,
  };
}

export function businessState(db: Database, projectId: string): BusinessState {
  const config = paymentConfiguration();
  return {
    customers: listCustomers(db, projectId),
    deliveries: listDeliveries(db, projectId),
    invoices: listInvoices(db, projectId),
    paymentConfiguration: config,
  };
}
