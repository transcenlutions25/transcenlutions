import { getDatabase } from "../../../../../../lib/tay/db";
import { decideApproval, listApprovals } from "../../../../../../lib/tay/approvals";
import { appendMessage, listTasks, updateTask } from "../../../../../../lib/tay/projects";
import { fail, json, readJson, requireApprove, requireProject, str } from "../../../../../../lib/tay/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const { project } = await requireProject(id);
    const status = new URL(_request.url).searchParams.get("status") ?? undefined;
    return json({ ok: true, approvals: listApprovals(getDatabase(), project.id, status ?? undefined) });
  } catch (error) {
    return fail(error);
  }
}

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const { project, user } = await requireProject(id);
    requireApprove(project);
    const body = await readJson(request, 65536);
    const approvalId = str(body.approvalId, 80);
    const decision = str(body.decision, 20);
    if (!approvalId || !decision || !["approve", "reject", "review_later"].includes(decision)) {
      return json({ ok: false, error: "Supply an approval id and one of: approve, reject, review_later." }, 400);
    }

    const db = getDatabase();
    const result = decideApproval(db, approvalId, project.id, decision as "approve" | "reject" | "review_later", user);

    // Keep the task checklist truthful about what happens next.
    if (result.approval.taskId) {
      const task = listTasks(db, project.id, 100).find((entry) => entry.id === result.approval.taskId);
      if (task) {
        const steps = task.steps.map((step) =>
          step.id === "review" || step.id === "locate"
            ? { ...step, status: result.applied ? ("done" as const) : decision === "reject" ? ("blocked" as const) : ("awaiting_approval" as const) }
            : step.id === "save" || step.id === "artifact"
              ? { ...step, status: result.applied ? ("done" as const) : ("pending" as const) }
              : step,
        );
        updateTask(db, task.id, {
          status: result.applied ? "completed" : decision === "reject" ? "blocked" : "awaiting_approval",
          steps,
          result: result.applied ? { approvalId, applied: true } : { approvalId, decision },
        });
      }
    }

    if (result.approval.conversationId) {
      const grant = result.approval.kind === "business_action" && result.approval.payload.action === "grant_run_task";
      const outcomeText = result.applied
        ? decision === "approve"
          ? grant
            ? "Authorization recorded for this project. Tay can now run approved tasks here; nothing outside the project changed."
            : result.approval.kind === "business_action"
              ? `Recorded: ${result.approval.title}. The business records were updated; no payment was charged.`
              : result.approval.kind === "memory_write"
                ? `Recorded: ${result.approval.title}. Project memory was updated.`
                : `Applied: ${result.approval.title}. The change is saved in this project and recorded as an artifact.`
          : "Recorded."
        : decision === "reject"
          ? `Rejected: ${result.approval.title}. Nothing was written.`
          : `Moved to review later: ${result.approval.title}. Nothing was written.`;
      appendMessage(db, {
        projectId: project.id,
        conversationId: result.approval.conversationId,
        role: "tay",
        agentId: "tay",
        kind: "result",
        text: result.error ? `${outcomeText}\n\n${result.error}` : outcomeText,
        data: { approvalId, decision, applied: result.applied },
      });
    }

    return json({ ok: true, approval: result.approval, applied: result.applied, error: result.error ?? null });
  } catch (error) {
    return fail(error);
  }
}

export function PUT() {
  return json({ ok: false, error: "Use POST to record a decision." }, 405);
}
