/**
 * Transcenlutions Tay workspace integration tests.
 *
 * Exercises the real server modules: identity and owner binding, project
 * isolation, the authority registry, the approval lifecycle, the end-to-end
 * conversation → approval → apply → artifact flow, project memory, authorized
 * task runs, business records, and the vendored file-edit matcher.
 */
import assert from "node:assert/strict";
import { rmSync, mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { requireSource as require } from "./tay-source-loader.mjs";

const dataDir = mkdtempSync(join(tmpdir(), "tay-workspace-test-"));
process.env.TAY_DATA_DIR = dataDir;
process.env.TAY_OWNER_EMAIL = "owner@transcenlutions.test";
process.env.TAY_MODEL_PROVIDER = "";
delete process.env.TAY_OLLAMA_URL;
delete process.env.TAY_MODEL_BASE_URL;
delete process.env.STRIPE_SECRET_KEY;
delete process.env.TAY_STRIPE_PAYMENT_LINK;

const { getDatabase } = require("../lib/tay/db.ts");
const accounts = require("../lib/tay/accounts.ts");
const projects = require("../lib/tay/projects.ts");
const approvals = require("../lib/tay/approvals.ts");
const registry = require("../lib/tay/registry.ts");
const orchestrator = require("../lib/tay/orchestrator.ts");
const business = require("../lib/tay/business.ts");
const diff = require("../lib/tay/diff.ts");
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

const owner = accounts.provisionOwnerFromConsole(db, "correct horse battery", "Founding Owner");
const member = accounts.createUser(db, "member@transcenlutions.test", "another long password", "Member User", "member");
const stranger = accounts.createUser(db, "stranger@transcenlutions.test", "third long password", "Other User", "member");

check("owner binding is immutable", () => {
  assert.equal(owner.isOwner, true);
  assert.throws(() => accounts.provisionOwnerFromConsole(db, "another password here", "Second"), /already exists/);
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

/* ------------------------------- model -------------------------------- */

await checkAsync("no provider is reported as connected by default", async () => {
  const status = await model.modelStatus(200);
  assert.equal(status.connected, false);
  assert.equal(status.provider, "none");
  assert.match(status.detail, /built-in/i);
});

/* -------------------------------- done -------------------------------- */

db.close();
rmSync(dataDir, { recursive: true, force: true });

if (failures.length > 0) {
  console.error("Tay workspace tests failed:");
  for (const failure of failures) console.error(` - ${failure}`);
  process.exit(1);
}
console.log(`Tay workspace tests passed: ${passed} checks across identity, isolation, authority, approvals, task runs, and business records.`);
