/**
 * Versioned workspace schema migrations.
 *
 * Every structural change to the workspace database is an ordered migration
 * recorded in `schema_migrations`. The runner is idempotent, so an existing
 * database created before this module existed is adopted on the next boot:
 * each table uses `IF NOT EXISTS`, and the migration is then recorded.
 *
 * This is the seam a hosted database needs. `docs/tay-agent-runtime-queue.md`
 * records what still has to move before the workspace can run on Postgres.
 */
import type { Database } from "./db";

export interface Migration {
  id: string;
  description: string;
  sql: string;
}

const CORE_SQL = `
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  display_name TEXT NOT NULL,
  role TEXT NOT NULL,
  is_owner INTEGER NOT NULL DEFAULT 0,
  disabled INTEGER NOT NULL DEFAULT 0,
  password_salt TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS sessions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  created_at TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  revoked INTEGER NOT NULL DEFAULT 0
);
CREATE TABLE IF NOT EXISTS projects (
  id TEXT PRIMARY KEY,
  owner_id TEXT NOT NULL,
  name TEXT NOT NULL,
  summary TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'active',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS project_members (
  project_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  role TEXT NOT NULL,
  created_at TEXT NOT NULL,
  PRIMARY KEY (project_id, user_id)
);
CREATE TABLE IF NOT EXISTS conversations (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL,
  title TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS messages (
  id TEXT PRIMARY KEY,
  conversation_id TEXT NOT NULL,
  project_id TEXT NOT NULL,
  role TEXT NOT NULL,
  agent_id TEXT NOT NULL,
  kind TEXT NOT NULL,
  text TEXT NOT NULL,
  data TEXT,
  created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS memories (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL,
  scope TEXT NOT NULL,
  key TEXT NOT NULL,
  value TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  UNIQUE (project_id, scope, key)
);
CREATE TABLE IF NOT EXISTS tasks (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL,
  conversation_id TEXT,
  title TEXT NOT NULL,
  intent TEXT NOT NULL,
  status TEXT NOT NULL,
  steps TEXT NOT NULL,
  result TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS approvals (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL,
  task_id TEXT,
  conversation_id TEXT,
  kind TEXT NOT NULL,
  title TEXT NOT NULL,
  summary TEXT NOT NULL,
  explanation TEXT NOT NULL,
  risk TEXT NOT NULL,
  payload TEXT NOT NULL,
  slides TEXT NOT NULL,
  status TEXT NOT NULL,
  requested_by TEXT NOT NULL,
  decided_by TEXT,
  decided_at TEXT,
  applied_at TEXT,
  apply_error TEXT,
  created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS project_files (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL,
  path TEXT NOT NULL,
  content TEXT NOT NULL,
  version INTEGER NOT NULL DEFAULT 1,
  updated_at TEXT NOT NULL,
  UNIQUE (project_id, path)
);
CREATE TABLE IF NOT EXISTS artifacts (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL,
  conversation_id TEXT,
  task_id TEXT,
  path TEXT NOT NULL,
  title TEXT NOT NULL,
  kind TEXT NOT NULL,
  version INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS audit_events (
  id TEXT PRIMARY KEY,
  project_id TEXT,
  actor_id TEXT,
  actor_label TEXT NOT NULL,
  kind TEXT NOT NULL,
  detail TEXT NOT NULL,
  at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS grants (
  id TEXT PRIMARY KEY,
  subject_id TEXT NOT NULL,
  subject_label TEXT NOT NULL,
  scope TEXT NOT NULL,
  granted_by TEXT NOT NULL,
  created_at TEXT NOT NULL,
  revoked_at TEXT
);
CREATE TABLE IF NOT EXISTS custom_agents (
  id TEXT PRIMARY KEY,
  owner_id TEXT NOT NULL,
  name TEXT NOT NULL,
  purpose TEXT NOT NULL,
  instructions TEXT NOT NULL,
  authority TEXT NOT NULL,
  status TEXT NOT NULL,
  allowed_actions TEXT NOT NULL,
  approval_required_for TEXT NOT NULL,
  picture TEXT,
  voice TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS invites (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL,
  role TEXT NOT NULL,
  scopes TEXT NOT NULL,
  token_hash TEXT NOT NULL,
  invited_by TEXT NOT NULL,
  created_at TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  accepted_at TEXT,
  revoked_at TEXT
);
CREATE TABLE IF NOT EXISTS customers (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  stage TEXT NOT NULL,
  notes TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS deliveries (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL,
  customer_id TEXT NOT NULL,
  offer TEXT NOT NULL,
  status TEXT NOT NULL,
  artifact_path TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS invoices (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL,
  customer_id TEXT NOT NULL,
  offer TEXT NOT NULL,
  amount_cents INTEGER NOT NULL,
  currency TEXT NOT NULL,
  status TEXT NOT NULL,
  provider TEXT NOT NULL,
  provider_ref TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_projects_owner ON projects (owner_id);
CREATE INDEX IF NOT EXISTS idx_messages_conversation ON messages (conversation_id, created_at);
CREATE INDEX IF NOT EXISTS idx_approvals_project ON approvals (project_id, created_at);
CREATE INDEX IF NOT EXISTS idx_files_project ON project_files (project_id, path);
`;

const ENGINEERING_SQL = `
CREATE TABLE IF NOT EXISTS engineering_sessions (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL,
  conversation_id TEXT,
  title TEXT NOT NULL,
  request TEXT NOT NULL,
  mode TEXT NOT NULL,
  status TEXT NOT NULL,
  repository TEXT NOT NULL,
  base_branch TEXT NOT NULL,
  steps TEXT NOT NULL DEFAULT '[]',
  task_id TEXT,
  playbook_id TEXT,
  model_label TEXT,
  summary TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS engineering_events (
  id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL,
  project_id TEXT NOT NULL,
  kind TEXT NOT NULL,
  tool TEXT,
  summary TEXT NOT NULL,
  detail TEXT,
  at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS engineering_checkpoints (
  id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL,
  project_id TEXT NOT NULL,
  label TEXT NOT NULL,
  files TEXT NOT NULL,
  created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS engineering_playbooks (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL,
  name TEXT NOT NULL,
  macro TEXT NOT NULL,
  instructions TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  UNIQUE (project_id, name)
);
CREATE INDEX IF NOT EXISTS idx_engineering_sessions_project ON engineering_sessions (project_id, created_at);
CREATE INDEX IF NOT EXISTS idx_engineering_events_session ON engineering_events (session_id, at);
`;

const AGENT_JOBS_SQL = `
CREATE TABLE IF NOT EXISTS agent_jobs (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL,
  agent_id TEXT NOT NULL,
  kind TEXT NOT NULL,
  payload TEXT NOT NULL,
  status TEXT NOT NULL,
  attempts INTEGER NOT NULL DEFAULT 0,
  max_attempts INTEGER NOT NULL DEFAULT 3,
  lease_owner TEXT,
  lease_expires_at TEXT,
  available_at TEXT NOT NULL,
  last_error TEXT,
  created_by TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  finished_at TEXT
);
CREATE INDEX IF NOT EXISTS idx_agent_jobs_ready ON agent_jobs (status, available_at);
CREATE INDEX IF NOT EXISTS idx_agent_jobs_project ON agent_jobs (project_id, created_at);
`;

export const MIGRATIONS: Migration[] = [
  { id: "001_workspace_core", description: "Users, sessions, projects, conversations, approvals, files and business records", sql: CORE_SQL },
  { id: "002_engineering_sessions", description: "Engineering sessions, worklog, checkpoints and playbooks", sql: ENGINEERING_SQL },
  { id: "003_agent_jobs", description: "Durable leased agent job queue", sql: AGENT_JOBS_SQL },
];

const MIGRATIONS_TABLE = `
CREATE TABLE IF NOT EXISTS schema_migrations (
  id TEXT PRIMARY KEY,
  description TEXT NOT NULL,
  applied_at TEXT NOT NULL
);
`;

export interface MigrationResult {
  applied: string[];
  alreadyApplied: string[];
}

/** Applies pending migrations in order, each inside its own transaction. */
export function applyMigrations(db: Database): MigrationResult {
  db.exec(MIGRATIONS_TABLE);
  const applied = new Set(db.all<{ id: string }>("SELECT id FROM schema_migrations").map((row) => row.id));
  const result: MigrationResult = { applied: [], alreadyApplied: [...applied] };

  for (const migration of MIGRATIONS) {
    if (applied.has(migration.id)) continue;
    db.exec("BEGIN IMMEDIATE");
    try {
      // Another process may have migrated after the initial snapshot.
      if (db.get<{ id: string }>("SELECT id FROM schema_migrations WHERE id = ?", [migration.id])) {
        db.exec("COMMIT");
        result.alreadyApplied.push(migration.id);
        continue;
      }
      db.exec(migration.sql);
      db.run("INSERT INTO schema_migrations (id, description, applied_at) VALUES (?,?,?)", [
        migration.id,
        migration.description,
        new Date().toISOString(),
      ]);
      db.exec("COMMIT");
      result.applied.push(migration.id);
    } catch (error) {
      db.exec("ROLLBACK");
      throw new Error(
        `Migration ${migration.id} failed: ${error instanceof Error ? error.message : "unknown error"}`,
      );
    }
  }
  return result;
}

/** Current schema version and pending work, for health checks and the worker. */
export function migrationStatus(db: Database): { version: number; applied: string[]; pending: string[] } {
  db.exec(MIGRATIONS_TABLE);
  const applied = db.all<{ id: string }>("SELECT id FROM schema_migrations ORDER BY id ASC").map((row) => row.id);
  const pending = MIGRATIONS.filter((migration) => !applied.includes(migration.id)).map((migration) => migration.id);
  return { version: applied.length, applied, pending };
}
