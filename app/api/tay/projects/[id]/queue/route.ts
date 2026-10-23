import { getDatabase } from "../../../../../../lib/tay/db";
import { audit } from "../../../../../../lib/tay/audit";
import { getEngineeringSession } from "../../../../../../lib/tay/engineering";
import { migrationStatus } from "../../../../../../lib/tay/migrations";
import {
  getJob,
  isJobKind,
  enqueueJob,
  jobStats,
  listJobs,
  runQueueTick,
} from "../../../../../../lib/tay/queue";
import { fail, json, readJson, requireEdit, requireProject, str } from "../../../../../../lib/tay/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Durable agent queue for one project.
 *
 * Enqueueing checks the agent's `run_task` authority in `lib/tay/registry.ts`.
 * A tick runs at most one job in this process so the interface stays honest:
 * five queued checks are not five parallel agents. A dedicated worker
 * (`scripts/tay-queue-worker.mjs`) drains the queue for long-running work.
 */
export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const { project } = await requireProject(id);
    const db = getDatabase();
    const jobId = new URL(request.url).searchParams.get("jobId");
    const job = jobId ? getJob(db, jobId, project.id) : null;
    return json({
      ok: true,
      jobs: listJobs(db, project.id),
      job,
      stats: jobStats(db, project.id),
      schema: migrationStatus(db),
    });
  } catch (error) {
    return fail(error);
  }
}

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const { project, user } = await requireProject(id);
    requireEdit(project);
    const body = await readJson(request, 8192);
    const action = str(body.action, 40);
    const db = getDatabase();

    if (action === "enqueue") {
      const kind = str(body.kind, 60);
      if (!isJobKind(kind)) return json({ ok: false, error: "Unknown job kind." }, 400);
      const sessionId = str(body.sessionId, 80);
      const session = sessionId ? getEngineeringSession(db, sessionId, project.id) : null;
      if (!session) return json({ ok: false, error: "That engineering session is not in this project." }, 404);

      const payload: Record<string, unknown> = { sessionId: session.id };
      if (kind === "engineering_verify") {
        const command = str(body.command, 40);
        if (!command) return json({ ok: false, error: "Choose one of the allowlisted checks." }, 400);
        payload.command = command;
      }
      if (kind === "engineering_checkpoint") {
        payload.label = str(body.label, 80) ?? "Queued checkpoint";
      }

      const job = enqueueJob(db, {
        projectId: project.id,
        agentId: "kj",
        kind,
        payload,
        createdBy: user.id,
      });
      audit(db, {
        projectId: project.id,
        actorId: user.id,
        actorLabel: user.email,
        kind: "agent_job_requested",
        detail: { jobId: job.id, kind },
      });
      return json({ ok: true, job, jobs: listJobs(db, project.id), stats: jobStats(db, project.id) });
    }

    if (action === "tick") {
      // One job per request: the web process is not a background daemon.
      const result = await runQueueTick(db, {
        owner: `web:${user.id.slice(-8)}`,
        limit: 1,
        leaseSeconds: 120,
        projectId: project.id,
      });
      return json({
        ok: true,
        processed: result.processed,
        // `ran` is what this tick did; `jobs` is the project's current queue.
        ran: result.jobs,
        jobs: listJobs(db, project.id),
        stats: jobStats(db, project.id),
      });
    }

    return json({ ok: false, error: "Unknown queue action." }, 400);
  } catch (error) {
    return fail(error);
  }
}
