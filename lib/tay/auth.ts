/** Request-facing identity helpers for route handlers. */
import { cookies } from "next/headers";
import { getDatabase } from "./db";
import { sessionIdentityFromToken } from "./accounts";
import type { SessionIdentity } from "./types";

export const SESSION_COOKIE = "tay_session";

// Console-only owner provisioning is intentionally not exposed to routes.
export {
  AuthError,
  authenticate,
  countUsers,
  createSession,
  createUser,
  getUserByEmail,
  hashPassword,
  loadProjectForUser,
  newId,
  normalizeEmail,
  now,
  ownerExists,
  projectAccess,
  publicUserProfile,
  requireOwner,
  revokeSession,
  sessionIdentityFromToken,
  signPayload,
  tokenHash,
  validatePassword,
  verifyPassword,
} from "./accounts";
export type { ProjectRow } from "./accounts";

export async function currentIdentity(): Promise<SessionIdentity | null> {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (!token || token.length > 200) return null;
  return sessionIdentityFromToken(getDatabase(), token);
}

interface CookieWriter {
  set(value: {
    name: string;
    value: string;
    httpOnly: boolean;
    sameSite: "lax";
    secure: boolean;
    path: string;
    expires?: Date;
    maxAge?: number;
  }): void;
}

export function setSessionCookie(store: CookieWriter, token: string, expiresAt: string): void {
  store.set({
    name: SESSION_COOKIE,
    value: token,
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires: new Date(expiresAt),
  });
}

export function clearSessionCookie(store: CookieWriter): void {
  store.set({
    name: SESSION_COOKIE,
    value: "",
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0,
  });
}
