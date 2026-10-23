"use client";

import { useCallback, useEffect, useState } from "react";
import { ProgressChecklist } from "./tay-approval";
import type {
  EngineeringCheckpointRecord,
  EngineeringEventRecord,
  EngineeringPlaybookRecord,
  EngineeringSessionRecord,
  RepositoryFacts,
} from "../../lib/tay/types";

interface EngineeringBundle {
  ok: true;
  sessions: EngineeringSessionRecord[];
  playbooks: EngineeringPlaybookRecord[];
  facts: RepositoryFacts;
  session: EngineeringSessionRecord | null;
  events: EngineeringEventRecord[];
  checkpoints: EngineeringCheckpointRecord[];
}

interface QueueJob {
  id: string;
  kind: string;
  status: string;
  attempts: number;
  maxAttempts: number;
  lastError: string | null;
  createdAt: string;
}

interface QueueBundle {
  ok: true;
  jobs: QueueJob[];
  stats: Record<string, number>;
  schema: { version: number; pending: string[] };
}

const STATUS_TONE: Record<string, string> = {
  running: "ok",
  completed: "ok",
  planning: "wait",
  awaiting_approval: "wait",
  paused: "wait",
  blocked: "blocked",
  failed: "blocked",
};

const EVENT_LABEL: Record<string, string> = {
  plan: "Plan",
  tool: "Tool",
  observation: "Observation",
  proposal: "Proposal",
  verification: "Verification",
  checkpoint: "Checkpoint",
  handoff: "Handoff",
  message: "Note",
  error: "Error",
};

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(path, {
    ...init,
    headers: { "content-type": "application/json", ...(init?.headers ?? {}) },
    cache: "no-store",
  });
  const payload = (await response.json().catch(() => ({}))) as T & { ok?: boolean; error?: string };
  if (!response.ok || payload.ok === false) throw new Error(payload.error || "The engineering request failed.");
  return payload;
}

export function EngineeringPanel({
  projectId,
  canEdit,
  onNotice,
  onChanged,
}: {
  projectId: string;
  canEdit: boolean;
  onNotice: (tone: "ok" | "error" | "info", text: string) => void;
  onChanged: () => Promise<void> | void;
}) {
  const [bundle, setBundle] = useState<EngineeringBundle | null>(null);
  const [queue, setQueue] = useState<QueueBundle | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [requestText, setRequestText] = useState("");
  const [mode, setMode] = useState<"ask" | "agent">("agent");
  const [playbookId, setPlaybookId] = useState("");
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState<{ text: string; provider: string } | null>(null);
  const [query, setQuery] = useState("");
  const [filePath, setFilePath] = useState("package.json");
  const [verifyCommand, setVerifyCommand] = useState("typecheck");
  const [checkpointLabel, setCheckpointLabel] = useState("");
  const [patch, setPatch] = useState({ path: "", find: "", replace: "", summary: "" });
  const [playbook, setPlaybook] = useState({ name: "", macro: "", instructions: "" });

  const load = useCallback(
    async (sessionId?: string | null) => {
      const search = sessionId ? `?sessionId=${encodeURIComponent(sessionId)}` : "";
      const [payload, queuePayload] = await Promise.all([
        request<EngineeringBundle>(`/api/tay/projects/${projectId}/engineering${search}`),
        request<QueueBundle>(`/api/tay/projects/${projectId}/queue`),
      ]);
      setBundle(payload);
      setQueue(queuePayload);
      setSelectedId(payload.session?.id ?? null);
      if (payload.facts.verificationCommands.length > 0) {
        const ids = payload.facts.verificationCommands.map((command) => command.id);
        setVerifyCommand((current) => (ids.includes(current) ? current : ids[0]!));
      }
      return payload;
    },
    [projectId],
  );

  useEffect(() => {
    setBundle(null);
    setSelectedId(null);
    setAnswer(null);
    void load().catch((error: unknown) =>
      onNotice("error", error instanceof Error ? error.message : "Engineering sessions could not be opened."),
    );
  }, [load, onNotice]);

  const post = useCallback(
    async (body: Record<string, unknown>, success: string) => {
      setBusy(true);
      try {
        const payload = await request<{ ok: true; session?: EngineeringSessionRecord | null; approvalId?: string | null; answer?: string; provider?: string }>(
          `/api/tay/projects/${projectId}/engineering`,
          { method: "POST", body: JSON.stringify(body) },
        );
        const nextSessionId = payload.session?.id ?? selectedId;
        await load(nextSessionId);
        if (payload.answer) setAnswer({ text: payload.answer, provider: payload.provider ?? "built-in" });
        if (payload.approvalId) {
          onNotice("info", `${success} A decision was added to the Approvals queue.`);
          await onChanged();
        } else {
          onNotice("ok", success);
        }
        return payload;
      } catch (error) {
        onNotice("error", error instanceof Error ? error.message : "That engineering action failed.");
        return null;
      } finally {
        setBusy(false);
      }
    },
    [load, onChanged, onNotice, projectId, selectedId],
  );

  function tool(toolName: string, args: Record<string, unknown> = {}, success = "Recorded.") {
    if (!selectedId) return;
    return post({ action: "tool", sessionId: selectedId, tool: toolName, args }, success);
  }

  const session = bundle?.session ?? null;
  const facts = bundle?.facts;
  const playbookOptions = bundle?.playbooks ?? [];

  return (
    <div className="tl-stack">
      <section className="tl-panel" style={{ padding: "0.75rem" }}>
        <div className="tl-between">
          <h3 className="tl-heading">Engineering sessions</h3>
          {facts ? (
            <span className="tl-chip" data-state="ok">
              {facts.fileCount} files · {facts.framework ?? "repo"}
            </span>
          ) : null}
        </div>
        <p className="tl-small tl-muted" style={{ margin: "0.35rem 0" }}>
          A scoped session reads this checkout read-only, plans the work, runs allowlisted checks and proposes diffs. Nothing is written
          outside the project sandbox, and every write waits for an approval.
        </p>

        <label className="tl-field">
          <span className="tl-label">What should the engineering agent work on?</span>
          <textarea
            className="tl-textarea"
            value={requestText}
            onChange={(event) => setRequestText(event.target.value)}
            placeholder="Fix the approval checklist so it updates immediately after a decision"
            rows={3}
          />
        </label>
        <div className="tl-row" style={{ marginTop: "0.4rem" }}>
          <label className="tl-field">
            <span className="tl-label">Mode</span>
            <select className="tl-select" value={mode} onChange={(event) => setMode(event.target.value === "ask" ? "ask" : "agent")}>
              <option value="agent">Agent · plan and propose changes</option>
              <option value="ask">Ask · read-only investigation</option>
            </select>
          </label>
          <label className="tl-field">
            <span className="tl-label">Playbook</span>
            <select className="tl-select" value={playbookId} onChange={(event) => setPlaybookId(event.target.value)}>
              <option value="">None</option>
              {playbookOptions.map((entry) => (
                <option key={entry.id} value={entry.id}>
                  {entry.macro} · {entry.name}
                </option>
              ))}
            </select>
          </label>
        </div>
        <button
          type="button"
          className="tl-button"
          data-variant="primary"
          disabled={busy || !canEdit || requestText.trim().length < 8}
          onClick={() =>
            void post(
              { action: "create_session", request: requestText.trim(), mode, playbookId: playbookId || null },
              "Session started with a plan.",
            ).then((payload) => {
              if (payload) setRequestText("");
            })
          }
        >
          {busy ? "Working…" : "Start session"}
        </button>
        {!canEdit ? (
          <p className="tl-small tl-muted" style={{ margin: "0.4rem 0 0" }}>
            This account has read-only project access, so it cannot start sessions.
          </p>
        ) : null}

        {(bundle?.sessions ?? []).length > 0 ? (
          <ul className="tl-file-list" style={{ marginTop: "0.6rem" }}>
            {(bundle?.sessions ?? []).slice(0, 8).map((entry) => (
              <li key={entry.id}>
                <button
                  type="button"
                  className="tl-file-button"
                  aria-current={entry.id === selectedId}
                  onClick={() => {
                    setAnswer(null);
                    void load(entry.id).catch((error: unknown) =>
                      onNotice("error", error instanceof Error ? error.message : "That session did not open."),
                    );
                  }}
                >
                  <strong>{entry.title}</strong>
                  <br />
                  <span className="tl-small tl-muted">
                    {entry.mode} · {entry.status.replace(/_/g, " ")} · {new Date(entry.createdAt).toLocaleString()}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        ) : null}
      </section>

      {session ? (
        <>
          <section className="tl-panel" style={{ padding: "0.75rem" }}>
            <div className="tl-between">
              <h3 className="tl-heading">{session.title}</h3>
              <span className="tl-chip" data-state={STATUS_TONE[session.status] ?? "wait"}>
                {session.status.replace(/_/g, " ")}
              </span>
            </div>
            <p className="tl-small tl-muted" style={{ margin: "0.35rem 0" }}>
              {session.mode === "ask" ? "Read-only session" : "Agent session"} · branch to create{" "}
              <code>{`engineering/${session.id.slice(-8)}`}</code> · inspected <code>{session.repository}</code>
            </p>
            <ProgressChecklist steps={session.steps} title="Session plan" />
            <div className="tl-row" style={{ marginTop: "0.5rem" }}>
              <button type="button" className="tl-button" data-variant="ghost" disabled={busy} onClick={() => void tool("repo_map", {}, "Repository mapped.")}>
                Map repo
              </button>
              {session.status === "paused" ? (
                <button type="button" className="tl-button" data-variant="ghost" disabled={busy} onClick={() => void tool("resume", {}, "Session resumed.")}>
                  Resume
                </button>
              ) : (
                <button type="button" className="tl-button" data-variant="ghost" disabled={busy} onClick={() => void tool("pause", {}, "Session paused.")}>
                  Pause
                </button>
              )}
              <button type="button" className="tl-button" data-variant="ghost" disabled={busy} onClick={() => void tool("complete", {}, "Session closed.")}>
                Close session
              </button>
            </div>
          </section>

          <section className="tl-panel" style={{ padding: "0.75rem" }}>
            <h3 className="tl-heading">Ask about the repository</h3>
            <label className="tl-field" style={{ marginTop: "0.35rem" }}>
              <span className="tl-label">Question</span>
              <input
                className="tl-input"
                value={question}
                onChange={(event) => setQuestion(event.target.value)}
                placeholder="Where is the approval status rendered?"
              />
            </label>
            <button
              type="button"
              className="tl-button"
              disabled={busy || question.trim().length < 3}
              onClick={() =>
                void post({ action: "ask", sessionId: session.id, question: question.trim() }, "Answer recorded in the worklog.").then(
                  (payload) => {
                    if (payload) setQuestion("");
                  },
                )
              }
            >
              Ask
            </button>
            {answer ? (
              <>
                <pre className="tl-code" style={{ marginTop: "0.5rem" }} aria-label="Engineering answer">
                  {answer.text}
                </pre>
                <p className="tl-small tl-muted" style={{ margin: "0.3rem 0 0" }}>
                  Answer source: {answer.provider}
                </p>
              </>
            ) : null}
          </section>

          <section className="tl-panel" style={{ padding: "0.75rem" }}>
            <h3 className="tl-heading">Repository tools</h3>
            <p className="tl-small tl-muted" style={{ margin: "0.3rem 0" }}>
              Read-only. Secret files, dependency folders and paths outside this checkout are refused.
            </p>

            <label className="tl-field">
              <span className="tl-label">Search pattern (regular expression)</span>
              <input className="tl-input" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="sessionId|approvalId" />
            </label>
            <button
              type="button"
              className="tl-button"
              data-variant="ghost"
              disabled={busy || query.trim().length < 2}
              onClick={() => void tool("search", { query: query.trim() }, "Search recorded.")}
            >
              Search repo
            </button>

            <label className="tl-field" style={{ marginTop: "0.5rem" }}>
              <span className="tl-label">Read a file</span>
              <input className="tl-input" value={filePath} onChange={(event) => setFilePath(event.target.value)} placeholder="lib/tay/approvals.ts" />
            </label>
            <button
              type="button"
              className="tl-button"
              data-variant="ghost"
              disabled={busy || filePath.trim().length === 0}
              onClick={() => void tool("read_file", { path: filePath.trim() }, "File read recorded.")}
            >
              Read file
            </button>

            <label className="tl-field" style={{ marginTop: "0.5rem" }}>
              <span className="tl-label">Verification command</span>
              <select className="tl-select" value={verifyCommand} onChange={(event) => setVerifyCommand(event.target.value)}>
                {(facts?.verificationCommands ?? []).map((command) => (
                  <option key={command.id} value={command.id}>
                    {command.id} · {command.label}
                  </option>
                ))}
              </select>
            </label>
            <button
              type="button"
              className="tl-button"
              data-variant="ghost"
              disabled={busy || !canEdit}
              onClick={() => void tool("verify", { command: verifyCommand }, "Verification recorded.")}
            >
              Run check
            </button>
            <p className="tl-small tl-muted" style={{ margin: "0.35rem 0 0" }}>
              Only these checks can run. The session cannot install, build, start, push or deploy.
            </p>
          </section>

          {canEdit && session.mode === "agent" ? (
            <section className="tl-panel" style={{ padding: "0.75rem" }}>
              <h3 className="tl-heading">Propose a change</h3>
              <p className="tl-small tl-muted" style={{ margin: "0.3rem 0" }}>
                Writes into the project sandbox only, and only after approval. Leave the find field empty and send content to create a file.
              </p>
              <label className="tl-field">
                <span className="tl-label">Project path</span>
                <input
                  className="tl-input"
                  value={patch.path}
                  onChange={(event) => setPatch((current) => ({ ...current, path: event.target.value }))}
                  placeholder="briefs/engineering-plan.md"
                />
              </label>
              <label className="tl-field">
                <span className="tl-label">Find (optional)</span>
                <textarea
                  className="tl-textarea"
                  rows={3}
                  value={patch.find}
                  onChange={(event) => setPatch((current) => ({ ...current, find: event.target.value }))}
                  placeholder="Exact text already in the file"
                />
              </label>
              <label className="tl-field">
                <span className="tl-label">Replace with / new content</span>
                <textarea
                  className="tl-textarea"
                  rows={4}
                  value={patch.replace}
                  onChange={(event) => setPatch((current) => ({ ...current, replace: event.target.value }))}
                  placeholder="Replacement text, or the full content of a new file"
                />
              </label>
              <label className="tl-field">
                <span className="tl-label">Why</span>
                <input
                  className="tl-input"
                  value={patch.summary}
                  onChange={(event) => setPatch((current) => ({ ...current, summary: event.target.value }))}
                  placeholder="One line the reviewer will read"
                />
              </label>
              <button
                type="button"
                className="tl-button"
                data-variant="primary"
                disabled={busy || patch.path.trim().length === 0 || patch.replace.length === 0}
                onClick={() => {
                  const args: Record<string, unknown> = {
                    path: patch.path.trim(),
                    summary: patch.summary.trim() || undefined,
                  };
                  if (patch.find.trim().length > 0) {
                    args.find = patch.find;
                    args.replace = patch.replace;
                  } else {
                    args.content = patch.replace;
                  }
                  void tool("propose_patch", args, "Patch proposed.")?.then(() => setPatch({ path: "", find: "", replace: "", summary: "" }));
                }}
              >
                Hold for approval
              </button>
            </section>
          ) : null}

          <section className="tl-panel" style={{ padding: "0.75rem" }}>
            <div className="tl-between">
              <h3 className="tl-heading">Durable runs</h3>
              <span className="tl-chip" data-state={queue?.stats.queued ? "wait" : "ok"}>
                {queue ? `${queue.stats.queued ?? 0} queued · ${queue.stats.failed ?? 0} failed` : "queue loading"}
              </span>
            </div>
            <p className="tl-small tl-muted" style={{ margin: "0.3rem 0" }}>
              Queue a check or checkpoint so it survives a page reload and can be drained by the worker process. Run next job executes one job
              in this request; it never approves anything for you.
            </p>
            <div className="tl-row">
              <button
                type="button"
                className="tl-button"
                data-variant="ghost"
                disabled={busy || !canEdit}
                onClick={() =>
                  void post(
                    { action: "enqueue", kind: "engineering_verify", sessionId: session.id, command: verifyCommand },
                    `Queued ${verifyCommand}.`,
                  )
                }
              >
                Queue check
              </button>
              <button
                type="button"
                className="tl-button"
                data-variant="ghost"
                disabled={busy || !canEdit}
                onClick={() =>
                  void post(
                    { action: "enqueue", kind: "engineering_checkpoint", sessionId: session.id, label: checkpointLabel.trim() || "Queued checkpoint" },
                    "Queued a checkpoint.",
                  )
                }
              >
                Queue checkpoint
              </button>
              <button
                type="button"
                className="tl-button"
                data-variant="ghost"
                disabled={busy || !canEdit || (queue?.stats.queued ?? 0) === 0}
                onClick={() => void post({ action: "tick" }, "Ran one queued job.")}
              >
                Run next job
              </button>
            </div>
            <ul className="tl-file-list" style={{ marginTop: "0.5rem" }}>
              {(queue?.jobs ?? []).slice(0, 6).map((job) => (
                <li key={job.id} className="tl-small">
                  <span className="tl-chip" data-state={job.status === "completed" ? "ok" : job.status === "failed" ? "blocked" : "wait"}>
                    {job.status}
                  </span>{" "}
                  {job.kind.replace(/_/g, " ")} · attempt {job.attempts}/{job.maxAttempts}
                  {job.lastError ? (
                    <>
                      <br />
                      <span className="tl-muted">{job.lastError}</span>
                    </>
                  ) : null}
                </li>
              ))}
            </ul>
            {queue?.schema ? (
              <p className="tl-small tl-muted" style={{ margin: "0.35rem 0 0" }}>
                Schema v{queue.schema.version}
                {queue.schema.pending.length > 0 ? ` · pending: ${queue.schema.pending.join(", ")}` : " · up to date"}
              </p>
            ) : null}
          </section>

          <section className="tl-panel" style={{ padding: "0.75rem" }}>
            <h3 className="tl-heading">Checkpoints</h3>
            <label className="tl-field" style={{ marginTop: "0.3rem" }}>
              <span className="tl-label">Checkpoint label</span>
              <input
                className="tl-input"
                value={checkpointLabel}
                onChange={(event) => setCheckpointLabel(event.target.value)}
                placeholder="Before the patch"
              />
            </label>
            <button
              type="button"
              className="tl-button"
              data-variant="ghost"
              disabled={busy || !canEdit}
              onClick={() => void tool("checkpoint", { label: checkpointLabel.trim() }, "Checkpoint captured.")?.then(() => setCheckpointLabel(""))}
            >
              Capture checkpoint
            </button>
            {(bundle?.checkpoints ?? []).length === 0 ? (
              <p className="tl-small tl-muted" style={{ margin: "0.4rem 0 0" }}>
                No checkpoints yet. A checkpoint records the project sandbox so a rewind can restore it.
              </p>
            ) : (
              <ul className="tl-file-list" style={{ marginTop: "0.5rem" }}>
                {(bundle?.checkpoints ?? []).map((checkpoint) => (
                  <li key={checkpoint.id}>
                    <div className="tl-between">
                      <span className="tl-small">
                        <strong>{checkpoint.label}</strong>
                        <br />
                        <span className="tl-muted">
                          {checkpoint.files.length} files · {new Date(checkpoint.createdAt).toLocaleString()}
                        </span>
                      </span>
                      <button
                        type="button"
                        className="tl-button"
                        data-variant="ghost"
                        disabled={busy || !canEdit}
                        onClick={() => void tool("rewind", { checkpointId: checkpoint.id }, "Rewind proposed.")}
                      >
                        Rewind
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="tl-panel" style={{ padding: "0.75rem" }}>
            <div className="tl-between">
              <h3 className="tl-heading">Handoff</h3>
              <button type="button" className="tl-button" data-variant="ghost" disabled={busy || !canEdit} onClick={() => void tool("handoff", {}, "Handoff proposed.")}>
                Prepare pack
              </button>
            </div>
            <p className="tl-small tl-muted" style={{ margin: "0.3rem 0 0" }}>
              The pack records plan progress, verification evidence, proposed changes and risks, and is saved as a project artifact. It never
              pushes a branch or opens a pull request.
            </p>
          </section>

          <section className="tl-panel" style={{ padding: "0.75rem" }}>
            <h3 className="tl-heading">Worklog</h3>
            {(bundle?.events ?? []).length === 0 ? (
              <p className="tl-small tl-muted" style={{ margin: "0.35rem 0 0" }}>
                No events yet.
              </p>
            ) : (
              <ol className="tl-checklist" style={{ marginTop: "0.45rem" }}>
                {(bundle?.events ?? []).map((event) => (
                  <li key={event.id} className="tl-small" style={{ marginBottom: "0.35rem" }}>
                    <span className="tl-chip" data-state={event.kind === "error" ? "blocked" : event.kind === "verification" ? "ok" : "wait"}>
                      {EVENT_LABEL[event.kind] ?? event.kind}
                    </span>{" "}
                    {event.summary}
                    <br />
                    <span className="tl-muted">{new Date(event.at).toLocaleTimeString()}</span>
                  </li>
                ))}
              </ol>
            )}
          </section>
        </>
      ) : null}

      <section className="tl-panel" style={{ padding: "0.75rem" }}>
        <h3 className="tl-heading">Playbooks</h3>
        <p className="tl-small tl-muted" style={{ margin: "0.3rem 0" }}>
          Reusable instructions for repeated work, attached when a session starts.
        </p>
        {(bundle?.playbooks ?? []).length > 0 ? (
          <ul className="tl-file-list">
            {(bundle?.playbooks ?? []).map((entry) => (
              <li key={entry.id}>
                <span className="tl-small">
                  <strong>{entry.name}</strong> <code>{entry.macro}</code>
                  <br />
                  <span className="tl-muted">{entry.instructions.slice(0, 160)}</span>
                </span>
              </li>
            ))}
          </ul>
        ) : null}
        <label className="tl-field">
          <span className="tl-label">Name</span>
          <input className="tl-input" value={playbook.name} onChange={(event) => setPlaybook((current) => ({ ...current, name: event.target.value }))} />
        </label>
        <label className="tl-field">
          <span className="tl-label">Macro</span>
          <input className="tl-input" value={playbook.macro} onChange={(event) => setPlaybook((current) => ({ ...current, macro: event.target.value }))} placeholder="!triage" />
        </label>
        <label className="tl-field">
          <span className="tl-label">Instructions</span>
          <textarea
            className="tl-textarea"
            rows={3}
            value={playbook.instructions}
            onChange={(event) => setPlaybook((current) => ({ ...current, instructions: event.target.value }))}
            placeholder="How this kind of work is done here, including the checks to run."
          />
        </label>
        <button
          type="button"
          className="tl-button"
          disabled={busy || !canEdit || playbook.name.trim().length < 2 || playbook.instructions.trim().length < 20}
          onClick={() =>
            void post(
              { action: "create_playbook", name: playbook.name.trim(), macro: playbook.macro.trim(), instructions: playbook.instructions.trim() },
              "Playbook saved.",
            ).then((payload) => {
              if (payload) setPlaybook({ name: "", macro: "", instructions: "" });
            })
          }
        >
          Save playbook
        </button>
      </section>
    </div>
  );
}
