export type PlatformRole = "owner" | "admin" | "member" | "learner" | "child";

export interface PlatformIdentity {
  userId: string;
  tenantId: string;
  role: PlatformRole;
  sessionId: string;
  source: "internal_dev" | "authenticated";
}

export interface IdentityResolution {
  ok: boolean;
  identity: PlatformIdentity | null;
  error?: string;
}

function clean(value: string | null, max = 160): string | null {
  const result = value?.trim().slice(0, max);
  return result || null;
}

function validRole(value: string | null): value is PlatformRole {
  return ["owner", "admin", "member", "learner", "child"].includes(value ?? "");
}

/**
 * Identity/Tenant Foundation v1.
 *
 * Production intentionally fails closed until a real authenticated provider
 * binds these values server-side. Development identity is opt-in so tests and
 * local work can exercise tenant-aware contracts without pretending to be auth.
 */
export function resolvePlatformIdentity(request: Request): IdentityResolution {
  if (process.env.NODE_ENV === "production") {
    return {
      ok: false,
      identity: null,
      error: "Authenticated platform identity is not configured.",
    };
  }

  if (process.env.TAY_ALLOW_DEV_IDENTITY !== "true") {
    return {
      ok: false,
      identity: null,
      error: "Development identity is disabled.",
    };
  }

  const userId = clean(request.headers.get("x-tay-dev-user"));
  const tenantId = clean(request.headers.get("x-tay-dev-tenant"));
  const sessionId = clean(request.headers.get("x-tay-dev-session"));
  const role = clean(request.headers.get("x-tay-dev-role"));

  if (!userId || !tenantId || !sessionId || !validRole(role)) {
    return {
      ok: false,
      identity: null,
      error: "Complete development identity headers are required.",
    };
  }

  return {
    ok: true,
    identity: { userId, tenantId, sessionId, role, source: "internal_dev" },
  };
}

export function requirePlatformIdentity(request: Request): PlatformIdentity {
  const resolved = resolvePlatformIdentity(request);
  if (!resolved.ok || !resolved.identity) {
    throw new Error(resolved.error ?? "Platform identity unavailable.");
  }
  return resolved.identity;
}
