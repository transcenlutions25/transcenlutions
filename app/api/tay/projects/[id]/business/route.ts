import { getDatabase } from "../../../../../../lib/tay/db";
import {
  businessState,
  createCustomer,
  createDelivery,
  createInvoice,
  paymentConfiguration,
  setDeliveryStatus,
  updateCustomerStage,
} from "../../../../../../lib/tay/business";
import { readProjectFile, safeProjectPath } from "../../../../../../lib/tay/projects";
import { requestApproval } from "../../../../../../lib/tay/approvals";
import { normalizeEmail } from "../../../../../../lib/tay/auth";
import { fail, json, readJson, requireEdit, requireProject, str } from "../../../../../../lib/tay/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const { project } = await requireProject(id);
    return json({ ok: true, business: businessState(getDatabase(), project.id) });
  } catch (error) {
    return fail(error);
  }
}

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const { project, user } = await requireProject(id);
    requireEdit(project);
    const body = await readJson(request, 32768);
    const action = str(body.action, 40);
    const db = getDatabase();

    if (action === "add_customer") {
      const name = str(body.name, 120);
      const email = normalizeEmail(body.email);
      if (!name || !email) return json({ ok: false, error: "A customer needs a name and a valid email." }, 400);
      const customer = createCustomer(db, project.id, user, { name, email, notes: str(body.notes, 2000) ?? "" });
      return json({ ok: true, business: businessState(db, project.id), customer });
    }

    if (action === "set_customer_stage") {
      const customerId = str(body.customerId, 80);
      const stage = str(body.stage, 20);
      if (!customerId || !stage) return json({ ok: false, error: "A customer and stage are required." }, 400);
      const customer = updateCustomerStage(db, project.id, user, customerId, stage);
      if (!customer) return json({ ok: false, error: "That customer or stage is not valid here." }, 400);
      return json({ ok: true, business: businessState(db, project.id), customer });
    }

    if (action === "open_delivery") {
      const customerId = str(body.customerId, 80);
      const offer = str(body.offer, 160);
      const rawPath = str(body.artifactPath, 180);
      const artifactPath = rawPath ? safeProjectPath(rawPath) : null;
      if (!customerId || !offer) return json({ ok: false, error: "A customer and offer name are required." }, 400);
      if (rawPath && !artifactPath) return json({ ok: false, error: "The artifact path is not a valid project path." }, 400);
      if (artifactPath && !readProjectFile(db, project.id, artifactPath)) {
        return json({ ok: false, error: "That artifact is not in this project yet." }, 400);
      }
      const delivery = createDelivery(db, project.id, user, { customerId, offer, artifactPath });
      if (!delivery) return json({ ok: false, error: "That customer is not in this project." }, 400);
      return json({ ok: true, business: businessState(db, project.id), delivery });
    }

    if (action === "set_delivery_status") {
      const deliveryId = str(body.deliveryId, 80);
      const status = str(body.status, 30);
      if (!deliveryId || !status) return json({ ok: false, error: "A delivery and status are required." }, 400);
      if (!setDeliveryStatus(db, project.id, user, deliveryId, status)) {
        return json({ ok: false, error: "That delivery or status is not valid here." }, 400);
      }
      return json({ ok: true, business: businessState(db, project.id) });
    }

    if (action === "record_invoice") {
      const customerId = str(body.customerId, 80);
      const offer = str(body.offer, 160);
      const amountCents = typeof body.amountCents === "number" ? body.amountCents : Number(body.amountCents);
      if (!customerId || !offer || !Number.isFinite(amountCents) || amountCents <= 0 || amountCents > 100_000_000) {
        return json({ ok: false, error: "An invoice needs a customer, an offer, and an amount greater than zero." }, 400);
      }
      const invoice = createInvoice(db, project.id, user, { customerId, offer, amountCents });
      if (!invoice) return json({ ok: false, error: "That customer is not in this project." }, 400);
      const config = paymentConfiguration();
      if (!config.configured) {
        return json({
          ok: true,
          business: businessState(db, project.id),
          invoice,
          notice: config.detail,
        });
      }
      const approval = requestApproval(db, {
        projectId: project.id,
        taskId: null,
        conversationId: null,
        kind: "business_action",
        title: `Prepare payment link for ${invoice.offer}`,
        summary: `$${(invoice.amountCents / 100).toFixed(2)} for ${invoice.customerId}`,
        explanation:
          "Approving records the configured Stripe payment link against this invoice so it can be sent by a human. This workspace never charges a card or collects payment details.",
        risk: "high",
        payload: { action: "record_payment_link", invoiceId: invoice.id, providerRef: (process.env.TAY_STRIPE_PAYMENT_LINK || "").slice(0, 200) },
        slides: [
          { title: "Payment handoff", caption: "Owner approval required", lines: [`Offer: ${invoice.offer}`, `Amount: $${(invoice.amountCents / 100).toFixed(2)}`, "Method: Stripe payment link"], tone: "neutral" },
          { title: "What stays untouched", caption: "No card data, no charge", lines: ["No card details are collected here", "No refund or transfer is issued", "Sending the link stays a human action"], tone: "remove" },
        ],
        requestedBy: user.id,
      });
      return json({ ok: true, business: businessState(db, project.id), invoice, approvalId: approval.id });
    }

    return json({ ok: false, error: "Unknown business action." }, 400);
  } catch (error) {
    return fail(error);
  }
}

