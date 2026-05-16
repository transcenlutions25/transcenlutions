import type {
  ActionResult,
  SessionLogEntry,
  SuggestedAction,
  TayResponse,
} from "./types";

export function executeSuggestedAction(response: TayResponse): ActionResult {
  const { action, intent } = response;

  if (action.permissionStatus === "blocked") {
    return {
      status: "failed",
      result: "Tay stopped this request for safety.",
      nextStep: response.nextStep,
    };
  }

  if (action.permissionStatus === "requires_approval") {
    return {
      status: "failed",
      result: "Tay paused this request because it needs approval first.",
      nextStep: response.nextStep,
    };
  }

  if (action.type === "create_task") {
    return {
      status: "completed",
      result:
        "Task created: define the passive-income outcome, name the business asset, and confirm the request reaches a visible result.",
      nextStep:
        "Next step: choose the smallest business asset Tay should structure next: offer, workflow, content engine, or operating task.",
    };
  }

  if (action.type === "draft_plan") {
    return {
      status: "completed",
      result:
        "Plan drafted: define the income goal, identify the asset, list the next action, confirm boundaries, then execute one visible step.",
      nextStep: "Next step: choose the first plan item to turn into a business task.",
    };
  }

  if (action.type === "log_note") {
    return {
      status: "completed",
      result: "Note saved in the current activity record.",
      nextStep: "Next step: add another note, plan, or passive-income build request.",
    };
  }

  return {
    status: "failed",
    result: `No executable action exists for ${intent}.`,
    nextStep: response.nextStep,
  };
}

export function createSessionLogEntry(
  response: TayResponse,
  detail: string,
): SessionLogEntry {
  return {
    id: `log-${Date.now()}-${response.intent}`,
    timestamp: new Date().toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    }),
    intent: response.intent,
    actionType: response.action.type,
    permissionStatus: response.action.permissionStatus,
    status: getLogStatus(response.action),
    detail,
  };
}

function getLogStatus(action: SuggestedAction): SessionLogEntry["status"] {
  if (action.permissionStatus === "blocked") return "blocked";
  if (action.type === "none") {
    return action.permissionStatus === "allowed"
      ? "needs_clarification"
      : "unsupported";
  }
  return "executed";
}
