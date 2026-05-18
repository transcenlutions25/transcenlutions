export type TayIntent =
  | "build_feature"
  | "sell_offer"
  | "handle_buyer_reply"
  | "manage_focus"
  | "prepare_launch"
  | "prepare_alpha"
  | "write_plan"
  | "record_note"
  | "clarify_request"
  | "unsupported_request";

export type TayActionType =
  | "create_task"
  | "prepare_offer"
  | "recommend_follow_up"
  | "route_focus"
  | "route_launch_readiness"
  | "route_private_alpha"
  | "draft_plan"
  | "log_note"
  | "none";

export type PermissionStatus = "allowed" | "requires_approval" | "blocked";

export type ExecutionStatus = "idle" | "running" | "completed" | "failed";

export type ApprovalDecision = "approved" | "declined";

export type GovernanceRiskTier = "none" | "low" | "medium" | "high" | "critical";

export type GovernanceDomain =
  | "local_workspace"
  | "revenue"
  | "communication"
  | "external_service"
  | "payment"
  | "data_control";

export type GovernanceAuditStatus =
  | "ready"
  | "approval_required"
  | "blocked"
  | "no_action";

export interface GovernanceDecision {
  ruleId: string;
  domain: GovernanceDomain;
  permissionStatus: PermissionStatus;
  permissionReason: string;
  riskTier: GovernanceRiskTier;
  riskScore: number;
  auditStatus: GovernanceAuditStatus;
}

export interface SuggestedAction {
  type: TayActionType;
  title: string;
  summary: string;
  permissionStatus: PermissionStatus;
  permissionReason: string;
  governance: GovernanceDecision;
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
  artifact?: ActionArtifact;
  handoff?: ActionHandoff;
}

export interface ActionHandoff {
  title: string;
  description: string;
  href: string;
  label: string;
  external: boolean;
  simulated: boolean;
}

export interface ActionArtifact {
  title: string;
  subtitle: string;
  sections: ActionArtifactSection[];
  careNote: string;
}

export interface ActionArtifactSection {
  heading: string;
  items: string[];
}

export interface SessionLogEntry {
  id: string;
  timestamp: string;
  intent: TayIntent;
  actionType: TayActionType;
  permissionStatus: PermissionStatus;
  governanceRuleId: string;
  riskTier: GovernanceRiskTier;
  riskScore: number;
  auditStatus: GovernanceAuditStatus;
  status:
    | "detected"
    | "approval_required"
    | "approved"
    | "declined"
    | "executed"
    | "blocked"
    | "needs_clarification"
    | "unsupported";
  detail: string;
}
