import type { TayActionType, TayIntent, TayResponse } from "./types";

const blockedTerms = [
  "payment",
  "payments",
  "charge",
  "checkout",
  "delete",
  "deleting",
  "remove data",
  "real-world automation",
  "background automation",
  "hidden background",
];

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
    action: {
      type: actionType,
      title: createActionTitle(intent),
      summary: createActionSummary(intent, userText),
      permissionStatus: getPermissionStatus(intent, normalized),
      permissionReason: getPermissionReason(intent, normalized),
    },
    nextStep: createNextStep(intent),
    shouldLogImmediately:
      intent === "clarify_request" || intent === "unsupported_request",
  };
}

export function detectIntent(input: string): TayIntent {
  if (!input || vagueTerms.includes(input)) {
    return "clarify_request";
  }

  if (blockedTerms.some((term) => input.includes(term))) {
    return "unsupported_request";
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
  if (intent === "write_plan") return "draft_plan";
  if (intent === "record_note") return "log_note";
  return "none";
}

function getPermissionStatus(
  intent: TayIntent,
  input: string,
): TayResponse["action"]["permissionStatus"] {
  if (intent === "unsupported_request") return "blocked";
  if (input.includes("external api") || input.includes("autonomous")) {
    return "requires_approval";
  }
  return "allowed";
}

function getPermissionReason(intent: TayIntent, input: string) {
  if (intent === "unsupported_request") {
    return "Tay cannot process payments, delete records, or run background work from this screen.";
  }

  if (input.includes("external api") || input.includes("autonomous")) {
    return "This needs approval before Tay connects to outside services or works on its own.";
  }

  return "This move stays inside the current Transcenlutions workspace.";
}

function createMessage(intent: TayIntent) {
  if (intent === "build_feature") {
    return "I see a build request. I can turn this into a focused business task for Transcenlutions, with passive income as the priority.";
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
  if (intent === "write_plan") return "Draft a plan";
  if (intent === "record_note") return "Log a note";
  if (intent === "clarify_request") return "Clarify the request";
  return "Blocked request";
}

function createActionSummary(intent: TayIntent, userText: string) {
  if (intent === "build_feature") {
    return `Create a focused passive-income task from: "${userText.trim()}".`;
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

  if (intent === "write_plan") {
    return "Next step: confirm the move to draft the business plan result.";
  }

  if (intent === "record_note") {
    return "Next step: execute the allowed action to add the note to the session.";
  }

  if (intent === "clarify_request") {
    return "Next step: ask for one clear business outcome, such as an offer, workflow, plan, or note.";
  }

  return "Next step: choose a request that does not require payments, deletion, outside automation, or hidden work.";
}
