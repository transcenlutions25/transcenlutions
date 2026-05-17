export interface RevenueOffer {
  id: string;
  name: string;
  price: string;
  paymentLinkEnvKey: string;
  checkoutUrl: string;
  promise: string;
  outcome: string;
  delivery: string;
  bestFor: string;
  includes: string[];
  buyerIntake: string[];
  command: string;
}

export type PaymentMode = "checkout" | "invoice" | "setup_required";

export interface OfferPaymentState {
  mode: PaymentMode;
  title: string;
  description: string;
  href: string;
  label: string;
  external: boolean;
}

const legacyCheckoutUrl =
  process.env.NEXT_PUBLIC_TRANSCENLUTIONS_PAYMENT_URL ?? "";

export const revenueOffers: RevenueOffer[] = [
  {
    id: "starter-map",
    name: "Tay Command Starter Map",
    price: "$97",
    paymentLinkEnvKey: "NEXT_PUBLIC_STRIPE_STARTER_MAP_PAYMENT_LINK",
    checkoutUrl:
      process.env.NEXT_PUBLIC_STRIPE_STARTER_MAP_PAYMENT_LINK ??
      legacyCheckoutUrl,
    promise:
      "A focused passive-income command map with one offer, one workflow, and one next action.",
    outcome:
      "Buyer leaves with one clear offer, one practical execution workflow, and one governed next step.",
    delivery: "60-minute command session plus written starter map",
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
    checkoutUrl:
      process.env.NEXT_PUBLIC_STRIPE_OPERATOR_SPRINT_PAYMENT_LINK ?? "",
    promise:
      "A deeper build sprint for turning an idea into a visible business system foundation.",
    outcome:
      "Buyer leaves with a sellable offer direction, operating plan, and seven-day execution agenda.",
    delivery: "Strategy sprint with implementation map and follow-up agenda",
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
  "Checkout links must use the exact offer price, scope, and buyer expectation before they appear as live checkout.",
  "Manual invoice handoff is only enabled when a real contact email is configured.",
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
  if (isApprovedPaymentUrl(offer.checkoutUrl)) {
    return {
      mode: "checkout",
      title: "Checkout ready",
      description:
        "This offer opens an approved Stripe Payment Link in a separate checkout page.",
      href: offer.checkoutUrl.trim(),
      label: "Open checkout",
      external: true,
    };
  }

  const invoiceHref = buildInvoiceMailto(offer);

  if (invoiceHref) {
    return {
      mode: "invoice",
      title: "Invoice ready",
      description:
        "No checkout link is connected for this offer. Tay can open a real invoice email draft instead.",
      href: invoiceHref,
      label: "Draft invoice",
      external: false,
    };
  }

  return {
    mode: "setup_required",
    title: "Payment setup needed",
    description: `Add ${offer.paymentLinkEnvKey} or NEXT_PUBLIC_TRANSCENLUTIONS_CONTACT_EMAIL before taking payment for this offer.`,
    href: "",
    label: "Payment setup needed",
    external: false,
  };
}

export function isApprovedPaymentUrl(url: string) {
  const trimmed = url.trim();
  if (!trimmed) return false;

  try {
    const parsed = new URL(trimmed);
    return (
      parsed.protocol === "https:" && approvedPaymentHosts.has(parsed.hostname)
    );
  } catch {
    return false;
  }
}

export function buildInvoiceMailto(offer: RevenueOffer) {
  if (!contactEmail.trim()) return "";

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

  return `mailto:${contactEmail.trim()}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}
