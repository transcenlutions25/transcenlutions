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
      result: "Execution blocked by Box 1 governance.",
      nextStep: response.nextStep,
    };
  }

  if (action.permissionStatus === "requires_approval") {
    return {
      status: "failed",
      result: "Execution paused because this future action requires approval.",
      nextStep: response.nextStep,
    };
  }

  if (action.type === "create_task") {
    return {
      status: "completed",
      result:
        "Task created: define the first Tay feature, keep scope local, and verify the full request-to-log loop.",
      nextStep:
        "Next step: decide the smallest feature outcome Tay should structure after Box 1.",
    };
  }

  if (action.type === "draft_plan") {
    return {
      status: "completed",
      result:
        "Plan drafted: define the goal, list the next action, confirm boundaries, then execute one visible step.",
      nextStep: "Next step: choose the first plan item to turn into a local task.",
    };
  }

  if (action.type === "log_note") {
    return {
      status: "completed",
      result: "Note logged in the current Box 1 session.",
      nextStep: "Next step: add another note, plan, or build request.",
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
