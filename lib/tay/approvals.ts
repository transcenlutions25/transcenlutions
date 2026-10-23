/**
 * Approval queue.
 *
 * Nothing consequential happens from the conversation alone: Tay records a
 * proposal, the interface shows a plain-language explanation plus a short
 * visual preview, and only a recorded decision by an authorized human applies
 * the change. Approve, reject, and review later are all real states.
 */
import { getDatabase, type Database } from "./db";
import { newId, now } from "./auth";
import { audit, parseJson } from "./audit";
import { readProjectFile, recordArtifact, safeProjectPath, writeProjectFile } from "./projects";
import { applyReplacements, type Replacement } from "../../third_party/freebuff/str-replace";
import type { ApprovalKind, ApprovalRecord, ApprovalSlide, UserRecord } from "./types";

interface ApprovalRow {
  id: string;
  project_id: string;
  task_id: string | null;
  conversation_id: string | null;
  kind: string;
  title: string;
  summary: string;
  explanation: string;
  risk: string;
  payload: string;
  slides: string;
  status: string;
  requested_by: string;
  decided_by: string | null;
  decided_at: string | null;
  applied_at: string | null;
  apply_error: string | null;
  created_at: string;
}

function toApproval(row: ApprovalRow): ApprovalRecord {
  return {
    id: row.id,
    projectId: row.project_id,
    taskId: row.task_id,
    conversationId: row.conversation_id,
    kind: row.kind as ApprovalKind,
    title: row.title,
    summary: row.summary,
    explanation: row.explanation,
    risk: (row.risk as ApprovalRecord["risk"]) ?? "low",
    payload: parseJson(row.payload),
    slides: JSON.parse(row.slides) as ApprovalSlide[],
    status: row.status as ApprovalRecord["status"],
    requestedBy: row.requested_by,
    decidedBy: row.decided_by,
    decidedAt: row.decided_at,
    appliedAt: row.applied_at,
    applyError: row.apply_error,
    createdAt: row.created_at,
  };
}

export function requestApproval(
  db: Database,
  input: {
    projectId: string;
    taskId: string | null;
    conversationId: string | null;
    kind: ApprovalKind;
    title: string;
    summary: string;
    explanation: string;
    risk: ApprovalRecord["risk"];
    payload: Record<string, unknown>;
    slides: ApprovalSlide[];
    requestedBy: string;
  },
): ApprovalRecord {
  const id = newId("apr");
  const createdAt = now();
  db.run(
    `INSERT INTO approvals (id, project_id, task_id, conversation_id, kind, title, summary, explanation, risk, payload, slides, status, requested_by, created_at)
     VALUES (?,?,?,?,?,?,?,?,?,?,?, 'pending', ?, ?)`,
    [
      id,
      input.projectId,
      input.taskId,
      input.conversationId,
      input.kind,
      input.title.slice(0, 200),
      input.summary.slice(0, 600),
      input.explanation.slice(0, 1200),
      input.risk,
      JSON.stringify(input.payload),
      JSON.stringify(input.slides),
      input.requestedBy,
      createdAt,
    ],
  );
  audit(db, {
    projectId: input.projectId,
    actorId: input.requestedBy,
    actorLabel: "tay",
    kind: "approval_requested",
    detail: { approvalId: id, kind: input.kind, title: input.title, risk: input.risk },
  });
  return getApproval(db, id, input.projectId)!;
}

export function getApproval(db: Database, approvalId: string, projectId: string): ApprovalRecord | null {
  const row = db.get<ApprovalRow>("SELECT * FROM approvals WHERE id = ? AND project_id = ?", [approvalId, projectId]);
  return row ? toApproval(row) : null;
}

export function listApprovals(db: Database, projectId: string, status?: string, limit = 50): ApprovalRecord[] {
  const rows = status
    ? db.all<ApprovalRow>("SELECT * FROM approvals WHERE project_id = ? AND status = ? ORDER BY created_at DESC LIMIT ?", [
        projectId,
        status,
        Math.min(limit, 200),
      ])
    : db.all<ApprovalRow>("SELECT * FROM approvals WHERE project_id = ? ORDER BY created_at DESC LIMIT ?", [
        projectId,
        Math.min(limit, 200),
      ]);
  return rows.map(toApproval);
}

export function pendingApprovalCount(db: Database, projectId: string): number {
  return db.get<{ n: number }>("SELECT COUNT(*) AS n FROM approvals WHERE project_id = ? AND status IN ('pending','review_later')", [
    projectId,
  ])?.n ?? 0;
}

export interface DecisionResult {
  approval: ApprovalRecord;
  applied: boolean;
  error?: string;
}

/** Approving applies the change; rejecting and postponing never touch files. */
export function decideApproval(
  db: Database,
  approvalId: string,
  projectId: string,
  decision: "approve" | "reject" | "review_later",
  user: UserRecord,
): DecisionResult {
  const approval = getApproval(db, approvalId, projectId);
  if (!approval) throw new Error("Approval not found.");
  if (approval.status === "applied") return { approval, applied: false, error: "This change was already applied." };
  if (decision === "review_later") {
    db.run("UPDATE approvals SET status = 'review_later', decided_by = ?, decided_at = ? WHERE id = ?", [user.id, now(), approvalId]);
    audit(db, { projectId, actorId: user.id, actorLabel: user.email, kind: "approval_postponed", detail: { approvalId } });
    return { approval: getApproval(db, approvalId, projectId)!, applied: false };
  }
  if (decision === "reject") {
    db.run("UPDATE approvals SET status = 'rejected', decided_by = ?, decided_at = ? WHERE id = ?", [user.id, now(), approvalId]);
    audit(db, {
      projectId,
      actorId: user.id,
      actorLabel: user.email,
      kind: "approval_rejected",
      detail: { approvalId, kind: approval.kind },
    });
    return { approval: getApproval(db, approvalId, projectId)!, applied: false };
  }

  const outcome = applyProposal(db, approval, user);
  db.run("UPDATE approvals SET status = ?, decided_by = ?, decided_at = ?, applied_at = ?, apply_error = ? WHERE id = ?", [
    outcome.ok ? "applied" : "failed",
    user.id,
    now(),
    outcome.ok ? now() : null,
    outcome.error ?? null,
    approvalId,
  ]);
  audit(db, {
    projectId,
    actorId: user.id,
    actorLabel: user.email,
    kind: outcome.ok ? "approval_applied" : "approval_apply_failed",
    detail: { approvalId, kind: approval.kind, error: outcome.error ?? null },
  });
  return { approval: getApproval(db, approvalId, projectId)!, applied: outcome.ok, error: outcome.error };
}

interface ApplyOutcome {
  ok: boolean;
  error?: string;
}

/** Executes the recorded effect of an approved proposal. Server-side only. */
function applyProposal(db: Database, approval: ApprovalRecord, user: UserRecord): ApplyOutcome {
  if (approval.kind === "file_write") {
    const path = safeProjectPath(approval.payload.path);
    const content = approval.payload.content;
    if (!path) return { ok: false, error: "The stored file path is not allowed in a project sandbox." };
    if (typeof content !== "string") return { ok: false, error: "The stored content is not text." };
    const { file, created } = writeProjectFile(db, approval.projectId, path, content);
    recordArtifact(db, {
      projectId: approval.projectId,
      conversationId: approval.conversationId,
      taskId: approval.taskId,
      path,
      title: approval.title,
      kind: created ? "created_file" : "updated_file",
      version: file.version,
    });
    return { ok: true };
  }

  if (approval.kind === "file_edit") {
    const path = safeProjectPath(approval.payload.path);
    if (!path) return { ok: false, error: "The stored file path is not allowed in a project sandbox." };
    const existing = readProjectFile(db, approval.projectId, path);
    if (!existing) return { ok: false, error: "That file no longer exists in this project." };
    const replacements = approval.payload.replacements as Replacement[] | undefined;
    if (!Array.isArray(replacements) || replacements.length === 0) {
      return { ok: false, error: "The stored edit contains no replacements." };
    }
    const outcome = applyReplacements(existing.content, replacements);
    if (outcome.applied === 0) {
      return { ok: false, error: outcome.messages.join(" ") || "The edit did not match the current file." };
    }
    const { file } = writeProjectFile(db, approval.projectId, path, outcome.content);
    recordArtifact(db, {
      projectId: approval.projectId,
      conversationId: approval.conversationId,
      taskId: approval.taskId,
      path,
      title: approval.title,
      kind: "edited_file",
      version: file.version,
    });
    return { ok: true };
  }

  if (approval.kind === "business_action") {
    const action = approval.payload.action;
    if (typeof action !== "string") return { ok: false, error: "The stored business action is missing." };
    const db2 = getDatabase();
    if (action === "grant_run_task") {
      db2.run("INSERT INTO grants (id, subject_id, subject_label, scope, granted_by, created_at) VALUES (?,?,?,?,?,?)", [
        newId("grt"),
        approval.projectId,
        `Project ${approval.projectId}`,
        "run_task",
        user.email,
        now(),
      ]);
      return { ok: true };
    }
    if (action === "record_payment_link") {
      const invoiceId = approval.payload.invoiceId;
      if (typeof invoiceId !== "string") return { ok: false, error: "The stored invoice is missing." };
      db2.run("UPDATE invoices SET status = 'payment_link_ready', provider_ref = ?, updated_at = ? WHERE id = ? AND project_id = ?", [
        typeof approval.payload.providerRef === "string" ? approval.payload.providerRef : null,
        now(),
        invoiceId,
        approval.projectId,
      ]);
      return { ok: true };
    }
    if (action === "advance_delivery") {
      const deliveryId = approval.payload.deliveryId;
      if (typeof deliveryId !== "string") return { ok: false, error: "The stored delivery is missing." };
      db2.run("UPDATE deliveries SET status = ?, updated_at = ? WHERE id = ? AND project_id = ?", [
        typeof approval.payload.status === "string" ? approval.payload.status : "in_progress",
        now(),
        deliveryId,
        approval.projectId,
      ]);
      return { ok: true };
    }
    return { ok: false, error: "That business action is not recognized." };
  }

  if (approval.kind === "checkpoint_restore") {
    const files = approval.payload.files;
    if (!Array.isArray(files) || files.length === 0) {
      return { ok: false, error: "The stored checkpoint has no files." };
    }
    if (files.length > 60) return { ok: false, error: "That checkpoint holds more files than a restore accepts." };
    let restored = 0;
    for (const entry of files) {
      const record = entry as { path?: unknown; content?: unknown };
      const path = safeProjectPath(record.path);
      if (!path || typeof record.content !== "string") {
        return { ok: false, error: "The stored checkpoint contains an invalid file entry." };
      }
      const { file } = writeProjectFile(db, approval.projectId, path, record.content);
      recordArtifact(db, {
        projectId: approval.projectId,
        conversationId: approval.conversationId,
        taskId: approval.taskId,
        path,
        title: `Rewind restore · ${approval.title}`,
        kind: "restored_file",
        version: file.version,
      });
      restored++;
    }
    audit(db, {
      projectId: approval.projectId,
      actorId: user.id,
      actorLabel: user.email,
      kind: "checkpoint_restored",
      detail: { approvalId: approval.id, files: restored },
    });
    return { ok: true };
  }

  if (approval.kind === "memory_write") {
    const key = typeof approval.payload.key === "string" ? approval.payload.key : null;
    const value = typeof approval.payload.value === "string" ? approval.payload.value : null;
    if (!key || !value) return { ok: false, error: "The stored memory entry is incomplete." };
    db.run(
      "INSERT INTO memories (id, project_id, scope, key, value, updated_at) VALUES (?,?,?,?,?,?) ON CONFLICT(project_id, scope, key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at",
      [newId("mem"), approval.projectId, "project", key.slice(0, 120), value.slice(0, 4000), now()],
    );
    audit(db, { projectId: approval.projectId, actorId: user.id, actorLabel: user.email, kind: "memory_promoted", detail: { key } });
    return { ok: true };
  }

  return {
    ok: false,
    error:
      "This proposal type has no local effect. Outside actions stay unavailable until the owner connects and authorizes the provider.",
  };
}
