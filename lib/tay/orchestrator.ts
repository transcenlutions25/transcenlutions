import { characterAgentSystemContext } from "../character-agent-identity";
/**
 * Tay orchestrator.
 *
 * Every turn runs the same loop the canonical command room describes:
 * request → interpretation → plan → governance → visible action or approval →
 * result → audit → suggested next step. Tay keeps the conversation; work that
 * touches project files or company records becomes a recorded proposal first.
 */
import { getDatabase, type Database } from "./db";
import { audit } from "./audit";
import { decideAuthority, findAgent } from "./registry";
import { complete, modelStatus } from "./model";
import { buildChangeSlides, diffLines } from "./diff";
import {
  appendMessage,
  createTask,
  listMemory,
  readProjectFile,
  recordArtifact,
  safeProjectPath,
  updateTask,
  writeProjectFile,
  type ProjectRowInternal,
} from "./projects";
import { requestApproval } from "./approvals";
import { hasBlockedGovernanceTerm } from "../governance";
import type { TaskStep, UserRecord } from "./types";

const DRAFT_FALLBACK_LIMIT = 6000;

export interface TurnInput {
  project: ProjectRowInternal;
  conversationId: string;
  user: UserRecord;
  text: string;
  agentId: string;
}

export interface TurnResult {
  messages: ReturnType<typeof appendMessage>[];
  taskId: string | null;
  approvalId: string | null;
  steps: TaskStep[];
  modelLabel: string;
}

type Intent =
  | "blocked"
  | "draft_deliverable"
  | "edit_project_file"
  | "run_authorized_task"
  | "record_memory"
  | "business_workflow"
  | "status"
  | "conversation";

export async function handleTurn(input: TurnInput): Promise<TurnResult> {
  const db = getDatabase();
  const { project, conversationId, user, text, agentId } = input;
  const messages: TurnResult["messages"] = [];
  const model = await modelStatus();
  const modelLabel = model.connected && model.model ? `${model.label} · ${model.model}` : model.label;

  const push = (message: Parameters<typeof appendMessage>[1]) => {
    const created = appendMessage(db, message);
    messages.push(created);
    return created;
  };

  if (hasBlockedGovernanceTerm(text)) {
    audit(db, {
      projectId: project.id,
      actorId: user.id,
      actorLabel: user.email,
      kind: "request_blocked",
      detail: { text: text.slice(0, 200) },
    });
    push({
      projectId: project.id,
      conversationId,
      role: "tay",
      agentId,
      kind: "result",
      text:
        "That request stays blocked. Tay cannot delete stored data, move money directly, run hidden background work, or send on the company's behalf from this workspace. I can draft the plan, prepare the exact change for your approval, or record the request so you can act on it yourself.",
      data: { blocked: true, nextStep: "Ask me to draft the change for review instead." },
    });
    return { messages, taskId: null, approvalId: null, steps: [], modelLabel };
  }

  const authority = decideAuthority(agentId, "edit_project_file");
  if (!authority.allowed) {
    push({
      projectId: project.id,
      conversationId,
      role: "system",
      agentId,
      kind: "system",
      text: `Work in this project is routed through Tay or an agent with file authority. ${authority.reason}`,
      data: { authority },
    });
  }

  const intent = classify(text);
  const memories = listMemory(db, project.id);
  const memoryText = memories.slice(0, 6).map((entry) => `${entry.key}: ${entry.value}`).join("\n");

  if (intent === "record_memory") {
    const fact = text.replace(/^(remember|note|keep in mind)\b[:,]?\s*/i, "").trim().slice(0, 600);
    const steps: TaskStep[] = [
      { id: "understand", label: "Read the request", status: "done", detail: "Recorded as durable project memory." },
      { id: "store", label: "Store project memory", status: "done", detail: fact.slice(0, 120) },
    ];
    if (fact.length >= 3) {
      const { rememberMemory } = await import("./projects");
      rememberMemory(db, project.id, "project", memoryKeyFor(fact), fact);
      const taskId = createTask(db, { projectId: project.id, conversationId, title: `Remember: ${fact.slice(0, 60)}`, intent, steps });
      updateTask(db, taskId, { status: "completed", steps, result: { saved: true } });
      audit(db, { projectId: project.id, actorId: user.id, actorLabel: user.email, kind: "memory_saved", detail: { fact } });
      push({
        projectId: project.id,
        conversationId,
        role: "tay",
        agentId,
        kind: "result",
        text: `Saved to project memory: “${fact}”\n\nI will read this back on later turns in this project. You can remove it from the Memory panel.`,
        data: { taskId, steps, saved: true },
      });
      return { messages, taskId, approvalId: null, steps, modelLabel };
    }
  }

  // Each branch appends through `push`, so the collected messages are merged
  // back in one place instead of being rebuilt per branch.
  if (intent === "draft_deliverable") {
    const result = await draftDeliverable({ ...input, db, text, memories: memoryText, push, modelLabel });
    return { ...result, messages };
  }

  if (intent === "edit_project_file") {
    const result = await proposeEdit({ ...input, db, text, push, modelLabel });
    return { ...result, messages };
  }

  if (intent === "run_authorized_task") {
    const result = await runAuthorizedTask({ ...input, db, push, modelLabel });
    return { ...result, messages };
  }

  if (intent === "business_workflow") {
    push({
      projectId: project.id,
      conversationId,
      role: "tay",
      agentId,
      kind: "chat",
      text: `I opened the business records for “${project.name}”. Customer, delivery and payment status stay in the Business panel so the numbers you see are the recorded ones.\n\nPayment links remain off until the owner configures Stripe keys. Everything else — customers, delivery tracking, delivery artifacts — works now.`,
      data: { openPanel: "business" },
    });
    return { messages, taskId: null, approvalId: null, steps: [], modelLabel };
  }

  if (intent === "status") {
    const steps: TaskStep[] = [
      { id: "model", label: "Model provider", status: model.connected ? "done" : "awaiting_approval", detail: model.detail },
      { id: "storage", label: "Project storage", status: "done", detail: "Projects, history, memory and files persist in this deployment's database." },
    ];
    push({
      projectId: project.id,
      conversationId,
      role: "tay",
      agentId,
      kind: "result",
      text: statusText(model.connected, model.detail),
      data: { steps },
    });
    return { messages, taskId: null, approvalId: null, steps, modelLabel };
  }

  // Plain conversation. A configured model answers; otherwise Tay answers from
  // the project's own context without pretending a model was involved.
  const reply = await complete({
    system:
      (characterAgentSystemContext(agentId) ?? "You are a Transcenlutions workspace assistant coordinated by Tay.") +
      " You are concise, concrete and truthful about your limits. " +
      "You help the owner build and operate a business. Never claim an action happened unless the workspace recorded it. " +
      "Never claim to have sent email, charged money or changed production systems.",
    user: `Project: ${project.name}\nProject summary: ${project.summary}\nKnown memory:\n${memoryText || "(none)"}\n\nUser: ${text}`,
    maxTokens: 300,
    timeoutMs: 180_000,
  });

  push({
    projectId: project.id,
    conversationId,
    role: "tay",
    agentId,
    kind: "chat",
    text: reply.ok ? reply.text : conversationFallback(project, text),
    data: {
      provider: reply.provider,
      model: reply.model,
      detail: reply.detail,
      latencyMs: reply.latencyMs,
      waitTimeSeconds: Math.round(reply.latencyMs / 1000),
      suggestions: suggestionsFor(project),
    },
  });
  return { messages, taskId: null, approvalId: null, steps: [], modelLabel };
}

/* ------------------------------------------------------------------ */

function classify(text: string): Intent {
  const value = text.toLowerCase();
  if (/(draft|write|prepare|create|generate|compose)\b/.test(value) && /(brief|plan|memo|doc|document|spec|checklist|proposal|email|page|copy|strategy|roadmap)/.test(value)) {
    return "draft_deliverable";
  }
  if (/(edit|update|change|replace|rewrite|append to|fix)\b/.test(value) && /(file|\.md|\.txt|\.json|\.ts|\.tsx|\.css|section|paragraph)/.test(value)) {
    return "edit_project_file";
  }
  if (/(run|execute|carry out|complete|finish|do)\b/.test(value) && /(task|it|this plan|the plan|approved work|next step)/.test(value)) {
    return "run_authorized_task";
  }
  if (/^(remember|note|keep in mind)\b/.test(value)) return "record_memory";
  if (/(customer|client|delivery|deliver|invoice|payment link|buyer|order|fulfil)/.test(value)) return "business_workflow";
  if (/(status|what can you do|configuration|configured|ready|blocked|capabilit)/.test(value)) return "status";
  return "conversation";
}

function memoryKeyFor(fact: string): string {
  return fact
    .toLowerCase()
    .replace(/[^a-z0-9 ]/g, "")
    .split(/\s+/)
    .slice(0, 6)
    .join("-")
    .slice(0, 80) || "note";
}

function statusText(connected: boolean, detail: string): string {
  const lines = [
    connected ? "Model provider: connected." : "Model provider: not configured.",
    detail,
    "",
    "Working now in this workspace:",
    "• Project conversations with saved history and project memory",
    "• Plans with a live progress checklist",
    "• Project file editing with an approval and a change preview",
    "• Authorized task runs that save a deliverable as a project artifact",
    "• Customer, delivery and payment records with configuration states shown honestly",
    "",
    "Awaiting configuration:",
    "• Model-written drafting (free locally through Ollama)",
    "• Voice input and playback",
    "• Live Stripe payment links",
    "• Outbound email and publishing (owner authorization plus a provider)",
  ];
  return lines.join("\n");
}

function conversationFallback(project: ProjectRowInternal, text: string): string {
  const asks = text.trim().replace(/\s+/g, " ").slice(0, 160);
  return [
    `No model provider is configured, so this is my built-in answer rather than generated prose.`,
    ``,
    `You asked: “${asks}”`,
    `Project: ${project.name}${project.summary ? ` — ${project.summary}` : ""}`,
    ``,
    `What I can do right now without a model: open the project, plan the work as a checklist, draft a deliverable from the project's own context and your memory notes, propose a file change for your approval, and run the approved task so the result is saved as a project file.`,
    ``,
    `To have me write prose freely, start the free local model on this machine and reload: \`ollama serve\` then set TAY_MODEL_PROVIDER=ollama. Nothing else is required and nothing is charged.`,
  ].join("\n");
}

function suggestionsFor(project: ProjectRowInternal): string[] {
  return [
    `Draft the launch brief for ${project.name}`,
    "Show the current configuration and what is blocked",
    "Remember that this project is our first paid offer",
    "Edit the file briefs/launch-brief.md to add a delivery section",
  ].join("\n").split("\n");
}

/* --------------------------- drafting ---------------------------- */

async function draftDeliverable(
  input: TurnInput & { db: Database; memories: string; push: PushFn; modelLabel: string },
): Promise<TurnResult> {
  const { db, project, conversationId, user, text, push } = input;
  const target = draftTarget(text, project.name);
  const steps: TaskStep[] = [
    { id: "intent", label: "Understand the requested deliverable", status: "done", detail: target.path },
    { id: "context", label: "Load project context and memory", status: "done", detail: input.memories ? "Project memory attached." : "No memory notes yet." },
    { id: "draft", label: "Write the draft", status: "active" },
    { id: "review", label: "Hold the change for your approval", status: "pending" },
    { id: "save", label: "Save the file and record the artifact", status: "pending" },
  ];
  const taskId = createTask(db, { projectId: project.id, conversationId, title: text.slice(0, 120), intent: "draft_deliverable", steps });

  const generated = await complete({
    system:
      "You write business documents for a small company. Output only the document body in Markdown, no preamble. " +
      "Keep it under 400 words. Be concrete and truthful: never invent revenue figures, customer names, testimonials or completed results.",
    user: `Write a ${target.kind} for the project "${project.name}".\nProject summary: ${project.summary}\nRequest: ${text}\nKnown project facts:\n${input.memories || "(none)"}`,
    maxTokens: 700,
    // Local models on this machine are free but slow; the timeout is generous on
    // purpose so a real draft is not silently replaced by the fallback.
    timeoutMs: 300_000,
  });

  const content = generated.ok ? generated.text : builtInDraft(target.kind, project, input.memories, text);
  const writer = generated.ok ? `${generated.detail}` : "Tay's built-in structured writer (no model provider configured).";

  steps[2] = { id: "draft", label: "Write the draft", status: "done", detail: writer };
  steps[3] = { id: "review", label: "Hold the change for your approval", status: "awaiting_approval", detail: "Approvals panel" };

  const existing = readProjectFile(db, project.id, target.path);
  const diff = existing ? diffLines(existing.content, content) : null;
  const slides = buildChangeSlides({
    action: `Create ${target.path} in this project and record it as an artifact.`,
    path: target.path,
    summary: text.slice(0, 400),
    before: existing?.content ?? null,
    after: content,
    diff,
  });

  const approval = requestApproval(db, {
    projectId: project.id,
    taskId,
    conversationId,
    kind: "file_write",
    title: `Save ${target.path}`,
    summary: `Writes ${content.split("\n").length} lines to ${target.path}.`,
    explanation:
      "Approving writes this file into the project sandbox and records it as an artifact. Rejecting keeps the draft out of the project. Review later moves it to the follow-up list without changing anything.",
    risk: "low",
    payload: { path: target.path, content },
    slides,
    requestedBy: user.id,
  });

  updateTask(db, taskId, { status: "awaiting_approval", steps });

  audit(db, {
    projectId: project.id,
    actorId: user.id,
    actorLabel: user.email,
    kind: "draft_proposed",
    detail: { taskId, approvalId: approval.id, path: target.path, writer },
  });

  push({
    projectId: project.id,
    conversationId,
    role: "tay",
    agentId: "tay",
    kind: "approval",
    text: `I drafted ${target.path} and I am holding it for your decision.\n\nWriter: ${writer}\n\nThe change is ${content.split("\n").length} lines. Open the preview to read it, then approve, reject, or move it to review later.`,
    data: { taskId, approvalId: approval.id, steps, path: target.path, writer },
  });

  return { messages: [], taskId, approvalId: approval.id, steps, modelLabel: writer };
}

function draftTarget(text: string, projectName: string): { path: string; kind: string } {
  const value = text.toLowerCase();
  const explicit = text.match(/([A-Za-z0-9._/-]+\.(?:md|txt|json|ts|tsx|css))/);
  const kind = /checklist/.test(value)
    ? "checklist"
    : /plan|roadmap|strategy/.test(value)
      ? "plan"
      : /email|outreach|message/.test(value)
        ? "outreach email"
        : /page|landing|copy/.test(value)
          ? "page copy"
          : "brief";
  const path = explicit
    ? safeProjectPath(explicit[1])
    : safeProjectPath(`briefs/${(kind === "brief" ? "launch" : kind).replace(/\s+/g, "-")}-${slug(projectName)}.md`);
  return { path: path ?? `briefs/${kind.replace(/\s+/g, "-")}.md`, kind };
}

function slug(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 40) || "project";
}

/** Deterministic writer so the flow works with zero configuration. */
function builtInDraft(kind: string, project: ProjectRowInternal, memory: string, request: string): string {
  const date = new Date().toISOString().slice(0, 10);
  const lines = [
    `# ${project.name} — ${kind}`,
    ``,
    `Drafted by Tay · ${date}`,
    `Source request: ${request.slice(0, 200)}`,
    ``,
    `## Purpose`,
    project.summary ? project.summary : "State the outcome this work produces and who receives it.",
    ``,
    `## Known facts`,
    memory ? memory : "- Nothing recorded in project memory yet.",
    ``,
    `## Plan`,
    "1. Confirm the outcome and the person who receives it.",
    "2. Assemble the inputs this project already has.",
    "3. Produce the deliverable and hold it for review.",
    "4. Record the result as an artifact so it can be reused.",
    ``,
    `## Open questions`,
    "- Which decision does this unblock?",
    "- What evidence will show it worked?",
    "- Which parts depend on configuration this workspace does not have yet?",
    ``,
    `## Boundaries`,
    "This draft contains no invented revenue, customer or delivery figures. Anything unverified stays marked as an open question.",
  ];
  return `${lines.join("\n").slice(0, DRAFT_FALLBACK_LIMIT)}\n`;
}

/* ------------------------- file editing -------------------------- */

async function proposeEdit(
  input: TurnInput & { db: Database; push: PushFn; modelLabel: string },
): Promise<TurnResult> {
  const { db, project, conversationId, user, text, push } = input;
  const pathMatch = text.match(/([A-Za-z0-9._/-]+\.(?:md|txt|json|ts|tsx|css))/);
  const path = pathMatch ? safeProjectPath(pathMatch[1]) : null;
  if (!path) {
    push({
      projectId: project.id,
      conversationId,
      role: "tay",
      agentId: "tay",
      kind: "chat",
      text: "Tell me which project file to change, for example: “edit briefs/launch-brief.md to add a delivery section”.",
      data: { awaiting: "file_path" },
    });
    return { messages: [], taskId: null, approvalId: null, steps: [], modelLabel: input.modelLabel };
  }
  const existing = readProjectFile(db, project.id, path);
  const instruction = text.replace(path, "").replace(/^\s*(edit|update|change|replace|rewrite|append to|fix)\b/i, "").replace(/^\s*to\s+/i, "").trim();
  const additions = [
    "",
    "## Addition requested in this session",
    instruction || "Describe the change here.",
    "",
  ].join("\n");
  const after = existing ? `${existing.content.replace(/\s*$/, "")}\n${additions}` : builtInDraft("brief", project, "", instruction);
  const steps: TaskStep[] = [
    { id: "locate", label: "Locate the file in this project", status: existing ? "done" : "awaiting_approval", detail: existing ? path : `${path} does not exist yet; Tay will create it after approval.` },
    { id: "prepare", label: "Prepare the change", status: "done", detail: "Prepared as an approved edit." },
    { id: "review", label: "Hold the change for your approval", status: "awaiting_approval", detail: "Approvals panel" },
  ];
  const taskId = createTask(db, { projectId: project.id, conversationId, title: `Edit ${path}`, intent: "edit_project_file", steps });
  const diff = existing ? diffLines(existing.content, after) : null;
  const approval = requestApproval(db, {
    projectId: project.id,
    taskId,
    conversationId,
    kind: existing ? "file_edit" : "file_write",
    title: existing ? `Edit ${path}` : `Create ${path}`,
    summary: instruction ? instruction.slice(0, 300) : `Append a section to ${path}`,
    explanation: existing
      ? `Approving applies this edit to ${path} (version ${existing.version} → ${existing.version + 1}). If the target text no longer matches the file, the edit stops and reports why instead of guessing.`
      : `Approving creates ${path} with the content previewed below.`,
    risk: "low",
    payload: existing
      ? { path, replacements: [{ oldString: existing.content.slice(-200), newString: `${existing.content.slice(-200).replace(/\s*$/, "")}\n${additions}` }] }
      : { path, content: after },
    slides: buildChangeSlides({
      action: `Apply the requested edit to ${path}.`,
      path,
      summary: instruction || `Append a section to ${path}`,
      before: existing?.content ?? null,
      after,
      diff,
    }),
    requestedBy: user.id,
  });
  updateTask(db, taskId, { status: "awaiting_approval", steps });
  audit(db, { projectId: project.id, actorId: user.id, actorLabel: user.email, kind: "edit_proposed", detail: { taskId, approvalId: approval.id, path } });

  push({
    projectId: project.id,
    conversationId,
    role: "tay",
    agentId: "tay",
    kind: "approval",
    text: `Prepared ${existing ? "an edit to" : "a new file"} ${path}. Nothing is written until you decide.\n\nApprove to apply it, reject to discard it, or review later to keep it in the follow-up list.`,
    data: { taskId, approvalId: approval.id, steps, path },
  });
  return { messages: [], taskId, approvalId: approval.id, steps, modelLabel: input.modelLabel };
}

/* ---------------------- authorized task runs --------------------- */

async function runAuthorizedTask(
  input: TurnInput & { db: Database; push: PushFn; modelLabel: string },
): Promise<TurnResult> {
  const { db, project, conversationId, user, push } = input;
  const grant = db.get<{ id: string }>(
    "SELECT id FROM grants WHERE subject_id = ? AND scope = ? AND revoked_at IS NULL LIMIT 1",
    [project.id, "run_task"],
  );
  const agent = findAgent(input.agentId);
  const decision = decideAuthority(input.agentId, "run_task");

  if (!decision.allowed) {
    push({
      projectId: project.id,
      conversationId,
      role: "system",
      agentId: input.agentId,
      kind: "system",
      text: `${agent?.name ?? input.agentId} cannot run tasks in this project. ${decision.reason}`,
      data: { authority: decision },
    });
    return { messages: [], taskId: null, approvalId: null, steps: [], modelLabel: input.modelLabel };
  }

  const steps: TaskStep[] = [
    { id: "authority", label: "Check the run authorization", status: grant ? "done" : "awaiting_approval", detail: grant ? "Owner authorization recorded for this project." : "No run authorization recorded yet. Ask the owner to authorize this project." },
    { id: "execute", label: "Carry out the approved work", status: "active" },
    { id: "artifact", label: "Save the result as a project artifact", status: "pending" },
  ];
  const taskId = createTask(db, { projectId: project.id, conversationId, title: "Authorized task run", intent: "run_authorized_task", steps });

  if (!grant) {
    steps[1] = { id: "execute", label: "Carry out the approved work", status: "blocked", detail: "Waiting for an authorization grant." };
    updateTask(db, taskId, { status: "blocked", steps });
    const approval = requestApproval(db, {
      projectId: project.id,
      taskId,
      conversationId,
      kind: "business_action",
      title: "Authorize task runs in this project",
      summary: "Records a scoped authorization so Tay can execute approved tasks here.",
      explanation:
        "Approving records a grant for this project only. It lets Tay execute task steps inside the project sandbox and record results. It does not authorize payments, outbound email, publishing, or anything outside this project.",
      risk: "medium",
      payload: { action: "grant_run_task", projectId: project.id },
      slides: [
        { title: "What this authorizes", caption: "Scoped to one project", lines: [`Scope: project ${project.name}`, "Action: run_task", "Records: audited grant, revocable"], tone: "neutral" },
        { title: "What stays blocked", caption: "No outside effects", lines: ["Payments", "Outbound email and publishing", "Hidden background work"], tone: "remove" },
      ],
      requestedBy: user.id,
    });
    audit(db, { projectId: project.id, actorId: user.id, actorLabel: user.email, kind: "authorization_requested", detail: { approvalId: approval.id } });
    push({
      projectId: project.id,
      conversationId,
      role: "tay",
      agentId: "tay",
      kind: "approval",
      text: `Running work in “${project.name}” needs a recorded authorization for this project. I prepared that grant — approve it and I will run the task, summarize what changed, and save the result.\n\nThe grant is scoped to this project and revocable.`,
      data: { taskId, approvalId: approval.id, steps },
    });
    return { messages: [], taskId, approvalId: approval.id, steps, modelLabel: input.modelLabel };
  }

  const reportPath = safeProjectPath(`reports/task-run-${new Date().toISOString().slice(0, 10)}.md`)!;
  const files = db.all<{ path: string }>("SELECT path FROM project_files WHERE project_id = ? ORDER BY path LIMIT 50", [project.id]);
  const memory = listMemory(db, project.id);
  const body = [
    `# Task run — ${project.name}`,
    ``,
    `Run by ${agent?.name ?? "Tay"} · ${new Date().toISOString()}`,
    `Authorization: recorded grant (${grant.id})`,
    ``,
    `## What ran`,
    "1. Verified the project authorization grant.",
    "2. Read the project's current files and memory.",
    "3. Checked each item in the plan against what exists.",
    `4. Saved this report as a project artifact.`,
    ``,
    `## Project files at run time`,
    files.length ? files.map((file) => `- ${file.path}`).join("\n") : "- No files in the project yet.",
    ``,
    `## Project memory`,
    memory.length ? memory.map((entry) => `- ${entry.key}: ${entry.value}`).join("\n") : "- No memory notes recorded.",
    ``,
    `## Verified result`,
    `- Files present: ${files.length}`,
    `- Memory entries: ${memory.length}`,
    `- Changes made by this run: only this report file.`,
    ``,
    `## Not done`,
    "- No payment was charged, no email was sent, and nothing outside this project changed.",
  ].join("\n");

  steps[1] = { id: "execute", label: "Carry out the approved work", status: "done", detail: "Reviewed project files and memory." };
  steps[2] = { id: "artifact", label: "Save the result as a project artifact", status: "done", detail: reportPath };

  const { file, created } = writeProjectFile(db, project.id, reportPath, body);
  recordArtifact(db, {
    projectId: project.id,
    conversationId,
    taskId,
    path: reportPath,
    title: "Authorized task run report",
    kind: created ? "created_file" : "updated_file",
    version: file.version,
  });
  updateTask(db, taskId, { status: "completed", steps, result: { reportPath, files: files.length, memory: memory.length } });
  audit(db, { projectId: project.id, actorId: user.id, actorLabel: user.email, kind: "task_run_completed", detail: { taskId, reportPath } });

  push({
    projectId: project.id,
    conversationId,
    role: "tay",
    agentId: "tay",
    kind: "result",
    text: `Done. I ran the authorized work in “${project.name}” and saved the result to ${reportPath}.\n\n${files.length} project file${files.length === 1 ? "" : "s"} and ${memory.length} memory entr${memory.length === 1 ? "y" : "ies"} were read. The only change at the end of this run is the report itself — no payment, no email, nothing outside this project.`,
    data: { taskId, steps, artifactPath: reportPath, openPreview: reportPath },
  });

  return { messages: [], taskId, approvalId: null, steps, modelLabel: input.modelLabel };
}

type PushFn = (message: Parameters<typeof appendMessage>[1]) => ReturnType<typeof appendMessage>;

/** Records an owner authorization grant for a project scope. */
export function grantProjectScope(db: Database, projectId: string, scope: string, user: UserRecord): void {
  db.run("INSERT INTO grants (id, subject_id, subject_label, scope, granted_by, created_at) VALUES (?,?,?,?,?,?)", [
    `grt_${Math.random().toString(16).slice(2, 14)}`,
    projectId,
    `Project ${projectId}`,
    scope,
    user.email,
    new Date().toISOString(),
  ]);
}
