/**
 * Product Foundry provider-neutral contract and safe connector scaffold.
 *
 * Deliberately not a live service: this repository still lacks a verified
 * server identity, authenticated provider vault, and commerce release gate.
 * Server implementations must be installed behind those boundaries rather
 * than accepting authority from a browser boolean or generated prompt.
 */
import type { FoundryFulfillment, FoundryLineId } from "./product-foundry";

export type SupplierCapability =
  | "catalog" | "quote" | "sample" | "artwork-upload"
  | "product-draft" | "publish-listing" | "paid-order"
  | "tracking" | "refund-support" | "webhook";

export type FoundryWorkflowStage =
  | "concept" | "demand-evidence" | "supplier-shortlist"
  | "quote-verification" | "sample-review" | "compliance-review"
  | "listing-draft" | "owner-approval" | "publish"
  | "payment-verified" | "fulfillment" | "delivery-verified"
  | "buyer-support" | "reconciliation";

export type FoundryActionStatus =
  | "planned" | "needs_provider" | "needs_verification"
  | "needs_approval" | "ready" | "completed" | "blocked";

export interface FoundryStep {
  stage: FoundryWorkflowStage;
  status: FoundryActionStatus;
  reason: string;
}

export interface FoundrySupplierOffer {
  supplierId: string;
  supplierSku: string;
  businessLine: FoundryLineId;
  fulfillment: FoundryFulfillment;
  destinationCountry: string;
  currency: string;
  productionCostMinorUnits: number | null;
  shippingCostMinorUnits: number | null;
  fulfillmentDays: { min: number; max: number } | null;
  minimumQuantity: number | null;
  quoteId: string | null;
  quoteValidUntil: string | null;
  sourceUrl: string | null;
  checkedAt: string | null;
}

export interface FoundryOrderDraft {
  externalProductId: string;
  businessLine: FoundryLineId;
  checkoutPaymentId: string;
  supplierId: string;
  customerCountry: string;
  quoteId: string;
  // Only opaque references. Do not persist or log buyer addresses or payment details here.
  privateShippingAddressRef: string;
  clientIdempotencyKey: string;
}

export interface FoundryFulfillmentStatus {
  supplierOrderId: string;
  state: "prepared" | "submitted" | "processing" | "shipped" | "delivered" | "failed" | "cancelled";
  customerVisibleTrackingUrl?: string;
  lastProviderUpdate: string;
}

/** Contract: implement on an authenticated server, never inside a browser bundle. */
export interface FoundrySupplierAdapter {
  id: string;
  capabilities: readonly SupplierCapability[];
  connectionState(): Promise<"connected" | "unavailable">;
  getQuote(productId: string, destinationCountry: string): Promise<FoundrySupplierOffer>;
  prepareSample(productId: string): Promise<{ reference: string }>;
  prepareListing(productId: string): Promise<{ draftId: string }>;
  // These mutations must perform their own authoritative server checks:
  // owner identity and explicit grant, current supplier compliance, signed paid event,
  // customer privacy, idempotency, status recording and maximum permitted spend.
  submitVerifiedOrder(order: FoundryOrderDraft): Promise<{ supplierOrderId: string }>;
  getFulfillmentStatus(supplierOrderId: string): Promise<FoundryFulfillmentStatus>;
}

/**
 * In this preview build, every supplier is unconnected. This class never reaches
 * networks, charges money, creates supplier orders or manufactures goods.
 */
export class UnconnectedFoundrySupplier implements FoundrySupplierAdapter {
  readonly capabilities: readonly SupplierCapability[] = [];
  constructor(public readonly id: string) {}
  async connectionState(): Promise<"unavailable"> { return "unavailable"; }
  private unavailable(): never {
    throw new Error(`Foundry provider ${this.id} is not connected. No external action was executed.`);
  }
  async getQuote(_productId: string, _destinationCountry: string): Promise<FoundrySupplierOffer> { return this.unavailable(); }
  async prepareSample(_productId: string): Promise<{ reference: string }> { return this.unavailable(); }
  async prepareListing(_productId: string): Promise<{ draftId: string }> { return this.unavailable(); }
  async submitVerifiedOrder(_order: FoundryOrderDraft): Promise<{ supplierOrderId: string }> { return this.unavailable(); }
  async getFulfillmentStatus(_supplierOrderId: string): Promise<FoundryFulfillmentStatus> { return this.unavailable(); }
}

export const foundryWorkflow: readonly FoundryStep[] = [
  { stage: "concept", status: "ready", reason: "Original product concepts and governed prompt drafts can be created locally." },
  { stage: "demand-evidence", status: "needs_verification", reason: "Research actual buyer intent, comparable offers and target market." },
  { stage: "supplier-shortlist", status: "needs_provider", reason: "Select and validate suppliers for each regulated category." },
  { stage: "quote-verification", status: "needs_provider", reason: "Get destination-specific total cost and lead time from an authenticated supplier." },
  { stage: "sample-review", status: "needs_provider", reason: "Verify material, artwork, print or manufacturing quality before release." },
  { stage: "compliance-review", status: "needs_verification", reason: "Review the product-specific legal, IP, labeling and safety evidence." },
  { stage: "listing-draft", status: "ready", reason: "Private editorial drafts only; no public product listing or availability promise." },
  { stage: "owner-approval", status: "needs_approval", reason: "Owner must explicitly approve price, commitments, spend and public release." },
  { stage: "publish", status: "blocked", reason: "Production authentication, payment/storefront and supplier readiness not verified." },
  { stage: "payment-verified", status: "blocked", reason: "No verified signed payment event or linked commercial order." },
  { stage: "fulfillment", status: "blocked", reason: "No verified paid order, authorized provider credentials or idempotent worker." },
  { stage: "delivery-verified", status: "blocked", reason: "No supplier shipment evidence." },
  { stage: "buyer-support", status: "needs_verification", reason: "Review company support, exchanges, returns and fulfillment policies." },
  { stage: "reconciliation", status: "blocked", reason: "Requires actual sale, fees, supplier cost and payout evidence." },
];
