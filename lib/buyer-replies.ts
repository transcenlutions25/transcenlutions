export type BuyerReplySignal =
  | "ready_for_details"
  | "needs_fit_check"
  | "price_objection"
  | "not_now"
  | "stop_sale";

export interface BuyerReplyGuidance {
  signal: BuyerReplySignal;
  title: string;
  summary: string;
  suggestedResponse: string;
  nextStep: string;
  outcome: "continue" | "pause" | "stop";
}

export const buyerReplyExamples = [
  {
    label: "Interested buyer",
    prompt: "Buyer replied: yes, send me the details",
  },
  {
    label: "Budget concern",
    prompt: "Buyer replied: I like it, but the price feels high right now",
  },
  {
    label: "Boundary check",
    prompt: "Buyer replied: can you guarantee I will make money?",
  },
];

export const buyerReplyCarePoints = [
  "Never pressure a buyer after hesitation.",
  "Never claim guaranteed income.",
  "Ask one clear fit question before payment when the need is unclear.",
  "Keep the reply and next move visible in Tay.",
];

const buyerReplyTerms = [
  "buyer replied",
  "buyer said",
  "client replied",
  "client said",
  "customer replied",
  "customer said",
  "lead replied",
  "lead said",
  "prospect replied",
  "prospect said",
  "reply:",
];

const readyTerms = [
  "yes",
  "send details",
  "send me the details",
  "interested",
  "tell me more",
  "how do i pay",
  "where do i pay",
  "sounds good",
  "i want this",
];

const priceTerms = [
  "too much",
  "expensive",
  "price feels high",
  "costs too much",
  "can't afford",
  "cannot afford",
  "budget",
  "cheaper",
  "discount",
];

const notNowTerms = [
  "not now",
  "later",
  "busy",
  "not ready",
  "maybe next week",
  "maybe later",
  "circle back",
  "check back",
];

const stopTerms = [
  "guarantee",
  "guaranteed",
  "promise i will make money",
  "promise income",
  "automatic results",
  "do everything for me",
  "free work",
  "full agency build",
];

export function looksLikeBuyerReply(input: string) {
  return buyerReplyTerms.some((term) => input.includes(term));
}

export function analyzeBuyerReply(rawText: string): BuyerReplyGuidance {
  const input = rawText.toLowerCase();

  if (includesAny(input, stopTerms)) {
    return {
      signal: "stop_sale",
      title: "No-sale boundary",
      summary:
        "The reply is asking for guaranteed results, free labor, or a scope that does not fit the current offer.",
      suggestedResponse:
        "I cannot promise guaranteed income or take on that scope inside this offer. If you want a clear, honest next step, I can help define the smallest realistic move.",
      nextStep:
        "Next step: stop the sale, log the boundary, and only continue if the buyer accepts honest scope and realistic outcomes.",
      outcome: "stop",
    };
  }

  if (includesAny(input, priceTerms)) {
    return {
      signal: "price_objection",
      title: "Price concern",
      summary:
        "The buyer is interested enough to respond, but price or timing may be creating friction.",
      suggestedResponse:
        "That makes sense. Before I point you to the wrong option, what outcome would make this worth it for you right now?",
      nextStep:
        "Next step: ask the fit question, then either keep the current offer, suggest the starter option, or pause without pressure.",
      outcome: "pause",
    };
  }

  if (includesAny(input, notNowTerms)) {
    return {
      signal: "not_now",
      title: "Not ready yet",
      summary:
        "The buyer is not rejecting the business outright, but this is not the moment to push for payment.",
      suggestedResponse:
        "No pressure. I can check back when you are ready to turn the idea into one clear next move.",
      nextStep:
        "Next step: pause the sale, record the timing, and follow up only if the buyer welcomes it.",
      outcome: "pause",
    };
  }

  if (includesAny(input, readyTerms)) {
    return {
      signal: "ready_for_details",
      title: "Ready for details",
      summary:
        "The buyer is open to hearing the offer details. Keep the response simple and tied to the actual deliverable.",
      suggestedResponse:
        "Perfect. I will send the scope, price, delivery path, and what I need from you to make the first move useful.",
      nextStep:
        "Next step: send the approved offer details, use payment only after fit is clear, then log the buyer's answer.",
      outcome: "continue",
    };
  }

  return {
    signal: "needs_fit_check",
    title: "Needs one fit check",
    summary:
      "The reply does not give enough signal to request payment yet. Tay should qualify the need before the offer moves forward.",
    suggestedResponse:
      "What would you want this to help you decide or build first?",
    nextStep:
      "Next step: ask one qualifying question, then log the answer before sending payment details.",
    outcome: "pause",
  };
}

function includesAny(input: string, terms: string[]) {
  return terms.some((term) => input.includes(term));
}
