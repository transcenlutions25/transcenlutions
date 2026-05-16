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
    input.includes("ship")
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
    return "Box 1 blocks payments, deleting data, real-world automation, and hidden background work.";
  }

  if (input.includes("external api") || input.includes("autonomous")) {
    return "This is marked for future approval because Box 1 does not execute external API calls or autonomous tasks.";
  }

  return "This demo action stays inside the local Box 1 loop.";
}

function createMessage(intent: TayIntent) {
  if (intent === "build_feature") {
    return "I detected a build request. As Transcenlutions’ CEO Operator + Orchestrator, I can turn this into a structured task inside Box 1.";
  }

  if (intent === "write_plan") {
    return "I detected a planning request. I can draft a focused plan without creating external work or expanding scope.";
  }

  if (intent === "record_note") {
    return "I detected a note request. I can log the note locally in this session.";
  }

  if (intent === "clarify_request") {
    return "I need a clearer request before I suggest an allowed Box 1 action.";
  }

  return "That request is blocked in Box 1. I will show the reason and log it instead of pretending to act.";
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
    return `Create a local task from: "${userText.trim()}".`;
  }

  if (intent === "write_plan") {
    return `Draft a structured plan from: "${userText.trim()}".`;
  }

  if (intent === "record_note") {
    return `Record this session note: "${userText.trim()}".`;
  }

  if (intent === "clarify_request") {
    return "Ask for a more specific build, plan, or note request.";
  }

  return "Do not execute. Explain the Box 1 boundary and record the blocked attempt.";
}

function createNextStep(intent: TayIntent) {
  if (intent === "build_feature") {
    return "Next step: execute the allowed action to create the Box 1 task result.";
  }

  if (intent === "write_plan") {
    return "Next step: execute the allowed action to draft the plan result.";
  }

  if (intent === "record_note") {
    return "Next step: execute the allowed action to add the note to the session.";
  }

  if (intent === "clarify_request") {
    return "Next step: ask for one clear outcome, such as a feature, plan, or note.";
  }

  return "Next step: choose a Box 1-safe request that does not require payments, deletion, real-world automation, or hidden work.";
}
