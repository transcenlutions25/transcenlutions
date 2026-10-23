import { createHash, randomBytes } from "node:crypto";
import { getDatabase } from "../../../../lib/tay/db";
import { audit } from "../../../../lib/tay/audit";
import { newId, now, normalizeEmail, requireOwner } from "../../../../lib/tay/auth";
import { agentActionList, listAgents } from "../../../../lib/tay/registry";
import { fail, json, readJson, requireUser, str } from "../../../../lib/tay/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const INVITE_DAYS = 7;

/** Everything here is owner-only and re-checked server-side on every call. */
export async function GET() {
  try {
    const { user } = await requireUser();
    requireOwner(user);
    const db = getDatabase();
    const users = db.all<{ id: string; email: string; display_name: string; role: string; is_owner: number; created_at: string }>(
      "SELECT id, email, display_name, role, is_owner, created_at FROM users ORDER BY created_at ASC",
    );
    const invites = db.all<{
      id: string;
      email: string;
      role: string;
      scopes: string;
      created_at: string;
      expires_at: string;
      accepted_at: string | null;
      revoked_at: string | null;
    }>("SELECT id, email, role, scopes, created_at, expires_at, accepted_at, revoked_at FROM invites ORDER BY created_at DESC LIMIT 50");
    const grants = db.all<{ id: string; subject_id: string; subject_label: string; scope: string; granted_by: string; created_at: string; revoked_at: string | null }>(
      "SELECT * FROM grants ORDER BY created_at DESC LIMIT 100",
    );
    return json({
      ok: true,
      users: users.map((row) => ({
        id: row.id,
        email: row.email,
        displayName: row.display_name,
        role: row.role,
        isOwner: row.is_owner === 1,
        createdAt: row.created_at,
      })),
      invites: invites.map((row) => ({
        id: row.id,
        email: row.email,
        role: row.role,
        scopes: JSON.parse(row.scopes) as string[],
        createdAt: row.created_at,
        expiresAt: row.expires_at,
        acceptedAt: row.accepted_at,
        revokedAt: row.revoked_at,
      })),
      grants,
      agents: listAgents(),
      availableActions: agentActionList,
    });
  } catch (error) {
    return fail(error);
  }
}

export async function POST(request: Request) {
  try {
    const { user } = await requireUser();
    requireOwner(user);
    const body = await readJson(request, 32768);
    const action = str(body.action, 40);
    const db = getDatabase();

    if (action === "invite_admin") {
      const email = normalizeEmail(body.email);
      const scopes = Array.isArray(body.scopes) ? body.scopes.filter((scope): scope is string => typeof scope === "string").slice(0, 12) : [];
      if (!email) return json({ ok: false, error: "A valid email is required." }, 400);
      if (scopes.length === 0) return json({ ok: false, error: "Choose at least one delegated scope." }, 400);
      const existing = db.get<{ id: string }>("SELECT id FROM users WHERE email = ?", [email]);
      if (existing) return json({ ok: false, error: "That email already has an account on this deployment." }, 409);
      const token = randomBytes(24).toString("base64url");
      const id = newId("inv");
      const createdAt = now();
      const expiresAt = new Date(Date.now() + INVITE_DAYS * 86_400_000).toISOString();
      db.run(
        "INSERT INTO invites (id, email, role, scopes, token_hash, invited_by, created_at, expires_at, accepted_at, revoked_at) VALUES (?,?,?,?,?,?,?,?,NULL,NULL)",
        [id, email, "admin", JSON.stringify(scopes), hashToken(token), user.id, createdAt, expiresAt],
      );
      audit(db, { projectId: null, actorId: user.id, actorLabel: user.email, kind: "admin_invited", detail: { email, scopes } });
      return json({
        ok: true,
        invite: { id, email, scopes, expiresAt },
        // Returned exactly once. Delivering it is a human action: no email
        // provider is connected, and this workspace does not send.
        token,
        notice:
          "Deliver this single-use token to the invited person yourself. No email provider is connected, so Transcenlutions did not send it.",
      });
    }

    if (action === "revoke_invite") {
      const inviteId = str(body.inviteId, 80);
      if (!inviteId) return json({ ok: false, error: "An invite id is required." }, 400);
      const result = db.get<{ id: string }>("SELECT id FROM invites WHERE id = ?", [inviteId]);
      if (!result) return json({ ok: false, error: "That invitation is not on this deployment." }, 404);
      db.run("UPDATE invites SET revoked_at = ? WHERE id = ?", [now(), inviteId]);
      audit(db, { projectId: null, actorId: user.id, actorLabel: user.email, kind: "admin_invite_revoked", detail: { inviteId } });
      return json({ ok: true });
    }

    if (action === "create_agent") {
      const name = str(body.name, 60);
      const purpose = str(body.purpose, 240);
      const instructions = str(body.instructions, 4000);
      const picture = str(body.picture, 200);
      const voice = str(body.voice, 80);
      const activate = body.activate === true;
      const requested = Array.isArray(body.allowedActions) ? body.allowedActions.filter((value): value is string => typeof value === "string") : [];
      if (!name || !purpose || !instructions) {
        return json({ ok: false, error: "An admin agent needs a name, a purpose and instructions." }, 400);
      }
      // An agent can never be granted more than the orchestrator's own actions.
      const allowed = requested.filter((value) => agentActionList.includes(value as never)).slice(0, 12);
      const forbidden = ["hire_or_fire_human", "sensitive_content", "change_system_settings"];
      const safeAllowed = allowed.filter((value) => !forbidden.includes(value));
      const id = newId("agt");
      const timestamp = now();
      db.run(
        "INSERT INTO custom_agents (id, owner_id, name, purpose, instructions, authority, status, allowed_actions, approval_required_for, picture, voice, created_at, updated_at) VALUES (?,?,?,?,?, 'admin_agent', ?, ?, ?, ?, ?, ?, ?)",
        [
          id,
          user.id,
          name,
          purpose,
          instructions,
          activate ? "active" : "draft",
          JSON.stringify(safeAllowed),
          JSON.stringify(["external_commitment", "payment", "send_communication"]),
          picture,
          voice,
          timestamp,
          timestamp,
        ],
      );
      audit(db, {
        projectId: null,
        actorId: user.id,
        actorLabel: user.email,
        kind: activate ? "admin_agent_activated" : "admin_agent_drafted",
        detail: { agentId: id, allowedActions: safeAllowed },
      });
      return json({ ok: true, agentId: id, status: activate ? "active" : "draft", allowedActions: safeAllowed });
    }

    if (action === "set_agent_status") {
      const agentId = str(body.agentId, 80);
      const status = str(body.status, 20);
      if (!agentId || !status || !["draft", "active", "suspended"].includes(status)) {
        return json({ ok: false, error: "Supply an agent id and one of: draft, active, suspended." }, 400);
      }
      const existing = db.get<{ id: string }>("SELECT id FROM custom_agents WHERE id = ?", [agentId]);
      if (!existing) return json({ ok: false, error: "Canonical agents cannot be suspended from here." }, 404);
      db.run("UPDATE custom_agents SET status = ?, updated_at = ? WHERE id = ?", [status, now(), agentId]);
      audit(db, { projectId: null, actorId: user.id, actorLabel: user.email, kind: "admin_agent_status", detail: { agentId, status } });
      return json({ ok: true });
    }

    if (action === "revoke_grant") {
      const grantId = str(body.grantId, 80);
      if (!grantId) return json({ ok: false, error: "A grant id is required." }, 400);
      db.run("UPDATE grants SET revoked_at = ? WHERE id = ?", [now(), grantId]);
      audit(db, { projectId: null, actorId: user.id, actorLabel: user.email, kind: "grant_revoked", detail: { grantId } });
      return json({ ok: true });
    }

    return json({ ok: false, error: "Unknown administration action." }, 400);
  } catch (error) {
    return fail(error);
  }
}

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}
