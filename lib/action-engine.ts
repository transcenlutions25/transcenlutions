import type {
  ActionResult,
  ApprovalDecision,
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

  if (action.type === "prepare_offer") {
    return {
      status: "completed",
      result:
        "Revenue offer prepared: present the Tay Command Starter Map, state the price, confirm the buyer outcome, and send the approved checkout or manual invoice step.",
      nextStep:
        "Next step: send the offer to one buyer now and record the reply in Tay.",
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

export function resolveApproval(
  response: TayResponse,
  decision: ApprovalDecision,
): ActionResult {
  if (response.action.permissionStatus !== "requires_approval") {
    return executeSuggestedAction(response);
  }

  if (decision === "declined") {
    return {
      status: "failed",
      result:
        "Approval declined. Tay stopped the move, kept the boundary visible, and made no outside change.",
      nextStep:
        "Next step: choose a safer local task, plan, note, or revenue handoff Tay can prepare inside this workspace.",
    };
  }

  if (response.action.type === "prepare_offer") {
    return {
      status: "completed",
      result:
        "Approval recorded. Tay prepared the revenue handoff while keeping payment processing outside this app until an approved link or manual invoice is used.",
      nextStep:
        "Next step: send the approved checkout link or invoice email to one buyer and log the reply.",
    };
  }

  if (response.action.type === "create_task") {
    return {
      status: "completed",
      result:
        "Approval recorded. Tay prepared a controlled automation handoff and did not call any outside service from this screen.",
      nextStep:
        "Next step: connect the approved service later, or convert the request into a local task Tay can run now.",
    };
  }

  return {
    status: "completed",
    result:
      "Approval recorded. Tay converted the risky move into a visible local handoff.",
    nextStep:
      "Next step: review the handoff, then choose the smallest safe move Tay should execute next.",
  };
}

export function createSessionLogEntry(
  response: TayResponse,
  detail: string,
  status?: SessionLogEntry["status"],
): SessionLogEntry {
  return {
    id: `log-${Date.now()}-${Math.random().toString(36).slice(2, 8)}-${response.intent}`,
    timestamp: new Date().toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    }),
    intent: response.intent,
    actionType: response.action.type,
    permissionStatus: response.action.permissionStatus,
    status: status ?? getLogStatus(response.action),
    detail,
  };
}

function getLogStatus(action: SuggestedAction): SessionLogEntry["status"] {
  if (action.permissionStatus === "blocked") return "blocked";
  if (action.permissionStatus === "requires_approval") {
    return "approval_required";
  }
  if (action.type === "none") {
    return action.permissionStatus === "allowed"
      ? "needs_clarification"
      : "unsupported";
  }
  return "executed";
}
