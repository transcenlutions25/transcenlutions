export type TayIntent =
  | "build_feature"
  | "write_plan"
  | "record_note"
  | "clarify_request"
  | "unsupported_request";

export type TayActionType = "create_task" | "draft_plan" | "log_note" | "none";

export type PermissionStatus = "allowed" | "requires_approval" | "blocked";

export type ExecutionStatus = "idle" | "running" | "completed" | "failed";

export interface SuggestedAction {
  type: TayActionType;
  title: string;
  summary: string;
  permissionStatus: PermissionStatus;
  permissionReason: string;
}

export interface TayResponse {
  id: string;
  userText: string;
  intent: TayIntent;
  message: string;
  action: SuggestedAction;
  nextStep: string;
  shouldLogImmediately: boolean;
}

export interface ActionResult {
  status: ExecutionStatus;
  result: string;
  nextStep: string;
}

export interface SessionLogEntry {
  id: string;
  timestamp: string;
  intent: TayIntent;
  actionType: TayActionType;
  permissionStatus: PermissionStatus;
  status: "detected" | "executed" | "blocked" | "needs_clarification" | "unsupported";
  detail: string;
}
