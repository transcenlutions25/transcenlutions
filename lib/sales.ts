export interface SalesKit {
  offerId: string;
  title: string;
  buyerFit: string[];
  firstMessage: string;
  followUps: string[];
  disqualifiers: string[];
  command: string;
}

export const salesKits: SalesKit[] = [
  {
    offerId: "starter-map",
    title: "Starter Map Buyer Outreach",
    buyerFit: [
      "has a business idea but no clear first offer",
      "needs a simple passive-income path",
      "can act within the next week",
      "wants clarity more than a large build",
    ],
    firstMessage:
      "I am opening a few Tay Command Starter Map spots for founders who need one clear offer, one workflow, and one next action. If you want help turning your idea into a sellable first move, I can send the $97 details.",
    followUps: [
      "Would a simple offer map help you decide what to sell first?",
      "I can help you leave with one clear action instead of another loose idea.",
      "If now is not the moment, I can check back when you are ready to build.",
    ],
    disqualifiers: [
      "wants guaranteed income claims",
      "expects done-for-you automation in this starter offer",
      "will not share their buyer or business goal",
    ],
    command: "Prepare buyer outreach for the $97 Tay Command Starter Map offer",
  },
  {
    offerId: "operator-sprint",
    title: "Operator Sprint Buyer Outreach",
    buyerFit: [
      "has an existing idea, audience, or skill set",
      "needs offer positioning and a seven-day execution path",
      "can commit to a focused build sprint",
      "values strategic structure before automation",
    ],
    firstMessage:
      "I am taking a small number of Operator Build Sprint clients. It is a $497 strategy sprint to shape your offer, lead path, automation boundary, and seven-day execution agenda. If you want a focused business system instead of another scattered plan, I can send the details.",
    followUps: [
      "What would make a seven-day build sprint worth it for you?",
      "If the offer is already forming, this can help turn it into a working system.",
      "I can send the scope first so you can decide without pressure.",
    ],
    disqualifiers: [
      "wants a full agency build for sprint pricing",
      "needs payments or automations handled outside approved tools",
      "cannot name a target buyer or desired outcome",
    ],
    command: "Prepare buyer outreach for the $497 Operator Build Sprint offer",
  },
];

export const salesCarePoints = [
  "Do not promise guaranteed income or automatic results.",
  "Offer the next step clearly without pressure.",
  "Qualify fit before requesting payment.",
  "Keep every buyer reply visible in Tay before deciding the next move.",
];

export function findSalesKitForOffer(offerId: string) {
  return salesKits.find((kit) => kit.offerId === offerId) ?? salesKits[0];
}
