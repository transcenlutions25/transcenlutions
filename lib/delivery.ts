export interface DeliveryKit {
  offerId: string;
  title: string;
  deliveryPromise: string;
  phases: string[];
  artifacts: string[];
  qualityStandard: string;
  followUpPrompt: string;
  command: string;
}

export const deliveryKits: DeliveryKit[] = [
  {
    offerId: "starter-map",
    title: "Starter Map Delivery Kit",
    deliveryPromise:
      "Turn one business idea into a clear passive-income offer, first workflow, and next action.",
    phases: [
      "Confirm buyer goal and current blocker",
      "Name the first sellable outcome",
      "Map the smallest delivery workflow",
      "Close with one action the buyer can take within 24 hours",
    ],
    artifacts: [
      "one-page offer map",
      "buyer outcome statement",
      "first workflow checklist",
      "governed next-step list",
    ],
    qualityStandard:
      "The buyer should leave knowing exactly what they sell, who it helps, why it matters, and what to do next.",
    followUpPrompt:
      "What part of the Starter Map did you execute first, and what blocked momentum?",
    command: "Prepare a $97 Tay Command Starter Map offer delivery checklist",
  },
  {
    offerId: "operator-sprint",
    title: "Operator Sprint Delivery Kit",
    deliveryPromise:
      "Shape a business idea into a visible system foundation with offer direction, lead path, and seven-day execution agenda.",
    phases: [
      "Clarify offer, buyer, and current assets",
      "Choose the strongest first lead or content path",
      "Map the automation boundary before any tooling",
      "Build a seven-day execution agenda with one visible daily output",
    ],
    artifacts: [
      "offer positioning brief",
      "lead-flow or content plan",
      "automation boundary map",
      "seven-day execution agenda",
    ],
    qualityStandard:
      "The buyer should leave with a focused system they can run immediately without needing another strategy reset.",
    followUpPrompt:
      "Which day-one output shipped, and what should Tay help tighten next?",
    command: "Prepare a $497 Operator Build Sprint offer delivery checklist",
  },
];

export const fulfillmentCarePoints = [
  "Every paid offer must have a clear buyer outcome before payment is requested.",
  "Every session closes with a visible artifact the buyer can use.",
  "Tay should prepare the work, but the operator stays responsible for quality.",
  "Follow-up should ask what moved, what blocked, and what needs tightening next.",
];

export function findDeliveryKitForOffer(offerId: string) {
  return deliveryKits.find((kit) => kit.offerId === offerId) ?? deliveryKits[0];
}
