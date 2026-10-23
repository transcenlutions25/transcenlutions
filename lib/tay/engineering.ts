/**
 * Engineering sessions: a Devin-style autonomous coding workflow inside Tay.
 *
 * The capability model is adapted from Cognition's Devin (provenance and limits
 * are recorded in `docs/tay-devin-style-engineering.md`): a scoped session, an
 * inspectable plan, a worklog, repository tools, verification runs,
 * checkpoints, reusable playbooks and a reviewable handoff.
 *
 * What this module can really do in this deployment:
 *   - read the running repository (bounded, read-only, secret files refused)
 *   - search it and map it
 *   - turn a request into a phased plan with acceptance criteria
 *   - run an allowlist of check commands (typecheck, lint, tests, git status)
 *   - propose edits to the project sandbox, which apply only after approval
 *   - checkpoint the project sandbox and restore it through another approval
 *   - write a PR-style handoff pack as a project artifact
 *
 * What it cannot do, and never claims: boot a VM, clone a remote repository,
 * push a branch, open a pull request, or edit the application source. The
 * repository is inspected read-only; every write lands in the project sandbox
 * through `approvals.ts`.
 */
import { execFile, execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { openSync, closeSync, readSync } from "node:fs";
import { readFileSync, readdirSync, statSync, lstatSync } from "node:fs";
import path from "node:path";
import type { Database } from "./db";
import { newId, now } from "./auth";
import { audit, parseJson } from "./audit";
import { buildChangeSlides, clip, diffLines } from "./diff";
import { complete } from "./model";
import { decideAuthority } from "./registry";
import { listProjectFiles, readProjectFile, safeProjectPath, type ProjectRowInternal } from "./projects";
import { requestApproval } from "./approvals";
import type {
  EngineeringCheckpointFile,
  EngineeringCheckpointRecord,
  EngineeringEventKind,
  EngineeringEventRecord,
  EngineeringMode,
  EngineeringPlaybookRecord,
  EngineeringSessionRecord,
  EngineeringStatus,
  RepositoryFacts,
  TaskStep,
  UserRecord,
} from "./types";

/** The repository this server is running from. Read-only for sessions. */
export const REPOSITORY_ROOT = process.cwd();

const SKIP_DIRS = new Set([
  "node_modules",
  ".git",
  ".next",
  ".next-desktop",
  ".workspace-data",
  ".tay-data",
  ".tools",
  ".vercel",
  ".identity-test",
  ".social-test",
  "upstream",
  "runtime-state",
  "coverage",
  "out",
  "dist",
  "browser-profiles",
]);

const TEXT_EXTENSIONS = new Set([
  ".ts",
  ".tsx",
  ".js",
  ".jsx",
  ".mjs",
  ".cjs",
  ".json",
  ".md",
  ".mdx",
  ".css",
  ".scss",
  ".html",
  ".yml",
  ".yaml",
  ".toml",
  ".py",
  ".sh",
  ".sql",
  ".txt",
  ".example",
  ".env.example",
]);

const BARE_TEXT_FILES = new Set(["Dockerfile", "Makefile", "Procfile", "justfile", ".nvmrc"]);

const MAX_MAP_FILES = 4000;
const MAX_MAP_DEPTH = 6;
const MAX_READ_BYTES = 51200;
const MAX_SEARCH_FILES = 1500;
const MAX_SEARCH_MATCHES = 40;
const MAX_EVENT_DETAIL = 6000;

/* ------------------------------ repository ------------------------------ */

export interface VerificationCommand {
  id: string;
  label: string;
  bin: string;
  args: string[];
}

/**
 * The only commands a session may execute. Deliberately fixed server-side: a
 * client cannot pass a command string, so this list is the whole shell surface.
 * Nothing here writes, installs, deploys, pushes or starts a server.
 */
const VERIFICATION_COMMANDS: VerificationCommand[] = [
  { id: "typecheck", label: "TypeScript typecheck", bin: "npm", args: ["run", "typecheck"] },
  { id: "lint", label: "Lint and public-copy guard", bin: "npm", args: ["run", "lint"] },
  { id: "test:tay", label: "Tay workspace tests", bin: "npm", args: ["run", "test:tay"] },
  { id: "test:security", label: "Security gate", bin: "npm", args: ["run", "test:security"] },
  { id: "smoke", label: "Smoke test", bin: "npm", args: ["run", "smoke"] },
  { id: "git_status", label: "Working tree status", bin: "git", args: ["status", "--short"] },
  { id: "git_diff", label: "Diff stat", bin: "git", args: ["diff", "--stat"] },
];

function readTextFile(absolutePath: string, maxBytes = MAX_READ_BYTES): string | null {
  try {
    const stat = statSync(absolutePath);
    if (!stat.isFile() || stat.size > maxBytes) return null;
    return readFileSync(absolutePath, "utf8");
  } catch {
    return null;
  }
}

function packageScripts(): { name: string; command: string }[] {
  const raw = readTextFile(path.join(REPOSITORY_ROOT, "package.json"));
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as { scripts?: Record<string, string> };
    return Object.entries(parsed.scripts ?? {}).map(([name, command]) => ({ name, command: String(command) }));
  } catch {
    return [];
  }
}

function fileExists(relative: string): boolean {
  try {
    return statSync(path.join(REPOSITORY_ROOT, relative)).isFile();
  } catch {
    return false;
  }
}

function detectPackageManager(): string | null {
  const lockfiles: [string, string][] = [
    ["pnpm-lock.yaml", "pnpm"],
    ["package-lock.json", "npm"],
    ["yarn.lock", "yarn"],
    ["bun.lockb", "bun"],
  ];
  for (const [file, manager] of lockfiles) {
    if (fileExists(file)) return manager;
  }
  return null;
}

function detectFramework(): string | null {
  const raw = readTextFile(path.join(REPOSITORY_ROOT, "package.json"));
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as { dependencies?: Record<string, string>; devDependencies?: Record<string, string> };
    const deps = { ...(parsed.dependencies ?? {}), ...(parsed.devDependencies ?? {}) };
    for (const [name, label] of [
      ["next", "Next.js"],
      ["vite", "Vite"],
      ["@sveltejs/kit", "SvelteKit"],
      ["nuxt", "Nuxt"],
      ["react", "React"],
    ] as const) {
      if (deps[name]) return label;
    }
  } catch {
    return null;
  }
  return null;
}

export interface RepoMapEntry {
  path: string;
  bytes: number;
}

/** Bounded, deterministic walk of the repository. Never follows symlinks out. */
export function repositoryMap(limit = MAX_MAP_FILES): { entries: RepoMapEntry[]; truncated: boolean; skipped: string[] } {
  const entries: RepoMapEntry[] = [];
  const skipped: string[] = [];
  let truncated = false;

  const walk = (relative: string, depth: number) => {
    if (truncated) return;
    let children: string[];
    try {
      children = readdirSync(path.join(REPOSITORY_ROOT, relative), { withFileTypes: true })
        .sort((a, b) => a.name.localeCompare(b.name))
        .map((entry) => entry.name);
    } catch {
      return;
    }
    for (const name of children) {
      if (entries.length >= limit) {
        truncated = true;
        return;
      }
      if (name.startsWith(".") && name !== ".env.example" && !BARE_TEXT_FILES.has(name)) {
        if (SKIP_DIRS.has(name) || name.startsWith(".next") || name.startsWith(".workspace")) skipped.push(relative ? `${relative}/${name}` : name);
        continue;
      }
      const childRelative = relative ? `${relative}/${name}` : name;
      const absolute = path.join(REPOSITORY_ROOT, childRelative);
      let stat;
      try {
        stat = lstatSync(absolute);
        if (stat.isSymbolicLink()) continue;
      } catch {
        continue;
      }
      if (stat.isDirectory()) {
        if (SKIP_DIRS.has(name.toLowerCase()) || depth >= MAX_MAP_DEPTH) {
          skipped.push(childRelative);
          continue;
        }
        walk(childRelative, depth + 1);
      } else if (stat.isFile()) {
        const extension = path.extname(name).toLowerCase();
        if (TEXT_EXTENSIONS.has(extension) || BARE_TEXT_FILES.has(name)) {
          entries.push({ path: childRelative, bytes: stat.size });
        }
      }
    }
  };

  walk("", 0);
  return { entries, truncated, skipped: [...new Set(skipped)].slice(0, 40) };
}

/** Facts a session needs before it can plan anything honest. */
export function repositoryFacts(): RepositoryFacts {
  const scripts = packageScripts();
  const map = repositoryMap();
  const npmAvailable = new Set(scripts.map((script) => script.name));
  const nodeVersion =
    readTextFile(path.join(REPOSITORY_ROOT, ".nvmrc"), 64)?.trim() ??
    readTextFile(path.join(REPOSITORY_ROOT, "package.json"))?.match(/"node"\s*:\s*"([^"]+)"/)?.[1] ??
    null;
  return {
    root: path.basename(REPOSITORY_ROOT),
    name: readTextFile(path.join(REPOSITORY_ROOT, "package.json"))?.match(/"name"\s*:\s*"([^"]+)"/)?.[1] ?? null,
    framework: detectFramework(),
    packageManager: detectPackageManager(),
    nodeVersion,
    scripts,
    verificationCommands: VERIFICATION_COMMANDS.filter((command) =>
      command.bin === "git" ? true : npmAvailable.has(command.args[1] ?? ""),
    ).map((command) => ({ id: command.id, label: command.label })),
    topLevel: [...new Set(map.entries.map((entry) => entry.path.split("/")[0]!))].slice(0, 40),
    fileCount: map.entries.length,
    truncated: map.truncated,
  };
}

/** Repo-relative path that cannot escape the repository or name a secret. */
export function safeRepoPath(input: unknown): string | null {
  if (typeof input !== "string") return null;
  const trimmed = input.trim().replace(/\\/g, "/");
  if (!trimmed || trimmed.length > 240) return null;
  if (trimmed.startsWith("/") || /^[a-zA-Z]:/.test(trimmed)) return null;
  const segments = trimmed.split("/").filter((segment) => segment.length > 0);
  if (segments.length === 0 || segments.length > 12) return null;
  for (const segment of segments) {
    const lower = segment.toLowerCase();
    if (segment === "." || segment === "..") return null;
    if (SKIP_DIRS.has(lower)) return null;
    if (/^\.env/.test(lower)) return null;
    if (/\.(pem|key|p12|pfx|keystore|sqlite|db)$/i.test(lower)) return null;
    if (!/^[A-Za-z0-9._@ -]+$/.test(segment)) return null;
  }
  const relative = segments.join("/");
  const absolute = path.resolve(REPOSITORY_ROOT, relative);
  if (absolute !== REPOSITORY_ROOT && !absolute.startsWith(`${REPOSITORY_ROOT}${path.sep}`)) return null;
  // Reject every symlink component, including aliases to excluded local state.
  let current = REPOSITORY_ROOT;
  for (const segment of segments) {
    current = path.join(current, segment);
    try { if (lstatSync(current).isSymbolicLink()) return null; } catch { return null; }
  }
  return relative;
}

export interface RepoFileRead {
  path: string;
  bytes: number;
  content: string;
  truncated: boolean;
}

export function readRepoFile(input: unknown): RepoFileRead {
  const relative = safeRepoPath(input);
  if (!relative) throw new Error("That path is outside the readable repository or names a secret file.");
  const absolute = path.join(REPOSITORY_ROOT, relative);
  const stat = statSync(absolute, { throwIfNoEntry: false });
  if (!stat || !stat.isFile()) throw new Error("That file is not in the repository.");
  if (stat.size > MAX_READ_BYTES) {
    const buffer = Buffer.alloc(MAX_READ_BYTES);
    const fd = openSync(absolute, "r");
    try {
      const read = readSync(fd, buffer, 0, MAX_READ_BYTES, 0);
      return { path: relative, bytes: stat.size, content: buffer.subarray(0, read).toString("utf8"), truncated: true };
    } finally {
      closeSync(fd);
    }
  }
  return { path: relative, bytes: stat.size, content: readFileSync(absolute, "utf8"), truncated: false };
}

export interface RepoSearchMatch {
  path: string;
  line: number;
  text: string;
}

export function searchRepository(query: unknown): { query: string; matches: RepoSearchMatch[]; filesScanned: number; truncated: boolean } {
  if (typeof query !== "string") throw new Error("Supply a search pattern.");
  const pattern = query.trim();
  if (pattern.length < 2 || pattern.length > 120) throw new Error("Search patterns are 2–120 characters.");
  let expression: RegExp;
  try {
    expression = new RegExp(pattern, "i");
  } catch {
    throw new Error("That search pattern is not a valid regular expression.");
  }

  const matches: RepoSearchMatch[] = [];
  let filesScanned = 0;
  let truncated = false;
  for (const entry of repositoryMap(MAX_MAP_FILES).entries) {
    if (matches.length >= MAX_SEARCH_MATCHES || filesScanned >= MAX_SEARCH_FILES) {
      truncated = true;
      break;
    }
    if (entry.bytes > 200_000) continue;
    filesScanned++;
    const content = readTextFile(path.join(REPOSITORY_ROOT, entry.path));
    if (!content) continue;
    const lines = content.split("\n");
    for (let index = 0; index < lines.length; index++) {
      if (!expression.test(lines[index]!)) continue;
      matches.push({ path: entry.path, line: index + 1, text: lines[index]!.trim().slice(0, 200) });
      if (matches.length >= MAX_SEARCH_MATCHES) {
        truncated = true;
        break;
      }
    }
  }
  return { query: pattern, matches, filesScanned, truncated };
}

/* ------------------------------ verification ---------------------------- */

export interface VerificationResult {
  id: string;
  label: string;
  command: string;
  ok: boolean;
  exitCode: number | null;
  durationMs: number;
  output: string;
  timedOut: boolean;
}

/** Runs one allowlisted check. Resolves; never throws on a failing check. */
export function runVerification(commandId: unknown, timeoutMs = 240_000): Promise<VerificationResult> {
  const command = VERIFICATION_COMMANDS.find((entry) => entry.id === commandId);
  if (!command) {
    throw new Error(
      `Only these checks can run here: ${VERIFICATION_COMMANDS.map((entry) => entry.id).join(", ")}.`,
    );
  }
  // Repository scripts are executable code, not a hosted tenant sandbox.
  if (process.env.NODE_ENV === "production") throw new Error("Repository verification is local-only until an isolated worker is verified.");
  const bin = process.platform === "win32" && command.bin === "npm" ? "npm.cmd" : command.bin;
  const started = Date.now();
  return new Promise((resolve) => {
    execFile(
      bin,
      command.args,
      {
        cwd: REPOSITORY_ROOT,
        timeout: timeoutMs,
        maxBuffer: 4 * 1024 * 1024,
        env: Object.fromEntries([
          ...["PATH", "SystemRoot", "TEMP", "TMP", "TMPDIR"].flatMap((key) => process.env[key] ? [[key, process.env[key]!]] : []),
          ["CI", "1"], ["FORCE_COLOR", "0"],
        ]),
      },
      (error, stdout, stderr) => {
        const combined = `${stdout ?? ""}${stderr ?? ""}`.trim();
        const timedOut = Boolean(error && "killed" in error && error.killed);
        const exitCode = error && typeof (error as { code?: unknown }).code === "number" ? (error as { code: number }).code : (error ? 1 : 0);
        resolve({
          id: command.id,
          label: command.label,
          command: [command.bin, ...command.args].join(" "),
          ok: !error,
          exitCode,
          durationMs: Date.now() - started,
          output: combined.slice(-4000),
          timedOut,
        });
      },
    );
  });
}

/* -------------------------------- planning ------------------------------ */

type WorkKind = "bugfix" | "feature" | "tests" | "refactor" | "migration" | "investigation" | "docs" | "general";

function classifyWork(request: string): WorkKind {
  const value = request.toLowerCase();
  if (/\b(fix|bug|broken|regression|error|fails?|crash)\b/.test(value)) return "bugfix";
  if (/\b(test|coverage|spec|assert)\b/.test(value)) return "tests";
  if (/\b(refactor|rename|extract|clean up|simplif)/.test(value)) return "refactor";
  if (/\b(migrate|migration|upgrade|port)\b/.test(value)) return "migration";
  if (/\b(research|investigate|explain|why|how does|where is|audit)\b/.test(value)) return "investigation";
  if (/\b(document|docs|readme|guide)\b/.test(value)) return "docs";
  if (/\b(add|build|implement|create|new|support|feature)\b/.test(value)) return "feature";
  return "general";
}

export interface PlanStep extends TaskStep {
  /** What "done" means for this step, so the session cannot quietly drift. */
  acceptance?: string;
}

export interface EngineeringPlan {
  kind: WorkKind;
  title: string;
  steps: PlanStep[];
  acceptance: string[];
  risks: string[];
}

export function buildEngineeringPlan(request: string, facts: RepositoryFacts, mode: EngineeringMode): EngineeringPlan {
  const kind = classifyWork(request);
  const checks = facts.verificationCommands.map((command) => command.id);
  const readOnly = mode === "ask";
  const verification = checks.includes("typecheck")
    ? "Run typecheck first, then the narrowest test that covers the change."
    : "No repository check script matched; state which manual evidence is available.";

  const steps: PlanStep[] = [
    {
      id: "scope",
      label: "Scope the request",
      status: "done",
      detail: `${kind} · ${request.trim().slice(0, 120)}`,
      acceptance: "One sentence states the outcome and who benefits.",
    },
    {
      id: "map",
      label: "Map the repository",
      status: "done",
      detail: `${facts.fileCount} text files indexed${facts.truncated ? " (truncated)" : ""} · ${facts.framework ?? "framework not detected"}`,
      acceptance: "The files that own the behaviour are named.",
    },
    {
      id: "approach",
      label: "Confirm the approach",
      status: readOnly ? "done" : "active",
      detail: readOnly
        ? "Ask sessions stay read-only; the approach is reported, not applied."
        : "Review the approach before a patch is proposed.",
      acceptance: "The approach names the files to change and the checks that will prove it.",
    },
    {
      id: "implement",
      label: readOnly ? "Report what would change" : "Implement the change",
      status: "pending",
      detail: readOnly ? "No writes in an Ask session." : "Patches apply only after a recorded approval.",
      acceptance: "The change is reviewable as a diff before it is written.",
    },
    {
      id: "verify",
      label: "Run verification",
      status: "pending",
      detail: verification,
      acceptance: `Recorded output for: ${checks.length ? checks.join(", ") : "no repository checks found"}.`,
    },
    {
      id: "checkpoint",
      label: "Record a checkpoint",
      status: "pending",
      detail: "A checkpoint lets a later rewind restore the project sandbox through an approval.",
      acceptance: "The sandbox can be restored to this point.",
    },
    {
      id: "handoff",
      label: "Prepare the handoff",
      status: "pending",
      detail: "A PR-style pack with the plan, verification evidence and risks.",
      acceptance: "A reviewer can decide without re-reading the whole session.",
    },
  ];

  const acceptance = [
    `The request is satisfied: ${request.trim().slice(0, 160)}`,
    "Changed files are limited to what the approach named.",
    "Verification output is recorded, not described.",
    "No payment, outbound message, deployment or push happens from this session.",
  ];

  const risks = [
    "Repository reads are of this running checkout, not a fresh clone of the remote.",
    "Verification commands run against the current working tree, so uncommitted changes are included.",
    facts.packageManager ? `Dependencies resolve with ${facts.packageManager}.` : "No lockfile was detected.",
  ];

  return { kind, title: titleFor(kind, request), steps, acceptance, risks };
}

function titleFor(kind: WorkKind, request: string): string {
  const label: Record<WorkKind, string> = {
    bugfix: "Fix",
    feature: "Build",
    tests: "Test",
    refactor: "Refactor",
    migration: "Migrate",
    investigation: "Investigate",
    docs: "Document",
    general: "Work on",
  };
  const subject = request.trim().replace(/^(please|can you|could you)\s+/i, "").slice(0, 90);
  // Do not repeat the work verb the request already opens with.
  const alreadyVerbed = /^(fix|add|build|test|refactor|migrate|investigate|document|create|implement|update|remove|replace)\b/i.test(subject);
  if (alreadyVerbed) return subject.charAt(0).toUpperCase() + subject.slice(1);
  return `${label[kind]}: ${subject}`;
}

/* -------------------------------- storage ------------------------------- */

interface SessionRow {
  id: string;
  project_id: string;
  conversation_id: string | null;
  title: string;
  request: string;
  mode: string;
  status: string;
  repository: string;
  base_branch: string;
  steps: string;
  task_id: string | null;
  playbook_id: string | null;
  model_label: string | null;
  summary: string;
  created_at: string;
  updated_at: string;
}

interface EventRow {
  id: string;
  session_id: string;
  project_id: string;
  kind: string;
  tool: string | null;
  summary: string;
  detail: string | null;
  at: string;
}

interface CheckpointRow {
  id: string;
  session_id: string;
  project_id: string;
  label: string;
  files: string;
  created_at: string;
}

interface PlaybookRow {
  id: string;
  project_id: string;
  name: string;
  macro: string;
  instructions: string;
  created_at: string;
  updated_at: string;
}

function currentBranch(): string | null {
  try {
    return execFileSync("git", ["symbolic-ref", "--quiet", "--short", "HEAD"],
      { cwd: REPOSITORY_ROOT, encoding: "utf8", timeout: 2000, stdio: ["ignore", "pipe", "ignore"] }).trim() || null;
  } catch { return null; }
}

function toSession(row: SessionRow): EngineeringSessionRecord {
  return {
    id: row.id,
    projectId: row.project_id,
    conversationId: row.conversation_id,
    title: row.title,
    request: row.request,
    mode: row.mode === "ask" ? "ask" : "agent",
    status: row.status as EngineeringStatus,
    repository: row.repository,
    baseBranch: row.base_branch,
    steps: (parseJson(row.steps) as unknown as TaskStep[]) ?? [],
    taskId: row.task_id,
    playbookId: row.playbook_id,
    modelLabel: row.model_label,
    summary: row.summary,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function toEvent(row: EventRow): EngineeringEventRecord {
  return {
    id: row.id,
    sessionId: row.session_id,
    projectId: row.project_id,
    kind: row.kind as EngineeringEventKind,
    tool: row.tool,
    summary: row.summary,
    detail: row.detail ? parseJson(row.detail) : null,
    at: row.at,
  };
}

function toPlaybook(row: PlaybookRow): EngineeringPlaybookRecord {
  return {
    id: row.id,
    projectId: row.project_id,
    name: row.name,
    macro: row.macro,
    instructions: row.instructions,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function listEngineeringSessions(db: Database, projectId: string, limit = 25): EngineeringSessionRecord[] {
  const rows = db.all<SessionRow>(
    "SELECT * FROM engineering_sessions WHERE project_id = ? ORDER BY created_at DESC LIMIT ?",
    [projectId, Math.min(limit, 100)],
  );
  return rows.map(toSession);
}

export function getEngineeringSession(db: Database, sessionId: string, projectId: string): EngineeringSessionRecord | null {
  const row = db.get<SessionRow>("SELECT * FROM engineering_sessions WHERE id = ? AND project_id = ?", [sessionId, projectId]);
  return row ? toSession(row) : null;
}

export function listEngineeringEvents(db: Database, sessionId: string, projectId: string, limit = 200): EngineeringEventRecord[] {
  const rows = db.all<EventRow>(
    "SELECT * FROM engineering_events WHERE session_id = ? AND project_id = ? ORDER BY at ASC LIMIT ?",
    [sessionId, projectId, Math.min(limit, 500)],
  );
  return rows.map(toEvent);
}

export function listEngineeringPlaybooks(db: Database, projectId: string): EngineeringPlaybookRecord[] {
  return db
    .all<PlaybookRow>("SELECT * FROM engineering_playbooks WHERE project_id = ? ORDER BY name ASC", [projectId])
    .map(toPlaybook);
}

export function createEngineeringPlaybook(
  db: Database,
  projectId: string,
  user: UserRecord,
  input: { name: unknown; macro: unknown; instructions: unknown },
): EngineeringPlaybookRecord {
  const name = typeof input.name === "string" ? input.name.trim().slice(0, 80) : "";
  const instructions = typeof input.instructions === "string" ? input.instructions.trim() : "";
  if (name.length < 2) throw new Error("Give the playbook a name.");
  if (instructions.length < 20) throw new Error("Playbook instructions need at least 20 characters.");
  const rawMacro = typeof input.macro === "string" ? input.macro.trim() : "";
  const macro = (rawMacro || `!${name.toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 30)}`).startsWith("!")
    ? (rawMacro || `!${name.toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 30)}`)
    : `!${rawMacro}`;

  const existing = db.get<{ id: string }>("SELECT id FROM engineering_playbooks WHERE project_id = ? AND name = ?", [projectId, name]);
  const timestamp = now();
  if (existing) {
    db.run("UPDATE engineering_playbooks SET macro = ?, instructions = ?, updated_at = ? WHERE id = ?", [
      macro.slice(0, 40),
      instructions.slice(0, 4000),
      timestamp,
      existing.id,
    ]);
  } else {
    db.run(
      "INSERT INTO engineering_playbooks (id, project_id, name, macro, instructions, created_at, updated_at) VALUES (?,?,?,?,?,?,?)",
      [newId("pbd"), projectId, name, macro.slice(0, 40), instructions.slice(0, 4000), timestamp, timestamp],
    );
  }
  audit(db, {
    projectId,
    actorId: user.id,
    actorLabel: user.email,
    kind: "engineering_playbook_saved",
    detail: { name, macro },
  });
  return listEngineeringPlaybooks(db, projectId).find((playbook) => playbook.name === name)!;
}

function addEvent(
  db: Database,
  input: {
    sessionId: string;
    projectId: string;
    kind: EngineeringEventKind;
    tool?: string | null;
    summary: string;
    detail?: Record<string, unknown> | null;
  },
): EngineeringEventRecord {
  const id = newId("evt");
  const at = now();
  db.run(
    "INSERT INTO engineering_events (id, session_id, project_id, kind, tool, summary, detail, at) VALUES (?,?,?,?,?,?,?,?)",
    [
      id,
      input.sessionId,
      input.projectId,
      input.kind,
      input.tool ?? null,
      input.summary.slice(0, 1200),
      input.detail ? JSON.stringify(input.detail).slice(0, MAX_EVENT_DETAIL) : null,
      at,
    ],
  );
  db.run("UPDATE engineering_sessions SET updated_at = ? WHERE id = ?", [at, input.sessionId]);
  return { id, sessionId: input.sessionId, projectId: input.projectId, kind: input.kind, tool: input.tool ?? null, summary: input.summary, detail: input.detail ?? null, at };
}

function setStatus(db: Database, sessionId: string, projectId: string, status: EngineeringStatus, steps?: TaskStep[]) {
  db.run("UPDATE engineering_sessions SET status = ?, updated_at = ? WHERE id = ? AND project_id = ?", [
    status,
    now(),
    sessionId,
    projectId,
  ]);
  if (steps) {
    db.run("UPDATE engineering_sessions SET steps = ? WHERE id = ? AND project_id = ?", [JSON.stringify(steps), sessionId, projectId]);
  }
}

/** A tool must not silently clear a pending decision or a closed session. */
function statusAfterTool(current: EngineeringStatus, fallback: EngineeringStatus): EngineeringStatus {
  if (current === "awaiting_approval" || current === "paused" || current === "completed") return current;
  return fallback;
}

function updateStep(steps: TaskStep[], id: string, patch: Partial<TaskStep>): TaskStep[] {
  return steps.map((step) => (step.id === id ? { ...step, ...patch } : step));
}

/* -------------------------------- sessions ------------------------------ */

export interface CreateSessionInput {
  request: unknown;
  mode: unknown;
  playbookId?: unknown;
  conversationId?: string | null;
}

export async function createEngineeringSession(
  db: Database,
  project: ProjectRowInternal,
  user: UserRecord,
  input: CreateSessionInput,
): Promise<{ session: EngineeringSessionRecord; facts: RepositoryFacts; plan: EngineeringPlan }> {
  const request = typeof input.request === "string" ? input.request.trim() : "";
  if (request.length < 8) throw new Error("Describe the work in at least a sentence.");
  if (request.length > 2000) throw new Error("Keep the request under 2000 characters.");
  const mode: EngineeringMode = input.mode === "ask" ? "ask" : "agent";

  const playbookId = typeof input.playbookId === "string" && input.playbookId ? input.playbookId : null;
  const playbook = playbookId
    ? db.get<PlaybookRow>("SELECT * FROM engineering_playbooks WHERE id = ? AND project_id = ?", [playbookId, project.id])
    : undefined;

  const facts = repositoryFacts();
  const plan = buildEngineeringPlan(request, facts, mode);
  const id = newId("eng");
  const timestamp = now();
  // Prefer the package name: a checkout folder can be a temporary hash.
  const repository = facts.name ?? facts.root;
  const baseBranch = currentBranch() ?? "detached-or-unavailable";
  const summary = playbook ? `${plan.kind} work · playbook ${playbook.macro}` : `${plan.kind} work · no playbook`;

  db.run(
    `INSERT INTO engineering_sessions
      (id, project_id, conversation_id, title, request, mode, status, repository, base_branch, steps, task_id, playbook_id, model_label, summary, created_at, updated_at)
     VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
    [
      id,
      project.id,
      input.conversationId ?? null,
      plan.title.slice(0, 180),
      request,
      mode,
      "running",
      repository,
      baseBranch,
      JSON.stringify(plan.steps),
      null,
      playbookId,
      null,
      summary,
      timestamp,
      timestamp,
    ],
  );

  addEvent(db, {
    sessionId: id,
    projectId: project.id,
    kind: "observation",
    tool: "repository_facts",
    summary: `${facts.fileCount} text files in ${facts.name ?? facts.root}${facts.truncated ? " (map truncated)" : ""} · ${facts.framework ?? "framework not detected"} · ${facts.packageManager ?? "no lockfile"}`,
    detail: { facts, topLevel: facts.topLevel },
  });
  addEvent(db, {
    sessionId: id,
    projectId: project.id,
    kind: "plan",
    tool: "plan",
    summary: `${plan.steps.length}-phase ${mode} plan: ${plan.steps.map((step) => step.label).join(" → ")}`,
    detail: { steps: plan.steps, acceptance: plan.acceptance, risks: plan.risks, kind: plan.kind, playbook: playbook?.name ?? null },
  });
  if (playbook) {
    addEvent(db, {
      sessionId: id,
      projectId: project.id,
      kind: "message",
      tool: "playbook",
      summary: `Attached playbook ${playbook.macro} — ${playbook.name}`,
      detail: { instructions: playbook.instructions },
    });
  }

  audit(db, {
    projectId: project.id,
    actorId: user.id,
    actorLabel: user.email,
    kind: "engineering_session_created",
    detail: { sessionId: id, mode, request: request.slice(0, 200) },
  });

  return { session: getEngineeringSession(db, id, project.id)!, facts, plan };
}

/**
 * Ask mode answers a question grounded in the repository. It uses the
 * configured model when one is reachable and otherwise answers from the repo
 * facts it actually read.
 */
export async function askEngineeringQuestion(
  db: Database,
  project: ProjectRowInternal,
  user: UserRecord,
  session: EngineeringSessionRecord,
  question: unknown,
): Promise<{ answer: string; provider: string; model: string | null }> {
  const text = typeof question === "string" ? question.trim() : "";
  if (text.length < 3) throw new Error("Ask a question first.");
  const facts = repositoryFacts();
  const map = repositoryMap(600);
  const playbook = session.playbookId
    ? db.get<PlaybookRow>("SELECT * FROM engineering_playbooks WHERE id = ? AND project_id = ?", [session.playbookId, project.id])
    : undefined;

  const reply = await complete({
    system:
      "You are the engineering agent inside the Transcenlutions Tay workspace. Answer from the repository facts provided. " +
      "Never claim you changed, ran or deployed anything. Mark anything you did not read as unverified. Be concise.",
    user: [
      `Repository: ${facts.name ?? facts.root} (${facts.framework ?? "framework unknown"})`,
      `Node: ${facts.nodeVersion ?? "unknown"} · package manager: ${facts.packageManager ?? "unknown"}`,
      `Scripts: ${facts.scripts.map((script) => script.name).join(", ") || "none"}`,
      `Files: ${map.entries.slice(0, 120).map((entry) => entry.path).join(", ")}`,
      playbook ? `Playbook (${playbook.macro}): ${playbook.instructions}` : "",
      `Question: ${text}`,
    ]
      .filter(Boolean)
      .join("\n"),
    maxTokens: 600,
    timeoutMs: 120_000,
  });

  const answer = reply.ok
    ? reply.text
    : [
        "No model provider is configured, so this answer comes from the repository facts read just now rather than generated prose.",
        "",
        `Repository: ${facts.name ?? facts.root} · ${facts.framework ?? "framework not detected"} · ${facts.fileCount} text files`,
        `Package manager: ${facts.packageManager ?? "no lockfile detected"} · Node: ${facts.nodeVersion ?? "unknown"}`,
        `Scripts: ${facts.scripts.map((script) => script.name).join(", ") || "none"}`,
        "",
        `Files near this question: ${map.entries
          .filter((entry) => entry.path.toLowerCase().includes(termFrom(text)) || entry.path.toLowerCase().includes("readme"))
          .slice(0, 8)
          .map((entry) => entry.path)
          .join(", ") || "(no filename matched; use Search to look inside files)"}`,
        "",
        `You asked: “${text.slice(0, 200)}”`,
      ].join("\n");

  addEvent(db, {
    sessionId: session.id,
    projectId: project.id,
    kind: "message",
    tool: "ask",
    summary: text.slice(0, 200),
    detail: { answer: answer.slice(0, 4000), provider: reply.detail },
  });
  audit(db, {
    projectId: project.id,
    actorId: user.id,
    actorLabel: user.email,
    kind: "engineering_question_answered",
    detail: { sessionId: session.id, provider: reply.provider },
  });
  return { answer, provider: reply.provider, model: reply.model };
}

function termFrom(text: string): string {
  return (
    text
      .toLowerCase()
      .replace(/[^a-z0-9 ]/g, " ")
      .split(/\s+/)
      .filter((word) => word.length > 4)
      .sort((a, b) => b.length - a.length)[0] ?? ""
  );
}

/* --------------------------------- tools -------------------------------- */

export type EngineeringTool =
  | "repo_map"
  | "search"
  | "read_file"
  | "verify"
  | "propose_patch"
  | "checkpoint"
  | "rewind"
  | "handoff"
  | "pause"
  | "resume"
  | "complete";

export interface ToolOutcome {
  session: EngineeringSessionRecord;
  events: EngineeringEventRecord[];
  approvalId: string | null;
  result: Record<string, unknown>;
}

/** Attribute every action to KJ (Forge Master), then let the registry decide. */
function requireAuthority(tool: EngineeringTool): void {
  const action = tool === "propose_patch" ? "edit_project_file" : tool === "verify" ? "run_task" : "read_context";
  const decision = decideAuthority("kj", action);
  if (!decision.allowed) throw new Error(`The engineering agent cannot ${tool.replace(/_/g, " ")} here. ${decision.reason}`);
}

export async function runEngineeringTool(
  db: Database,
  project: ProjectRowInternal,
  user: UserRecord,
  input: { sessionId: unknown; tool: unknown; args?: Record<string, unknown> },
): Promise<ToolOutcome> {
  const sessionId = typeof input.sessionId === "string" ? input.sessionId : "";
  const session = getEngineeringSession(db, sessionId, project.id);
  if (!session) throw new Error("That engineering session is not in this project.");
  const tool = input.tool as EngineeringTool;
  const allowed: EngineeringTool[] = [
    "repo_map",
    "search",
    "read_file",
    "verify",
    "propose_patch",
    "checkpoint",
    "rewind",
    "handoff",
    "pause",
    "resume",
    "complete",
  ];
  if (!allowed.includes(tool)) throw new Error("Unknown tool.");
  requireAuthority(tool);

  const args = input.args ?? {};
  const facts = repositoryFacts();
  let approvalId: string | null = null;
  let result: Record<string, unknown> = {};

  if (tool === "repo_map") {
    const map = repositoryMap(400);
    addEvent(db, {
      sessionId: session.id,
      projectId: project.id,
      kind: "tool",
      tool,
      summary: `Mapped ${map.entries.length} text files${map.truncated ? " (truncated)" : ""}`,
      detail: { entries: map.entries.slice(0, 120), skipped: map.skipped, facts },
    });
    result = { entries: map.entries.slice(0, 200), truncated: map.truncated, facts, skipped: map.skipped };
  } else if (tool === "search") {
    const found = searchRepository(args.query);
    addEvent(db, {
      sessionId: session.id,
      projectId: project.id,
      kind: "tool",
      tool,
      summary: `${found.matches.length} match${found.matches.length === 1 ? "" : "es"} for /${found.query}/ across ${found.filesScanned} files`,
      detail: { ...found, matches: found.matches.slice(0, 20) },
    });
    result = found;
  } else if (tool === "read_file") {
    const file = readRepoFile(args.path);
    addEvent(db, {
      sessionId: session.id,
      projectId: project.id,
      kind: "tool",
      tool,
      summary: `Read ${file.path} (${file.bytes} bytes${file.truncated ? ", truncated" : ""})`,
      detail: { path: file.path, bytes: file.bytes, preview: clip(file.content, 1200) },
    });
    result = { ...file, content: file.content };
  } else if (tool === "verify") {
    const verification = await runVerification(args.command);
    const steps = updateStep(session.steps, "verify", {
      status: verification.ok ? "done" : "blocked",
      detail: `${verification.command} → ${verification.ok ? "passed" : `exit ${verification.exitCode ?? "unknown"}`} in ${(verification.durationMs / 1000).toFixed(1)}s`,
    });
    setStatus(db, session.id, project.id, statusAfterTool(session.status, verification.ok ? "running" : "blocked"), steps);
    addEvent(db, {
      sessionId: session.id,
      projectId: project.id,
      kind: "verification",
      tool,
      summary: `${verification.label}: ${verification.ok ? "passed" : verification.timedOut ? "timed out" : `failed (exit ${verification.exitCode ?? "?"})`} in ${(verification.durationMs / 1000).toFixed(1)}s`,
      detail: verification as unknown as Record<string, unknown>,
    });
    result = { verification };
  } else if (tool === "propose_patch") {
    const proposal = proposePatch(db, project, user, session, args);
    approvalId = proposal.approvalId;
    result = proposal.result;
  } else if (tool === "checkpoint") {
    const checkpoint = captureCheckpoint(db, project, user, session, args.label);
    const steps = updateStep(session.steps, "checkpoint", {
      status: "done",
      detail: `${checkpoint.files.length} file${checkpoint.files.length === 1 ? "" : "s"} captured · ${checkpoint.label}`,
    });
    setStatus(db, session.id, project.id, statusAfterTool(session.status, session.status === "blocked" ? "blocked" : "running"), steps);
    result = { checkpoint };
  } else if (tool === "rewind") {
    const restore = proposeRewind(db, project, user, session, args.checkpointId);
    approvalId = restore.approvalId;
    result = restore.result;
  } else if (tool === "handoff") {
    const pack = proposeHandoff(db, project, user, session, facts);
    approvalId = pack.approvalId;
    result = pack.result;
  } else if (tool === "pause" || tool === "resume") {
    const status: EngineeringStatus = tool === "pause" ? "paused" : "running";
    setStatus(db, session.id, project.id, status);
    addEvent(db, {
      sessionId: session.id,
      projectId: project.id,
      kind: "message",
      tool,
      summary: tool === "pause" ? "Session paused by the operator." : "Session resumed by the operator.",
    });
    result = { status };
  } else if (tool === "complete") {
    const steps = session.steps.map((step) =>
      step.status === "pending" || step.status === "active" ? { ...step, status: "done" as const } : step,
    );
    setStatus(db, session.id, project.id, "completed", steps);
    addEvent(db, {
      sessionId: session.id,
      projectId: project.id,
      kind: "message",
      tool,
      summary: "Session closed by the operator. Verification evidence stays in the worklog.",
    });
    result = { status: "completed" };
  }

  audit(db, {
    projectId: project.id,
    actorId: user.id,
    actorLabel: user.email,
    kind: "engineering_tool",
    detail: { sessionId: session.id, tool, approvalId },
  });

  return {
    session: getEngineeringSession(db, session.id, project.id)!,
    events: listEngineeringEvents(db, session.id, project.id),
    approvalId,
    result,
  };
}

/* ------------------------------- proposals ------------------------------ */

function proposePatch(
  db: Database,
  project: ProjectRowInternal,
  user: UserRecord,
  session: EngineeringSessionRecord,
  args: Record<string, unknown>,
): { approvalId: string; result: Record<string, unknown> } {
  if (session.mode === "ask") {
    throw new Error("Ask sessions are read-only. Start an agent session to propose a change.");
  }
  if (session.status === "paused" || session.status === "completed") {
    throw new Error("Resume the session before proposing a change.");
  }
  const target = safeProjectPath(args.path);
  if (!target) throw new Error("Supply a safe project-relative path.");
  const existing = readProjectFile(db, project.id, target);
  const summary = typeof args.summary === "string" ? args.summary.trim().slice(0, 400) : "";

  let after: string;
  let payload: Record<string, unknown>;
  let kind: "file_write" | "file_edit";

  const fullContent = typeof args.content === "string" ? args.content : null;
  const find = typeof args.find === "string" ? args.find : null;
  const replace = typeof args.replace === "string" ? args.replace : null;

  if (fullContent !== null) {
    if (fullContent.length > 60_000) throw new Error("That file is larger than the sandbox accepts.");
    after = fullContent;
    payload = { path: target, content: fullContent };
    kind = "file_write";
  } else if (find && replace !== null) {
    if (!existing) throw new Error("A find/replace patch needs an existing project file. Send full content to create one.");
    const occurrences = existing.content.split(find).length - 1;
    if (occurrences === 0) throw new Error("That text is not in the current file. Read the file again before proposing the edit.");
    if (occurrences > 1) throw new Error("That text appears more than once. Include more surrounding text so the edit is unambiguous.");
    after = existing.content.replace(find, replace);
    payload = { path: target, replacements: [{ oldString: find, newString: replace }] };
    kind = "file_edit";
  } else {
    throw new Error("Send either full content, or a find/replace pair.");
  }

  const approval = requestApproval(db, {
    projectId: project.id,
    taskId: session.taskId,
    conversationId: session.conversationId,
    kind,
    title: `${existing ? "Patch" : "Create"} ${target}`,
    summary: summary || `${session.title} — ${target}`,
    explanation:
      "This is the engineering agent's proposed change. Approving applies it to the project sandbox and records it as an artifact; the application repository itself is untouched. Rejecting leaves the sandbox unchanged.",
    risk: target.startsWith("app/") || target.startsWith("lib/") ? "medium" : "low",
    payload,
    slides: buildChangeSlides({
      action: `Apply the engineering session patch to ${target}.`,
      path: target,
      summary: summary || session.request.slice(0, 300),
      before: existing?.content ?? null,
      after,
      diff: existing ? diffLines(existing.content, after) : null,
    }),
    requestedBy: user.id,
  });

  const withApproach = updateStep(session.steps, "approach", {
    status: "done",
    detail: `Approach accepted for ${target}; the patch is the reviewable change.`,
  });
  const steps = updateStep(withApproach, "implement", {
    status: "awaiting_approval",
    detail: `Awaiting a decision on ${target} (approval ${approval.id}).`,
  });
  setStatus(db, session.id, project.id, "awaiting_approval", steps);
  addEvent(db, {
    sessionId: session.id,
    projectId: project.id,
    kind: "proposal",
    tool: "propose_patch",
    summary: `${existing ? "Edit" : "Create"} ${target} held for approval`,
    detail: { approvalId: approval.id, path: target, before: existing?.version ?? null, afterLines: after.split("\n").length },
  });

  return {
    approvalId: approval.id,
    result: { approvalId: approval.id, path: target, kind, awaiting: "approval" },
  };
}

export function captureCheckpoint(
  db: Database,
  project: ProjectRowInternal,
  user: UserRecord,
  session: EngineeringSessionRecord,
  labelInput: unknown,
): EngineeringCheckpointRecord {
  const label = typeof labelInput === "string" && labelInput.trim() ? labelInput.trim().slice(0, 80) : `Checkpoint ${new Date().toISOString()}`;
  const rows = db.all<{ path: string; version: number; content: string }>(
    "SELECT path, version, content FROM project_files WHERE project_id = ? ORDER BY path ASC LIMIT 60",
    [project.id],
  );
  const files = rows.map((row) => ({
    path: row.path,
    version: row.version,
    sha256: createHash("sha256").update(row.content).digest("hex").slice(0, 16),
    bytes: row.content.length,
    content: row.content,
  }));
  const id = newId("ckp");
  const timestamp = now();
  db.run(
    "INSERT INTO engineering_checkpoints (id, session_id, project_id, label, files, created_at) VALUES (?,?,?,?,?,?)",
    [id, session.id, project.id, label, JSON.stringify(files), timestamp],
  );
  audit(db, {
    projectId: project.id,
    actorId: user.id,
    actorLabel: user.email,
    kind: "engineering_checkpoint",
    detail: { sessionId: session.id, checkpointId: id, files: files.length },
  });
  addEvent(db, {
    sessionId: session.id,
    projectId: project.id,
    kind: "checkpoint",
    tool: "checkpoint",
    summary: `${label} · ${files.length} project file${files.length === 1 ? "" : "s"}`,
    detail: { checkpointId: id, files: files.map(({ path: filePath, version, sha256, bytes }) => ({ path: filePath, version, sha256, bytes })) },
  });
  return { id, sessionId: session.id, projectId: project.id, label, files: files.map(({ path: filePath, version, sha256, bytes }) => ({ path: filePath, version, sha256, bytes })), createdAt: timestamp };
}

export function listCheckpoints(db: Database, sessionId: string, projectId: string): EngineeringCheckpointRecord[] {
  return db
    .all<CheckpointRow>("SELECT * FROM engineering_checkpoints WHERE session_id = ? AND project_id = ? ORDER BY created_at DESC", [
      sessionId,
      projectId,
    ])
    .map((row) => {
      const files = (parseJson(row.files) as unknown as (EngineeringCheckpointFile & { content?: string })[]).map((file) => ({
        path: file.path,
        version: file.version,
        sha256: file.sha256,
        bytes: file.bytes,
      }));
      return {
        id: row.id,
        sessionId: row.session_id,
        projectId: row.project_id,
        label: row.label,
        files,
        createdAt: row.created_at,
      };
    });
}

function proposeRewind(
  db: Database,
  project: ProjectRowInternal,
  user: UserRecord,
  session: EngineeringSessionRecord,
  checkpointIdInput: unknown,
): { approvalId: string; result: Record<string, unknown> } {
  const checkpointId = typeof checkpointIdInput === "string" ? checkpointIdInput : "";
  const row = db.get<CheckpointRow>("SELECT * FROM engineering_checkpoints WHERE id = ? AND project_id = ? AND session_id = ?", [
    checkpointId,
    project.id,
    session.id,
  ]);
  if (!row) throw new Error("That checkpoint is not part of this session.");
  const files = parseJson(row.files) as unknown as (EngineeringCheckpointFile & { content: string })[];

  const approval = requestApproval(db, {
    projectId: project.id,
    taskId: session.taskId,
    conversationId: session.conversationId,
    kind: "checkpoint_restore",
    title: `Rewind to ${row.label}`,
    summary: `Restores ${files.length} project file${files.length === 1 ? "" : "s"} to the checkpoint taken at ${row.created_at}.`,
    explanation:
      "Approving rewrites the named project files with the checkpointed content and records new artifact versions. Files created after the checkpoint stay untouched. Rejecting changes nothing.",
    risk: "medium",
    payload: { checkpointId: row.id, files: files.map((file) => ({ path: file.path, content: file.content })) },
    slides: [
      {
        title: "Rewind target",
        caption: row.label,
        lines: files.slice(0, 20).map((file) => `${file.path} → v${file.version} (${file.sha256})`),
        tone: "neutral",
      },
      {
        title: "What stays",
        caption: "Only checkpointed files are restored",
        lines: ["Files created after the checkpoint remain.", "No file is deleted by a rewind.", "The application repository is untouched."],
        tone: "remove",
      },
    ],
    requestedBy: user.id,
  });

  addEvent(db, {
    sessionId: session.id,
    projectId: project.id,
    kind: "proposal",
    tool: "rewind",
    summary: `Rewind to ${row.label} held for approval`,
    detail: { approvalId: approval.id, checkpointId: row.id, files: files.map((file) => file.path) },
  });
  setStatus(db, session.id, project.id, "awaiting_approval");
  return { approvalId: approval.id, result: { approvalId: approval.id, checkpointId: row.id, files: files.map((file) => file.path) } };
}

function proposeHandoff(
  db: Database,
  project: ProjectRowInternal,
  user: UserRecord,
  session: EngineeringSessionRecord,
  facts: RepositoryFacts,
): { approvalId: string; result: Record<string, unknown> } {
  const events = listEngineeringEvents(db, session.id, project.id, 500);
  const verifications = events.filter((event) => event.kind === "verification");
  const proposals = events.filter((event) => event.kind === "proposal");
  const documents = listProjectFiles(db, project.id);
  const branch = `engineering/${session.id.slice(-8)}`;
  const packPath = safeProjectPath(`handoffs/${branch.replace(/\//g, "-")}.md`)!;

  const body = [
    `# Engineering handoff — ${session.title}`,
    "",
    `Session: \`${session.id}\` · mode: ${session.mode} · status: ${session.status}`,
    `Repository inspected: \`${facts.root}\` (read-only) · branch to create: \`${branch}\``,
    `Requested: ${session.request}`,
    "",
    "## Plan and progress",
    ...session.steps.map((step) => `- [${step.status === "done" ? "x" : " "}] ${step.label} — ${step.detail ?? ""}`),
    "",
    "## Verification evidence",
    verifications.length
      ? verifications
          .map((event) => {
            const detail = event.detail as { command?: string; ok?: boolean; durationMs?: number; output?: string } | null;
            return [
              `- \`${detail?.command ?? event.tool ?? "check"}\` → ${detail?.ok ? "passed" : "failed"} (${Math.round((detail?.durationMs ?? 0) / 1000)}s)`,
              detail?.output ? `  \`\`\`\n${clip(detail.output, 1200)}\n  \`\`\`` : "",
            ]
              .filter(Boolean)
              .join("\n");
          })
          .join("\n")
      : "- No verification command has run in this session yet. Do not merge on the strength of this pack.",
    "",
    "## Changes proposed",
    proposals.length
      ? proposals.map((event) => `- ${event.summary}${event.detail?.path ? ` (\`${String(event.detail.path)}\`)` : ""}`).join("\n")
      : "- None yet.",
    "",
    "## Files in the project sandbox",
    documents.length ? documents.map((file) => `- ${file.path} · v${file.version} · ${file.bytes} bytes`).join("\n") : "- Empty.",
    "",
    "## Risks and open questions",
    "- Repository inspection covered this checkout, not a fresh clone.",
    "- Verification ran against the current working tree, including uncommitted changes.",
    "- Nothing in this session pushed, deployed, charged or messaged anyone.",
    "",
    "## Next commands for a human",
    "```bash",
    `git switch -c ${branch}`,
    "npm run typecheck",
    "npm run lint",
    "npm run test:tay",
    "```",
    "",
    "Merging, production migrations and deployment stay with the owner.",
    "",
  ].join("\n");

  const approval = requestApproval(db, {
    projectId: project.id,
    taskId: session.taskId,
    conversationId: session.conversationId,
    kind: "file_write",
    title: `Write handoff pack for ${session.title.slice(0, 80)}`,
    summary: `${body.split("\n").length} lines with plan progress, verification evidence and risks.`,
    explanation:
      "Approving saves the handoff pack inside the project sandbox and records it as an artifact. It never pushes a branch or opens a pull request.",
    risk: "low",
    payload: { path: packPath, content: body },
    slides: buildChangeSlides({
      action: `Save the reviewable handoff pack to ${packPath}.`,
      path: packPath,
      summary: session.request.slice(0, 300),
      before: null,
      after: body,
    }),
    requestedBy: user.id,
  });

  const steps = updateStep(session.steps, "handoff", { status: "awaiting_approval", detail: `Awaiting a decision on ${packPath}.` });
  setStatus(db, session.id, project.id, "awaiting_approval", steps);
  addEvent(db, {
    sessionId: session.id,
    projectId: project.id,
    kind: "handoff",
    tool: "handoff",
    summary: `Handoff pack prepared at ${packPath}`,
    detail: { approvalId: approval.id, path: packPath, verificationCount: verifications.length },
  });
  return { approvalId: approval.id, result: { approvalId: approval.id, path: packPath, branch } };
}

/** Convenience for the workspace: everything one session panel needs. */
export function engineeringBundle(db: Database, projectId: string) {
  return {
    sessions: listEngineeringSessions(db, projectId),
    playbooks: listEngineeringPlaybooks(db, projectId),
    facts: repositoryFacts(),
  };
}

/** Test hook: the allowlisted command ids, without running anything. */
export function verificationCommandIds(): string[] {
  return VERIFICATION_COMMANDS.map((command) => command.id);
}
