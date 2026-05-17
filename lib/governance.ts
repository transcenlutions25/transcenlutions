import type {
  GovernanceAuditStatus,
  GovernanceDecision,
  GovernanceDomain,
  GovernanceRiskTier,
  PermissionStatus,
  SuggestedAction,
  TayActionType,
  TayIntent,
} from "./types";

export interface ActionRegistryEntry {
  type: TayActionType;
  label: string;
  domain: GovernanceDomain;
  defaultPermission: PermissionStatus;
  defaultRiskTier: GovernanceRiskTier;
  defaultRiskScore: number;
  reason: string;
  examples: string[];
}

interface GovernanceRule {
  id: string;
  permissionStatus: PermissionStatus;
  domain: GovernanceDomain;
  riskTier: GovernanceRiskTier;
  riskScore: number;
  auditStatus: GovernanceAuditStatus;
  reason: string;
  terms: string[];
}

export const actionRegistry: Record<TayActionType, ActionRegistryEntry> = {
  create_task: {
    type: "create_task",
    label: "Create task",
    domain: "local_workspace",
    defaultPermission: "allowed",
    defaultRiskTier: "low",
    defaultRiskScore: 1,
    reason: "This creates a local task result inside the current workspace.",
    examples: ["Create a feature task", "Structure a business asset"],
  },
  prepare_offer: {
    type: "prepare_offer",
    label: "Prepare offer",
    domain: "revenue",
    defaultPermission: "allowed",
    defaultRiskTier: "medium",
    defaultRiskScore: 3,
    reason:
      "This prepares an offer and fulfillment handoff, but does not collect payment inside Tay.",
    examples: ["Prepare a paid offer", "Create buyer-ready scope"],
  },
  recommend_follow_up: {
    type: "recommend_follow_up",
    label: "Recommend follow-up",
    domain: "communication",
    defaultPermission: "allowed",
    defaultRiskTier: "medium",
    defaultRiskScore: 2,
    reason:
      "This reviews a buyer reply locally and recommends a response without sending it.",
    examples: ["Route a buyer reply", "Recommend the next sales response"],
  },
  route_focus: {
    type: "route_focus",
    label: "Route focus",
    domain: "local_workspace",
    defaultPermission: "allowed",
    defaultRiskTier: "low",
    defaultRiskScore: 1,
    reason:
      "This routes founder focus, backlog, review, and alignment work inside the local command room.",
    examples: ["Run daily priorities", "Park a distracting idea"],
  },
  draft_plan: {
    type: "draft_plan",
    label: "Draft plan",
    domain: "local_workspace",
    defaultPermission: "allowed",
    defaultRiskTier: "low",
    defaultRiskScore: 1,
    reason: "This drafts a local plan without outside effects.",
    examples: ["Draft a strategy", "Create a roadmap"],
  },
  log_note: {
    type: "log_note",
    label: "Save note",
    domain: "local_workspace",
    defaultPermission: "allowed",
    defaultRiskTier: "low",
    defaultRiskScore: 1,
    reason: "This records a visible session note only.",
    examples: ["Log a note", "Record a visible update"],
  },
  none: {
    type: "none",
    label: "No action",
    domain: "local_workspace",
    defaultPermission: "allowed",
    defaultRiskTier: "none",
    defaultRiskScore: 0,
    reason: "Tay needs a clearer request before choosing an action.",
    examples: ["Ask for more detail", "Pause for clarification"],
  },
};

export const governanceRules: GovernanceRule[] = [
  {
    id: "blocked_destructive_data",
    permissionStatus: "blocked",
    domain: "data_control",
    riskTier: "critical",
    riskScore: 10,
    auditStatus: "blocked",
    reason:
      "Tay cannot delete records, remove stored data, or destroy business information from this screen.",
    terms: ["delete", "deleting", "remove data", "wipe", "destroy data"],
  },
  {
    id: "blocked_direct_money_movement",
    permissionStatus: "blocked",
    domain: "payment",
    riskTier: "critical",
    riskScore: 10,
    auditStatus: "blocked",
    reason:
      "Tay cannot charge cards, collect card numbers, move wallet funds, withdraw money, or issue refunds directly.",
    terms: [
      "charge card",
      "charge cards",
      "charge buyer",
      "charge the buyer",
      "charge customer",
      "collect card",
      "card number",
      "wallet transfer",
      "withdraw",
      "refund",
      "take money",
    ],
  },
  {
    id: "blocked_hidden_automation",
    permissionStatus: "blocked",
    domain: "external_service",
    riskTier: "critical",
    riskScore: 10,
    auditStatus: "blocked",
    reason:
      "Tay cannot run hidden background work or real-world automation without visible approval and logs.",
    terms: [
      "real-world automation",
      "background automation",
      "hidden background",
      "silent automation",
      "without telling",
    ],
  },
  {
    id: "approval_external_service",
    permissionStatus: "requires_approval",
    domain: "external_service",
    riskTier: "high",
    riskScore: 7,
    auditStatus: "approval_required",
    reason:
      "Outside services, autonomous work, publishing, and sent communications need explicit approval first.",
    terms: [
      "external api",
      "connect api",
      "autonomous",
      "send email",
      "send buyer email",
      "publish",
      "post for me",
      "schedule",
    ],
  },
  {
    id: "approval_payment_handoff",
    permissionStatus: "requires_approval",
    domain: "payment",
    riskTier: "high",
    riskScore: 8,
    auditStatus: "approval_required",
    reason:
      "Checkout, invoices, Stripe links, and payment handoff require approval before Tay points a buyer to payment.",
    terms: ["payment", "checkout", "invoice", "stripe", "payment link"],
  },
];

export const governanceCarePoints = [
  "Local planning, notes, offer prep, and reply review can run inside Tay.",
  "External services, sent communications, and payment handoffs pause for approval.",
  "Deletion, direct money movement, hidden work, and unsafe automation are blocked.",
  "Every governance decision carries a rule, risk score, and audit status.",
];

export function evaluateGovernance(
  intent: TayIntent,
  actionType: TayActionType,
  input: string,
): GovernanceDecision {
  const normalized = input.trim().toLowerCase();

  if (intent === "unsupported_request") {
    const rule = matchRule(normalized, "blocked") ?? governanceRules[0];
    return toDecision(rule);
  }

  if (actionType === "none") {
    return {
      ruleId: "clarify_before_action",
      domain: "local_workspace",
      permissionStatus: "allowed",
      permissionReason: actionRegistry.none.reason,
      riskTier: "none",
      riskScore: 0,
      auditStatus: "no_action",
    };
  }

  const blockedRule = matchRule(normalized, "blocked");
  if (blockedRule) return toDecision(blockedRule);

  const approvalRule = matchRule(normalized, "requires_approval");
  if (approvalRule) return toDecision(approvalRule);

  const entry = actionRegistry[actionType];

  return {
    ruleId: `registry_${entry.type}`,
    domain: entry.domain,
    permissionStatus: entry.defaultPermission,
    permissionReason: entry.reason,
    riskTier: entry.defaultRiskTier,
    riskScore: entry.defaultRiskScore,
    auditStatus: entry.defaultPermission === "allowed" ? "ready" : "approval_required",
  };
}

export function hasBlockedGovernanceTerm(input: string) {
  const normalized = input.trim().toLowerCase();
  return governanceRules.some((rule) => {
    return (
      rule.permissionStatus === "blocked" &&
      rule.terms.some((term) => normalized.includes(term))
    );
  });
}

export function createGovernedAction(
  intent: TayIntent,
  actionType: TayActionType,
  input: string,
  title: string,
  summary: string,
): SuggestedAction {
  const governance = evaluateGovernance(intent, actionType, input);

  return {
    type: actionType,
    title,
    summary,
    permissionStatus: governance.permissionStatus,
    permissionReason: governance.permissionReason,
    governance,
  };
}

function matchRule(input: string, status: PermissionStatus) {
  return governanceRules.find((rule) => {
    return (
      rule.permissionStatus === status &&
      rule.terms.some((term) => input.includes(term))
    );
  });
}

function toDecision(rule: GovernanceRule): GovernanceDecision {
  return {
    ruleId: rule.id,
    domain: rule.domain,
    permissionStatus: rule.permissionStatus,
    permissionReason: rule.reason,
    riskTier: rule.riskTier,
    riskScore: rule.riskScore,
    auditStatus: rule.auditStatus,
  };
}
