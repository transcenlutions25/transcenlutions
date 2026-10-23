import { getDatabase } from "../../../../../../lib/tay/db";
import { audit } from "../../../../../../lib/tay/audit";
import {
  askEngineeringQuestion,
  createEngineeringPlaybook,
  createEngineeringSession,
  engineeringBundle,
  getEngineeringSession,
  listCheckpoints,
  listEngineeringEvents,
  runEngineeringTool,
} from "../../../../../../lib/tay/engineering";
import { fail, json, projectRow, readJson, requireEdit, requireProject, str } from "../../../../../../lib/tay/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Engineering sessions (the Devin-style surface).
 *
 * Read tools inspect this checkout read-only. Every write lands in the project
 * sandbox and only through an approval recorded by `lib/tay/approvals.ts`.
 * Nothing here can push, deploy, charge or message anyone.
 */
export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const { project } = await requireProject(id);
    const db = getDatabase();
    const sessionId = new URL(request.url).searchParams.get("sessionId");
    const bundle = engineeringBundle(db, project.id);
    const session = sessionId ? getEngineeringSession(db, sessionId, project.id) : (bundle.sessions[0] ?? null);
    return json({
      ok: true,
      sessions: bundle.sessions,
      playbooks: bundle.playbooks,
      facts: bundle.facts,
      session,
      events: session ? listEngineeringEvents(db, session.id, project.id) : [],
      checkpoints: session ? listCheckpoints(db, session.id, project.id) : [],
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
    const body = await readJson(request, 32768);
    const db = getDatabase();
    const action = str(body.action, 40);

    if (action === "create_session") {
      requireEdit(project);
      const created = await createEngineeringSession(db, projectRow(project), user, {
        request: body.request,
        mode: body.mode,
        playbookId: body.playbookId,
        conversationId: str(body.conversationId, 80),
      });
      return json({
        ok: true,
        session: created.session,
        facts: created.facts,
        plan: { acceptance: created.plan.acceptance, risks: created.plan.risks, kind: created.plan.kind },
        events: listEngineeringEvents(db, created.session.id, project.id),
      });
    }

    if (action === "ask") {
      const sessionId = str(body.sessionId, 80);
      const session = sessionId ? getEngineeringSession(db, sessionId, project.id) : null;
      if (!session) return json({ ok: false, error: "Open an engineering session first." }, 404);
      const answer = await askEngineeringQuestion(db, projectRow(project), user, session, body.question);
      return json({
        ok: true,
        ...answer,
        session: getEngineeringSession(db, session.id, project.id),
        events: listEngineeringEvents(db, session.id, project.id),
      });
    }

    if (action === "tool") {
      const tool = str(body.tool, 40);
      const writeTools = new Set(["propose_patch", "rewind", "handoff", "checkpoint"]);
      if (tool && writeTools.has(tool)) requireEdit(project);
      const outcome = await runEngineeringTool(db, projectRow(project), user, {
        sessionId: body.sessionId,
        tool,
        args: body.args && typeof body.args === "object" ? (body.args as Record<string, unknown>) : {},
      });
      return json({ ok: true, ...outcome });
    }

    if (action === "create_playbook") {
      requireEdit(project);
      const playbook = createEngineeringPlaybook(db, project.id, user, {
        name: body.name,
        macro: body.macro,
        instructions: body.instructions,
      });
      audit(db, {
        projectId: project.id,
        actorId: user.id,
        actorLabel: user.email,
        kind: "engineering_playbook_created",
        detail: { playbookId: playbook.id, macro: playbook.macro },
      });
      return json({ ok: true, playbook, playbooks: engineeringBundle(db, project.id).playbooks });
    }

    return json({ ok: false, error: "Unknown engineering action." }, 400);
  } catch (error) {
    return fail(error);
  }
}
