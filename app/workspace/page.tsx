import type { Metadata } from "next";
import { TayAuth } from "../../components/tay/tay-auth";
import { TayWorkspace } from "../../components/tay/tay-workspace";
import type { ProjectSummary } from "../../components/tay/tay-types";
import { currentIdentity, countUsers, ownerExists, projectAccess } from "../../lib/tay/auth";
import { getDatabase, WorkspaceStorageError, type Database } from "../../lib/tay/db";
import { listConversations, listProjectsForUser } from "../../lib/tay/projects";
import { pendingApprovalCount } from "../../lib/tay/approvals";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export const metadata: Metadata = {
  title: "Tay workspace | Transcenlutions",
  description:
    "The consolidated Transcenlutions command room: project conversations, approvals, file changes, authorized task runs and business records.",
};

/**
 * One application: identity is resolved on the server, so an unauthenticated
 * visitor never receives project data or an owner interface.
 */
export default async function WorkspacePage() {
  let db: Database;
  try {
    db = getDatabase();
  } catch (error) {
    if (!(error instanceof WorkspaceStorageError)) throw error;
    return (
      <main className="tl-shell tl-auth">
        <div className="tl-panel tl-panel-strong tl-auth-card">
          <p className="tl-brand-mark">TRANSCENLUTIONS</p>
          <h1 style={{ margin: "0.3rem 0 0.4rem", fontSize: "1.35rem" }}>Tay is temporarily unavailable</h1>
          <p className="tl-small tl-muted" role="status">
            Workspace storage needs attention before you can sign in or save work. Please try again later.
          </p>
          <a className="tl-button" href="/workspace">Try again</a>
        </div>
      </main>
    );
  }
  const identity = await currentIdentity();

  if (!identity) {
    return (
      <TayAuth
        setup={{
          users: countUsers(db),
          ownerExists: ownerExists(db),
          ownerEmailConfigured: Boolean(process.env.TAY_OWNER_EMAIL),
        }}
      />
    );
  }

  const projects: ProjectSummary[] = listProjectsForUser(db, identity.user).map((row) => ({
    id: row.id,
    name: row.name,
    summary: row.summary,
    status: row.status === "archived" ? "archived" : "active",
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    access: projectAccess(db, row, identity.user),
    conversationId: listConversations(db, row.id, 1)[0]?.id ?? null,
    pendingApprovals: pendingApprovalCount(db, row.id),
  }));

  return (
    <TayWorkspace
      user={{
        id: identity.user.id,
        email: identity.user.email,
        displayName: identity.user.displayName,
        role: identity.user.role,
        isOwner: identity.user.isOwner,
      }}
      initialProjects={projects}
    />
  );
}
