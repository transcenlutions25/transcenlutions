import { getDatabase } from "../../../../../../lib/tay/db";
import { appendMessage, listMessages } from "../../../../../../lib/tay/projects";
import { handleTurn } from "../../../../../../lib/tay/orchestrator";
import { decideAuthority } from "../../../../../../lib/tay/registry";
import { fail, json, projectRow, readJson, requireEdit, requireProject, str } from "../../../../../../lib/tay/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const { project } = await requireProject(id);
    const db = getDatabase();
    const conversationId = new URL(_request.url).searchParams.get("conversationId");
    if (!conversationId) return json({ ok: false, error: "A conversation id is required." }, 400);
    return json({ ok: true, messages: listMessages(db, conversationId) });
  } catch (error) {
    return fail(error);
  }
}

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const { project, user } = await requireProject(id);
    requireEdit(project);
    const body = await readJson(request, 32768);
    const text = str(body.text, 6000);
    const conversationId = str(body.conversationId, 80);
    const agentId = str(body.agentId, 40) ?? "tay";
    if (!text || !conversationId) return json({ ok: false, error: "A message and conversation are required." }, 400);

    const db = getDatabase();
    const userMessage = appendMessage(db, {
      projectId: project.id,
      conversationId,
      role: "user",
      agentId: "you",
      kind: "chat",
      text,
    });

    const turn = await handleTurn({
      project: projectRow(project),
      conversationId,
      user,
      text,
      agentId,
    });

    const authority = decideAuthority(agentId, "edit_project_file");
    return json({
      ok: true,
      userMessage,
      messages: [...turn.messages],
      taskId: turn.taskId,
      approvalId: turn.approvalId,
      steps: turn.steps,
      modelLabel: turn.modelLabel,
      authority,
    });
  } catch (error) {
    return fail(error);
  }
}
