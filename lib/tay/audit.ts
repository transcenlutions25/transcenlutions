/** Append-only audit trail for the Tay workspace. */
import { getDatabase, type Database } from "./db";
import { newId, now } from "./auth";
import type { AuditEvent } from "./types";

export function audit(
  db: Database,
  input: {
    projectId: string | null;
    actorId: string | null;
    actorLabel: string;
    kind: string;
    detail?: Record<string, unknown>;
  },
): void {
  db.run("INSERT INTO audit_events (id, project_id, actor_id, actor_label, kind, detail, at) VALUES (?,?,?,?,?,?,?)", [
    newId("evt"),
    input.projectId,
    input.actorId,
    input.actorLabel.slice(0, 120),
    input.kind,
    JSON.stringify(input.detail ?? {}),
    now(),
  ]);
}

export function listAudit(projectId: string, limit = 40): AuditEvent[] {
  const rows = getDatabase().all<{
    id: string;
    project_id: string | null;
    actor_id: string | null;
    actor_label: string;
    kind: string;
    detail: string;
    at: string;
  }>("SELECT * FROM audit_events WHERE project_id = ? ORDER BY at DESC LIMIT ?", [projectId, Math.min(limit, 200)]);
  return rows.map((row) => ({
    id: row.id,
    projectId: row.project_id,
    actorId: row.actor_id,
    actorLabel: row.actor_label,
    kind: row.kind,
    detail: parseJson(row.detail),
    at: row.at,
  }));
}

export function parseJson(value: string | null): Record<string, unknown> {
  if (!value) return {};
  try {
    const parsed = JSON.parse(value);
    return parsed && typeof parsed === "object" ? (parsed as Record<string, unknown>) : {};
  } catch {
    return {};
  }
}
