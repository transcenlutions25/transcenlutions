import { getDatabase } from "../../../../../../lib/tay/db";
import { forgetMemory, listMemory, rememberMemory } from "../../../../../../lib/tay/projects";
import { audit } from "../../../../../../lib/tay/audit";
import { fail, json, readJson, requireEdit, requireProject, str } from "../../../../../../lib/tay/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const { project } = await requireProject(id);
    return json({ ok: true, memory: listMemory(getDatabase(), project.id) });
  } catch (error) {
    return fail(error);
  }
}

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const { project, user } = await requireProject(id);
    requireEdit(project);
    const body = await readJson(request, 16384);
    const key = str(body.key, 120);
    const value = str(body.value, 4000);
    if (!key || !value) return json({ ok: false, error: "Memory needs both a short name and a value." }, 400);
    const db = getDatabase();
    rememberMemory(db, project.id, "project", key, value);
    audit(db, { projectId: project.id, actorId: user.id, actorLabel: user.email, kind: "memory_recorded", detail: { key } });
    return json({ ok: true, memory: listMemory(db, project.id) });
  } catch (error) {
    return fail(error);
  }
}

export async function DELETE(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const { project, user } = await requireProject(id);
    requireEdit(project);
    const memoryId = str(new URL(request.url).searchParams.get("memoryId"), 80);
    if (!memoryId) return json({ ok: false, error: "A memory id is required." }, 400);
    const db = getDatabase();
    const removed = forgetMemory(db, project.id, memoryId);
    if (!removed) return json({ ok: false, error: "That memory entry is not in this project." }, 404);
    audit(db, { projectId: project.id, actorId: user.id, actorLabel: user.email, kind: "memory_forgotten", detail: { memoryId } });
    return json({ ok: true, memory: listMemory(db, project.id) });
  } catch (error) {
    return fail(error);
  }
}
