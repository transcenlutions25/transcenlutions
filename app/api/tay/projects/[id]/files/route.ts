import { getDatabase } from "../../../../../../lib/tay/db";
import { recordArtifact, listProjectFiles, readProjectFile, safeProjectPath, writeProjectFile } from "../../../../../../lib/tay/projects";
import { audit } from "../../../../../../lib/tay/audit";
import { fail, json, readJson, requireEdit, requireProject, str } from "../../../../../../lib/tay/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const { project } = await requireProject(id);
    const db = getDatabase();
    const path = safeProjectPath(new URL(request.url).searchParams.get("path"));
    if (!path) return json({ ok: true, files: listProjectFiles(db, project.id) });
    const file = readProjectFile(db, project.id, path);
    if (!file) return json({ ok: false, error: "That file is not in this project." }, 404);
    return json({ ok: true, file });
  } catch (error) {
    return fail(error);
  }
}

/** A human saving their own edit. Audited, path-validated, and versioned. */
export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const { project, user } = await requireProject(id);
    requireEdit(project);
    const body = await readJson(request, 65536);
    const path = safeProjectPath(body.path);
    const content = typeof body.content === "string" ? body.content : null;
    if (!path || content === null) return json({ ok: false, error: "Supply a project-relative path and text content." }, 400);
    if (content.length > 60000) return json({ ok: false, error: "That file is larger than this editor accepts." }, 413);

    const db = getDatabase();
    const previous = readProjectFile(db, project.id, path);
    const { file, created } = writeProjectFile(db, project.id, path, content);
    recordArtifact(db, {
      projectId: project.id,
      conversationId: null,
      taskId: null,
      path,
      title: str(body.title, 120) ?? path,
      kind: created ? "created_file" : "updated_file",
      version: file.version,
    });
    audit(db, {
      projectId: project.id,
      actorId: user.id,
      actorLabel: user.email,
      kind: created ? "file_created_by_human" : "file_saved_by_human",
      detail: { path, version: file.version, previousVersion: previous?.version ?? null },
    });
    return json({ ok: true, file, created });
  } catch (error) {
    return fail(error);
  }
}
