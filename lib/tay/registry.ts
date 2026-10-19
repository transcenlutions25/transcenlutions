/**
 * Server-authoritative agent roster, skill tree and authority tree.
 *
 * The canonical roster and boundaries come from the repository's recovered
 * Agent Foundation contract (`lib/agent-foundation.ts`, `docs/agent-authority-boundaries.md`).
 * The client may select an agent, but only this module decides whether an
 * action is allowed, whether it needs approval, or whether it stays blocked.
 */
import { getDatabase } from "./db";
import { parseJson } from "./audit";
import type { AgentNode, AuthorityNode, AuthorityTree, SkillNode } from "./types";

export type AgentAction =
  | "read_context"
  | "plan"
  | "draft_content"
  | "edit_project_file"
  | "run_task"
  | "prepare_offer"
  | "recommend_follow_up"
  | "route_focus"
  | "route_launch_readiness"
  | "manage_business_records"
  | "log_note"
  | "external_commitment"
  | "payment"
  | "send_communication"
  | "hire_or_fire_human"
  | "sensitive_content"
  | "change_system_settings";

const ACTIONS: AgentAction[] = [
  "read_context",
  "plan",
  "draft_content",
  "edit_project_file",
  "run_task",
  "prepare_offer",
  "recommend_follow_up",
  "route_focus",
  "route_launch_readiness",
  "manage_business_records",
  "log_note",
  "external_commitment",
  "payment",
  "send_communication",
  "hire_or_fire_human",
  "sensitive_content",
  "change_system_settings",
];

/** Actions that always pause for a decision, even when the agent has the skill. */
const APPROVAL_ACTIONS = new Set<AgentAction>([
  "external_commitment",
  "payment",
  "send_communication",
  "hire_or_fire_human",
  "sensitive_content",
  "change_system_settings",
]);

/** Actions no agent may perform from this workspace, at any approval state. */
const BLOCKED_ACTIONS = new Set<AgentAction>([
  "hire_or_fire_human",
  "sensitive_content",
  "change_system_settings",
]);

export const canonicalAgents: AgentNode[] = [
  {
    id: "founder",
    name: "Founding owner",
    role: "Sole system owner. Sets company-wide rules, grants scoped administration, and approves consequential change.",
    authority: "founding_owner",
    parentId: null,
    status: "active",
    allowedActions: ["change_system_settings", "external_commitment", "payment", "send_communication"],
    approvalRequiredFor: ["external_commitment", "payment", "send_communication"],
    delegatesTo: ["tay"],
    source: "canon",
  },
  {
    id: "tay",
    name: "Tay",
    role: "Executive orchestrator and primary relationship agent. Runs the conversation and delegates to specialists.",
    authority: "orchestrator",
    parentId: "founder",
    status: "active",
    allowedActions: [
      "read_context",
      "plan",
      "draft_content",
      "edit_project_file",
      "run_task",
      "prepare_offer",
      "recommend_follow_up",
      "route_focus",
      "route_launch_readiness",
      "manage_business_records",
      "log_note",
      "external_commitment",
      "payment",
      "send_communication",
    ],
    approvalRequiredFor: ["external_commitment", "payment", "send_communication"],
    delegatesTo: ["dawn", "kj", "rory"],
    source: "canon",
  },
  {
    id: "dawn",
    name: "Dawn",
    role: "Creator, marketing and audience growth specialist.",
    authority: "specialist",
    parentId: "tay",
    status: "active",
    allowedActions: ["read_context", "plan", "draft_content", "prepare_offer", "recommend_follow_up", "edit_project_file"],
    approvalRequiredFor: ["prepare_offer"],
    delegatesTo: [],
    source: "canon",
  },
  {
    id: "kj",
    name: "KJ",
    role: "Forge Master. Leads build, systems and Ascended Forge execution.",
    authority: "specialist",
    parentId: "tay",
    status: "active",
    allowedActions: ["read_context", "plan", "draft_content", "run_task", "edit_project_file"],
    approvalRequiredFor: [],
    delegatesTo: [],
    source: "canon",
  },
  {
    id: "rory",
    name: "Rory",
    role: "Family-side learning guide. Restricted until parent controls are implemented.",
    authority: "child_safe",
    parentId: "tay",
    status: "active",
    allowedActions: ["read_context", "plan", "draft_content", "log_note"],
    approvalRequiredFor: [],
    delegatesTo: [],
    source: "canon",
  },
];

interface CustomAgentRow {
  id: string;
  name: string;
  purpose: string;
  authority: string;
  status: string;
  allowed_actions: string;
  approval_required_for: string;
  picture: string | null;
  voice: string | null;
}

/** Owner-created admin agents are persisted, never trusted from the client. */
export function listAgents(): AgentNode[] {
  const rows = getDatabase().all<CustomAgentRow>("SELECT * FROM custom_agents ORDER BY created_at ASC");
  const custom: AgentNode[] = rows.map((row) => ({
    id: row.id,
    name: row.name,
    role: row.purpose,
    authority: "admin_agent",
    parentId: "tay",
    status: row.status === "suspended" ? "suspended" : row.status === "draft" ? "draft" : "active",
    allowedActions: (JSON.parse(row.allowed_actions) as string[]).filter(isAction),
    approvalRequiredFor: JSON.parse(row.approval_required_for) as string[],
    delegatesTo: [],
    source: "owner_created",
    picture: row.picture,
    voice: row.voice,
  }));
  return [...canonicalAgents, ...custom];
}

export function findAgent(agentId: string): AgentNode | null {
  return listAgents().find((agent) => agent.id === agentId) ?? null;
}

function isAction(value: string): value is AgentAction {
  return (ACTIONS as string[]).includes(value);
}

export function normalizeAction(input: string): AgentAction | null {
  const normalized = input.trim().toLowerCase().replace(/[ -]+/g, "_");
  return isAction(normalized) ? normalized : null;
}

export interface AuthorityDecision {
  agentId: string;
  action: string;
  allowed: boolean;
  requiresApproval: boolean;
  approved: boolean;
  blocked: boolean;
  reason: string;
}

/**
 * Single server-side decision point. `approved` means a recorded human approval
 * already exists for this exact proposal; a client flag alone never qualifies.
 */
export function decideAuthority(agentId: string, actionInput: string, approved = false): AuthorityDecision {
  const action = normalizeAction(actionInput);
  const base: AuthorityDecision = {
    agentId,
    action: actionInput,
    allowed: false,
    requiresApproval: false,
    approved,
    blocked: false,
    reason: "Unknown actions are denied by default.",
  };
  if (!action) return base;

  const agent = findAgent(agentId);
  if (!agent) return { ...base, reason: "Unknown agents are denied by default." };
  if (agent.status !== "active") {
    return { ...base, action, blocked: true, reason: `${agent.name} is ${agent.status} and cannot act.` };
  }
  if (BLOCKED_ACTIONS.has(action)) {
    return {
      ...base,
      action,
      blocked: true,
      reason: `${action.replace(/_/g, " ")} stays blocked in this workspace and is not delegated to an agent.`,
    };
  }
  if (!agent.allowedActions.includes(action)) {
    return {
      ...base,
      action,
      requiresApproval: APPROVAL_ACTIONS.has(action),
      reason: `${agent.name} is not authorized for ${action.replace(/_/g, " ")}.`,
    };
  }
  const requiresApproval = APPROVAL_ACTIONS.has(action) || agent.approvalRequiredFor.includes(action);
  return {
    ...base,
    action,
    allowed: !requiresApproval || approved,
    requiresApproval,
    reason: requiresApproval
      ? `${action.replace(/_/g, " ")} needs an explicit approval record before it runs.`
      : `${agent.name} may perform ${action.replace(/_/g, " ")} inside this project.`,
  };
}

/** Skills expose what the workspace can genuinely do today, with honest gaps. */
export function skillTree(): SkillNode[] {
  return [
    {
      id: "conversation",
      label: "Project conversation",
      description: "Talk to Tay inside a saved project; history and context persist server-side.",
      agents: ["tay"],
      status: "available",
      requiresConfiguration: null,
    },
    {
      id: "planning",
      label: "Plan and checklist",
      description: "Turn a request into visible steps with live progress.",
      agents: ["tay", "kj"],
      status: "available",
      requiresConfiguration: null,
    },
    {
      id: "file_editing",
      label: "Project file editing",
      description: "Create and edit files in the project sandbox after an approved change.",
      agents: ["tay", "kj"],
      status: "available",
      requiresConfiguration: null,
    },
    {
      id: "task_execution",
      label: "Authorized task execution",
      description: "Run the approved task steps and record the result as an artifact.",
      agents: ["tay", "kj"],
      status: "available",
      requiresConfiguration: null,
    },
    {
      id: "project_memory",
      label: "Project memory",
      description: "Durable facts Tay reads back on later turns.",
      agents: ["tay"],
      status: "available",
      requiresConfiguration: null,
    },
    {
      id: "business_records",
      label: "Customer, payment and delivery records",
      description: "Local customer records, delivery tracking, and payment-link status.",
      agents: ["tay", "dawn"],
      status: "available",
      requiresConfiguration: null,
    },
    {
      id: "document_drafting",
      label: "Model-written drafting",
      description: "Drafting is written by the configured model. Without one, Tay uses its built-in structured drafts.",
      agents: ["tay", "dawn"],
      status: "awaiting_configuration",
      requiresConfiguration: "TAY_MODEL_PROVIDER (Ollama runs free on this machine)",
    },
    {
      id: "voice",
      label: "Voice in and out",
      description: "Microphone capture and speech playback are not wired into this workspace yet.",
      agents: ["tay"],
      status: "awaiting_configuration",
      requiresConfiguration: "A voice provider and explicit owner approval",
    },
    {
      id: "payments_live",
      label: "Live payment collection",
      description: "Stripe checkout stays off until the owner configures real keys.",
      agents: ["tay"],
      status: "approval_required",
      requiresConfiguration: "STRIPE_SECRET_KEY and TAY_STRIPE_PAYMENT_LINK",
    },
    {
      id: "outbound_sending",
      label: "Outbound email and publishing",
      description: "Sending on the company's behalf pauses for owner authorization and no provider is connected.",
      agents: ["tay", "dawn"],
      status: "blocked",
      requiresConfiguration: "Owner authorization plus a connected provider",
    },
  ];
}

export function authorityTree(): AuthorityTree {
  const db = getDatabase();
  const owner = db.get<{ display_name: string; email: string }>(
    "SELECT display_name, email FROM users WHERE is_owner = 1 LIMIT 1",
  );
  const members = db.all<{ id: string; display_name: string; email: string; role: string }>(
    "SELECT id, display_name, email, role FROM users WHERE is_owner = 0 ORDER BY created_at ASC",
  );
  const grants = db.all<{ subject_id: string; scope: string; subject_label: string }>(
    "SELECT subject_id, scope, subject_label FROM grants WHERE revoked_at IS NULL",
  );
  const agents = listAgents();

  const specialists: AuthorityNode[] = agents
    .filter((agent) => agent.parentId === "tay")
    .map((agent) => ({
      id: agent.id,
      label: `${agent.name} — ${agent.authority.replace(/_/g, " ")}`,
      kind: "agent",
      scope: `${agent.allowedActions.length} permitted actions · ${agent.approvalRequiredFor.length} need approval`,
      children: [],
    }));

  const tay: AuthorityNode = {
    id: "tay",
    label: "Tay — orchestrator",
    kind: "agent",
    scope: "Owns the conversation, plans work, delegates to specialists",
    children: specialists,
  };

  const accounts: AuthorityNode[] = members.map((member) => ({
    id: member.id,
    label: `${member.display_name} <${member.email}>`,
    kind: "user",
    scope: `${member.role} — own projects only`,
    children: grants
      .filter((grant) => grant.subject_id === member.id)
      .map((grant) => ({ id: `${grant.subject_id}-${grant.scope}`, label: "Delegated scope", kind: "admin" as const, scope: grant.scope, children: [] })),
  }));

  return {
    id: "founding-owner",
    label: owner ? `Founding owner — ${owner.display_name} <${owner.email}>` : "Founding owner — not yet created",
    kind: "founder",
    scope: "System-wide decisions, owner administration, release approval",
    children: [tay, ...accounts],
  };
}

export function customAgentDetail(agentId: string): Record<string, unknown> | null {
  const row = getDatabase().get<{ instructions: string; purpose: string } & CustomAgentRow>(
    "SELECT * FROM custom_agents WHERE id = ?",
    [agentId],
  );
  if (!row) return null;
  return {
    id: row.id,
    name: row.name,
    purpose: row.purpose,
    instructions: row.instructions,
    allowedActions: JSON.parse(row.allowed_actions),
    approvalRequiredFor: JSON.parse(row.approval_required_for),
  };
}

export const agentActionList = ACTIONS;
export function parseAgentRowActions(value: string): string[] {
  return parseJson(value) as unknown as string[];
}
