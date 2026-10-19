import { getDatabase } from "../../../../../lib/tay/db";
import { createConversation, listArtifacts, listConversations, listMemory, listMessages, listProjectFiles, listTasks, readProjectFile } from "../../../../../lib/tay/projects";
import { listApprovals } from "../../../../../lib/tay/approvals";
import { listAudit } from "../../../../../lib/tay/audit";
import { authorityTree, listAgents, skillTree } from "../../../../../lib/tay/registry";
import { businessState } from "../../../../../lib/tay/business";
import { modelStatus } from "../../../../../lib/tay/model";
import { fail, json, requireProject } from "../../../../../lib/tay/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Everything the workspace needs to render one project in a single round trip. */
export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const { project, user } = await requireProject(id);
    const db = getDatabase();
    const url = new URL(request.url);
    const requestedConversation = url.searchParams.get("conversationId");

    const conversations = listConversations(db, project.id);
    const conversation =
      (requestedConversation ? conversations.find((entry) => entry.id === requestedConversation) : null) ??
      conversations[0] ??
      createConversation(db, project.id, `Welcome to ${project.name}`);
    if (conversations.length === 0) conversations.push(conversation);

    const filePath = url.searchParams.get("file");
    const selectedFile = filePath ? readProjectFile(db, project.id, filePath) : null;
    const model = await modelStatus();

    return json({
      ok: true,
      project,
      user: { id: user.id, email: user.email, displayName: user.displayName, isOwner: user.isOwner },
      conversations,
      conversation,
      messages: listMessages(db, conversation.id),
      approvals: listApprovals(db, project.id),
      tasks: listTasks(db, project.id),
      files: listProjectFiles(db, project.id),
      selectedFile,
      memory: listMemory(db, project.id),
      artifacts: listArtifacts(db, project.id),
      audit: listAudit(project.id, 25),
      agents: listAgents(),
      skills: skillTree(),
      authority: authorityTree(),
      business: businessState(db, project.id),
      model,
    });
  } catch (error) {
    return fail(error);
  }
}
