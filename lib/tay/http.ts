/** Shared HTTP boundary for the Tay workspace routes. */
import { readJson as boundedReadJson, RequestError, requestError } from "../request-security";
import { getDatabase, WorkspaceStorageError } from "./db";
import { AuthError, currentIdentity, loadProjectForUser } from "./auth";
import type { ProjectRowInternal } from "./projects";
import type { ProjectRecord, SessionIdentity, UserRecord } from "./types";

export { RequestError, requestError };

export function json(body: unknown, status = 200): Response {
  return Response.json(body, { status, headers: { "Cache-Control": "no-store" } });
}

export function fail(error: unknown): Response {
  if (error instanceof RequestError || error instanceof AuthError || error instanceof WorkspaceStorageError) {
    return json({ ok: false, error: error.message }, error.status);
  }
  const message = error instanceof Error ? error.message : "Unexpected failure.";
  return json({ ok: false, error: message }, 400);
}

const HOST_PATTERN = /^(?:(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)*[a-z0-9](?:[a-z0-9-]*[a-z0-9])?|\[[0-9a-f:]+\])(?::\d{1,5})?$/i;
const LOOPBACK_PATTERN = /^(?:localhost|127\.0\.0\.1|\[::1\])(?::\d{1,5})?$/i;

/**
 * The operator's canonical public origin, when one is pinned via
 * TAY_PUBLIC_ORIGIN. A deployment behind a proxy sets this so no request header
 * can redefine which origin is permitted.
 */
function configuredOrigin(): string | null {
  const raw = process.env.TAY_PUBLIC_ORIGIN?.trim();
  if (!raw) return null;
  try {
    const url = new URL(raw);
    if (url.protocol !== "https:" && url.protocol !== "http:") return null;
    if (url.username || url.password || url.search || url.hash || url.pathname !== "/") return null;
    if (url.protocol !== "https:" && !LOOPBACK_PATTERN.test(url.host)) return null;
    return url.origin;
  } catch {
    return null;
  }
}

function singleHeader(value: string | null): string | null {
  if (!value) return null;
  const parts = value.split(",");
  if (parts.length !== 1) return null;
  const trimmed = parts[0]!.trim().toLowerCase();
  return trimmed || null;
}

/**
 * The origin the browser actually used. TAY_PUBLIC_ORIGIN wins when set; a
 * proxy pair is otherwise only honoured when it names the same host the server
 * received or a loopback host, so a forwarded header cannot redefine the
 * permitted origin. Cross-site requests still fail the comparison in readJson.
 */
export function sameOrigin(request: Request): string {
  const configured = configuredOrigin();
  if (configured) return configured;

  const url = new URL(request.url);
  const forwardedHost = singleHeader(request.headers.get("x-forwarded-host"));
  const forwardedProto = singleHeader(request.headers.get("x-forwarded-proto"));
  if (
    forwardedHost &&
    HOST_PATTERN.test(forwardedHost) &&
    (forwardedHost === url.host.toLowerCase() || LOOPBACK_PATTERN.test(forwardedHost))
  ) {
    const protocol = forwardedProto === "http" || forwardedProto === "https" ? forwardedProto : url.protocol.replace(":", "");
    return `${protocol}://${forwardedHost}`;
  }

  // The Host header the server received, when it is a plain host name or address.
  const host = singleHeader(request.headers.get("host"));
  if (host && HOST_PATTERN.test(host)) return `${url.protocol}//${host}`;
  return url.origin;
}

/** Bounded, same-origin JSON reading. Every mutating route calls this directly. */
export async function readJson(request: Request, max = 65536): Promise<Record<string, unknown>> {
  return boundedReadJson(request, max, sameOrigin(request));
}

export interface AuthedRoute {
  user: UserRecord;
  identity: SessionIdentity;
}

/** Rejects unauthenticated requests; never falls back to a development identity. */
export async function requireUser(): Promise<AuthedRoute> {
  const identity = await currentIdentity();
  if (!identity) throw new AuthError(401, "Sign in to use the Tay workspace.");
  return { user: identity.user, identity };
}

/** Resolves a project and proves the signed-in user has access to it. */
export async function requireProject(projectId: string) {
  const { user, identity } = await requireUser();
  const project = loadProjectForUser(getDatabase(), projectId, user);
  if (!project) throw new AuthError(404, "That project is not available to this account.");
  return { user, identity, project };
}

export function projectRow(project: ProjectRecord): ProjectRowInternal {
  return {
    id: project.id,
    owner_id: project.ownerId,
    name: project.name,
    summary: project.summary,
    status: project.status,
    created_at: project.createdAt,
    updated_at: project.updatedAt,
  };
}

export function requireEdit(project: ProjectRecord): void {
  if (!project.access.canEdit) throw new AuthError(403, "This account has read-only access to that project.");
}

export function requireApprove(project: ProjectRecord): void {
  if (!project.access.canApprove) throw new AuthError(403, "This account cannot decide approvals in that project.");
}

export function requireAdmin(project: ProjectRecord): void {
  if (!project.access.canAdminister) throw new AuthError(403, "Only a project administrator can do that.");
}

export function str(value: unknown, max: number): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed || trimmed.length > max) return null;
  return trimmed;
}

