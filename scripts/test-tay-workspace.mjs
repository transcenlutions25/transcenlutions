/**
 * Transcenlutions Tay workspace integration tests.
 *
 * Exercises the real server modules: identity and owner binding, project
 * isolation, the authority registry, the approval lifecycle, the end-to-end
 * conversation → approval → apply → artifact flow, project memory, authorized
 * task runs, business records, and the vendored file-edit matcher.
 */
import { spawnSync } from "node:child_process";
import assert from "node:assert/strict";
import { readFileSync, rmSync, mkdtempSync, symlinkSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const ts = require("typescript");
require.extensions[".ts"] = (module, filename) =>
  module._compile(
    ts.transpileModule(readFileSync(filename, "utf8"), {
      compilerOptions: {
        esModuleInterop: true,
        module: ts.ModuleKind.CommonJS,
        moduleResolution: ts.ModuleResolutionKind.NodeJs,
        target: ts.ScriptTarget.ES2022,
      },
      fileName: filename,
    }).outputText,
    filename,
  );

const dataDir = mkdtempSync(join(tmpdir(), "tay-workspace-test-"));
process.env.TAY_DATA_DIR = dataDir;
process.env.TAY_MODEL_PROVIDER = "";
delete process.env.TAY_OLLAMA_URL;
delete process.env.TAY_MODEL_BASE_URL;
delete process.env.STRIPE_SECRET_KEY;
delete process.env.TAY_STRIPE_PAYMENT_LINK;

const { getDatabase, openDatabase, validateStorageEnvironment } = require("../lib/tay/db.ts");
const accounts = require("../lib/tay/accounts.ts");
const projects = require("../lib/tay/projects.ts");
const approvals = require("../lib/tay/approvals.ts");
const registry = require("../lib/tay/registry.ts");
const orchestrator = require("../lib/tay/orchestrator.ts");
const business = require("../lib/tay/business.ts");
const diff = require("../lib/tay/diff.ts");
const engineering = require("../lib/tay/engineering.ts");
const migrations = require("../lib/tay/migrations.ts");
const queue = require("../lib/tay/queue.ts");
const model = require("../lib/tay/model.ts");
const patch = require("../third_party/freebuff/str-replace.ts");

// Same connection the server modules use, so writes and reads share one file.
const db = getDatabase();

let passed = 0;
const failures = [];
function check(name, fn) {
  try {
    fn();
    passed++;
  } catch (error) {
    failures.push(`${name}: ${error.message}`);
  }
}
async function checkAsync(name, fn) {
  try {
    await fn();
    passed++;
  } catch (error) {
    failures.push(`${name}: ${error.message}`);
  }
}

/* ------------------------------ identity ------------------------------ */

const owner = accounts.bootstrapOwner(db, "owner@transcenlutions.test", "correct horse battery", "Founding Owner");
const member = accounts.createUser(db, "member@transcenlutions.test", "another long password", "Member User", "member");
const stranger = accounts.createUser(db, "stranger@transcenlutions.test", "third long password", "Other User", "member");

check("owner binding is immutable", () => {
  assert.equal(owner.isOwner, true);
  assert.throws(() => accounts.bootstrapOwner(db, "second@example.com", "another password here", "Second"), /already exists/);
});

check("credential verification rejects bad passwords", () => {
  assert.equal(accounts.authenticate(db, "owner@transcenlutions.test", "wrong password") , null);
  const authenticated = accounts.authenticate(db, "owner@transcenlutions.test", "correct horse battery");
  assert.equal(authenticated?.id, owner.id);
});

check("sessions are revocable", () => {
  const { token } = accounts.createSession(db, member.id);
  assert.equal(accounts.sessionIdentityFromToken(db, token)?.user.id, member.id);
  accounts.revokeSession(db, token);
  assert.equal(accounts.sessionIdentityFromToken(db, token), null);
  const expired = accounts.createSession(db, member.id);
  db.run("UPDATE sessions SET expires_at = ? WHERE user_id = ?", [new Date(Date.now() - 1000).toISOString(), member.id]);
  assert.equal(accounts.sessionIdentityFromToken(db, expired.token), null);
});

/* ------------------------------ projects ------------------------------ */

const project = projects.createProject(db, owner.id, "Launch the checklist", "First paid offer for operators.");
const conversation = projects.createConversation(db, project.id, "Welcome to Launch the checklist");

check("projects are isolated by account", () => {
  assert.equal(accounts.loadProjectForUser(db, project.id, stranger), null);
  assert.equal(accounts.loadProjectForUser(db, project.id, member), null);
  db.run("INSERT INTO project_members (project_id, user_id, role, created_at) VALUES (?,?,?,?)", [
    project.id,
    member.id,
    "member",
    new Date().toISOString(),
  ]);
  const access = accounts.loadProjectForUser(db, project.id, member);
  assert.equal(access?.access.canEdit, true);
  assert.equal(access?.access.canAdminister, false);
  assert.equal(accounts.loadProjectForUser(db, project.id, owner)?.access.canAdminister, true);
});

check("project paths reject traversal and secret files", () => {
  assert.equal(projects.safeProjectPath("../etc/passwd"), null);
  assert.equal(projects.safeProjectPath("/etc/passwd"), null);
  assert.equal(projects.safeProjectPath(".env"), null);
  assert.equal(projects.safeProjectPath("briefs/.env.local"), null);
  assert.equal(projects.safeProjectPath("node_modules/pkg/index.js"), null);
  assert.equal(projects.safeProjectPath("briefs/launch-brief.md"), "briefs/launch-brief.md");
});

/* ----------------------------- authority ------------------------------ */

check("authority is enforced server-side", () => {
  assert.equal(registry.decideAuthority("tay", "edit_project_file").allowed, true);
  assert.equal(registry.decideAuthority("kj", "payment", true).allowed, false);
  assert.equal(registry.decideAuthority("kj", "edit_project_file").allowed, true);
  assert.equal(registry.decideAuthority("tay", "hire_or_fire_human", true).blocked, true);
  assert.equal(registry.decideAuthority("tay", "change_system_settings", true).blocked, true);
  assert.equal(registry.decideAuthority("tay", "invent_new_power", true).allowed, false);
  assert.equal(registry.decideAuthority("ghost", "plan", true).allowed, false);
});

check("skills report configuration honestly", () => {
  const skills = registry.skillTree();
  assert.equal(skills.find((skill) => skill.id === "file_editing")?.status, "available");
  assert.equal(skills.find((skill) => skill.id === "payments_live")?.status, "approval_required");
  assert.equal(skills.find((skill) => skill.id === "outbound_sending")?.status, "blocked");
});

/* --------------------------- vendored edit ---------------------------- */

check("vendored Freebuff matcher applies exact replacements", () => {
  const result = patch.applyReplacements("hello world\n", [{ oldString: "hello", newString: "hi" }]);
  assert.equal(result.applied, 1);
  assert.equal(result.content, "hi world\n");
});

check("vendored Freebuff matcher refuses ambiguous targets", () => {
  const result = patch.applyReplacements("a\nb\na\n", [{ oldString: "a", newString: "c" }]);
  assert.equal(result.applied, 0);
  assert.match(result.messages.join(" "), /2 occurrences/);
});

check("vendored Freebuff matcher tolerates whitespace differences", () => {
  const result = patch.applyReplacements("const value = 1;\n", [{ oldString: "const   value = 1;", newString: "const value = 2;" }]);
  assert.equal(result.applied, 1);
  assert.equal(result.content, "const value = 2;\n");
});

/* -------------------------------- diff -------------------------------- */

check("line diff counts real changes", () => {
  const result = diff.diffLines("alpha\nbeta\ngamma\n", "alpha\nbeta changed\ngamma\n");
  assert.equal(result.added, 1);
  assert.equal(result.removed, 1);
  assert.equal(result.unchanged, 2);
});

check("change slides explain the proposal", () => {
  const slides = diff.buildChangeSlides({
    action: "Write the brief",
    path: "briefs/brief.md",
    summary: "Draft the launch brief",
    before: null,
    after: "# Brief\nBody\n",
  });
  assert.ok(slides.length >= 2);
  assert.match(slides[0].title, /What this does/);
});

/* ------------------------------ the flow ------------------------------ */

const projectRow = {
  id: project.id,
  owner_id: owner.id,
  name: project.name,
  summary: project.summary,
  status: "active",
  created_at: project.createdAt,
  updated_at: project.updatedAt,
};

await checkAsync("a draft request produces an approval, not a file", async () => {
  const turn = await orchestrator.handleTurn({
    project: projectRow,
    conversationId: conversation.id,
    user: owner,
    text: "Draft the launch brief for this project",
    agentId: "tay",
  });
  assert.ok(turn.approvalId, "expected an approval id");
  assert.ok(turn.messages.length > 0, "expected a Tay message");
  const approval = approvals.getApproval(db, turn.approvalId, project.id);
  assert.equal(approval?.status, "pending");
  assert.equal(approval?.kind, "file_write");
  assert.ok(approval.slides.length >= 2);
  assert.equal(projects.listProjectFiles(db, project.id).length, 0, "no file may exist before approval");
});

let briefApprovalId = null;
const pending = approvals.listApprovals(db, project.id, "pending");
briefApprovalId = pending[0]?.id ?? null;

await checkAsync("approving applies the change and records an artifact", async () => {
  assert.ok(briefApprovalId);
  const result = approvals.decideApproval(db, briefApprovalId, project.id, "approve", owner);
  assert.equal(result.applied, true, result.error);
  const approval = result.approval;
  const path = approval.payload.path;
  const file = projects.readProjectFile(db, project.id, path);
  assert.ok(file, "expected the file to exist after approval");
  assert.match(file.content, /Launch the checklist/);
  const artifacts = projects.listArtifacts(db, project.id);
  assert.equal(artifacts.length >= 1, true);
  assert.equal(artifacts[0].path, path);

  const again = approvals.decideApproval(db, briefApprovalId, project.id, "approve", owner);
  assert.equal(again.applied, false);
  assert.match(String(again.error), /already applied/);
});

await checkAsync("rejecting writes nothing", async () => {
  const turn = await orchestrator.handleTurn({
    project: projectRow,
    conversationId: conversation.id,
    user: owner,
    text: "Draft a plan for the second offer",
    agentId: "tay",
  });
  const rejection = approvals.decideApproval(db, turn.approvalId, project.id, "reject", owner);
  assert.equal(rejection.applied, false);
  const path = rejection.approval.payload.path;
  assert.equal(projects.readProjectFile(db, project.id, path), null);
});

await checkAsync("review later records a decision without applying", async () => {
  const turn = await orchestrator.handleTurn({
    project: projectRow,
    conversationId: conversation.id,
    user: owner,
    text: "Create a launch checklist",
    agentId: "tay",
  });
  const postponed = approvals.decideApproval(db, turn.approvalId, project.id, "review_later", owner);
  assert.equal(postponed.applied, false);
  assert.equal(postponed.approval.status, "review_later");
  assert.equal(projects.readProjectFile(db, project.id, postponed.approval.payload.path), null);
});

await checkAsync("memory is durable and readable", async () => {
  const turn = await orchestrator.handleTurn({
    project: projectRow,
    conversationId: conversation.id,
    user: owner,
    text: "remember that the first paid offer is the $97 implementation checklist",
    agentId: "tay",
  });
  assert.ok(turn.taskId);
  const memory = projects.listMemory(db, project.id);
  assert.equal(memory.length >= 1, true);
  assert.match(memory.map((entry) => entry.value).join(" "), /97/);
});

await checkAsync("blocked requests never create approvals", async () => {
  const before = approvals.listApprovals(db, project.id).length;
  const turn = await orchestrator.handleTurn({
    project: projectRow,
    conversationId: conversation.id,
    user: owner,
    text: "delete the database and wipe every record",
    agentId: "tay",
  });
  assert.equal(turn.approvalId, null);
  assert.equal(approvals.listApprovals(db, project.id).length, before);
  assert.match(turn.messages[0].text, /blocked/i);
});

await checkAsync("an unauthorized agent cannot run tasks", async () => {
  const turn = await orchestrator.handleTurn({
    project: projectRow,
    conversationId: conversation.id,
    user: owner,
    text: "run the authorized task for this project",
    agentId: "dawn",
  });
  assert.equal(turn.approvalId, null);
  assert.equal(turn.taskId, null);
});

await checkAsync("a task run needs a recorded grant, then saves an artifact", async () => {
  const first = await orchestrator.handleTurn({
    project: projectRow,
    conversationId: conversation.id,
    user: owner,
    text: "run the authorized task for this project",
    agentId: "tay",
  });
  assert.ok(first.approvalId, "expected a grant proposal");
  const grantApproval = approvals.getApproval(db, first.approvalId, project.id);
  assert.equal(grantApproval?.payload.action, "grant_run_task");
  const applied = approvals.decideApproval(db, first.approvalId, project.id, "approve", owner);
  assert.equal(applied.applied, true, applied.error);

  const second = await orchestrator.handleTurn({
    project: projectRow,
    conversationId: conversation.id,
    user: owner,
    text: "run the authorized task for this project",
    agentId: "tay",
  });
  assert.equal(second.approvalId, null);
  assert.ok(second.taskId);
  const task = projects.listTasks(db, project.id).find((entry) => entry.id === second.taskId);
  assert.equal(task?.status, "completed");
  const report = projects.listProjectFiles(db, project.id).find((file) => file.path.startsWith("reports/"));
  assert.ok(report, "expected a task report file");
  assert.equal(second.messages[0].data.artifactPath, report.path);
});

/* ----------------------------- business ------------------------------- */

check("invoice starts awaiting configuration, never as revenue", () => {
  const customer = business.createCustomer(db, project.id, owner, {
    name: "Sam Buyer",
    email: "sam@example.test",
    notes: "Wants the checklist",
  });
  const delivery = business.createDelivery(db, project.id, owner, { customerId: customer.id, offer: "Checklist", artifactPath: null });
  assert.ok(delivery);
  const invoice = business.createInvoice(db, project.id, owner, { customerId: customer.id, offer: "Checklist", amountCents: 9700 });
  assert.equal(invoice?.status, "awaiting_configuration");
  assert.equal(invoice?.amountCents, 9700);
  const state = business.businessState(db, project.id);
  assert.equal(state.paymentConfiguration.configured, false);
  assert.equal(state.invoices.length, 1);
});

check("a payment handoff only records a configured link", () => {
  process.env.TAY_STRIPE_PAYMENT_LINK = "https://buy.stripe.com/test_0000000000";
  const customer = business.listCustomers(db, project.id)[0];
  const invoice = business.createInvoice(db, project.id, owner, { customerId: customer.id, offer: "Checklist", amountCents: 9700 });
  const approval = approvals.requestApproval(db, {
    projectId: project.id,
    taskId: null,
    conversationId: conversation.id,
    kind: "business_action",
    title: "Prepare payment link",
    summary: "9700 cents",
    explanation: "Approval records the configured payment link; it never charges a card.",
    risk: "high",
    payload: { action: "record_payment_link", invoiceId: invoice.id, providerRef: process.env.TAY_STRIPE_PAYMENT_LINK },
    slides: [{ title: "Handoff", caption: "Owner approval", lines: ["No charge occurs here"], tone: "neutral" }],
    requestedBy: owner.id,
  });
  const result = approvals.decideApproval(db, approval.id, project.id, "approve", owner);
  assert.equal(result.applied, true, result.error);
  const updated = business.listInvoices(db, project.id).find((entry) => entry.id === invoice.id);
  assert.equal(updated.status, "payment_link_ready");
  delete process.env.TAY_STRIPE_PAYMENT_LINK;
});

/* -------------------------- engineering sessions ------------------------ */

check("repository inspection is read-only and refuses secret paths", () => {
  const facts = engineering.repositoryFacts();
  assert.ok(facts.fileCount > 50, `expected a populated repository, saw ${facts.fileCount} files`);
  assert.equal(facts.packageManager, "npm");
  assert.ok(facts.verificationCommands.some((command) => command.id === "typecheck"));
  assert.ok(facts.scripts.some((script) => script.name === "test:tay"));
  assert.match(engineering.readRepoFile("lib/tay/approvals.ts").content, /decideApproval/);
  assert.throws(() => engineering.readRepoFile(".env"), /outside the readable repository|secret/);
  assert.throws(() => engineering.readRepoFile("../package.json"), /outside the readable repository|secret/);
  assert.throws(() => engineering.readRepoFile("node_modules/typescript/package.json"), /outside the readable repository|secret/);
  const found = engineering.searchRepository("decideAuthority");
  assert.ok(found.matches.some((match) => match.path === "lib/tay/registry.ts"));
});

check("the plan is phased and names the real checks", () => {
  const facts = engineering.repositoryFacts();
  const plan = engineering.buildEngineeringPlan("Fix the approval checklist so it updates after a decision", facts, "agent");
  assert.equal(plan.kind, "bugfix");
  assert.equal(plan.title, "Fix the approval checklist so it updates after a decision");
  assert.deepEqual(
    plan.steps.map((step) => step.id),
    ["scope", "map", "approach", "implement", "verify", "checkpoint", "handoff"],
  );
  assert.ok(plan.acceptance.length >= 3);
  const ask = engineering.buildEngineeringPlan("Where is the approval status rendered?", facts, "ask");
  assert.match(ask.steps.find((step) => step.id === "implement").detail, /No writes/);
});

check("verification refuses anything outside the allowlist", () => {
  assert.throws(() => engineering.runVerification("rm -rf /"), /Only these checks/);
  assert.throws(() => engineering.runVerification("npm install"), /Only these checks/);
  assert.ok(engineering.verificationCommandIds().includes("typecheck"));
});

let engineeringSessionId = null;
await checkAsync("an agent session persists a plan and a worklog", async () => {
  const created = await engineering.createEngineeringSession(db, projectRow, owner, {
    request: "Fix the approval checklist so it updates after a decision",
    mode: "agent",
    conversationId: conversation.id,
  });
  engineeringSessionId = created.session.id;
  assert.equal(created.session.mode, "agent");
  assert.equal(created.session.status, "running");
  assert.ok(created.session.steps.length >= 6);
  const head = spawnSync("git", ["symbolic-ref", "--quiet", "--short", "HEAD"], { encoding: "utf8" });
  assert.equal(created.session.baseBranch, head.status === 0 ? head.stdout.trim() : "detached-or-unavailable");
  const events = engineering.listEngineeringEvents(db, created.session.id, project.id);
  assert.ok(events.some((event) => event.kind === "plan"));
  assert.ok(events.some((event) => event.tool === "repository_facts"));
  assert.ok(engineering.listEngineeringSessions(db, project.id).some((entry) => entry.id === created.session.id));
});

await checkAsync("a patch is proposed and only applied after approval", async () => {
  const path = "engineering/notes.md";
  const outcome = await engineering.runEngineeringTool(db, projectRow, owner, {
    sessionId: engineeringSessionId,
    tool: "propose_patch",
    args: { path, content: "# Engineering note\n\nProposed by the session.\n" },
  });
  assert.ok(outcome.approvalId);
  assert.equal(projects.readProjectFile(db, project.id, path), null, "no file may exist before approval");
  const applied = approvals.decideApproval(db, outcome.approvalId, project.id, "approve", owner);
  assert.equal(applied.applied, true, applied.error);
  assert.match(projects.readProjectFile(db, project.id, path).content, /Engineering note/);
});

await checkAsync("ask sessions never write", async () => {
  const created = await engineering.createEngineeringSession(db, projectRow, owner, {
    request: "Explain how approvals are applied in this repository",
    mode: "ask",
  });
  assert.equal(created.session.mode, "ask");
  await assert.rejects(
    engineering.runEngineeringTool(db, projectRow, owner, {
      sessionId: created.session.id,
      tool: "propose_patch",
      args: { path: "engineering/ask.md", content: "should never be written" },
    }),
    /read-only/,
  );
  assert.equal(projects.readProjectFile(db, project.id, "engineering/ask.md"), null);
});

await checkAsync("a checkpoint can be rewound through an approval", async () => {
  const path = "engineering/notes.md";
  const session = engineering.getEngineeringSession(db, engineeringSessionId, project.id);
  const checkpoint = engineering.captureCheckpoint(db, projectRow, owner, session, "Before the rewrite");
  assert.ok(checkpoint.files.some((file) => file.path === path));
  // A tool run must not clear the pending decision it is running alongside.
  const toolRun = await engineering.runEngineeringTool(db, projectRow, owner, {
    sessionId: engineeringSessionId,
    tool: "checkpoint",
    args: { label: "Second checkpoint" },
  });
  assert.equal(toolRun.session.status, session.status);
  projects.writeProjectFile(db, project.id, path, "# Rewritten\n");
  const restore = await engineering.runEngineeringTool(db, projectRow, owner, {
    sessionId: engineeringSessionId,
    tool: "rewind",
    args: { checkpointId: checkpoint.id },
  });
  assert.ok(restore.approvalId);
  const approval = approvals.getApproval(db, restore.approvalId, project.id);
  assert.equal(approval.kind, "checkpoint_restore");
  const applied = approvals.decideApproval(db, restore.approvalId, project.id, "approve", owner);
  assert.equal(applied.applied, true, applied.error);
  assert.match(projects.readProjectFile(db, project.id, path).content, /Engineering note/);
});

await checkAsync("the handoff pack is an artifact, not a push", async () => {
  const outcome = await engineering.runEngineeringTool(db, projectRow, owner, {
    sessionId: engineeringSessionId,
    tool: "handoff",
    args: {},
  });
  assert.ok(outcome.approvalId);
  const approval = approvals.getApproval(db, outcome.approvalId, project.id);
  assert.equal(approval.kind, "file_write");
  assert.match(approval.payload.path, /^handoffs\//);
  const applied = approvals.decideApproval(db, outcome.approvalId, project.id, "approve", owner);
  assert.equal(applied.applied, true, applied.error);
  const file = projects.readProjectFile(db, project.id, approval.payload.path);
  assert.match(file.content, /Engineering handoff/);
  assert.match(file.content, /Next commands for a human/);
  assert.match(file.content, /Nothing in this session pushed/);
});

/* --------------------------- migrations and queue ----------------------- */

check("migrations are recorded and safe to re-run", () => {
  const status = migrations.migrationStatus(db);
  assert.deepEqual(status.pending, []);
  assert.ok(status.applied.includes("001_workspace_core"));
  assert.ok(status.applied.includes("003_agent_jobs"));
  assert.deepEqual(migrations.applyMigrations(db).applied, []);
});

check("the queue refuses an agent without run_task authority", () => {
  assert.throws(
    () =>
      queue.enqueueJob(db, {
        projectId: project.id,
        agentId: "dawn",
        kind: "engineering_checkpoint",
        payload: { sessionId: engineeringSessionId },
        createdBy: owner.id,
      }),
    /cannot queue work/,
  );
});

await checkAsync("a queued job is leased once, completed once, and audited", async () => {
  const job = queue.enqueueJob(db, {
    projectId: project.id,
    agentId: "kj",
    kind: "engineering_checkpoint",
    payload: { sessionId: engineeringSessionId, label: "Lease check" },
    createdBy: owner.id,
  });
  assert.equal(job.status, "queued");
  const claimed = queue.claimNextJob(db, "worker-a");
  assert.equal(claimed.id, job.id);
  assert.equal(claimed.attempts, 1);
  assert.equal(queue.claimNextJob(db, "worker-b"), null, "a leased job cannot be claimed twice");
  assert.throws(() => queue.completeJob(db, job.id, "worker-b"), /Only the lease holder/);
  const done = queue.completeJob(db, job.id, "worker-a", { ok: true });
  assert.equal(done.status, "completed");
  assert.equal(done.finishedAt !== null, true);
  const auditKinds = db
    .all("SELECT kind FROM audit_events WHERE detail LIKE ?", [`%${job.id}%`])
    .map((row) => row.kind);
  assert.ok(auditKinds.includes("agent_job_enqueued"));
  assert.ok(auditKinds.includes("agent_job_claimed"));
  assert.ok(auditKinds.includes("agent_job_completed"));
});

await checkAsync("a failing job backs off, retries, then fails permanently", async () => {
  const job = queue.enqueueJob(db, {
    projectId: project.id,
    agentId: "kj",
    kind: "engineering_checkpoint",
    payload: { sessionId: engineeringSessionId, label: "Retry check" },
    createdBy: owner.id,
    maxAttempts: 2,
  });
  const first = queue.claimNextJob(db, "worker-a");
  assert.equal(first.id, job.id);
  queue.failJob(db, job.id, "worker-a", "first failure");
  const retried = queue.getJob(db, job.id, project.id);
  assert.equal(retried.status, "queued");
  assert.equal(retried.attempts, 1);
  assert.equal(retried.lastError, "first failure");
  assert.equal(queue.claimNextJob(db, "worker-a"), null, "backoff must delay the retry");
  db.run("UPDATE agent_jobs SET available_at = ? WHERE id = ?", [new Date(0).toISOString(), job.id]);
  const second = queue.claimNextJob(db, "worker-a");
  assert.equal(second.attempts, 2);
  queue.failJob(db, job.id, "worker-a", "second failure");
  assert.equal(queue.getJob(db, job.id, project.id).status, "failed");
});

await checkAsync("a worker tick runs a real checkpoint job", async () => {
  const before = engineering.listCheckpoints(db, engineeringSessionId, project.id).length;
  const job = queue.enqueueJob(db, {
    projectId: project.id,
    agentId: "kj",
    kind: "engineering_checkpoint",
    payload: { sessionId: engineeringSessionId, label: "From the queue" },
    createdBy: owner.id,
  });
  const tick = await queue.runQueueTick(db, { owner: "worker-a", limit: 1, projectId: project.id });
  assert.equal(tick.processed, 1);
  assert.equal(tick.jobs[0].id, job.id);
  assert.equal(tick.jobs[0].status, "completed", tick.jobs[0].error);
  assert.equal(engineering.listCheckpoints(db, engineeringSessionId, project.id).length, before + 1);
  assert.equal(queue.getJob(db, job.id, project.id).status, "completed");
});

/* ----------------------- recovery security regressions ---------------- */

check("accounts and artifacts persist across independent server connections", () => {
  const token = accounts.createSession(db, owner.id).token;
  const other = openDatabase(join(dataDir, "tay.sqlite"));
  try {
    assert.equal(accounts.authenticate(other, owner.email, "correct horse battery").id, owner.id);
    assert.equal(accounts.sessionIdentityFromToken(other, token).user.id, owner.id);
    assert.match(projects.readProjectFile(other, project.id, "engineering/notes.md").content, /Engineering note/);
    assert.equal(accounts.loadProjectForUser(other, project.id, stranger), null);
    accounts.revokeSession(other, token);
    assert.equal(accounts.sessionIdentityFromToken(db, token), null);
  } finally { other.close(); }
});

check("hosted defaults fail closed for storage, session signing and owner signup", () => {
  const prior = process.env.NODE_ENV;
  const secret = process.env.TAY_SESSION_SECRET;
  const dir = process.env.TAY_DATA_DIR;
  try {
    process.env.NODE_ENV = "production";
    delete process.env.TAY_SESSION_SECRET;
    delete process.env.TAY_DATA_DIR;
    assert.throws(() => validateStorageEnvironment(), /persistent|absolute TAY_DATA_DIR/);
    assert.throws(() => accounts.signPayload("untrusted"), /session secret/);
    assert.throws(() => accounts.bootstrapOwner(db, "intruder@example.test", "long password here", "Intruder"), /Public owner setup is disabled/);
    assert.throws(() => engineering.runVerification("git_status"), /local-only/);
  } finally {
    for (const [key, value] of Object.entries({ NODE_ENV: prior, TAY_SESSION_SECRET: secret, TAY_DATA_DIR: dir })) {
      if (value === undefined) delete process.env[key]; else process.env[key] = value;
    }
  }
});

check("repository reads and search reject symlink aliases to private files", () => {
  const alias = "tay-security-alias.txt";
  const folder = "tay-security-alias-dir";
  try {
    symlinkSync(join(dataDir, "tay.sqlite"), alias);
    symlinkSync(dataDir, folder);
    assert.throws(() => engineering.readRepoFile(alias), /outside the readable repository|secret/);
    assert.throws(() => engineering.readRepoFile(`${folder}/tay.sqlite`), /outside the readable repository|secret/);
    assert.ok(!engineering.repositoryMap().entries.some((entry) => entry.path.startsWith("tay-security-alias")));
  } finally { rmSync(alias, { force: true }); rmSync(folder, { force: true }); }
});

check("completed jobs cannot be completed again or audited by a different worker", () => {
  const job = queue.enqueueJob(db, { projectId: project.id, agentId: "kj", kind: "engineering_checkpoint",
    payload: { sessionId: engineeringSessionId }, createdBy: owner.id });
  queue.claimNextJob(db, "one");
  queue.completeJob(db, job.id, "one");
  assert.throws(() => queue.completeJob(db, job.id, "two"), /Only the lease holder/);
  assert.equal(db.get("SELECT COUNT(*) AS n FROM audit_events WHERE kind = 'agent_job_completed' AND detail LIKE ?", [`%${job.id}%`]).n, 1);
});

check("an expired final lease is terminal and cannot be completed", () => {
  const job = queue.enqueueJob(db, { projectId: project.id, agentId: "kj", kind: "engineering_checkpoint",
    payload: { sessionId: engineeringSessionId }, createdBy: owner.id, maxAttempts: 1 });
  queue.claimNextJob(db, "crashed");
  db.run("UPDATE agent_jobs SET lease_expires_at = ? WHERE id = ?", [new Date(0).toISOString(), job.id]);
  assert.throws(() => queue.completeJob(db, job.id, "crashed"), /unexpired/);
  assert.equal(queue.claimNextJob(db, "replacement"), null);
  assert.equal(queue.getJob(db, job.id, project.id).status, "failed");
});

await checkAsync("queue rechecks disabled identities before checkpoint side effects", async () => {
  const before = engineering.listCheckpoints(db, engineeringSessionId, project.id).length;
  const job = queue.enqueueJob(db, { projectId: project.id, agentId: "kj", kind: "engineering_checkpoint",
    payload: { sessionId: engineeringSessionId }, createdBy: owner.id, maxAttempts: 1 });
  db.run("UPDATE users SET disabled = 1 WHERE id = ?", [owner.id]);
  try {
    const tick = await queue.runQueueTick(db, { owner: "revocation-test", projectId: project.id });
    assert.equal(tick.jobs[0].status, "failed");
    assert.match(tick.jobs[0].error, /authority is no longer valid/);
    assert.equal(engineering.listCheckpoints(db, engineeringSessionId, project.id).length, before);
    assert.throws(() => queue.enqueueJob(db, { projectId: project.id, agentId: "kj", kind: "engineering_checkpoint",
      payload: { sessionId: engineeringSessionId }, createdBy: owner.id }), /cannot queue/);
    assert.equal(queue.getJob(db, job.id, project.id).status, "failed");
  } finally { db.run("UPDATE users SET disabled = 0 WHERE id = ?", [owner.id]); }
});

/* ------------------------------- model -------------------------------- */

await checkAsync("no provider is reported as connected by default", async () => {
  const status = await model.modelStatus(200);
  assert.equal(status.connected, false);
  assert.equal(status.provider, "none");
  assert.match(status.detail, /built-in/i);
});

/* -------------------------------- done -------------------------------- */

rmSync(dataDir, { recursive: true, force: true });

if (failures.length > 0) {
  console.error("Tay workspace tests failed:");
  for (const failure of failures) console.error(` - ${failure}`);
  process.exit(1);
}
console.log(`Tay workspace tests passed: ${passed} checks across identity, isolation, authority, approvals, task runs, business records, engineering sessions, migrations, and the agent queue.`);
