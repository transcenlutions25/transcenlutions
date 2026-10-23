"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { WorkspaceFrame } from "../workspace-frame";
import { ApprovalCard, ProgressChecklist } from "./tay-approval";
import {
  AdminPanel,
  AgentsPanel,
  ApprovalQueue,
  AuthorityPanel,
  BusinessPanel,
  FilesPanel,
  HistoryPanel,
  MemoryPanel,
  PreviewPanel,
  SkillsPanel,
} from "./tay-panels";
import {
  errorMessage,
  type AdminPayload,
  type ProjectBundle,
  type ProjectSummary,
  type SessionUser,
  type TurnResponse,
} from "./tay-types";
import type { ApprovalRecord, MessageRecord, TaskStep } from "../../lib/tay/types";

type PanelId = "preview" | "files" | "approvals" | "memory" | "business" | "hierarchy" | "history" | "admin";

const PANELS: { id: PanelId; label: string; ownerOnly?: boolean }[] = [
  { id: "preview", label: "Preview" },
  { id: "files", label: "Files" },
  { id: "approvals", label: "Approvals" },
  { id: "memory", label: "Memory" },
  { id: "business", label: "Business" },
  { id: "hierarchy", label: "Agents & authority" },
  { id: "history", label: "History" },
  { id: "admin", label: "Administration", ownerOnly: true },
];

function messageOf(error: unknown, fallback: string): string {
  return error instanceof Error && error.message ? error.message : fallback;
}

async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(path, {
    ...init,
    headers: { "content-type": "application/json", ...(init?.headers ?? {}) },
    cache: "no-store",
  });
  const payload = (await response.json().catch(() => ({}))) as T & { ok?: boolean; error?: string };
  if (!response.ok || payload.ok === false) throw new Error(errorMessage(payload));
  return payload;
}

export function TayWorkspace({ user, initialProjects }: { user: SessionUser; initialProjects: ProjectSummary[] }) {
  const [projects, setProjects] = useState<ProjectSummary[]>(initialProjects);
  const [bundle, setBundle] = useState<ProjectBundle | null>(null);
  const [activePanel, setActivePanel] = useState<PanelId>("preview");
  const [sidecarOpen, setSidecarOpen] = useState(true);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<{ tone: "error" | "ok" | "info"; text: string } | null>(null);
  const [liveMessage, setLiveMessage] = useState("");
  const [agentId, setAgentId] = useState("tay");
  const [admin, setAdmin] = useState<AdminPayload | null>(null);
  const [inviteToken, setInviteToken] = useState<string | null>(null);
  const [newProject, setNewProject] = useState({ name: "", summary: "" });
  const conversationRef = useRef<HTMLDivElement>(null);

  const selectedProjectId = bundle?.project.id ?? null;

  const refreshProjects = useCallback(async () => {
    const payload = await api<{ ok: true; projects: ProjectSummary[] }>("/api/tay/projects");
    setProjects(payload.projects);
  }, []);

  const loadProject = useCallback(async (projectId: string, options?: { conversationId?: string; file?: string }) => {
    const search = new URLSearchParams();
    if (options?.conversationId) search.set("conversationId", options.conversationId);
    if (options?.file) search.set("file", options.file);
    const payload = await api<ProjectBundle>(`/api/tay/projects/${projectId}${search.size ? `?${search.toString()}` : ""}`);
    setBundle(payload);
    const openApproval = payload.approvals.find((approval) => approval.status === "pending");
    setSidecarOpen(true);
    if (openApproval) setActivePanel("approvals");
    return payload;
  }, []);

  useEffect(() => {
    if (bundle || projects.length === 0) return;
    void loadProject(projects[0]!.id).catch((error: unknown) =>
      setNotice({ tone: "error", text: messageOf(error, "That project did not open.") }),
    );
  }, [bundle, projects, loadProject]);

  useEffect(() => {
    if (activePanel !== "admin" || !user.isOwner || admin) return;
    void api<AdminPayload>("/api/tay/admin")
      .then(setAdmin)
      .catch((error: unknown) =>
        setNotice({ tone: "error", text: messageOf(error, "Administration could not be opened for this account.") }),
      );
  }, [activePanel, admin, user.isOwner]);

  useEffect(() => {
    const node = conversationRef.current;
    if (node) node.scrollTop = node.scrollHeight;
  }, [bundle?.messages.length]);

  const pendingApprovals = useMemo(
    () => (bundle?.approvals ?? []).filter((approval) => approval.status === "pending" || approval.status === "review_later"),
    [bundle?.approvals],
  );

  const refreshAfterChange = useCallback(
    async (projectId: string, file?: string) => {
      await Promise.all([refreshProjects(), loadProject(projectId, file ? { file } : undefined)]);
    },
    [loadProject, refreshProjects],
  );

  async function send(text: string) {
    if (!bundle || busy) return;
    const message = text.trim();
    if (!message) return;
    setBusy(true);
    setNotice(null);
    setDraft("");
    setLiveMessage("Tay is working.");
    try {
      const payload = await api<TurnResponse>(`/api/tay/projects/${bundle.project.id}/messages`, {
        method: "POST",
        body: JSON.stringify({ text: message, conversationId: bundle.conversation.id, agentId }),
      });
      setBundle((current) =>
        current
          ? { ...current, messages: [...current.messages, payload.userMessage, ...payload.messages] }
          : current,
      );
      setLiveMessage(
        payload.messages.map((entry) => entry.text).join(" ").slice(0, 240) || "Tay recorded the change.",
      );
      if (payload.approvalId) {
        setActivePanel("approvals");
        setSidecarOpen(true);
      }
      await refreshProjects();
      await loadProject(bundle.project.id);
    } catch (error) {
      setNotice({ tone: "error", text: error instanceof Error ? error.message : "Tay could not complete that turn." });
    } finally {
      setBusy(false);
    }
  }

  async function decide(approvalId: string, decision: "approve" | "reject" | "review_later") {
    if (!bundle) return;
    setBusy(true);
    setNotice(null);
    try {
      const payload = await api<{ ok: true; approval: ApprovalRecord; applied: boolean; error: string | null }>(
        `/api/tay/projects/${bundle.project.id}/approvals`,
        { method: "POST", body: JSON.stringify({ approvalId, decision }) },
      );
      const appliedPath = typeof payload.approval.payload.path === "string" ? payload.approval.payload.path : undefined;
      // Show the recorded decision right away: the card and its checklist stop
      // asking for a decision while the confirmed project view reloads.
      setBundle((current) =>
        current
          ? {
              ...current,
              approvals: current.approvals.map((entry) => (entry.id === payload.approval.id ? payload.approval : entry)),
            }
          : current,
      );
      setNotice({
        tone: payload.error ? "error" : "ok",
        text: payload.error
          ? payload.error
          : payload.applied
            ? `Applied ${payload.approval.title}. The change is saved and recorded as an artifact.`
            : decision === "reject"
              ? `Rejected ${payload.approval.title}. Nothing was written.`
              : `Moved ${payload.approval.title} to review later.`,
      });
      setLiveMessage(payload.applied ? "Change applied and saved." : "Decision recorded.");
      try {
        await refreshAfterChange(bundle.project.id, payload.applied ? appliedPath : undefined);
      } catch {
        setNotice({
          tone: "error",
          text: "The decision was saved, but the project view could not be refreshed. Reload to see the latest files.",
        });
      }
    } catch (error) {
      setNotice({ tone: "error", text: error instanceof Error ? error.message : "That decision was not recorded." });
    } finally {
      setBusy(false);
    }
  }

  async function saveFile(path: string, content: string) {
    if (!bundle) return;
    setBusy(true);
    try {
      await api(`/api/tay/projects/${bundle.project.id}/files`, { method: "POST", body: JSON.stringify({ path, content }) });
      await refreshAfterChange(bundle.project.id, path);
      setNotice({ tone: "ok", text: `Saved ${path}.` });
      setLiveMessage(`Saved ${path}.`);
    } catch (error) {
      setNotice({ tone: "error", text: error instanceof Error ? error.message : "That file could not be saved." });
    } finally {
      setBusy(false);
    }
  }

  async function memoryAction(method: "POST" | "DELETE", body: Record<string, unknown> | string) {
    if (!bundle) return;
    setBusy(true);
    try {
      const url =
        method === "DELETE"
          ? `/api/tay/projects/${bundle.project.id}/memory?memoryId=${encodeURIComponent(String(body))}`
          : `/api/tay/projects/${bundle.project.id}/memory`;
      await api(url, { method, ...(method === "POST" ? { body: JSON.stringify(body) } : {}) });
      await refreshAfterChange(bundle.project.id);
      setNotice({ tone: "ok", text: "Project memory updated." });
    } catch (error) {
      setNotice({ tone: "error", text: error instanceof Error ? error.message : "Memory was not updated." });
    } finally {
      setBusy(false);
    }
  }

  async function businessAction(action: string, payload: Record<string, unknown>) {
    if (!bundle) return;
    setBusy(true);
    try {
      const result = await api<{ ok: true; notice?: string; approvalId?: string }>(`/api/tay/projects/${bundle.project.id}/business`, {
        method: "POST",
        body: JSON.stringify({ action, ...payload }),
      });
      await refreshAfterChange(bundle.project.id);
      if (result.approvalId) {
        setActivePanel("approvals");
        setNotice({ tone: "info", text: "A payment handoff was proposed and is waiting for your approval." });
      } else if (result.notice) {
        setNotice({ tone: "info", text: result.notice });
      } else {
        setNotice({ tone: "ok", text: "Business records updated." });
      }
    } catch (error) {
      setNotice({ tone: "error", text: error instanceof Error ? error.message : "That business action failed." });
    } finally {
      setBusy(false);
    }
  }

  async function adminAction(action: string, payload: Record<string, unknown>) {
    setBusy(true);
    try {
      const result = await api<{ ok: true; token?: string; notice?: string }>("/api/tay/admin", {
        method: "POST",
        body: JSON.stringify({ action, ...payload }),
      });
      if (result.token) setInviteToken(result.token);
      if (result.notice) setNotice({ tone: "info", text: result.notice });
      setAdmin(await api<AdminPayload>("/api/tay/admin"));
      setNotice((current) => current ?? { tone: "ok", text: "Administration updated." });
    } catch (error) {
      setNotice({ tone: "error", text: error instanceof Error ? error.message : "That administration action failed." });
    } finally {
      setBusy(false);
    }
  }

  async function createProject() {
    const name = newProject.name.trim();
    if (name.length < 2) {
      setNotice({ tone: "error", text: "Give the project a name first." });
      return;
    }
    setBusy(true);
    try {
      const created = await api<{ ok: true; project: { id: string } }>("/api/tay/projects", {
        method: "POST",
        body: JSON.stringify({ name, summary: newProject.summary.trim() }),
      });
      setNewProject({ name: "", summary: "" });
      await refreshProjects();
      await loadProject(created.project.id);
      setNotice({ tone: "ok", text: `Opened ${name}.` });
    } catch (error) {
      setNotice({ tone: "error", text: error instanceof Error ? error.message : "That project could not be created." });
    } finally {
      setBusy(false);
    }
  }

  async function signOut() {
    await fetch("/api/tay/session", { method: "DELETE" });
    window.location.reload();
  }

  const model = bundle?.model;
  const modelChip = model
    ? model.connected
      ? { state: "ok", text: `Model: ${model.model}`, detail: model.detail }
      : { state: "wait", text: "Model: built-in drafts", detail: model.detail }
    : { state: "wait", text: "Model: checking", detail: "Checking the configured provider." };

  const navigation = (
    <div className="tl-stack">
      <section className="tl-panel" style={{ padding: "0.6rem" }}>
        <h3 className="tl-heading">Projects</h3>
        <ul className="tl-file-list" style={{ marginTop: "0.4rem" }}>
          {projects.map((project) => (
            <li key={project.id}>
              <button
                type="button"
                className="tl-file-button"
                aria-current={project.id === selectedProjectId}
                onClick={() => {
                  setNotice(null);
                  void loadProject(project.id).catch((error: unknown) =>
                    setNotice({ tone: "error", text: error instanceof Error ? error.message : "That project did not open." }),
                  );
                }}
              >
                <strong>{project.name}</strong>
                <br />
                <span className="tl-small tl-muted">
                  {project.access.role} · {new Date(project.updatedAt).toLocaleDateString()}
                  {project.pendingApprovals > 0 ? ` · ${project.pendingApprovals} to review` : ""}
                </span>
              </button>
            </li>
          ))}
        </ul>
        <div className="tl-stack" style={{ marginTop: "0.55rem" }}>
          <label className="tl-field">
            <span className="tl-label">New project</span>
            <input
              className="tl-input"
              value={newProject.name}
              onChange={(event) => setNewProject((current) => ({ ...current, name: event.target.value }))}
              placeholder="Project name"
            />
          </label>
          <input
            className="tl-input"
            value={newProject.summary}
            onChange={(event) => setNewProject((current) => ({ ...current, summary: event.target.value }))}
            placeholder="What is this project for?"
            aria-label="Project summary"
          />
          <button type="button" className="tl-button" data-variant="primary" disabled={busy} onClick={() => void createProject()}>
            Open project
          </button>
        </div>
      </section>

      <section className="tl-panel" style={{ padding: "0.6rem" }}>
        <h3 className="tl-heading">Workspace panels</h3>
        <div className="tl-stack" style={{ marginTop: "0.4rem" }}>
          {PANELS.filter((panel) => !panel.ownerOnly || user.isOwner).map((panel) => (
            <button
              key={panel.id}
              type="button"
              className="tl-file-button"
              aria-current={activePanel === panel.id}
              onClick={() => {
                setActivePanel(panel.id);
                setSidecarOpen(true);
              }}
            >
              {panel.label}
              {panel.id === "approvals" && pendingApprovals.length > 0 ? ` (${pendingApprovals.length})` : ""}
            </button>
          ))}
        </div>
      </section>

      <section className="tl-panel" style={{ padding: "0.6rem" }}>
        <h3 className="tl-heading">Agent</h3>
        <label className="tl-field" style={{ marginTop: "0.35rem" }}>
          <span className="tl-label">Talking with</span>
          <select className="tl-select" value={agentId} onChange={(event) => setAgentId(event.target.value)}>
            {(bundle?.agents ?? [{ id: "tay", name: "Tay", status: "active" } as never])
              .filter((agent) => agent.authority !== "founding_owner")
              .map((agent) => (
                <option key={agent.id} value={agent.id} disabled={agent.status !== "active"}>
                  {agent.name}
                  {agent.status !== "active" ? ` (${agent.status})` : ""}
                </option>
              ))}
          </select>
        </label>
        <p className="tl-small tl-muted" style={{ margin: "0.35rem 0 0" }}>
          {modelChip.detail}
        </p>
      </section>
    </div>
  );

  const composer = (
    <form
      className="tl-composer"
      onSubmit={(event) => {
        event.preventDefault();
        void send(draft);
      }}
    >
      <label className="tl-field">
        <span className="tl-label">Talk to Tay about {bundle?.project.name ?? "a project"}</span>
        <textarea
          className="tl-textarea"
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) {
              event.preventDefault();
              void send(draft);
            }
          }}
          placeholder="Draft the launch brief, edit a file, run the authorized task, record a customer…"
          aria-describedby="tay-composer-help"
        />
      </label>
      <div className="tl-row">
        <button type="submit" className="tl-button" data-variant="primary" disabled={busy || draft.trim().length === 0}>
          {busy ? "Working…" : "Send to Tay"}
        </button>
        <span id="tay-composer-help" className="tl-small tl-muted">
          Enter adds a line. {navigatorKeyLabel()} sends.
        </span>
      </div>
      <div className="tl-suggestions" aria-label="Suggested requests">
        {(bundle?.project
          ? [
              `Draft the launch brief for ${bundle.project.name}`,
              "Show the current configuration and what is blocked",
              "Run the authorized task for this project",
              "Remember that the first paid offer is the $97 checklist",
            ]
          : []
        ).map((suggestion) => (
          <button key={suggestion} type="button" className="tl-suggestion" onClick={() => void send(suggestion)} disabled={busy}>
            {suggestion}
          </button>
        ))}
      </div>
    </form>
  );

  return (
    <div className="tl-shell">
      <a className="tl-skip-link" href="#tay-conversation">
        Skip to the conversation
      </a>
      <p className="tl-live tl-visually-hidden" role="status" aria-live="polite">
        {liveMessage}
      </p>

      <WorkspaceFrame
        navigation={navigation}
        conversationTitle={bundle ? `${bundle.project.name} · Tay` : "Transcenlutions · Tay"}
        composer={composer}
        sidecarOpen={sidecarOpen}
        onSidecarOpenChange={setSidecarOpen}
        sidecarTitle={PANELS.find((panel) => panel.id === activePanel)?.label ?? "Workspace"}
        sidecarToolbar={
          <div className="tl-tabs" role="tablist" aria-label="Workspace panels">
            {PANELS.filter((panel) => !panel.ownerOnly || user.isOwner).map((panel) => (
              <button
                key={panel.id}
                type="button"
                role="tab"
                aria-selected={activePanel === panel.id}
                className="tl-tab"
                onClick={() => setActivePanel(panel.id)}
              >
                {panel.label}
              </button>
            ))}
          </div>
        }
        sidecar={
          <div className="tl-stack">
            <div className="tl-row">
              <span className="tl-chip" data-state={modelChip.state}>
                {modelChip.text}
              </span>
              <span className="tl-chip" data-state={pendingApprovals.length ? "wait" : "ok"}>
                {pendingApprovals.length ? `${pendingApprovals.length} awaiting decision` : "No pending decisions"}
              </span>
              <span className="tl-chip" data-state="ok">
                {user.isOwner ? "Founding owner" : user.role}
              </span>
            </div>

            {notice ? (
              <p className="tl-notice" data-tone={notice.tone === "info" ? undefined : notice.tone} role="status">
                {notice.text}
              </p>
            ) : null}

            {activePanel === "preview" ? (
              <PreviewPanel
                file={bundle?.selectedFile ?? null}
                artifacts={bundle?.artifacts ?? []}
                tasks={bundle?.tasks ?? []}
                onOpenFile={(path) => {
                  if (bundle) void loadProject(bundle.project.id, { file: path });
                }}
              />
            ) : null}

            {activePanel === "files" ? (
              <FilesPanel
                files={bundle?.files ?? []}
                selected={bundle?.selectedFile ?? null}
                canEdit={bundle?.project.access.canEdit ?? false}
                busy={busy}
                onOpen={(path) => {
                  if (bundle) void loadProject(bundle.project.id, { file: path });
                }}
                onSave={(path, content) => void saveFile(path, content)}
              />
            ) : null}

            {activePanel === "approvals" ? (
              <ApprovalQueue approvals={bundle?.approvals ?? []} busy={busy} onDecide={(id, decision) => void decide(id, decision)} />
            ) : null}

            {activePanel === "memory" ? (
              <MemoryPanel
                memory={bundle?.memory ?? []}
                canEdit={bundle?.project.access.canEdit ?? false}
                busy={busy}
                onAdd={(key, value) => void memoryAction("POST", { key, value })}
                onRemove={(id) => void memoryAction("DELETE", id)}
              />
            ) : null}

            {activePanel === "business" && bundle ? (
              <BusinessPanel
                business={bundle.business}
                canEdit={bundle.project.access.canEdit}
                busy={busy}
                onAction={(action, payload) => void businessAction(action, payload)}
              />
            ) : null}

            {activePanel === "hierarchy" ? (
              <>
                <AgentsPanel agents={bundle?.agents ?? []} isOwner={user.isOwner} />
                <SkillsPanel skills={bundle?.skills ?? []} />
                {bundle ? <AuthorityPanel authority={bundle.authority} /> : null}
              </>
            ) : null}

            {activePanel === "history" ? (
              <HistoryPanel
                projects={projects}
                tasks={bundle?.tasks ?? []}
                audit={bundle?.audit ?? []}
                currentProjectId={selectedProjectId}
                onSelectProject={(id) => {
                  void loadProject(id).catch((error: unknown) =>
                    setNotice({ tone: "error", text: error instanceof Error ? error.message : "That project did not open." }),
                  );
                }}
              />
            ) : null}

            {activePanel === "admin" ? (
              <AdminPanel admin={admin} busy={busy} inviteToken={inviteToken} onAction={(action, payload) => void adminAction(action, payload)} />
            ) : null}
          </div>
        }
      >
        <div id="tay-conversation" ref={conversationRef}>
          {!bundle ? (
            <section className="tl-panel" style={{ padding: "1rem" }} aria-live="polite">
              <h2 className="tl-heading">Opening the workspace</h2>
              <p className="tl-small tl-muted">Loading your projects, saved history and pending decisions.</p>
            </section>
          ) : bundle.messages.length === 0 ? (
            <section className="tl-panel" style={{ padding: "1rem" }}>
              <h2 className="tl-heading">{bundle.project.name}</h2>
              <p className="tl-small">
                {bundle.project.summary || "No project summary yet."} Tay is the orchestrator here: ask for a draft, a file change, or an
                authorized task run. Anything that writes into the project arrives first as a decision with an explanation and a preview.
              </p>
            </section>
          ) : (
            <div className="tl-messages">
              {bundle.messages.map((message) => (
                <MessageBubble
                  key={message.id}
                  message={message}
                  approvals={bundle.approvals}
                  busy={busy}
                  onDecide={(id, decision) => void decide(id, decision)}
                />
              ))}
            </div>
          )}
        </div>
      </WorkspaceFrame>

      <footer className="tl-workspace">
        <div className="tl-panel" style={{ padding: "0.7rem" }}>
          <div className="tl-between">
            <p className="tl-small tl-muted" style={{ margin: 0 }}>
              Transcenlutions · Tay. Signed in as {user.displayName} ({user.email}).
            </p>
            <button type="button" className="tl-button" data-variant="ghost" onClick={() => void signOut()}>
              Sign out
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
}

function approvalLabel(approval: ApprovalRecord | undefined) {
  switch (approval?.status) {
    case "applied":
      return "applied";
    case "rejected":
      return "rejected";
    case "review_later":
      return "review later";
    case "failed":
      return "apply failed";
    default:
      return "decision needed";
  }
}

function navigatorKeyLabel() {
  return typeof navigator !== "undefined" && /Mac|iPhone|iPad/.test(navigator.platform) ? "⌘ + Enter" : "Ctrl + Enter";
}

function MessageBubble({
  message,
  approvals,
  busy,
  onDecide,
}: {
  message: MessageRecord;
  approvals: ApprovalRecord[];
  busy: boolean;
  onDecide: (approvalId: string, decision: "approve" | "reject" | "review_later") => void;
}) {
  const approvalId = typeof message.data?.approvalId === "string" ? message.data.approvalId : null;
  const approval = approvalId ? approvals.find((entry) => entry.id === approvalId) : undefined;
  const rawSteps = Array.isArray(message.data?.steps) ? (message.data?.steps as TaskStep[]) : [];
  // Once a decision is recorded, the checklist shows the outcome rather than the
  // state it was in when the message was written. The audit trail keeps history.
  const steps = rawSteps.map((step) => {
    if (approval?.status === "applied" && step.status !== "done") return { ...step, status: "done" as const };
    if (approval?.status === "rejected" && step.status === "awaiting_approval") return { ...step, status: "blocked" as const };
    return step;
  });
  const writer = typeof message.data?.writer === "string" ? message.data.writer : null;
  const blocked = message.data?.blocked === true;

  return (
    <article className="tl-message" data-role={message.role === "tay" ? "tay" : message.role}>
      <span className="tl-message-author">
        {message.role === "user" ? "You" : message.agentId === "tay" ? "Tay" : message.agentId}
        {message.kind === "approval" ? ` · ${approvalLabel(approval)}` : ""}
        {blocked ? " · blocked" : ""}
      </span>
      <div className="tl-message-body">{message.text}</div>
      {writer ? (
        <p className="tl-small tl-muted" style={{ margin: "0.5rem 0 0" }}>
          Written by {writer}
        </p>
      ) : null}
      {steps.length > 0 ? <ProgressChecklist steps={steps} title="Plan" /> : null}
      {approval && message.kind === "approval" ? <ApprovalCard approval={approval} busy={busy} onDecide={onDecide} /> : null}
    </article>
  );
}
