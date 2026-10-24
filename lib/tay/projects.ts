/** Projects, conversations, memory, sandbox files and artifacts. */
import { getDatabase, type Database } from "./db";
import { newId, now } from "./auth";
import { audit, parseJson } from "./audit";
import type {
  ArtifactRecord,
  ConversationRecord,
  FileRecord,
  MemoryRecord,
  MessageKind,
  MessageRecord,
  ProjectRecord,
  TaskStep,
  UserRecord,
} from "./types";

export interface ProjectRowInternal {
  id: string;
  owner_id: string;
  name: string;
  summary: string;
  status: string;
  created_at: string;
  updated_at: string;
}

export function createProject(db: Database, ownerId: string, name: string, summary: string): ProjectRecord {
  const id = newId("prj");
  const timestamp = now();
  db.run("INSERT INTO projects (id, owner_id, name, summary, status, created_at, updated_at) VALUES (?,?,?,?, 'active', ?, ?)", [
    id,
    ownerId,
    name.slice(0, 120),
    summary.slice(0, 400),
    timestamp,
    timestamp,
  ]);
  db.run("INSERT INTO project_members (project_id, user_id, role, created_at) VALUES (?,?, 'owner', ?)", [id, ownerId, timestamp]);
  audit(db, { projectId: id, actorId: ownerId, actorLabel: "owner", kind: "project_created", detail: { name } });
  return {
    id,
    ownerId,
    name,
    summary,
    status: "active",
    createdAt: timestamp,
    updatedAt: timestamp,
    access: { role: "owner", canEdit: true, canApprove: true, canAdminister: true },
  };
}

export function listProjectsForUser(db: Database, user: UserRecord): ProjectRowInternal[] {
  return db.all<ProjectRowInternal>(
    `SELECT DISTINCT p.* FROM projects p
     LEFT JOIN project_members m ON m.project_id = p.id
     WHERE p.owner_id = ? OR m.user_id = ?
     ORDER BY p.updated_at DESC`,
    [user.id, user.id],
  );
}

export function createConversation(db: Database, projectId: string, title: string): ConversationRecord {
  const id = newId("cnv");
  const timestamp = now();
  db.run("INSERT INTO conversations (id, project_id, title, created_at, updated_at) VALUES (?,?,?,?,?)", [
    id,
    projectId,
    title.slice(0, 120),
    timestamp,
    timestamp,
  ]);
  return { id, projectId, title, createdAt: timestamp, updatedAt: timestamp };
}

export function listConversations(db: Database, projectId: string, limit = 50): ConversationRecord[] {
  const rows = db.all<{ id: string; project_id: string; title: string; created_at: string; updated_at: string }>(
    "SELECT * FROM conversations WHERE project_id = ? ORDER BY updated_at DESC LIMIT ?",
    [projectId, Math.min(limit, 200)],
  );
  return rows.map((row) => ({
    id: row.id,
    projectId: row.project_id,
    title: row.title,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }));
}

export function latestConversation(db: Database, projectId: string): ConversationRecord | null {
  return listConversations(db, projectId, 1)[0] ?? null;
}

export function appendMessage(
  db: Database,
  input: {
    projectId: string;
    conversationId: string;
    role: "user" | "tay" | "system";
    agentId: string;
    kind: MessageKind;
    text: string;
    data?: Record<string, unknown> | null;
  },
): MessageRecord {
  const id = newId("msg");
  const createdAt = now();
  db.run(
    "INSERT INTO messages (id, conversation_id, project_id, role, agent_id, kind, text, data, created_at) VALUES (?,?,?,?,?,?,?,?,?)",
    [
      id,
      input.conversationId,
      input.projectId,
      input.role,
      input.agentId,
      input.kind,
      input.text.slice(0, 20_000),
      input.data ? JSON.stringify(input.data) : null,
      createdAt,
    ],
  );
  db.run("UPDATE conversations SET updated_at = ? WHERE id = ?", [createdAt, input.conversationId]);
  db.run("UPDATE projects SET updated_at = ? WHERE id = ?", [createdAt, input.projectId]);
  return {
    id,
    conversationId: input.conversationId,
    role: input.role,
    agentId: input.agentId,
    kind: input.kind,
    text: input.text,
    data: input.data ?? null,
    createdAt,
  };
}

export function listMessages(db: Database, conversationId: string, limit = 200): MessageRecord[] {
  const rows = db.all<{
    id: string;
    conversation_id: string;
    role: string;
    agent_id: string;
    kind: string;
    text: string;
    data: string | null;
    created_at: string;
  }>("SELECT * FROM messages WHERE conversation_id = ? ORDER BY created_at ASC LIMIT ?", [conversationId, Math.min(limit, 500)]);
  return rows.map((row) => ({
    id: row.id,
    conversationId: row.conversation_id,
    role: row.role as MessageRecord["role"],
    agentId: row.agent_id,
    kind: row.kind as MessageKind,
    text: row.text,
    data: row.data ? parseJson(row.data) : null,
    createdAt: row.created_at,
  }));
}

/* ----------------------------- memory ----------------------------- */

export function rememberMemory(
  db: Database,
  projectId: string,
  scope: MemoryRecord["scope"],
  key: string,
  value: string,
): void {
  const existing = db.get<{ id: string }>("SELECT id FROM memories WHERE project_id = ? AND scope = ? AND key = ?", [
    projectId,
    scope,
    key,
  ]);
  if (existing) {
    db.run("UPDATE memories SET value = ?, updated_at = ? WHERE id = ?", [value.slice(0, 4000), now(), existing.id]);
    return;
  }
  db.run("INSERT INTO memories (id, project_id, scope, key, value, updated_at) VALUES (?,?,?,?,?,?)", [
    newId("mem"),
    projectId,
    scope,
    key.slice(0, 120),
    value.slice(0, 4000),
    now(),
  ]);
}

export function listMemory(db: Database, projectId: string): MemoryRecord[] {
  const rows = db.all<{ id: string; project_id: string; scope: string; key: string; value: string; updated_at: string }>(
    "SELECT * FROM memories WHERE project_id = ? ORDER BY updated_at DESC LIMIT 100",
    [projectId],
  );
  return rows.map((row) => ({
    id: row.id,
    projectId: row.project_id,
    scope: row.scope as MemoryRecord["scope"],
    key: row.key,
    value: row.value,
    updatedAt: row.updated_at,
  }));
}

export function forgetMemory(db: Database, projectId: string, memoryId: string): boolean {
  const existing = db.get<{ id: string }>("SELECT id FROM memories WHERE id = ? AND project_id = ?", [memoryId, projectId]);
  if (!existing) return false;
  db.run("DELETE FROM memories WHERE id = ?", [memoryId]);
  return true;
}

/* -------------------------- sandbox files -------------------------- */

const RESERVED_SEGMENTS = new Set([".env", ".git", "node_modules", ".ssh", "id_rsa", "id_ed25519"]);

/** Validates a project-relative path. Rejects traversal, absolute paths and secret files. */
export function safeProjectPath(input: unknown): string | null {
  if (typeof input !== "string") return null;
  const trimmed = input.trim().replace(/\\/g, "/");
  if (!trimmed || trimmed.length > 180) return null;
  if (trimmed.startsWith("/") || /^[a-zA-Z]:/.test(trimmed)) return null;
  const segments = trimmed.split("/").filter((segment) => segment.length > 0);
  if (segments.length === 0 || segments.length > 8) return null;
  for (const segment of segments) {
    if (segment === "." || segment === "..") return null;
    if (RESERVED_SEGMENTS.has(segment.toLowerCase())) return null;
    if (!/^[A-Za-z0-9._ -]+$/.test(segment)) return null;
    if (/^\.env/i.test(segment)) return null;
  }
  return segments.join("/");
}

export function readProjectFile(db: Database, projectId: string, path: string): FileRecord | null {
  const row = db.get<{ id: string; project_id: string; path: string; content: string; version: number; updated_at: string }>(
    "SELECT * FROM project_files WHERE project_id = ? AND path = ?",
    [projectId, path],
  );
  return row
    ? { id: row.id, projectId: row.project_id, path: row.path, content: row.content, version: row.version, updatedAt: row.updated_at }
    : null;
}

export function listProjectFiles(db: Database, projectId: string): { path: string; version: number; updatedAt: string; bytes: number }[] {
  const rows = db.all<{ path: string; version: number; updated_at: string; content: string }>(
    "SELECT path, version, updated_at, content FROM project_files WHERE project_id = ? ORDER BY path ASC LIMIT 300",
    [projectId],
  );
  return rows.map((row) => ({ path: row.path, version: row.version, updatedAt: row.updated_at, bytes: row.content.length }));
}

export function writeProjectFile(
  db: Database,
  projectId: string,
  path: string,
  content: string,
): { file: FileRecord; created: boolean } {
  const existing = readProjectFile(db, projectId, path);
  const timestamp = now();
  if (existing) {
    db.run("UPDATE project_files SET content = ?, version = ?, updated_at = ? WHERE id = ?", [
      content,
      existing.version + 1,
      timestamp,
      existing.id,
    ]);
    return { file: { ...existing, content, version: existing.version + 1, updatedAt: timestamp }, created: false };
  }
  const id = newId("fil");
  db.run("INSERT INTO project_files (id, project_id, path, content, version, updated_at) VALUES (?,?,?,?,1,?)", [
    id,
    projectId,
    path,
    content,
    timestamp,
  ]);
  return { file: { id, projectId, path, content, version: 1, updatedAt: timestamp }, created: true };
}

export function recordArtifact(
  db: Database,
  input: {
    projectId: string;
    conversationId: string | null;
    taskId: string | null;
    path: string;
    title: string;
    kind: string;
    version: number;
  },
): ArtifactRecord {
  const artifact: ArtifactRecord = { id: newId("art"), createdAt: now(), ...input };
  db.run(
    "INSERT INTO artifacts (id, project_id, conversation_id, task_id, path, title, kind, version, created_at) VALUES (?,?,?,?,?,?,?,?,?)",
    [
      artifact.id,
      artifact.projectId,
      artifact.conversationId,
      artifact.taskId,
      artifact.path,
      artifact.title,
      artifact.kind,
      artifact.version,
      artifact.createdAt,
    ],
  );
  return artifact;
}

export function listArtifacts(db: Database, projectId: string, limit = 40): ArtifactRecord[] {
  const rows = db.all<{
    id: string;
    project_id: string;
    conversation_id: string | null;
    task_id: string | null;
    path: string;
    title: string;
    kind: string;
    version: number;
    created_at: string;
  }>("SELECT * FROM artifacts WHERE project_id = ? ORDER BY created_at DESC LIMIT ?", [projectId, Math.min(limit, 200)]);
  return rows.map((row) => ({
    id: row.id,
    projectId: row.project_id,
    conversationId: row.conversation_id,
    taskId: row.task_id,
    path: row.path,
    title: row.title,
    kind: row.kind,
    version: row.version,
    createdAt: row.created_at,
  }));
}

/* ------------------------------ tasks ------------------------------ */

export function createTask(
  db: Database,
  input: { projectId: string; conversationId: string | null; title: string; intent: string; steps: TaskStep[] },
): string {
  const id = newId("tsk");
  const timestamp = now();
  db.run(
    "INSERT INTO tasks (id, project_id, conversation_id, title, intent, status, steps, result, created_at, updated_at) VALUES (?,?,?,?,?,?,?,NULL,?,?)",
    [id, input.projectId, input.conversationId, input.title.slice(0, 200), input.intent, "running", JSON.stringify(input.steps), timestamp, timestamp],
  );
  return id;
}

export function updateTask(
  db: Database,
  taskId: string,
  patch: { status?: string; steps?: TaskStep[]; result?: Record<string, unknown> | null },
): void {
  const existing = db.get<{ status: string; steps: string; result: string | null }>("SELECT status, steps, result FROM tasks WHERE id = ?", [
    taskId,
  ]);
  if (!existing) return;
  db.run("UPDATE tasks SET status = ?, steps = ?, result = ?, updated_at = ? WHERE id = ?", [
    patch.status ?? existing.status,
    patch.steps ? JSON.stringify(patch.steps) : existing.steps,
    patch.result !== undefined ? (patch.result ? JSON.stringify(patch.result) : null) : existing.result,
    now(),
    taskId,
  ]);
}

export function listTasks(db: Database, projectId: string, limit = 25) {
  const rows = db.all<{
    id: string;
    project_id: string;
    conversation_id: string | null;
    title: string;
    intent: string;
    status: string;
    steps: string;
    result: string | null;
    created_at: string;
    updated_at: string;
  }>("SELECT * FROM tasks WHERE project_id = ? ORDER BY created_at DESC LIMIT ?", [projectId, Math.min(limit, 100)]);
  return rows.map((row) => ({
    id: row.id,
    projectId: row.project_id,
    conversationId: row.conversation_id,
    title: row.title,
    intent: row.intent,
    status: row.status,
    steps: (JSON.parse(row.steps) as TaskStep[]) ?? [],
    result: row.result ? parseJson(row.result) : null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }));
}
