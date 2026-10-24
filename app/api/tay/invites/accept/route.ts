import { createHash } from "node:crypto";
import { cookies } from "next/headers";
import { getDatabase } from "../../../../../lib/tay/db";
import { createSession, createUser, normalizeEmail, SESSION_COOKIE, validatePassword } from "../../../../../lib/tay/auth";
import { audit } from "../../../../../lib/tay/audit";
import { newId, now } from "../../../../../lib/tay/auth";
import { fail, json, readJson, str } from "../../../../../lib/tay/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface InviteRow {
  id: string;
  email: string;
  role: string;
  scopes: string;
  expires_at: string;
  accepted_at: string | null;
  revoked_at: string | null;
}

/**
 * Acceptance is bound to the invited email: the single-use, expiring token is
 * delivered by the owner to that address, and the account created here carries
 * only the delegated scopes recorded on the invitation.
 */
export async function POST(request: Request) {
  try {
    const body = await readJson(request, 8192);
    const token = str(body.token, 200);
    const email = normalizeEmail(body.email);
    const password = validatePassword(body.password);
    const displayName = str(body.displayName, 80);
    if (!token || !email || !password || !displayName) {
      return json({ ok: false, error: "Enter the invite token, your name, email, and a password of at least 12 characters." }, 400);
    }

    const db = getDatabase();
    const invite = db.get<InviteRow>("SELECT * FROM invites WHERE token_hash = ?", [
      createHash("sha256").update(token).digest("hex"),
    ]);
    if (!invite) return json({ ok: false, error: "That invitation token is not valid." }, 404);
    if (invite.revoked_at) return json({ ok: false, error: "That invitation was revoked." }, 410);
    if (invite.accepted_at) return json({ ok: false, error: "That invitation was already used." }, 410);
    if (Date.parse(invite.expires_at) <= Date.now()) return json({ ok: false, error: "That invitation expired." }, 410);
    if (invite.email !== email) return json({ ok: false, error: "This invitation was issued to a different email address." }, 403);
    if (db.get<{ id: string }>("SELECT id FROM users WHERE email = ?", [email])) {
      return json({ ok: false, error: "An account already exists for that email." }, 409);
    }

    const user = createUser(db, email, password, displayName, "admin");
    db.run("UPDATE invites SET accepted_at = ? WHERE id = ?", [now(), invite.id]);

    const scopes = JSON.parse(invite.scopes) as string[];
    for (const scope of scopes.slice(0, 12)) {
      db.run("INSERT INTO grants (id, subject_id, subject_label, scope, granted_by, created_at) VALUES (?,?,?,?,?,?)", [
        newId("grt"),
        user.id,
        `Delegated to ${email}`,
        `${scope} (invitation)`,
        "founding owner",
        now(),
      ]);
    }
    audit(db, {
      projectId: null,
      actorId: user.id,
      actorLabel: email,
      kind: "admin_invite_accepted",
      detail: { inviteId: invite.id, scopes },
    });

    const { token: sessionToken, expiresAt } = createSession(db, user.id);
    const store = await cookies();
    store.set({
      name: SESSION_COOKIE,
      value: sessionToken,
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      expires: new Date(expiresAt),
    });
    return json({ ok: true, user: { id: user.id, email: user.email, displayName: user.displayName, role: user.role }, scopes });
  } catch (error) {
    return fail(error);
  }
}
