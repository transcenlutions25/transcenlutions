import type { CharacterAgentIdentity } from "../character-agent-identity";
/** Shared contracts for the Transcenlutions Tay workspace. */

export type UserRole = "owner" | "admin" | "member";

export interface UserRecord {
  id: string;
  email: string;
  displayName: string;
  role: UserRole;
  isOwner: boolean;
  disabled: boolean;
  createdAt: string;
}

export interface SessionIdentity {
  user: UserRecord;
  sessionId: string;
  expiresAt: string;
}

export interface ProjectRecord {
  id: string;
  ownerId: string;
  name: string;
  summary: string;
  status: "active" | "archived";
  createdAt: string;
  updatedAt: string;
  /** Rows the signed-in user may act on inside this project. */
  access: ProjectAccess;
}

export interface ProjectAccess {
  role: UserRole;
  canEdit: boolean;
  canApprove: boolean;
  canAdminister: boolean;
}

export interface ConversationRecord {
  id: string;
  projectId: string;
  title: string;
  createdAt: string;
  updatedAt: string;
}

export type MessageKind = "chat" | "plan" | "result" | "approval" | "system";

export interface MessageRecord {
  id: string;
  conversationId: string;
  role: "user" | "tay" | "system";
  agentId: string;
  kind: MessageKind;
  text: string;
  data: Record<string, unknown> | null;
  createdAt: string;
}

export interface MemoryRecord {
  id: string;
  projectId: string;
  scope: "project" | "agent" | "account";
  key: string;
  value: string;
  updatedAt: string;
}

export type TaskStatus = "queued" | "running" | "awaiting_approval" | "completed" | "blocked" | "failed";

export interface TaskStep {
  id: string;
  label: string;
  status: "pending" | "active" | "done" | "blocked" | "awaiting_approval";
  detail?: string;
}

export interface TaskRecord {
  id: string;
  projectId: string;
  conversationId: string | null;
  title: string;
  intent: string;
  status: TaskStatus;
  steps: TaskStep[];
  result: Record<string, unknown> | null;
  createdAt: string;
  updatedAt: string;
}

export type ApprovalKind = "file_write" | "file_edit" | "business_action" | "external_action" | "memory_write";

export interface ApprovalSlide {
  title: string;
  caption: string;
  /** Monospace lines rendered as the visual preview for this slide. */
  lines: string[];
  tone: "neutral" | "add" | "remove";
}

export interface ApprovalRecord {
  id: string;
  projectId: string;
  taskId: string | null;
  conversationId: string | null;
  kind: ApprovalKind;
  title: string;
  summary: string;
  /** Plain-language explanation of what approval would do. */
  explanation: string;
  risk: "low" | "medium" | "high" | "critical";
  payload: Record<string, unknown>;
  slides: ApprovalSlide[];
  status: "pending" | "approved" | "rejected" | "review_later" | "applied" | "failed";
  requestedBy: string;
  decidedBy: string | null;
  decidedAt: string | null;
  appliedAt: string | null;
  applyError: string | null;
  createdAt: string;
}

export interface FileRecord {
  id: string;
  projectId: string;
  path: string;
  content: string;
  version: number;
  updatedAt: string;
}

export interface ArtifactRecord {
  id: string;
  projectId: string;
  conversationId: string | null;
  taskId: string | null;
  path: string;
  title: string;
  kind: string;
  version: number;
  createdAt: string;
}

export interface AuditEvent {
  id: string;
  projectId: string | null;
  actorId: string | null;
  actorLabel: string;
  kind: string;
  detail: Record<string, unknown>;
  at: string;
}

export type AgentAuthority = "founding_owner" | "orchestrator" | "specialist" | "child_safe" | "admin_agent";

export interface AgentNode {
  /** Presentation link only; null for custom/unrecovered characters. */
  characterIdentity?: CharacterAgentIdentity | null;
  id: string;
  name: string;
  role: string;
  authority: AgentAuthority;
  parentId: string | null;
  status: "active" | "draft" | "suspended";
  /** Server-only; never trusted from the client. */
  allowedActions: string[];
  approvalRequiredFor: string[];
  delegatesTo: string[];
  source: "canon" | "owner_created";
  picture?: string | null;
  voice?: string | null;
}

export interface SkillNode {
  id: string;
  label: string;
  description: string;
  agents: string[];
  status: "available" | "approval_required" | "blocked" | "awaiting_configuration";
  requiresConfiguration: string | null;
}

export interface AuthorityGrant {
  id: string;
  subjectId: string;
  subjectLabel: string;
  scope: string;
  grantedBy: string;
  createdAt: string;
  revokedAt: string | null;
}

export interface AuthorityNode {
  id: string;
  label: string;
  kind: "founder" | "admin" | "agent" | "user";
  scope: string;
  children: AuthorityNode[];
}

/** The Authority Tree is a single root node with nested delegated scopes. */
export type AuthorityTree = AuthorityNode;

export type ModelProviderId = "ollama" | "openai_compatible" | "none";

export interface ModelStatus {
  provider: ModelProviderId;
  label: string;
  connected: boolean;
  model: string | null;
  baseUrl: string | null;
  detail: string;
  /** Capabilities that stay unavailable until the owner configures a provider. */
  awaitingConfiguration: string[];
}

export interface BusinessCustomer {
  id: string;
  projectId: string;
  name: string;
  email: string;
  stage: "lead" | "qualified" | "buyer" | "delivering" | "delivered" | "paused";
  notes: string;
  createdAt: string;
  updatedAt: string;
}

export interface BusinessDelivery {
  id: string;
  projectId: string;
  customerId: string;
  offer: string;
  status: "not_started" | "in_progress" | "ready_for_review" | "delivered";
  artifactPath: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface BusinessInvoice {
  id: string;
  projectId: string;
  customerId: string;
  offer: string;
  amountCents: number;
  currency: string;
  status: "awaiting_configuration" | "payment_link_ready" | "paid_recorded" | "cancelled";
  provider: "stripe";
  providerRef: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface BusinessState {
  customers: BusinessCustomer[];
  deliveries: BusinessDelivery[];
  invoices: BusinessInvoice[];
  paymentConfiguration: {
    configured: boolean;
    mode: "test" | "live" | "unconfigured";
    detail: string;
    requiredEnv: string[];
  };
}
