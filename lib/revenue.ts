export interface RevenueOffer {
  id: string;
  name: string;
  price: string;
  promise: string;
  includes: string[];
  command: string;
}

export const revenueOffers: RevenueOffer[] = [
  {
    id: "starter-map",
    name: "Tay Command Starter Map",
    price: "$97",
    promise:
      "A focused passive-income command map with one offer, one workflow, and one next action.",
    includes: [
      "60-minute command session",
      "passive-income offer outline",
      "first execution workflow",
      "governed next-step list",
    ],
    command: "Prepare a $97 Tay Command Starter Map offer",
  },
  {
    id: "operator-sprint",
    name: "Operator Build Sprint",
    price: "$497",
    promise:
      "A deeper build sprint for turning an idea into a visible business system foundation.",
    includes: [
      "offer positioning",
      "content or lead-flow plan",
      "automation boundary map",
      "7-day execution agenda",
    ],
    command: "Prepare a $497 Operator Build Sprint offer",
  },
];

export const checkoutUrl =
  process.env.NEXT_PUBLIC_TRANSCENLUTIONS_PAYMENT_URL ?? "";

export const contactEmail =
  process.env.NEXT_PUBLIC_TRANSCENLUTIONS_CONTACT_EMAIL ?? "";

export function buildInvoiceMailto(offer: RevenueOffer) {
  const subject = `Invoice request: ${offer.name}`;
  const body = [
    `I want to purchase ${offer.name} (${offer.price}).`,
    "",
    "Buyer name:",
    "Best email:",
    "Business idea or goal:",
    "",
    "Please send the next payment step.",
  ].join("\n");

  return `mailto:${contactEmail}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}
