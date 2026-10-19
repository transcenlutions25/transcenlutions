import { cookies } from "next/headers";
import { getDatabase } from "../../../../lib/tay/db";
import { bootstrapOwner, createSession, normalizeEmail, ownerExists, SESSION_COOKIE, validatePassword } from "../../../../lib/tay/auth";
import { fail, json, readJson } from "../../../../lib/tay/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Creates the founding owner once. After that this route always refuses, so
 * owner authority cannot be claimed by a later request, a header, or a prompt.
 */
export async function POST(request: Request) {
  try {
    const db = getDatabase();
    if (ownerExists(db)) {
      return json({ ok: false, error: "A founding owner already exists on this deployment." }, 409);
    }
    const body = await readJson(request, 8192);
    const email = normalizeEmail(body.email);
    const password = validatePassword(body.password);
    const displayName = typeof body.displayName === "string" ? body.displayName.trim().slice(0, 80) : "";
    if (!email || !password || displayName.length < 2) {
      return json({ ok: false, error: "Enter a display name, a valid email, and a password of at least 12 characters." }, 400);
    }
    const owner = bootstrapOwner(db, email, password, displayName);
    const { token, expiresAt } = createSession(db, owner.id);
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
    return json({ ok: true, user: { id: owner.id, email: owner.email, displayName: owner.displayName, isOwner: true } });
  } catch (error) {
    return fail(error);
  }
}
