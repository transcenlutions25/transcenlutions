import type {
  ExecutionStatus,
  GovernanceAuditStatus,
  GovernanceRiskTier,
  PermissionStatus,
  SessionLogEntry,
  TayActionType,
  TayIntent,
} from "./types";

export const intentLabels: Record<TayIntent, string> = {
  build_feature: "Feature request",
  sell_offer: "Revenue request",
  handle_buyer_reply: "Buyer reply",
  manage_focus: "Founder focus",
  prepare_launch: "Launch readiness",
  write_plan: "Planning request",
  record_note: "Session note",
  clarify_request: "Needs more detail",
  unsupported_request: "Protected request",
};

export const actionLabels: Record<TayActionType, string> = {
  create_task: "Create task",
  prepare_offer: "Prepare offer",
  recommend_follow_up: "Recommend follow-up",
  route_focus: "Route focus",
  route_launch_readiness: "Route launch readiness",
  draft_plan: "Draft plan",
  log_note: "Save note",
  none: "No action",
};

export const permissionLabels: Record<PermissionStatus, string> = {
  allowed: "Ready",
  requires_approval: "Needs approval",
  blocked: "Blocked",
};

export const executionLabels: Record<ExecutionStatus, string> = {
  idle: "Ready",
  running: "Working",
  completed: "Complete",
  failed: "Stopped",
};

export const riskTierLabels: Record<GovernanceRiskTier, string> = {
  none: "No risk",
  low: "Low risk",
  medium: "Medium risk",
  high: "High risk",
  critical: "Critical risk",
};

export const auditStatusLabels: Record<GovernanceAuditStatus, string> = {
  ready: "Ready",
  approval_required: "Approval needed",
  blocked: "Blocked",
  no_action: "No action",
};

export const logStatusLabels: Record<SessionLogEntry["status"], string> = {
  detected: "Reviewed",
  approval_required: "Approval needed",
  approved: "Approved",
  declined: "Declined",
  executed: "Completed",
  blocked: "Blocked",
  needs_clarification: "Needs detail",
  unsupported: "Stopped",
};
