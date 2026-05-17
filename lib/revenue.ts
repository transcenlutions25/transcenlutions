import { getInvoiceRecipientEmail } from "./company";

export interface RevenueOffer {
  id: string;
  name: string;
  price: string;
  paymentLinkEnvKey: string;
  priceIdEnvKey: string;
  checkoutUrl: string;
  priceId: string;
  buyerProblem: string;
  promise: string;
  outcome: string;
  scope: string[];
  delivery: string;
  timeline: string;
  refundSupportNote: string;
  bestFor: string;
  includes: string[];
  buyerIntake: string[];
  command: string;
}

export type PaymentMode =
  | "checkout"
  | "invoice"
  | "test_simulated"
  | "setup_required";

export interface OfferPaymentState {
  mode: PaymentMode;
  title: string;
  description: string;
  href: string;
  label: string;
  external: boolean;
  simulated: boolean;
  setupRequired: boolean;
}

export interface OfferPaymentContext {
  invoiceRecipientEmail: string;
  isTestMode: boolean;
}

const legacyCheckoutUrl =
  process.env.NEXT_PUBLIC_TRANSCENLUTIONS_PAYMENT_URL ?? "";

export const revenueOffers: RevenueOffer[] = [
  {
    id: "starter-map",
    name: "Tay Command Starter Map",
    price: "$97",
    paymentLinkEnvKey: "NEXT_PUBLIC_STRIPE_STARTER_MAP_PAYMENT_LINK",
    priceIdEnvKey: "NEXT_PUBLIC_STRIPE_STARTER_MAP_PRICE_ID",
    checkoutUrl:
      process.env.NEXT_PUBLIC_STRIPE_STARTER_MAP_PAYMENT_LINK ??
      legacyCheckoutUrl,
    priceId: process.env.NEXT_PUBLIC_STRIPE_STARTER_MAP_PRICE_ID ?? "",
    buyerProblem:
      "The buyer has an idea, skill, or goal but cannot see the first sellable offer clearly.",
    promise:
      "A focused passive-income command map with one offer, one workflow, and one next action.",
    outcome:
      "Buyer leaves with one clear offer, one practical execution workflow, and one governed next step.",
    scope: [
      "clarify the first offer",
      "name the buyer problem",
      "map one delivery workflow",
      "define the next action",
    ],
    delivery: "60-minute command session plus written starter map",
    timeline: "Delivered after one command session and one written follow-up artifact.",
    refundSupportNote:
      "Refund/support policy must be confirmed before payment; buyer questions route to the configured support inbox.",
    bestFor: "Founders who need the first sellable move made clear",
    includes: [
      "60-minute command session",
      "passive-income offer outline",
      "first execution workflow",
      "governed next-step list",
    ],
    buyerIntake: [
      "current business idea",
      "target buyer",
      "desired income goal",
      "main execution blocker",
    ],
    command: "Prepare a $97 Tay Command Starter Map offer",
  },
  {
    id: "operator-sprint",
    name: "Operator Build Sprint",
    price: "$497",
    paymentLinkEnvKey: "NEXT_PUBLIC_STRIPE_OPERATOR_SPRINT_PAYMENT_LINK",
    priceIdEnvKey: "NEXT_PUBLIC_STRIPE_OPERATOR_SPRINT_PRICE_ID",
    checkoutUrl:
      process.env.NEXT_PUBLIC_STRIPE_OPERATOR_SPRINT_PAYMENT_LINK ?? "",
    priceId: process.env.NEXT_PUBLIC_STRIPE_OPERATOR_SPRINT_PRICE_ID ?? "",
    buyerProblem:
      "The buyer has direction, skill, or audience signal but needs a focused system before execution scatters.",
    promise:
      "A deeper build sprint for turning an idea into a visible business system foundation.",
    outcome:
      "Buyer leaves with a sellable offer direction, operating plan, and seven-day execution agenda.",
    scope: [
      "shape the offer position",
      "map the lead or content path",
      "define automation boundaries",
      "prepare a seven-day execution agenda",
    ],
    delivery: "Strategy sprint with implementation map and follow-up agenda",
    timeline: "Delivered as a focused build sprint with a seven-day execution agenda.",
    refundSupportNote:
      "Refund/support policy must be confirmed before payment; buyer questions route to the configured support inbox.",
    bestFor: "Builders who need a real business system shaped quickly",
    includes: [
      "offer positioning",
      "content or lead-flow plan",
      "automation boundary map",
      "7-day execution agenda",
    ],
    buyerIntake: [
      "offer idea or skill set",
      "current audience or buyer source",
      "available tools",
      "deadline or urgency",
    ],
    command: "Prepare a $497 Operator Build Sprint offer",
  },
];

export const contactEmail =
  process.env.NEXT_PUBLIC_TRANSCENLUTIONS_CONTACT_EMAIL ?? "";

const approvedPaymentHosts = new Set([
  "buy.stripe.com",
  "checkout.stripe.com",
  "pay.stripe.com",
]);

export const paymentCarePoints = [
  "Transcenlutions does not collect or store card numbers inside this app.",
  "Checkout handoff remains approval-required under governance.",
  "Checkout links must use the exact offer price, scope, and buyer expectation before they appear as live checkout.",
  "Test mode must stay labeled as simulated and cannot claim money was collected.",
  "Manual invoice handoff is only enabled when a real company or billing email is configured.",
  "Every revenue action stays visible through Tay's activity record.",
];

export function findRevenueOfferForRequest(request: string) {
  const normalized = request.toLowerCase();

  return (
    revenueOffers.find((offer) => {
      return (
        normalized.includes(offer.id) ||
        normalized.includes(offer.name.toLowerCase()) ||
        normalized.includes(offer.price)
      );
    }) ?? revenueOffers[0]
  );
}

export function getOfferPaymentState(offer: RevenueOffer): OfferPaymentState {
  return createOfferPaymentState(offer, {
    invoiceRecipientEmail: getInvoiceRecipientEmail() || contactEmail.trim(),
    isTestMode: isRevenueTestMode(),
  });
}

export function createOfferPaymentState(
  offer: RevenueOffer,
  context: OfferPaymentContext,
): OfferPaymentState {
  if (context.isTestMode) {
    return {
      mode: "test_simulated",
      title: "Simulated test checkout",
      description:
        "Test mode is active. This state is simulated only; no real checkout opens and no money is collected.",
      href: "",
      label: "Simulated only",
      external: false,
      simulated: true,
      setupRequired: true,
    };
  }

  if (isApprovedPaymentUrl(offer.checkoutUrl)) {
    return {
      mode: "checkout",
      title: "Checkout ready",
      description:
        "This offer opens an approved Stripe Payment Link in a separate checkout page.",
      href: offer.checkoutUrl.trim(),
      label: "Open checkout",
      external: true,
      simulated: false,
      setupRequired: false,
    };
  }

  const invoiceHref = buildInvoiceMailto(offer, context.invoiceRecipientEmail);

  if (invoiceHref) {
    return {
      mode: "invoice",
      title: "Invoice ready",
      description:
        "No checkout link is connected for this offer. Tay can open a real invoice email draft instead.",
      href: invoiceHref,
      label: "Draft invoice",
      external: false,
      simulated: false,
      setupRequired: false,
    };
  }

  return {
    mode: "setup_required",
    title: "Payment setup needed",
    description: `Add ${offer.paymentLinkEnvKey} or NEXT_PUBLIC_TRANSCENLUTIONS_BILLING_EMAIL before taking payment for this offer.`,
    href: "",
    label: "Payment setup needed",
    external: false,
    simulated: false,
    setupRequired: true,
  };
}

export function isApprovedPaymentUrl(url: string) {
  const trimmed = url.trim();
  if (!trimmed) return false;
  if (looksLikePlaceholderValue(trimmed)) return false;

  try {
    const parsed = new URL(trimmed);
    return (
      parsed.protocol === "https:" && approvedPaymentHosts.has(parsed.hostname)
    );
  } catch {
    return false;
  }
}

export function isConfiguredStripePriceId(value: string) {
  const trimmed = value.trim();
  if (looksLikePlaceholderValue(trimmed)) return false;

  return /^price_[A-Za-z0-9]{8,}$/.test(trimmed);
}

export function buildInvoiceMailto(
  offer: RevenueOffer,
  recipientEmail = getInvoiceRecipientEmail() || contactEmail.trim(),
) {
  if (!recipientEmail) return "";

  const subject = `Invoice request: ${offer.name}`;
  const body = [
    `I want to purchase ${offer.name} (${offer.price}).`,
    "",
    "Buyer name:",
    "Best email:",
    "Business idea or goal:",
    "Main blocker:",
    "",
    "Please send the next payment step.",
  ].join("\n");

  return `mailto:${recipientEmail}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}

export function isRevenueTestMode() {
  return process.env.NEXT_PUBLIC_TAY_REVENUE_TEST_MODE === "true";
}

function looksLikePlaceholderValue(value: string) {
  const normalized = value.toLowerCase();

  return (
    normalized.includes("your-") ||
    normalized.includes("_here") ||
    normalized.includes("placeholder") ||
    normalized.includes("example") ||
    normalized.includes("starter_map") ||
    normalized.includes("operator_sprint")
  );
}
