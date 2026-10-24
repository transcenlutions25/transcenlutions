/** Client view types for the consolidated Tay workspace API. */
import type {
  AgentNode,
  ApprovalRecord,
  ArtifactRecord,
  AuthorityTree,
  BusinessState,
  ConversationRecord,
  FileRecord,
  MemoryRecord,
  MessageRecord,
  ModelStatus,
  ProjectAccess,
  ProjectRecord,
  SkillNode,
  TaskStep,
} from "../../lib/tay/types";

export interface ProjectSummary {
  id: string;
  name: string;
  summary: string;
  status: "active" | "archived";
  createdAt: string;
  updatedAt: string;
  access: ProjectAccess;
  conversationId: string | null;
  pendingApprovals: number;
}

export interface TaskSummary {
  id: string;
  title: string;
  intent: string;
  status: string;
  steps: TaskStep[];
  result: Record<string, unknown> | null;
  createdAt: string;
  updatedAt: string;
}

export interface AuditSummary {
  id: string;
  actorLabel: string;
  kind: string;
  detail: Record<string, unknown>;
  at: string;
}

export interface FileSummary {
  path: string;
  version: number;
  updatedAt: string;
  bytes: number;
}

export interface SessionUser {
  id: string;
  email: string;
  displayName: string;
  role: string;
  isOwner: boolean;
}

export interface ProjectBundle {
  ok: true;
  project: ProjectRecord;
  user: SessionUser;
  conversations: ConversationRecord[];
  conversation: ConversationRecord;
  messages: MessageRecord[];
  approvals: ApprovalRecord[];
  tasks: TaskSummary[];
  files: FileSummary[];
  selectedFile: FileRecord | null;
  memory: MemoryRecord[];
  artifacts: ArtifactRecord[];
  audit: AuditSummary[];
  agents: AgentNode[];
  skills: SkillNode[];
  authority: AuthorityTree;
  business: BusinessState;
  model: ModelStatus;
}

export interface TurnResponse {
  ok: true;
  userMessage: MessageRecord;
  messages: MessageRecord[];
  taskId: string | null;
  approvalId: string | null;
  steps: TaskStep[];
  modelLabel: string;
}

export interface AdminPayload {
  ok: true;
  users: { id: string; email: string; displayName: string; role: string; isOwner: boolean; createdAt: string }[];
  invites: {
    id: string;
    email: string;
    role: string;
    scopes: string[];
    createdAt: string;
    expiresAt: string;
    acceptedAt: string | null;
    revokedAt: string | null;
  }[];
  grants: { id: string; subject_label?: string; subjectLabel?: string; scope: string; grantedBy?: string; created_at?: string; createdAt?: string; revoked_at?: string | null }[];
  agents: AgentNode[];
  availableActions: string[];
}

export interface SessionResponse {
  ok: true;
  setup: { users: number; ownerExists: boolean; ownerEmailConfigured: boolean };
  session: { user: SessionUser; expiresAt: string } | null;
  model: ModelStatus;
}

export function errorMessage(payload: unknown): string {
  if (payload && typeof payload === "object" && "error" in payload) {
    const value = (payload as { error?: unknown }).error;
    if (typeof value === "string") return value;
  }
  return "The request could not be completed.";
}
