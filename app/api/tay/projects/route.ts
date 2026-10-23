import { getDatabase } from "../../../../lib/tay/db";
import { projectAccess } from "../../../../lib/tay/auth";
import { createConversation, createProject, listConversations, listProjectsForUser } from "../../../../lib/tay/projects";
import { pendingApprovalCount } from "../../../../lib/tay/approvals";
import { requireUser, fail, json, readJson, str } from "../../../../lib/tay/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const { user } = await requireUser();
    const db = getDatabase();
    const projects = listProjectsForUser(db, user).map((row) => {
      const access = projectAccess(db, row, user);
      const conversation = listConversations(db, row.id, 1)[0] ?? null;
      return {
        id: row.id,
        name: row.name,
        summary: row.summary,
        status: row.status === "archived" ? "archived" : "active",
        createdAt: row.created_at,
        updatedAt: row.updated_at,
        access,
        conversationId: conversation?.id ?? null,
        pendingApprovals: pendingApprovalCount(db, row.id),
      };
    });
    return json({ ok: true, projects });
  } catch (error) {
    return fail(error);
  }
}

export async function POST(request: Request) {
  try {
    const { user } = await requireUser();
    const body = await readJson(request, 16384);
    const name = str(body.name, 120);
    if (!name) return json({ ok: false, error: "Give the project a name of up to 120 characters." }, 400);
    const summary = str(body.summary, 400) ?? "";
    const db = getDatabase();
    const project = createProject(db, user.id, name, summary);
    const conversation = createConversation(db, project.id, `Welcome to ${project.name}`.slice(0, 120));
    return json({ ok: true, project, conversationId: conversation.id });
  } catch (error) {
    return fail(error);
  }
}
