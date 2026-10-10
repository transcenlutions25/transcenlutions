import type { PermissionStatus, TayActionType } from "./types";

export type ComposerIntent = "send" | "queue" | "steer";

export type ComposerContext = {
  runtime: "web";
  actionBusy: boolean;
  response: { action: { type: TayActionType; permissionStatus: PermissionStatus } } | null;
  hasResult: boolean;
  queuedCount: number;
} | {
  runtime: "desktop";
  loaded: boolean;
  /** A bridge mutation is in flight, distinct from an active model objective. */
  busy: boolean;
  submitting: boolean;
  agentEnabled: boolean;
  hasActiveObjective: boolean;
  queuedCount: number;
  /** A selected dependency may already be complete; it still belongs to enqueue. */
  hasDependency?: boolean;
};

export type ComposerReasonCode =
  | "send_ready"
  | "queue_requested"
  | "work_running"
  | "proposal_pending"
  | "queue_pending"
  | "steer_ready"
  | "steer_unavailable"
  | "desktop_loading"
  | "desktop_busy"
  | "desktop_agent_unavailable"
  | "desktop_active"
  | "desktop_queue"
  | "desktop_dependency"
  | "desktop_ready";

export interface ComposerResolution {
  requestedIntent: ComposerIntent;
  effectiveIntent: ComposerIntent;
  buttonLabel: "Send" | "Queue" | "Steer";
  /** Routing availability only: the caller still checks draft text and hydration. */
  canSubmit: boolean;
  canSteer: boolean;
  reasonCode: ComposerReasonCode;
  reason: string;
}

/**
 * One routing decision for the composer copy and the submit handler.
 * This does not grant approval, execute work, or change either queue's behavior.
 * Desktop Send and Queue both use the existing enqueue operation; an active
 * objective/backlog changes the visible intent, while bridge busy blocks both.
 * Steer is never converted into a new request when its target is unavailable.
 */
export function resolveComposerIntent(
  chosenIntent: ComposerIntent,
  context: ComposerContext,
): ComposerResolution {
  const canSteer = context.runtime === "desktop"
    ? context.loaded && !context.busy && !context.submitting && context.agentEnabled && context.hasActiveObjective
    : Boolean(context.response) && !context.hasResult && !context.actionBusy;

  const resolution = (
    effectiveIntent: ComposerIntent,
    reasonCode: ComposerReasonCode,
    reason: string,
    canSubmit = true,
  ): ComposerResolution => ({
    requestedIntent: chosenIntent,
    effectiveIntent,
    buttonLabel: effectiveIntent === "steer" ? "Steer" : effectiveIntent === "queue" ? "Queue" : "Send",
    canSubmit,
    canSteer,
    reasonCode,
    reason,
  });

  if (context.runtime === "desktop") {
    const effectiveIntent = chosenIntent === "send" && (context.hasActiveObjective || context.queuedCount > 0 || context.hasDependency)
      ? "queue" : chosenIntent;
    if (!context.loaded) {
      return resolution(effectiveIntent, "desktop_loading", "Wait for the Mac conversation to load. Your draft stays here.", false);
    }
    if (context.busy || context.submitting) {
      return resolution(effectiveIntent, "desktop_busy", "Wait for the current Mac update to finish. Your draft stays here.", false);
    }
    if (!context.agentEnabled) {
      return resolution(effectiveIntent, "desktop_agent_unavailable", "Choose an enabled agent before submitting. Your draft stays here.", false);
    }
    if (chosenIntent === "steer") {
      return canSteer
        ? resolution("steer", "steer_ready", "Update the active objective after its current model response.")
        : resolution("steer", "steer_unavailable", "There is no active objective to steer. Choose Send or Queue for a new request.", false);
    }
    if (chosenIntent === "queue") {
      return resolution("queue", "queue_requested", "Add this objective to the Mac queue.");
    }
    if (context.hasDependency) {
      return resolution("queue", "desktop_dependency", "Send will queue with the selected Start after dependency.");
    }
    if (context.hasActiveObjective) {
      return resolution("queue", "desktop_active", "Send will queue while an objective is active on the Mac.");
    }
    if (context.queuedCount > 0) {
      return resolution("queue", "desktop_queue", "Send will queue behind earlier objectives in the Mac queue.");
    }
    return resolution("send", "desktop_ready", "Send this objective to the Mac queue.");
  }

  if (chosenIntent === "steer") {
    return canSteer
      ? resolution("steer", "steer_ready", "Revise the current proposal before execution. Approval rules still apply.")
      : resolution("steer", "steer_unavailable", context.actionBusy
        ? "Running work cannot be steered mid-action. Choose Queue for a new request."
        : "There is no unresolved proposal to steer. Choose Send or Queue for a new request.", false);
  }
  if (chosenIntent === "queue") {
    return resolution("queue", "queue_requested", "Add a separate objective. Open Queue to start it when you're ready.");
  }
  if (context.actionBusy) {
    return resolution("queue", "work_running", "Send will queue while work is running. Open Queue to start it later.");
  }
  const unresolvedAction = context.response && !context.hasResult
    && context.response.action.permissionStatus !== "blocked" && context.response.action.type !== "none";
  if (unresolvedAction) {
    return resolution("queue", "proposal_pending", "Send will queue while a proposed move needs review. Open Queue to start it later.");
  }
  if (context.queuedCount > 0) {
    return resolution("queue", "queue_pending", "Send will queue behind earlier objectives. Open Queue to start it later.");
  }
  return resolution("send", "send_ready", "Send a new request.");
}
