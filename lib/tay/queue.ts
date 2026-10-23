/**
 * Durable agent job queue.
 *
 * Agent work that outlives one HTTP request becomes a recorded job: queued,
 * leased to one worker, retried with backoff, and closed with an audit entry.
 * A job never inherits authority from the request that created it: the agent's
 * `run_task` decision from `lib/tay/registry.ts` is re-checked at enqueue time,
 * and every handler runs in the server process against the same approvals and
 * audit layer as the interactive workspace.
 *
 * Leases, not locks: if a worker dies mid-job the lease expires and the job is
 * claimable again, with the attempt already counted.
 */
import type { Database } from "./db";
import { newId, now } from "./auth";
import { audit, parseJson } from "./audit";
import { loadProjectForUser } from "./accounts";
import { decideAuthority } from "./registry";
import { captureCheckpoint, getEngineeringSession, runEngineeringTool } from "./engineering";
import type { UserRecord } from "./types";

export type JobKind = "engineering_checkpoint" | "engineering_verify";

export const JOB_KINDS: JobKind[] = ["engineering_checkpoint", "engineering_verify"];

export type JobStatus = "queued" | "leased" | "completed" | "failed" | "blocked";

export interface AgentJob {
  id: string;
  projectId: string;
  agentId: string;
  kind: JobKind;
  payload: Record<string, unknown>;
  status: JobStatus;
  attempts: number;
  maxAttempts: number;
  leaseOwner: string | null;
  leaseExpiresAt: string | null;
  availableAt: string;
  lastError: string | null;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  finishedAt: string | null;
}

interface JobRow {
  id: string;
  project_id: string;
  agent_id: string;
  kind: string;
  payload: string;
  status: string;
  attempts: number;
  max_attempts: number;
  lease_owner: string | null;
  lease_expires_at: string | null;
  available_at: string;
  last_error: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
  finished_at: string | null;
}

function toJob(row: JobRow): AgentJob {
  return {
    id: row.id,
    projectId: row.project_id,
    agentId: row.agent_id,
    kind: row.kind as JobKind,
    payload: parseJson(row.payload),
    status: row.status as JobStatus,
    attempts: row.attempts,
    maxAttempts: row.max_attempts,
    leaseOwner: row.lease_owner,
    leaseExpiresAt: row.lease_expires_at,
    availableAt: row.available_at,
    lastError: row.last_error,
    createdBy: row.created_by,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    finishedAt: row.finished_at,
  };
}

export function isJobKind(value: unknown): value is JobKind {
  return typeof value === "string" && (JOB_KINDS as string[]).includes(value);
}

export interface EnqueueInput {
  projectId: string;
  agentId: string;
  kind: JobKind;
  payload: Record<string, unknown>;
  createdBy: string;
  maxAttempts?: number;
}

/**
 * Queues one job. Unknown kinds, over-large payloads and agents without
 * `run_task` authority are refused before anything is written.
 */
export function enqueueJob(db: Database, input: EnqueueInput): AgentJob {
  if (!isJobKind(input.kind)) {
    throw new Error(`Unknown job kind. Supported: ${JOB_KINDS.join(", ")}.`);
  }
  const decision = decideAuthority(input.agentId, "run_task");
  if (!decision.allowed) {
    throw new Error(`${input.agentId} cannot queue work here. ${decision.reason}`);
  }
  const user = loadUser(db, input.createdBy);
  if (!user || user.disabled || !loadProjectForUser(db, input.projectId, user)?.access.canEdit) {
    throw new Error("The user cannot queue work in this project.");
  }
  const payload = JSON.stringify(input.payload ?? {});
  if (payload.length > 4000) throw new Error("That job payload is too large.");
  const project = db.get<{ id: string }>("SELECT id FROM projects WHERE id = ?", [input.projectId]);
  if (!project) throw new Error("That project does not exist.");

  const id = newId("job");
  const timestamp = now();
  db.run(
    `INSERT INTO agent_jobs
      (id, project_id, agent_id, kind, payload, status, attempts, max_attempts, available_at, created_by, created_at, updated_at)
     VALUES (?,?,?,?,?, 'queued', 0, ?, ?, ?, ?, ?)`,
    [
      id,
      input.projectId,
      input.agentId,
      input.kind,
      payload,
      Math.min(Math.max(input.maxAttempts ?? 3, 1), 10),
      timestamp,
      input.createdBy,
      timestamp,
      timestamp,
    ],
  );
  audit(db, {
    projectId: input.projectId,
    actorId: input.createdBy,
    actorLabel: "queue",
    kind: "agent_job_enqueued",
    detail: { jobId: id, kind: input.kind, agentId: input.agentId },
  });
  return getJob(db, id, input.projectId)!;
}

export function getJob(db: Database, jobId: string, projectId: string): AgentJob | null {
  const row = db.get<JobRow>("SELECT * FROM agent_jobs WHERE id = ? AND project_id = ?", [jobId, projectId]);
  return row ? toJob(row) : null;
}

export function listJobs(db: Database, projectId: string, limit = 50): AgentJob[] {
  return db
    .all<JobRow>("SELECT * FROM agent_jobs WHERE project_id = ? ORDER BY created_at DESC LIMIT ?", [
      projectId,
      Math.min(limit, 200),
    ])
    .map(toJob);
}

export function jobStats(db: Database, projectId: string): Record<JobStatus, number> {
  const stats: Record<JobStatus, number> = { queued: 0, leased: 0, completed: 0, failed: 0, blocked: 0 };
  const rows = db.all<{ status: string; n: number }>(
    "SELECT status, COUNT(*) AS n FROM agent_jobs WHERE project_id = ? GROUP BY status",
    [projectId],
  );
  for (const row of rows) {
    if (row.status in stats) stats[row.status as JobStatus] = row.n;
  }
  return stats;
}

/**
 * Claims the oldest ready job for one worker. Expired leases become claimable
 * again; the claim is conditional so two processes cannot both win it.
 */
export function claimNextJob(
  db: Database,
  owner: string,
  options: { leaseSeconds?: number; projectId?: string } = {},
): AgentJob | null {
  if (!owner.trim()) throw new Error("A worker needs a lease owner name.");
  const leaseSeconds = Math.min(Math.max(options.leaseSeconds ?? 120, 15), 900);
  const timestamp = now();
  const leaseExpiresAt = new Date(Date.now() + leaseSeconds * 1000).toISOString();
  const filter = options.projectId ? " AND project_id = ?" : "";
  const params: unknown[] = options.projectId ? [timestamp, timestamp, options.projectId] : [timestamp, timestamp];

  // A crashed final attempt must terminate rather than being leased forever.
  db.run(`UPDATE agent_jobs SET status = 'failed', lease_owner = NULL, lease_expires_at = NULL,
    last_error = 'Retry limit reached after lease expiry.', finished_at = ?, updated_at = ?
    WHERE status = 'leased' AND lease_expires_at <= ? AND attempts >= max_attempts${filter}`,
    options.projectId ? [timestamp, timestamp, timestamp, options.projectId] : [timestamp, timestamp, timestamp]);
  for (let attempt = 0; attempt < 3; attempt++) {
    const candidate = db.get<JobRow>(
      `SELECT * FROM agent_jobs
       WHERE ((status = 'queued' AND available_at <= ?) OR (status = 'leased' AND lease_expires_at IS NOT NULL AND lease_expires_at <= ?))${filter}
       ORDER BY available_at ASC, created_at ASC LIMIT 1`,
      params,
    );
    if (!candidate) return null;

    const claimed = db.get<JobRow>(
      `UPDATE agent_jobs
       SET status = 'leased', lease_owner = ?, lease_expires_at = ?, attempts = attempts + 1, updated_at = ?
       WHERE id = ? AND attempts < max_attempts AND ((status = 'queued' AND available_at <= ?) OR (status = 'leased' AND lease_expires_at IS NOT NULL AND lease_expires_at <= ?)) RETURNING *`,
      [owner, leaseExpiresAt, timestamp, candidate.id, timestamp, timestamp],
    );
    if (claimed) {
      audit(db, {
        projectId: claimed.project_id,
        actorId: null,
        actorLabel: owner,
        kind: "agent_job_claimed",
        detail: { jobId: claimed.id, kind: claimed.kind, attempt: claimed.attempts },
      });
      return toJob(claimed);
    }
  }
  return null;
}

export function renewLease(db: Database, jobId: string, owner: string, leaseSeconds = 120): void {
  const timestamp = now();
  const renewed = db.get<JobRow>("UPDATE agent_jobs SET lease_expires_at = ?, updated_at = ? WHERE id = ? AND status = 'leased' AND lease_owner = ? AND lease_expires_at > ? RETURNING *", [
    new Date(Date.now() + Math.min(Math.max(leaseSeconds, 15), 900) * 1000).toISOString(), timestamp, jobId, owner, timestamp,
  ]);
  if (!renewed) throw new Error("The job lease is no longer valid.");
}

export function completeJob(db: Database, jobId: string, owner: string, result: Record<string, unknown> = {}): AgentJob {
  const timestamp = now();
  const job = db.get<JobRow>(
    "UPDATE agent_jobs SET status = 'completed', lease_owner = NULL, lease_expires_at = NULL, last_error = NULL, finished_at = ?, updated_at = ? WHERE id = ? AND status = 'leased' AND lease_owner = ? AND lease_expires_at > ? RETURNING *",
    [timestamp, timestamp, jobId, owner, timestamp],
  );
  if (!job) throw new Error("Only the lease holder can complete an unexpired job.");
  audit(db, {
    projectId: job.project_id,
    actorId: null,
    actorLabel: owner,
    kind: "agent_job_completed",
    detail: { jobId, kind: job.kind, attempts: job.attempts, result },
  });
  return toJob(job);
}

/** Failed jobs retry with linear backoff until `max_attempts` is reached. */
export function failJob(db: Database, jobId: string, owner: string, error: string): AgentJob {
  const row = db.get<JobRow>("SELECT * FROM agent_jobs WHERE id = ?", [jobId]);
  if (!row) throw new Error("That job does not exist.");
  if (row.status !== "leased" || row.lease_owner !== owner || !row.lease_expires_at || row.lease_expires_at <= now()) {
    throw new Error("Only the lease holder can fail this job.");
  }
  const message = error.trim().slice(0, 600) || "Job failed.";
  const timestamp = now();
  const exhausted = row.attempts >= row.max_attempts;
  if (exhausted) {
    db.run(
      "UPDATE agent_jobs SET status = 'failed', lease_owner = NULL, lease_expires_at = NULL, last_error = ?, finished_at = ?, updated_at = ? WHERE id = ? AND status = 'leased' AND lease_owner = ?",
      [message, timestamp, timestamp, jobId, owner],
    );
  } else {
    const delayMs = Math.min(row.attempts * 30_000, 300_000);
    db.run(
      "UPDATE agent_jobs SET status = 'queued', lease_owner = NULL, lease_expires_at = NULL, available_at = ?, last_error = ?, updated_at = ? WHERE id = ? AND status = 'leased' AND lease_owner = ?",
      [new Date(Date.now() + delayMs).toISOString(), message, timestamp, jobId, owner],
    );
  }
  audit(db, {
    projectId: row.project_id,
    actorId: null,
    actorLabel: owner,
    kind: exhausted ? "agent_job_failed" : "agent_job_retry_scheduled",
    detail: { jobId, kind: row.kind, attempts: row.attempts, error: message },
  });
  const updated = db.get<JobRow>("SELECT * FROM agent_jobs WHERE id = ?", [jobId]);
  return toJob(updated ?? row);
}

/* -------------------------------- handlers ------------------------------ */

interface HandlerContext {
  db: Database;
  job: AgentJob;
  payload: Record<string, unknown>;
  user: UserRecord | null;
}

type JobHandler = (context: HandlerContext) => Promise<Record<string, unknown>>;

function loadUser(db: Database, id: string): UserRecord | null {
  const row = db.get<{
    id: string;
    email: string;
    display_name: string;
    role: string;
    is_owner: number;
    disabled: number;
    created_at: string;
  }>("SELECT id, email, display_name, role, is_owner, disabled, created_at FROM users WHERE id = ?", [id]);
  if (!row) return null;
  return {
    id: row.id,
    email: row.email,
    displayName: row.display_name,
    role: row.role as UserRecord["role"],
    isOwner: row.is_owner === 1,
    disabled: row.disabled === 1,
    createdAt: row.created_at,
  };
}

function loadProjectRow(db: Database, projectId: string) {
  const row = db.get<{
    id: string;
    owner_id: string;
    name: string;
    summary: string;
    status: string;
    created_at: string;
    updated_at: string;
  }>("SELECT * FROM projects WHERE id = ?", [projectId]);
  if (!row) throw new Error("The job's project no longer exists.");
  return row;
}

function sessionIdFrom(payload: Record<string, unknown>): string {
  const value = payload.sessionId;
  if (typeof value !== "string" || value.length === 0) throw new Error("The job payload is missing sessionId.");
  return value;
}

const HANDLERS: Record<JobKind, JobHandler> = {
  engineering_checkpoint: async ({ db, job, payload, user }) => {
    const session = getEngineeringSession(db, sessionIdFrom(payload), job.projectId);
    if (!session) throw new Error("That engineering session is not in this project.");
    if (!user) throw new Error("The user who queued this job no longer exists.");
    const label = typeof payload.label === "string" ? payload.label : "Queued checkpoint";
    const checkpoint = captureCheckpoint(db, loadProjectRow(db, job.projectId), user, session, label);
    return { checkpointId: checkpoint.id, files: checkpoint.files.length, label: checkpoint.label };
  },
  engineering_verify: async ({ db, job, payload, user }) => {
    const session = getEngineeringSession(db, sessionIdFrom(payload), job.projectId);
    if (!session) throw new Error("That engineering session is not in this project.");
    if (!user) throw new Error("The user who queued this job no longer exists.");
    const outcome = await runEngineeringTool(db, loadProjectRow(db, job.projectId), user, {
      sessionId: session.id,
      tool: "verify",
      args: { command: payload.command },
    });
    const verification = outcome.result.verification as { ok?: boolean; durationMs?: number } | undefined;
    if (!verification?.ok) throw new Error("The verification check did not pass.");
    return { sessionId: session.id, ok: Boolean(verification?.ok), durationMs: verification?.durationMs ?? null };
  },
};

export interface TickOptions {
  owner: string;
  limit?: number;
  leaseSeconds?: number;
  projectId?: string;
}

export interface TickResult {
  processed: number;
  jobs: { id: string; kind: JobKind; status: JobStatus; result: Record<string, unknown> | null; error: string | null }[];
}

/**
 * Runs up to `limit` ready jobs in this process. Handlers that need a human
 * decision still create an approval and stop; the queue never approves for you.
 */
export async function runQueueTick(db: Database, options: TickOptions): Promise<TickResult> {
  const limit = Math.min(Math.max(options.limit ?? 1, 1), 10);
  const result: TickResult = { processed: 0, jobs: [] };

  for (let index = 0; index < limit; index++) {
    const leaseOwner = `${options.owner}:${newId("lease")}`;
    const job = claimNextJob(db, leaseOwner, {
      leaseSeconds: options.leaseSeconds,
      projectId: options.projectId,
    });
    if (!job) break;
    result.processed++;
    let leaseLost = false;
    const heartbeat = setInterval(() => {
      try { renewLease(db, job.id, leaseOwner, options.leaseSeconds); } catch { leaseLost = true; }
    }, 5000);
    try {
      const user = loadUser(db, job.createdBy);
      if (!user || user.disabled || !loadProjectForUser(db, job.projectId, user)?.access.canEdit ||
          !decideAuthority(job.agentId, "run_task").allowed) throw new Error("Queued authority is no longer valid.");
      const handler = HANDLERS[job.kind];
      if (!handler) throw new Error(`No handler is registered for ${job.kind}.`);
      const outcome = await handler({ db, job, payload: job.payload, user: loadUser(db, job.createdBy) });
      if (leaseLost) throw new Error("The job lease was lost during execution.");
      const completed = completeJob(db, job.id, leaseOwner, outcome);
      result.jobs.push({ id: job.id, kind: job.kind, status: completed.status, result: outcome, error: null });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Job failed.";
      // A replacement worker owns an expired lease; do not overwrite its state.
      const current = getJob(db, job.id, job.projectId)!;
      const failed = current.leaseOwner === leaseOwner && current.leaseExpiresAt && current.leaseExpiresAt > now()
        ? failJob(db, job.id, leaseOwner, message) : current;
      result.jobs.push({ id: job.id, kind: job.kind, status: failed.status, result: null, error: message });
    } finally { clearInterval(heartbeat); }
  }

  return result;
}

/** Health snapshot for the route and the worker CLI. */
export function queueHealth(db: Database, projectId?: string) {
  const stats = projectId
    ? jobStats(db, projectId)
    : (["queued", "leased", "completed", "failed", "blocked"] as JobStatus[]).reduce(
        (acc, status) => {
          acc[status] = db.get<{ n: number }>("SELECT COUNT(*) AS n FROM agent_jobs WHERE status = ?", [status])?.n ?? 0;
          return acc;
        },
        {} as Record<JobStatus, number>,
      );
  return { stats, kinds: JOB_KINDS };
}
