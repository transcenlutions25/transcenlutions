"use client";

import { useEffect, useState } from "react";
import type { AgentNode, ApprovalRecord, ArtifactRecord, AuthorityNode, BusinessState, FileRecord, MemoryRecord, SkillNode } from "../../lib/tay/types";
import type { AdminPayload, AuditSummary, FileSummary, ProjectSummary, TaskSummary } from "./tay-types";
import { ApprovalCard } from "./tay-approval";

/* ------------------------------- preview ------------------------------ */

export function PreviewPanel({
  file,
  artifacts,
  tasks,
  onOpenFile,
}: {
  file: FileRecord | null;
  artifacts: ArtifactRecord[];
  tasks: TaskSummary[];
  onOpenFile: (path: string) => void;
}) {
  const latestTask = tasks[0] ?? null;
  return (
    <div className="tl-stack">
      {latestTask ? (
        <section className="tl-panel" style={{ padding: "0.75rem" }}>
          <h3 className="tl-heading">Latest task</h3>
          <p className="tl-small" style={{ margin: "0.35rem 0" }}>
            {latestTask.title}
          </p>
          <span className="tl-chip" data-state={latestTask.status === "completed" ? "ok" : latestTask.status === "blocked" ? "blocked" : "wait"}>
            {latestTask.status.replace(/_/g, " ")}
          </span>
        </section>
      ) : null}

      <section className="tl-panel" style={{ padding: "0.75rem" }}>
        <h3 className="tl-heading">Preview</h3>
        {file ? (
          <>
            <p className="tl-small tl-muted" style={{ margin: "0.35rem 0" }}>
              {file.path} · version {file.version} · {file.content.length} characters
            </p>
            {/\.html?$/i.test(file.path) ? (
              <iframe
                className="tl-preview-frame"
                title={`Rendered preview of ${file.path}`}
                sandbox=""
                srcDoc={file.content}
              />
            ) : (
              <pre className="tl-code" aria-label={`Contents of ${file.path}`}>
                {file.content}
              </pre>
            )}
          </>
        ) : (
          <p className="tl-small tl-muted" style={{ margin: 0 }}>
            Select a project file or an artifact to preview it here. PDFs and images opened from the file list appear in this panel; this workspace
            renders text, Markdown and HTML directly.
          </p>
        )}
      </section>

      <section className="tl-panel" style={{ padding: "0.75rem" }}>
        <h3 className="tl-heading">Saved artifacts</h3>
        {artifacts.length === 0 ? (
          <p className="tl-small tl-muted" style={{ margin: "0.35rem 0 0" }}>
            Nothing saved yet. Approved changes and task runs are recorded here.
          </p>
        ) : (
          <ul className="tl-file-list" style={{ marginTop: "0.45rem" }}>
            {artifacts.slice(0, 12).map((artifact) => (
              <li key={artifact.id}>
                <button type="button" className="tl-file-button" onClick={() => onOpenFile(artifact.path)}>
                  <strong>{artifact.path}</strong>
                  <br />
                  <span className="tl-small tl-muted">
                    {artifact.kind.replace(/_/g, " ")} · v{artifact.version} · {new Date(artifact.createdAt).toLocaleString()}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

/* -------------------------------- files ------------------------------- */

export function FilesPanel({
  files,
  selected,
  canEdit,
  busy,
  onOpen,
  onSave,
}: {
  files: FileSummary[];
  selected: FileRecord | null;
  canEdit: boolean;
  busy: boolean;
  onOpen: (path: string) => void;
  onSave: (path: string, content: string) => void;
}) {
  const [draft, setDraft] = useState("");
  const [path, setPath] = useState("");

  useEffect(() => {
    setDraft(selected?.content ?? "");
    setPath(selected?.path ?? "");
  }, [selected?.id, selected?.version, selected?.path, selected?.content]);

  return (
    <div className="tl-stack">
      <section className="tl-panel" style={{ padding: "0.75rem" }}>
        <h3 className="tl-heading">Project files</h3>
        {files.length === 0 ? (
          <p className="tl-small tl-muted" style={{ margin: "0.35rem 0 0" }}>
            No files in this project yet. Ask Tay to draft one, or write one below.
          </p>
        ) : (
          <ul className="tl-file-list" style={{ marginTop: "0.45rem" }}>
            {files.map((file) => (
              <li key={file.path}>
                <button
                  type="button"
                  className="tl-file-button"
                  aria-current={selected?.path === file.path}
                  onClick={() => onOpen(file.path)}
                >
                  {file.path}
                  <br />
                  <span className="tl-small tl-muted">
                    v{file.version} · {file.bytes} characters
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="tl-panel" style={{ padding: "0.75rem" }}>
        <h3 className="tl-heading">Editor</h3>
        {canEdit ? (
          <div className="tl-stack" style={{ marginTop: "0.45rem" }}>
            <label className="tl-field">
              <span className="tl-label">Project-relative path</span>
              <input className="tl-input" value={path} onChange={(event) => setPath(event.target.value)} placeholder="briefs/launch-brief.md" />
            </label>
            <label className="tl-field">
              <span className="tl-label">Content</span>
              <textarea
                className="tl-textarea tl-editor"
                value={draft}
                onChange={(event) => setDraft(event.target.value)}
                spellCheck={false}
              />
            </label>
            <div className="tl-row">
              <button
                type="button"
                className="tl-button"
                data-variant="primary"
                disabled={busy || !path.trim() || draft.length === 0}
                onClick={() => onSave(path.trim(), draft)}
              >
                Save file
              </button>
              <span className="tl-small tl-muted">Saving here is your own edit and is recorded in the audit trail.</span>
            </div>
          </div>
        ) : (
          <p className="tl-small tl-muted" style={{ margin: "0.35rem 0 0" }}>
            This account has read-only access to the project, so the editor is closed.
          </p>
        )}
      </section>
    </div>
  );
}

/* ------------------------------- memory ------------------------------- */

export function MemoryPanel({
  memory,
  canEdit,
  busy,
  onAdd,
  onRemove,
}: {
  memory: MemoryRecord[];
  canEdit: boolean;
  busy: boolean;
  onAdd: (key: string, value: string) => void;
  onRemove: (id: string) => void;
}) {
  const [key, setKey] = useState("");
  const [value, setValue] = useState("");
  return (
    <div className="tl-stack">
      <section className="tl-panel" style={{ padding: "0.75rem" }}>
        <h3 className="tl-heading">Project memory</h3>
        {memory.length === 0 ? (
          <p className="tl-small tl-muted" style={{ margin: "0.35rem 0 0" }}>
            Nothing recorded yet. Tay reads these entries back on later turns in this project.
          </p>
        ) : (
          <ul className="tl-file-list" style={{ marginTop: "0.45rem" }}>
            {memory.map((entry) => (
              <li key={entry.id} className="tl-tree-node">
                <strong>{entry.key}</strong>
                <span className="tl-small">{entry.value}</span>
                <div className="tl-row">
                  <span className="tl-small tl-muted">
                    {entry.scope} · updated {new Date(entry.updatedAt).toLocaleString()}
                  </span>
                  {canEdit ? (
                    <button type="button" className="tl-button" data-variant="ghost" disabled={busy} onClick={() => onRemove(entry.id)}>
                      Remove
                    </button>
                  ) : null}
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      {canEdit ? (
        <section className="tl-panel" style={{ padding: "0.75rem" }}>
          <h3 className="tl-heading">Add a durable fact</h3>
          <div className="tl-stack" style={{ marginTop: "0.45rem" }}>
            <label className="tl-field">
              <span className="tl-label">Short name</span>
              <input className="tl-input" value={key} onChange={(event) => setKey(event.target.value)} placeholder="primary-offer" />
            </label>
            <label className="tl-field">
              <span className="tl-label">Value</span>
              <textarea className="tl-textarea" value={value} onChange={(event) => setValue(event.target.value)} placeholder="The first paid offer is the $97 implementation checklist." />
            </label>
            <button
              type="button"
              className="tl-button"
              disabled={busy || key.trim().length < 2 || value.trim().length < 3}
              onClick={() => {
                onAdd(key.trim(), value.trim());
                setKey("");
                setValue("");
              }}
            >
              Save memory
            </button>
          </div>
        </section>
      ) : null}
    </div>
  );
}

/* ------------------------------ business ------------------------------ */

export function BusinessPanel({
  business,
  canEdit,
  busy,
  onAction,
}: {
  business: BusinessState;
  canEdit: boolean;
  busy: boolean;
  onAction: (action: string, payload: Record<string, unknown>) => void;
}) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [notes, setNotes] = useState("");
  const [offer, setOffer] = useState("");
  const [amount, setAmount] = useState("97");
  const [customerId, setCustomerId] = useState("");

  const customerName = (id: string) => business.customers.find((customer) => customer.id === id)?.name ?? id;

  return (
    <div className="tl-stack">
      <section className="tl-panel" style={{ padding: "0.75rem" }}>
        <h3 className="tl-heading">Payment configuration</h3>
        <p className="tl-small" style={{ margin: "0.35rem 0 0" }}>
          {business.paymentConfiguration.detail}
        </p>
        {!business.paymentConfiguration.configured ? (
          <p className="tl-small tl-muted" style={{ margin: "0.35rem 0 0" }}>
            Required: {business.paymentConfiguration.requiredEnv.join(", ")}
          </p>
        ) : null}
      </section>

      <section className="tl-panel" style={{ padding: "0.75rem" }}>
        <h3 className="tl-heading">Customers</h3>
        {business.customers.length === 0 ? (
          <p className="tl-small tl-muted" style={{ margin: "0.35rem 0 0" }}>
            No customers recorded in this project.
          </p>
        ) : (
          <table className="tl-table" style={{ marginTop: "0.4rem" }}>
            <caption>Recorded customers, newest first</caption>
            <thead>
              <tr>
                <th scope="col">Name</th>
                <th scope="col">Stage</th>
                <th scope="col">Move</th>
              </tr>
            </thead>
            <tbody>
              {business.customers.map((customer) => (
                <tr key={customer.id}>
                  <td>
                    {customer.name}
                    <br />
                    <span className="tl-small tl-muted">{customer.email}</span>
                  </td>
                  <td>{customer.stage}</td>
                  <td>
                    {canEdit ? (
                      <select
                        className="tl-select"
                        aria-label={`Stage for ${customer.name}`}
                        value={customer.stage}
                        disabled={busy}
                        onChange={(event) => onAction("set_customer_stage", { customerId: customer.id, stage: event.target.value })}
                      >
                        {["lead", "qualified", "buyer", "delivering", "delivered", "paused"].map((stage) => (
                          <option key={stage} value={stage}>
                            {stage}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <span className="tl-small tl-muted">read-only</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      <section className="tl-panel" style={{ padding: "0.75rem" }}>
        <h3 className="tl-heading">Deliveries</h3>
        {business.deliveries.length === 0 ? (
          <p className="tl-small tl-muted" style={{ margin: "0.35rem 0 0" }}>
            No deliveries opened yet.
          </p>
        ) : (
          <ul className="tl-file-list" style={{ marginTop: "0.45rem" }}>
            {business.deliveries.map((delivery) => (
              <li key={delivery.id} className="tl-tree-node">
                <strong>{delivery.offer}</strong>
                <span className="tl-small">
                  {customerName(delivery.customerId)} · {delivery.status.replace(/_/g, " ")}
                  {delivery.artifactPath ? ` · ${delivery.artifactPath}` : ""}
                </span>
                {canEdit ? (
                  <select
                    className="tl-select"
                    aria-label={`Delivery status for ${delivery.offer}`}
                    value={delivery.status}
                    disabled={busy}
                    onChange={(event) => onAction("set_delivery_status", { deliveryId: delivery.id, status: event.target.value })}
                  >
                    {["not_started", "in_progress", "ready_for_review", "delivered"].map((status) => (
                      <option key={status} value={status}>
                        {status.replace(/_/g, " ")}
                      </option>
                    ))}
                  </select>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="tl-panel" style={{ padding: "0.75rem" }}>
        <h3 className="tl-heading">Invoices</h3>
        {business.invoices.length === 0 ? (
          <p className="tl-small tl-muted" style={{ margin: "0.35rem 0 0" }}>
            No invoices recorded. Amounts recorded here are intents, not collected revenue.
          </p>
        ) : (
          <table className="tl-table" style={{ marginTop: "0.4rem" }}>
            <caption>Recorded invoices and their real status</caption>
            <thead>
              <tr>
                <th scope="col">Offer</th>
                <th scope="col">Amount</th>
                <th scope="col">Status</th>
              </tr>
            </thead>
            <tbody>
              {business.invoices.map((invoice) => (
                <tr key={invoice.id}>
                  <td>
                    {invoice.offer}
                    <br />
                    <span className="tl-small tl-muted">{customerName(invoice.customerId)}</span>
                  </td>
                  <td>
                    ${(invoice.amountCents / 100).toFixed(2)} {invoice.currency.toUpperCase()}
                  </td>
                  <td>
                    <span className="tl-chip" data-state={invoice.status === "payment_link_ready" ? "ok" : "wait"}>
                      {invoice.status.replace(/_/g, " ")}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      {canEdit ? (
        <section className="tl-panel" style={{ padding: "0.75rem" }}>
          <h3 className="tl-heading">Record work</h3>
          <div className="tl-grid-2" style={{ marginTop: "0.45rem" }}>
            <div className="tl-stack">
              <span className="tl-label">New customer</span>
              <input className="tl-input" value={name} onChange={(event) => setName(event.target.value)} placeholder="Customer name" aria-label="New customer name" />
              <input className="tl-input" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="name@example.com" aria-label="New customer email" />
              <input className="tl-input" value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="Notes" aria-label="New customer notes" />
              <button
                type="button"
                className="tl-button"
                disabled={busy || name.trim().length < 2 || !email.includes("@")}
                onClick={() => {
                  onAction("add_customer", { name: name.trim(), email: email.trim(), notes: notes.trim() });
                  setName("");
                  setEmail("");
                  setNotes("");
                }}
              >
                Add customer
              </button>
            </div>
            <div className="tl-stack">
              <span className="tl-label">Delivery and invoice</span>
              <select className="tl-select" value={customerId} onChange={(event) => setCustomerId(event.target.value)} aria-label="Customer for delivery or invoice">
                <option value="">Select a customer…</option>
                {business.customers.map((customer) => (
                  <option key={customer.id} value={customer.id}>
                    {customer.name}
                  </option>
                ))}
              </select>
              <input className="tl-input" value={offer} onChange={(event) => setOffer(event.target.value)} placeholder="Offer name" aria-label="Offer name" />
              <input className="tl-input" value={amount} onChange={(event) => setAmount(event.target.value)} inputMode="decimal" placeholder="97" aria-label="Invoice amount in dollars" />
              <div className="tl-row">
                <button
                  type="button"
                  className="tl-button"
                  disabled={busy || !customerId || offer.trim().length < 2}
                  onClick={() => onAction("open_delivery", { customerId, offer: offer.trim() })}
                >
                  Open delivery
                </button>
                <button
                  type="button"
                  className="tl-button"
                  disabled={busy || !customerId || offer.trim().length < 2 || Number(amount) <= 0}
                  onClick={() => onAction("record_invoice", { customerId, offer: offer.trim(), amountCents: Math.round(Number(amount) * 100) })}
                >
                  Record invoice
                </button>
              </div>
            </div>
          </div>
        </section>
      ) : null}
    </div>
  );
}

/* -------------------------------- trees ------------------------------- */

function AuthorityBranch({ node, depth = 0 }: { node: AuthorityNode; depth?: number }) {
  return (
    <li>
      <div className="tl-tree-node">
        <strong>{node.label}</strong>
        <span className="tl-small tl-muted">{node.scope}</span>
        <span className="tl-chip" data-state={node.kind === "founder" ? "ok" : "wait"}>
          {node.kind}
        </span>
      </div>
      {node.children.length > 0 ? (
        <ul className="tl-tree" aria-label={`${node.label} delegates`}>
          {node.children.map((child) => (
            <AuthorityBranch key={`${child.id}-${child.scope}-${depth}`} node={child} depth={depth + 1} />
          ))}
        </ul>
      ) : null}
    </li>
  );
}

export function AgentsPanel({ agents, isOwner }: { agents: AgentNode[]; isOwner: boolean }) {
  return (
    <div className="tl-stack">
      <section className="tl-panel" style={{ padding: "0.75rem" }}>
        <h3 className="tl-heading">Agent Tree</h3>
        <p className="tl-small tl-muted" style={{ margin: "0.35rem 0 0" }}>
          Tay orchestrates. Specialists act only within the actions recorded here, and the server re-checks every call.
          {isOwner ? " You can add an admin agent from Administration." : ""}
        </p>
        <ul className="tl-tree" style={{ marginTop: "0.5rem" }}>
          {agents
            .filter((agent) => agent.parentId === null)
            .map((agent) => (
              <li key={agent.id}>
                <div className="tl-tree-node">
                  <strong>
                    {agent.name} · {agent.authority.replace(/_/g, " ")}
                  </strong>
                  <span className="tl-small">{agent.role}</span>
                  <span className="tl-small tl-muted">
                    {agent.allowedActions.length} actions · {agent.approvalRequiredFor.length} need approval · {agent.status}
                  </span>
                </div>
                <ul className="tl-tree">
                  {agents
                    .filter((child) => child.parentId === agent.id)
                    .map((child) => (
                      <li key={child.id}>
                        <div className="tl-tree-node">
                          <strong>{child.name}</strong>
                          <span className="tl-small">{child.role}</span>
                          <span className="tl-small tl-muted">
                            {child.allowedActions.join(", ") || "no actions"} · {child.status}
                            {child.picture ? " · picture set" : ""}
                            {child.voice ? ` · voice ${child.voice}` : ""}
                          </span>
                        </div>
                      </li>
                    ))}
                </ul>
              </li>
            ))}
        </ul>
      </section>
    </div>
  );
}

export function SkillsPanel({ skills }: { skills: SkillNode[] }) {
  return (
    <section className="tl-panel" style={{ padding: "0.75rem" }}>
      <h3 className="tl-heading">Skill Tree</h3>
      <ul className="tl-checklist" style={{ marginTop: "0.5rem" }}>
        {skills.map((skill) => (
          <li key={skill.id} className="tl-step" data-status={skill.status === "available" ? "done" : skill.status === "blocked" ? "blocked" : "awaiting_approval"}>
            <span className="tl-step-marker" aria-hidden="true">
              {skill.status === "available" ? "✓" : skill.status === "blocked" ? "✕" : "◆"}
            </span>
            <span>
              <strong>{skill.label}</strong>
              <br />
              <span className="tl-small tl-muted">{skill.description}</span>
              <br />
              <span className="tl-chip" data-state={skill.status === "available" ? "ok" : skill.status === "blocked" ? "blocked" : "wait"}>
                {skill.status.replace(/_/g, " ")}
              </span>
              {skill.requiresConfiguration ? <span className="tl-small tl-muted"> · needs {skill.requiresConfiguration}</span> : null}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}

export function AuthorityPanel({ authority }: { authority: AuthorityNode }) {
  return (
    <section className="tl-panel" style={{ padding: "0.75rem" }}>
      <h3 className="tl-heading">Authority Tree</h3>
      <p className="tl-small tl-muted" style={{ margin: "0.35rem 0 0" }}>
        Who can do what, recorded server-side. An account label never grants system-wide authority.
      </p>
      <ul className="tl-tree" style={{ marginTop: "0.5rem" }}>
        <AuthorityBranch node={authority} />
      </ul>
    </section>
  );
}

/* ------------------------------- history ------------------------------ */

export function HistoryPanel({
  projects,
  tasks,
  audit,
  currentProjectId,
  onSelectProject,
}: {
  projects: ProjectSummary[];
  tasks: TaskSummary[];
  audit: AuditSummary[];
  currentProjectId: string | null;
  onSelectProject: (id: string) => void;
}) {
  return (
    <div className="tl-stack">
      <section className="tl-panel" style={{ padding: "0.75rem" }}>
        <h3 className="tl-heading">Saved projects</h3>
        <ul className="tl-file-list" style={{ marginTop: "0.45rem" }}>
          {projects.map((project) => (
            <li key={project.id}>
              <button
                type="button"
                className="tl-file-button"
                aria-current={project.id === currentProjectId}
                onClick={() => onSelectProject(project.id)}
              >
                <strong>{project.name}</strong>
                <br />
                <span className="tl-small tl-muted">
                  Updated {new Date(project.updatedAt).toLocaleString()}
                  {project.pendingApprovals > 0 ? ` · ${project.pendingApprovals} awaiting decision` : ""}
                </span>
              </button>
            </li>
          ))}
        </ul>
      </section>

      <section className="tl-panel" style={{ padding: "0.75rem" }}>
        <h3 className="tl-heading">Task runs</h3>
        {tasks.length === 0 ? (
          <p className="tl-small tl-muted" style={{ margin: "0.35rem 0 0" }}>
            No tasks recorded in this project yet.
          </p>
        ) : (
          <ul className="tl-file-list" style={{ marginTop: "0.45rem" }}>
            {tasks.map((task) => (
              <li key={task.id} className="tl-tree-node">
                <strong>{task.title}</strong>
                <span className="tl-small tl-muted">
                  {task.intent.replace(/_/g, " ")} · {task.status.replace(/_/g, " ")} · {new Date(task.createdAt).toLocaleString()}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="tl-panel" style={{ padding: "0.75rem" }}>
        <h3 className="tl-heading">Audit trail</h3>
        <ul className="tl-file-list" style={{ marginTop: "0.45rem" }}>
          {audit.map((event) => (
            <li key={event.id} className="tl-tree-node">
              <strong>{event.kind.replace(/_/g, " ")}</strong>
              <span className="tl-small tl-muted">
                {event.actorLabel} · {new Date(event.at).toLocaleString()}
              </span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

/* ------------------------------ approvals ----------------------------- */

export function ApprovalQueue({
  approvals,
  busy,
  onDecide,
}: {
  approvals: ApprovalRecord[];
  busy: boolean;
  onDecide: (approvalId: string, decision: "approve" | "reject" | "review_later") => void;
}) {
  const pending = approvals.filter((approval) => approval.status === "pending" || approval.status === "review_later");
  const decided = approvals.filter((approval) => approval.status !== "pending" && approval.status !== "review_later");
  return (
    <div className="tl-stack">
      <section className="tl-panel" style={{ padding: "0.75rem" }}>
        <h3 className="tl-heading">Waiting on you ({pending.length})</h3>
        {pending.length === 0 ? (
          <p className="tl-small tl-muted" style={{ margin: "0.35rem 0 0" }}>
            Nothing is waiting. Changes Tay proposes will appear here with an explanation and a preview.
          </p>
        ) : (
          <div className="tl-stack" style={{ marginTop: "0.5rem" }}>
            {pending.map((approval) => (
              <ApprovalCard key={approval.id} approval={approval} busy={busy} onDecide={onDecide} />
            ))}
          </div>
        )}
      </section>
      {decided.length > 0 ? (
        <section className="tl-panel" style={{ padding: "0.75rem" }}>
          <h3 className="tl-heading">Decided</h3>
          <div className="tl-stack" style={{ marginTop: "0.5rem" }}>
            {decided.slice(0, 8).map((approval) => (
              <ApprovalCard key={approval.id} approval={approval} busy={busy} onDecide={onDecide} />
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}

/* ---------------------------- administration -------------------------- */

export function AdminPanel({
  admin,
  busy,
  inviteToken,
  onAction,
}: {
  admin: AdminPayload | null;
  busy: boolean;
  inviteToken: string | null;
  onAction: (action: string, payload: Record<string, unknown>) => void;
}) {
  const [email, setEmail] = useState("");
  const [scopes, setScopes] = useState("operations, reporting");
  const [agentName, setAgentName] = useState("");
  const [purpose, setPurpose] = useState("");
  const [instructions, setInstructions] = useState("");
  const [voice, setVoice] = useState("");
  const [picture, setPicture] = useState("");
  const [agentActions, setAgentActions] = useState<string[]>(["read_context", "plan", "draft_content"]);

  if (!admin) {
    return (
      <section className="tl-panel" style={{ padding: "0.75rem" }}>
        <h3 className="tl-heading">Administration</h3>
        <p className="tl-small tl-muted" style={{ margin: "0.35rem 0 0" }}>
          Only the founding owner can open administration. Your account does not have that authority.
        </p>
      </section>
    );
  }

  const grantable = admin.availableActions.filter(
    (action) => !["hire_or_fire_human", "sensitive_content", "change_system_settings"].includes(action),
  );

  return (
    <div className="tl-stack">
      <section className="tl-panel" style={{ padding: "0.75rem" }}>
        <h3 className="tl-heading">Accounts</h3>
        <table className="tl-table" style={{ marginTop: "0.4rem" }}>
          <caption>Everyone with access to this deployment</caption>
          <thead>
            <tr>
              <th scope="col">Account</th>
              <th scope="col">Role</th>
            </tr>
          </thead>
          <tbody>
            {admin.users.map((user) => (
              <tr key={user.id}>
                <td>
                  {user.displayName}
                  <br />
                  <span className="tl-small tl-muted">{user.email}</span>
                </td>
                <td>{user.isOwner ? "founding owner" : user.role}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section className="tl-panel" style={{ padding: "0.75rem" }}>
        <h3 className="tl-heading">Invite an admin</h3>
        <p className="tl-small tl-muted" style={{ margin: "0.35rem 0" }}>
          Invitations are single-use and expire in seven days. No email provider is connected, so the token is shown once for you to deliver yourself.
        </p>
        <div className="tl-stack">
          <label className="tl-field">
            <span className="tl-label">Invited email</span>
            <input className="tl-input" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="admin@transcenlutions.com" />
          </label>
          <label className="tl-field">
            <span className="tl-label">Delegated scopes (comma separated)</span>
            <input className="tl-input" value={scopes} onChange={(event) => setScopes(event.target.value)} />
          </label>
          <button
            type="button"
            className="tl-button"
            disabled={busy || !email.includes("@")}
            onClick={() =>
              onAction("invite_admin", {
                email: email.trim(),
                scopes: scopes.split(",").map((scope) => scope.trim()).filter(Boolean),
              })
            }
          >
            Create invitation
          </button>
          {inviteToken ? (
            <p className="tl-notice" role="status">
              Invitation token (shown once): <code>{inviteToken}</code>
            </p>
          ) : null}
        </div>
      </section>

      <section className="tl-panel" style={{ padding: "0.75rem" }}>
        <h3 className="tl-heading">Invitations</h3>
        {admin.invites.length === 0 ? (
          <p className="tl-small tl-muted" style={{ margin: "0.35rem 0 0" }}>
            No invitations issued.
          </p>
        ) : (
          <ul className="tl-file-list" style={{ marginTop: "0.45rem" }}>
            {admin.invites.map((invite) => (
              <li key={invite.id} className="tl-tree-node">
                <strong>{invite.email}</strong>
                <span className="tl-small tl-muted">
                  {invite.scopes.join(", ")} ·{" "}
                  {invite.acceptedAt ? "accepted" : invite.revokedAt ? "revoked" : `expires ${new Date(invite.expiresAt).toLocaleDateString()}`}
                </span>
                {!invite.acceptedAt && !invite.revokedAt ? (
                  <button type="button" className="tl-button" data-variant="danger" disabled={busy} onClick={() => onAction("revoke_invite", { inviteId: invite.id })}>
                    Revoke
                  </button>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="tl-panel" style={{ padding: "0.75rem" }}>
        <h3 className="tl-heading">Create an admin AI agent</h3>
        <div className="tl-stack" style={{ marginTop: "0.45rem" }}>
          <label className="tl-field">
            <span className="tl-label">Name</span>
            <input className="tl-input" value={agentName} onChange={(event) => setAgentName(event.target.value)} placeholder="Forge assistant" />
          </label>
          <label className="tl-field">
            <span className="tl-label">Purpose</span>
            <input className="tl-input" value={purpose} onChange={(event) => setPurpose(event.target.value)} placeholder="Keeps the build checklist current" />
          </label>
          <label className="tl-field">
            <span className="tl-label">Instructions</span>
            <textarea className="tl-textarea" value={instructions} onChange={(event) => setInstructions(event.target.value)} placeholder="What this agent should do, and what it must never do." />
          </label>
          <div className="tl-grid-2">
            <label className="tl-field">
              <span className="tl-label">Portrait reference</span>
              <input className="tl-input" value={picture} onChange={(event) => setPicture(event.target.value)} placeholder="assets/agents/forge.png" />
            </label>
            <label className="tl-field">
              <span className="tl-label">Voice reference</span>
              <input className="tl-input" value={voice} onChange={(event) => setVoice(event.target.value)} placeholder="calm-narrator" />
            </label>
          </div>
          <fieldset style={{ border: "1px solid var(--tl-edge-soft)", borderRadius: 12, padding: "0.6rem" }}>
            <legend className="tl-label">Permitted actions</legend>
            <div className="tl-row">
              {grantable.map((action) => (
                <label key={action} className="tl-chip" style={{ cursor: "pointer" }}>
                  <input
                    type="checkbox"
                    checked={agentActions.includes(action)}
                    onChange={(event) =>
                      setAgentActions((current) =>
                        event.target.checked ? [...current, action] : current.filter((entry) => entry !== action),
                      )
                    }
                  />
                  {action.replace(/_/g, " ")}
                </label>
              ))}
            </div>
          </fieldset>
          <p className="tl-small tl-muted" style={{ margin: 0 }}>
            A portrait, voice or instruction set never grants permissions. Agent-created agents cannot grant themselves authority, and payments,
            outbound sending and workforce changes always require your recorded approval.
          </p>
          <div className="tl-row">
            <button
              type="button"
              className="tl-button"
              disabled={busy || agentName.trim().length < 2 || instructions.trim().length < 10}
              onClick={() =>
                onAction("create_agent", {
                  name: agentName.trim(),
                  purpose: purpose.trim(),
                  instructions: instructions.trim(),
                  allowedActions: agentActions,
                  picture: picture.trim() || undefined,
                  voice: voice.trim() || undefined,
                  activate: false,
                })
              }
            >
              Save as draft
            </button>
            <button
              type="button"
              className="tl-button"
              data-variant="gold"
              disabled={busy || agentName.trim().length < 2 || instructions.trim().length < 10}
              onClick={() =>
                onAction("create_agent", {
                  name: agentName.trim(),
                  purpose: purpose.trim(),
                  instructions: instructions.trim(),
                  allowedActions: agentActions,
                  picture: picture.trim() || undefined,
                  voice: voice.trim() || undefined,
                  activate: true,
                })
              }
            >
              Save and activate
            </button>
          </div>
        </div>
      </section>

      <section className="tl-panel" style={{ padding: "0.75rem" }}>
        <h3 className="tl-heading">Live grants</h3>
        {admin.grants.length === 0 ? (
          <p className="tl-small tl-muted" style={{ margin: "0.35rem 0 0" }}>
            No delegated authority recorded yet.
          </p>
        ) : (
          <ul className="tl-file-list" style={{ marginTop: "0.45rem" }}>
            {admin.grants.map((grant) => (
              <li key={grant.id} className="tl-tree-node">
                <strong>{grant.scope}</strong>
                <span className="tl-small tl-muted">
                  {grant.revoked_at ? "revoked" : "active"} · granted by {grant.grantedBy ?? "founding owner"}
                </span>
                {!grant.revoked_at ? (
                  <button type="button" className="tl-button" data-variant="danger" disabled={busy} onClick={() => onAction("revoke_grant", { grantId: grant.id })}>
                    Revoke
                  </button>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
