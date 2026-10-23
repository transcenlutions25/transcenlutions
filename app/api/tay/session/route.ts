import { cookies } from "next/headers";
import { getDatabase } from "../../../../lib/tay/db";
import {
  authenticate,
  clearSessionCookie,
  countUsers,
  createSession,
  normalizeEmail,
  ownerExists,
  revokeSession,
  SESSION_COOKIE,
  publicUserProfile,
  sessionIdentityFromToken,
  validatePassword,
} from "../../../../lib/tay/auth";
import { audit } from "../../../../lib/tay/audit";
import { modelStatus } from "../../../../lib/tay/model";
import { fail, json, readJson } from "../../../../lib/tay/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const db = getDatabase();
    const store = await cookies();
    const identity = sessionIdentityFromToken(db, store.get(SESSION_COOKIE)?.value);
    const model = await modelStatus();
    return json({
      ok: true,
      setup: {
        users: countUsers(db),
        ownerExists: ownerExists(db),
        ownerEmailConfigured: Boolean(process.env.TAY_OWNER_EMAIL),
      },
      session: identity ? { user: publicUserProfile(identity.user), expiresAt: identity.expiresAt } : null,
      model,
    });
  } catch (error) {
    return fail(error);
  }
}

export async function POST(request: Request) {
  try {
    const body = await readJson(request, 8192);
    const email = normalizeEmail(body.email);
    const password = validatePassword(body.password);
    if (!email || !password) {
      return json({ ok: false, error: "Enter a valid email and a password of at least 12 characters." }, 400);
    }
    const db = getDatabase();
    const user = authenticate(db, email, password);
    if (!user) {
      audit(db, { projectId: null, actorId: null, actorLabel: email, kind: "login_failed", detail: {} });
      return json({ ok: false, error: "Email or password is incorrect." }, 401);
    }
    const { token, expiresAt } = createSession(db, user.id);
    const store = await cookies();
    store.set({
      name: SESSION_COOKIE,
      value: token,
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      expires: new Date(expiresAt),
    });
    audit(db, { projectId: null, actorId: user.id, actorLabel: email, kind: "login_succeeded", detail: {} });
    return json({ ok: true, user: publicUserProfile(user) });
  } catch (error) {
    return fail(error);
  }
}

export async function DELETE() {
  try {
    const db = getDatabase();
    const store = await cookies();
    const token = store.get(SESSION_COOKIE)?.value;
    if (token) revokeSession(db, token);
    clearSessionCookie(store);
    return json({ ok: true });
  } catch (error) {
    return fail(error);
  }
}
