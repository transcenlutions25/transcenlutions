/**
 * Identity, sessions and project-scoped authority.
 *
 * Identity is bound server-side to an immutable founding-owner record. Owner
 * authority is never inferred from a display name, email text, header, prompt
 * or client-supplied role: only the `users.is_owner` flag, set when the first
 * owner account is created (and only when it matches TAY_OWNER_EMAIL when that
 * variable is configured), can grant it.
 *
 * This module deliberately avoids `next/headers` so the whole flow can be tested
 * outside a request context; `auth.ts` adds the cookie-facing wrapper.
 */
import { createHash, createHmac, randomBytes, scryptSync, timingSafeEqual } from "node:crypto";
import { getDatabase, type Database } from "./db";
import { audit } from "./audit";
import type { ProjectAccess, ProjectRecord, SessionIdentity, UserRecord, UserRole } from "./types";

const SESSION_DAYS = 14;
const SCRYPT_KEYLEN = 32;

interface UserRow {
  id: string;
  email: string;
  display_name: string;
  role: string;
  is_owner: number;
  disabled: number;
  password_salt: string;
  password_hash: string;
  created_at: string;
}

function sessionSecret(): string {
  return process.env.TAY_SESSION_SECRET || "transcenlutions-local-development-secret";
}

export function newId(prefix: string): string {
  return `${prefix}_${randomBytes(12).toString("hex")}`;
}

export function now(): string {
  return new Date().toISOString();
}

export function hashPassword(password: string, salt = randomBytes(16).toString("hex")) {
  const hash = scryptSync(password, salt, SCRYPT_KEYLEN).toString("hex");
  return { salt, hash };
}

export function verifyPassword(password: string, salt: string, expected: string): boolean {
  try {
    const actual = scryptSync(password, salt, SCRYPT_KEYLEN);
    const wanted = Buffer.from(expected, "hex");
    return actual.length === wanted.length && timingSafeEqual(actual, wanted);
  } catch {
    return false;
  }
}

function toUser(row: UserRow): UserRecord {
  return {
    id: row.id,
    email: row.email,
    displayName: row.display_name,
    role: (row.role as UserRole) ?? "member",
    isOwner: row.is_owner === 1,
    disabled: row.disabled === 1,
    createdAt: row.created_at,
  };
}

export function normalizeEmail(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const email = value.trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email) || email.length > 190) return null;
  return email;
}

export function validatePassword(value: unknown): string | null {
  if (typeof value !== "string") return null;
  if (value.length < 12 || value.length > 200) return null;
  return value;
}

export function getUserByEmail(db: Database, email: string): (UserRecord & { salt: string; hash: string }) | null {
  const row = db.get<UserRow>("SELECT * FROM users WHERE email = ?", [email]);
  return row ? { ...toUser(row), salt: row.password_salt, hash: row.password_hash } : null;
}

export function countUsers(db: Database): number {
  return db.get<{ n: number }>("SELECT COUNT(*) AS n FROM users")?.n ?? 0;
}

/** Verifies credentials without revealing whether the account exists. */
export function authenticate(db: Database, email: string, password: string): UserRecord | null {
  const record = getUserByEmail(db, email);
  if (!record) {
    // Equalize work so a missing account is not detectable by response time.
    hashPassword(password, "00000000000000000000000000000000");
    return null;
  }
  if (record.disabled) return null;
  return verifyPassword(password, record.salt, record.hash) ? record : null;
}

export function ownerExists(db: Database): boolean {
  return (db.get<{ n: number }>("SELECT COUNT(*) AS n FROM users WHERE is_owner = 1")?.n ?? 0) > 0;
}

/**
 * Creates the founding owner. Only valid while no owner exists. The configured
 * TAY_OWNER_EMAIL, when present, must match exactly; this keeps the binding to
 * one verified address instead of "whoever signed up first" on a live host.
 */
export function bootstrapOwner(db: Database, email: string, password: string, displayName: string): UserRecord {
  if (ownerExists(db)) throw new Error("A founding owner already exists.");
  const configured = process.env.TAY_OWNER_EMAIL?.trim().toLowerCase();
  if (configured && configured !== email) {
    throw new Error("The founding owner email does not match the configured owner identity.");
  }
  if (!configured && process.env.NODE_ENV === "production") {
    throw new Error("Set TAY_OWNER_EMAIL before creating the founding owner on a hosted deployment.");
  }
  const { salt, hash } = hashPassword(password);
  const user: UserRecord = {
    id: newId("usr"),
    email,
    displayName: displayName.slice(0, 80),
    role: "owner",
    isOwner: true,
    disabled: false,
    createdAt: now(),
  };
  db.run(
    "INSERT INTO users (id, email, display_name, role, is_owner, disabled, password_salt, password_hash, created_at) VALUES (?,?,?,?,?,?,?,?,?)",
    [user.id, user.email, user.displayName, user.role, 1, 0, salt, hash, user.createdAt],
  );
  audit(db, {
    projectId: null,
    actorId: user.id,
    actorLabel: user.email,
    kind: "owner_bootstrapped",
    detail: { ownerBinding: configured ? "env_matched" : "local_first_owner" },
  });
  return user;
}

export function createUser(db: Database, email: string, password: string, displayName: string, role: UserRole): UserRecord {
  const { salt, hash } = hashPassword(password);
  const user: UserRecord = {
    id: newId("usr"),
    email,
    displayName: displayName.slice(0, 80),
    role,
    isOwner: false,
    disabled: false,
    createdAt: now(),
  };
  db.run(
    "INSERT INTO users (id, email, display_name, role, is_owner, disabled, password_salt, password_hash, created_at) VALUES (?,?,?,?,?,?,?,?,?)",
    [user.id, user.email, user.displayName, user.role, 0, 0, salt, hash, user.createdAt],
  );
  return user;
}

export function createSession(db: Database, userId: string): { token: string; expiresAt: string } {
  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 86_400_000).toISOString();
  db.run("INSERT INTO sessions (id, user_id, created_at, expires_at, revoked) VALUES (?,?,?,?,0)", [
    tokenHash(token),
    userId,
    now(),
    expiresAt,
  ]);
  return { token, expiresAt };
}

export function tokenHash(token: string): string {
  return createHash("sha256").update(`${token}${sessionSecret()}`).digest("hex");
}

export function revokeSession(db: Database, token: string): void {
  db.run("UPDATE sessions SET revoked = 1 WHERE id = ?", [tokenHash(token)]);
}

export function sessionIdentityFromToken(db: Database, token: string | undefined): SessionIdentity | null {
  if (!token || token.length > 200) return null;
  const row = db.get<{ user_id: string; expires_at: string; revoked: number }>(
    "SELECT user_id, expires_at, revoked FROM sessions WHERE id = ?",
    [tokenHash(token)],
  );
  if (!row || row.revoked === 1) return null;
  if (Date.parse(row.expires_at) <= Date.now()) return null;
  const user = db.get<UserRow>("SELECT * FROM users WHERE id = ?", [row.user_id]);
  if (!user || user.disabled === 1) return null;
  return { user: toUser(user), sessionId: tokenHash(token).slice(0, 16), expiresAt: row.expires_at };
}

export function signPayload(value: string): string {
  return createHmac("sha256", sessionSecret()).update(value).digest("base64url");
}

/* ------------------------------------------------------------------ */
/* Project-scoped authorization                                        */
/* ------------------------------------------------------------------ */

export interface ProjectRow {
  id: string;
  owner_id: string;
  name: string;
  summary: string;
  status: string;
  created_at: string;
  updated_at: string;
}

export function projectAccess(db: Database, project: ProjectRow, user: UserRecord): ProjectAccess {
  if (user.isOwner && project.owner_id === user.id) {
    return { role: "owner", canEdit: true, canApprove: true, canAdminister: true };
  }
  const member = db.get<{ role: string }>("SELECT role FROM project_members WHERE project_id = ? AND user_id = ?", [
    project.id,
    user.id,
  ]);
  if (member) {
    const role = member.role === "admin" ? "admin" : "member";
    return { role, canEdit: true, canApprove: true, canAdminister: false };
  }
  // The founding owner may enter any project on this deployment, but never
  // inherits another account's private data through a client-supplied id.
  if (user.isOwner) return { role: "owner", canEdit: true, canApprove: true, canAdminister: true };
  return { role: "member", canEdit: false, canApprove: false, canAdminister: false };
}

export function loadProjectForUser(db: Database, projectId: string, user: UserRecord): ProjectRecord | null {
  const project = db.get<ProjectRow>("SELECT * FROM projects WHERE id = ?", [projectId]);
  if (!project) return null;
  const access = projectAccess(db, project, user);
  const visible = user.isOwner || project.owner_id === user.id || access.canEdit;
  if (!visible) return null;
  return {
    id: project.id,
    ownerId: project.owner_id,
    name: project.name,
    summary: project.summary,
    status: project.status === "archived" ? "archived" : "active",
    createdAt: project.created_at,
    updatedAt: project.updated_at,
    access,
  };
}

/** The public shape of an account, safe to return to its own session. */
export function publicUserProfile(user: UserRecord) {
  return {
    id: user.id,
    email: user.email,
    displayName: user.displayName,
    role: user.role,
    isOwner: user.isOwner,
  };
}

export function requireOwner(user: UserRecord): void {
  if (!user.isOwner) throw new AuthError(403, "Only the founding owner can perform this action.");
}

export class AuthError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}
