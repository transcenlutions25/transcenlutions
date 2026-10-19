/** Request-facing identity helpers for route handlers. */
import { cookies } from "next/headers";
import { getDatabase } from "./db";
import { sessionIdentityFromToken } from "./accounts";
import type { SessionIdentity } from "./types";

export const SESSION_COOKIE = "tay_session";

export * from "./accounts";

export async function currentIdentity(): Promise<SessionIdentity | null> {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
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
