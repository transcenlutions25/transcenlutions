import type { TayActionType, TayIntent, TayResponse } from "./types";
import { looksLikeBuyerReply } from "./buyer-replies";
import { looksLikeFounderFocusRequest } from "./founder-os";
import { createGovernedAction, hasBlockedGovernanceTerm } from "./governance";

const vagueTerms = ["help", "do it", "make it", "fix it", "start", "thing"];
const businessBuildTerms = [
  "business",
  "income",
  "passive income",
  "revenue",
  "offer",
  "funnel",
  "lead magnet",
  "digital product",
  "workflow",
  "operation",
  "automate",
  "automation",
  "lead",
  "leads",
];
const revenueTerms = [
  "sell",
  "sale",
  "revenue",
  "paid",
  "client",
  "buyer",
  "offer",
  "invoice",
  "checkout",
  "payment",
  "payments",
  "pricing",
  "purchase",
];

export function createTayResponse(userText: string): TayResponse {
  const normalized = userText.trim().toLowerCase();
  const intent = detectIntent(normalized);
  const actionType = mapIntentToAction(intent);
  const id = `tay-${Date.now()}`;

  return {
    id,
    userText,
    intent,
    message: createMessage(intent),
    action: createGovernedAction(
      intent,
      actionType,
      normalized,
      createActionTitle(intent),
      createActionSummary(intent, userText),
    ),
    nextStep: createNextStep(intent),
    shouldLogImmediately:
      intent === "clarify_request" || intent === "unsupported_request",
  };
}

export function detectIntent(input: string): TayIntent {
  if (!input || vagueTerms.includes(input)) {
    return "clarify_request";
  }

  if (hasBlockedGovernanceTerm(input)) {
    return "unsupported_request";
  }

  if (looksLikeBuyerReply(input)) {
    return "handle_buyer_reply";
  }

  if (looksLikeFounderFocusRequest(input)) {
    return "manage_focus";
  }

  if (
    input.includes("plan") ||
    input.includes("strategy") ||
    input.includes("outline") ||
    input.includes("roadmap")
  ) {
    return "write_plan";
  }

  if (
    input.includes("note") ||
    input.includes("record") ||
    input.includes("remember") ||
    input.includes("log")
  ) {
    return "record_note";
  }

  if (revenueTerms.some((term) => input.includes(term))) {
    return "sell_offer";
  }

  if (
    input.includes("build") ||
    input.includes("feature") ||
    input.includes("create") ||
    input.includes("ship") ||
    businessBuildTerms.some((term) => input.includes(term))
  ) {
    return "build_feature";
  }

  return "clarify_request";
}

function mapIntentToAction(intent: TayIntent): TayActionType {
  if (intent === "build_feature") return "create_task";
  if (intent === "sell_offer") return "prepare_offer";
  if (intent === "handle_buyer_reply") return "recommend_follow_up";
  if (intent === "manage_focus") return "route_focus";
  if (intent === "write_plan") return "draft_plan";
  if (intent === "record_note") return "log_note";
  return "none";
}

function createMessage(intent: TayIntent) {
  if (intent === "build_feature") {
    return "I see a build request. I can turn this into a focused business task for Transcenlutions, with passive income as the priority.";
  }

  if (intent === "sell_offer") {
    return "I see a revenue request. I can prepare a buyer-ready offer and route payment through an approved checkout or manual invoice handoff.";
  }

  if (intent === "handle_buyer_reply") {
    return "I see a buyer reply. I can read the signal, protect the sales boundary, and recommend the next response.";
  }

  if (intent === "manage_focus") {
    return "I see a founder focus request. I can protect the current box, route distractions, and prepare the next execution move.";
  }

  if (intent === "write_plan") {
    return "I see a planning request. I can draft a focused plan that protects the passive-income direction before any work begins.";
  }

  if (intent === "record_note") {
    return "I see a note request. I can save it in this visible activity record.";
  }

  if (intent === "clarify_request") {
    return "I need a clearer request before I suggest a next move.";
  }

  return "That request is blocked here. I will show the reason and record it instead of pretending to act.";
}

function createActionTitle(intent: TayIntent) {
  if (intent === "build_feature") return "Create a feature task";
  if (intent === "sell_offer") return "Prepare a revenue offer";
  if (intent === "handle_buyer_reply") return "Recommend buyer follow-up";
  if (intent === "manage_focus") return "Route founder focus";
  if (intent === "write_plan") return "Draft a plan";
  if (intent === "record_note") return "Log a note";
  if (intent === "clarify_request") return "Clarify the request";
  return "Blocked request";
}

function createActionSummary(intent: TayIntent, userText: string) {
  if (intent === "build_feature") {
    return `Create a focused passive-income task from: "${userText.trim()}".`;
  }

  if (intent === "sell_offer") {
    return `Prepare a paid offer and payment handoff from: "${userText.trim()}".`;
  }

  if (intent === "handle_buyer_reply") {
    return `Review this buyer reply and recommend the next response: "${userText.trim()}".`;
  }

  if (intent === "manage_focus") {
    return `Route this founder focus request through NOW / NEXT / LATER / PARKED: "${userText.trim()}".`;
  }

  if (intent === "write_plan") {
    return `Draft a structured business plan from: "${userText.trim()}".`;
  }

  if (intent === "record_note") {
    return `Record this session note: "${userText.trim()}".`;
  }

  if (intent === "clarify_request") {
    return "Ask for a more specific business build, plan, or note request.";
  }

  return "Do not proceed. Explain the boundary and record the stopped request.";
}

function createNextStep(intent: TayIntent) {
  if (intent === "build_feature") {
    return "Next step: confirm the move to create the task result and connect it to passive income.";
  }

  if (intent === "sell_offer") {
    return "Next step: send the offer to a real buyer through an approved checkout link or manual invoice.";
  }

  if (intent === "handle_buyer_reply") {
    return "Next step: execute the review so Tay can recommend whether to send details, qualify, pause, or stop.";
  }

  if (intent === "manage_focus") {
    return "Next step: execute the focus route, then continue Box 4 or park the distraction.";
  }

  if (intent === "write_plan") {
    return "Next step: confirm the move to draft the business plan result.";
  }

  if (intent === "record_note") {
    return "Next step: execute the allowed action to add the note to the session.";
  }

  if (intent === "clarify_request") {
    return "Next step: ask for one clear business outcome, such as an offer, workflow, plan, or note.";
  }

  return "Next step: choose a request that does not require deletion, outside automation, or hidden work.";
}
