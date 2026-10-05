"use client";

import { useEffect, useRef, useState } from "react";
import { WritingBlock } from "./writing-block";
import { parseWritingAssets, WRITING_ASSET_STORAGE_KEY, type WritingAsset, type WritingRevisionRequest } from "../lib/writing-block";
import type { DesktopItem } from "../lib/use-desktop-runtime";
import { completedToday, type MomentumEvent, type QueuedRequest, type WorkspaceProject } from "../lib/workspace-state";

export function ReusableReply({ id, text, revise, onChange }: { id: string; text: string; revise?: (request: WritingRevisionRequest) => Promise<string>; onChange?: (text: string) => void }) {
  return <ReplyBlocks key={id} id={id} text={text} revise={revise} onChange={onChange} />;
}

function parseReply(text: string) {
  let plain = 0; let codeCount = 0;
  return text.split(/(```[^\n]*\n[\s\S]*?```)/g).filter(Boolean).map(part => {
    const code = part.match(/^```([^\n]*)\n([\s\S]*?)```$/);
    return { slot: code ? `code-${++codeCount}` : `text-${++plain}`, kind: code ? "code" as const : "text" as const,
      language: code?.[1] || undefined, content: code ? code[2] : part };
  });
}

function ReplyBlocks({ id, text, revise, onChange }: { id: string; text: string; revise?: (request: WritingRevisionRequest) => Promise<string>; onChange?: (text: string) => void }) {
  const layout = useRef(parseReply(text));
  const values = useRef(layout.current.map(part => part.content));
  const callback = useRef(onChange); callback.current = onChange;
  const incoming = parseReply(text);
  const sameLayout = incoming.length === layout.current.length && incoming.every((part, index) => part.kind === layout.current[index].kind);
  return <>{layout.current.map((part, index) => <WritingBlock key={part.slot} id={`${id}:${part.slot}`}
    title={part.kind === "code" ? `Code${part.language ? ` · ${part.language}` : ""}` : "Tay writing"}
    kind={part.kind} language={part.language} content={sameLayout ? incoming[index].content : part.content} onRequestRevision={revise}
    onContentChange={onChange ? value => {
      values.current[index] = value;
      callback.current?.(layout.current.map((source, slot) => source.kind === "code" ? `\u0060\u0060\u0060${source.language || ""}\n${values.current[slot]}\u0060\u0060\u0060` : values.current[slot]).join(""));
    } : undefined} />)}</>;
}

export function AssetsPanel() {
  const [assets, setAssets] = useState<WritingAsset[]>([]);
  const [error, setError] = useState("");
  useEffect(() => {
    const load = () => {
      try { setAssets(parseWritingAssets(localStorage.getItem(WRITING_ASSET_STORAGE_KEY))); setError(""); }
      catch { setError("Browser storage is unavailable. Export important writing before closing this tab."); }
    };
    load(); window.addEventListener("tay:writing-asset-saved", load); window.addEventListener("storage", load);
    return () => { window.removeEventListener("tay:writing-asset-saved", load); window.removeEventListener("storage", load); };
  }, []);
  return <section className="panel"><p className="eyebrow">Workspace Library</p><h2>Saved writing</h2>
    <p className="muted">Your latest saved versions, kept in this browser. Use Export for a portable copy.</p>
    {error ? <p role="alert">{error}</p> : null}
    {!assets.length ? <p>Choose Save to Assets from any writing block.</p> : assets.map(asset => <WritingBlock key={asset.id}
      id={asset.id} title={asset.title} content={asset.content} kind={asset.kind} language={asset.language} />)}
  </section>;
}

export function ProjectsPanel({ projects, onChange }: { projects: WorkspaceProject[]; onChange: (projects: WorkspaceProject[]) => void }) {
  const [name, setName] = useState(""); const [repository, setRepository] = useState(""); const [branch, setBranch] = useState("main");
  const [notice, setNotice] = useState("");
  return <section className="panel"><p className="eyebrow">Project registry</p><h2>One place for each build</h2>
    <p className="muted">Mappings stay in this browser. Repository and deployment state need verification; adding a mapping does not create a GitHub repository.</p>
    {projects.map(project => <article className="tay-registry-card" key={project.id}><strong>{project.name}</strong>
      <p>{project.repository} · {project.branch}</p><span>Connection needs verification</span>
      <a href={`https://github.com/${project.repository}`} target="_blank" rel="noreferrer">Open GitHub</a>
    </article>)}
    <form className="tay-registry-form" onSubmit={event => {
      event.preventDefault();
      if (!name.trim() || !/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(repository.trim()) || !branch.trim()) {
        setNotice("Add a project name, GitHub owner/repository, and branch."); return;
      }
      onChange([...projects, { id: `project-${Date.now()}`, name: name.trim(), repository: repository.trim(), branch: branch.trim() }]);
      setName(""); setRepository(""); setNotice("Project mapping saved in this browser.");
    }}><label>Project name<input value={name} onChange={event => setName(event.target.value)} /></label>
      <label>GitHub owner/repository<input value={repository} onChange={event => setRepository(event.target.value)} placeholder="owner/repository" /></label>
      <label>Branch<input value={branch} onChange={event => setBranch(event.target.value)} /></label><button type="submit">Save mapping</button>
    </form><p role="status">{notice}</p>
  </section>;
}

export function MomentumPanel({ events, enabled, onEnabledChange }: { events: MomentumEvent[]; enabled: boolean; onEnabledChange: (enabled: boolean) => void }) {
  const today = completedToday(events);
  return <section className="panel"><p className="eyebrow">Crowne Momentum</p><h2>Make the next move count</h2>
    <label className="tay-check"><input type="checkbox" checked={enabled} onChange={event => onEnabledChange(event.target.checked)} /> Show my progress</label>
    {enabled ? <><p>{today} completed {today === 1 ? "move" : "moves"} today · {events.length} total</p>
      <progress value={Math.min(today, 3)} max={3} aria-label="Optional daily target: three completed moves" />
      <p>{today >= 3 ? "Daily crown earned. Your next move is yours to choose." : `${3 - Math.min(today, 3)} more to today's crown. Small steps count.`}</p>
      <p className="muted">Only completed local work earns progress. It does not measure revenue, business outcomes, or external deployment. No missed-day penalties.</p></> : <p>Progress is optional. Your work stays available with it turned off.</p>}
  </section>;
}

export function DesktopQueuePanel({ items, command, steer, onView, busy }: {
  items: DesktopItem[]; command: (id: string, operation: string, extra?: object) => Promise<unknown>;
  steer: () => void; onView: (item: DesktopItem) => void; busy: boolean;
}) {
  const waiting = items.filter(item => item.status === "queued");
  return <section className="panel"><p className="eyebrow">Command queue</p><h2>{waiting.length} waiting</h2>
    <p className="muted">Work is stored by the Mac runtime. Model requests run one at a time. Steer, pause, and cancel take effect after the current response.</p>
    {!items.length ? <p>Add objectives while Tay works. Three or more can wait here.</p> : items.slice().reverse().map(item => <DesktopQueueCard
      key={item.id} item={item} waiting={waiting} command={command} steer={steer} onView={onView} busy={busy} />)}
  </section>;
}

function DesktopQueueCard({ item, waiting, command, steer, onView, busy }: {
  item: DesktopItem; waiting: DesktopItem[]; command: (id: string, operation: string, extra?: object) => Promise<unknown>;
  steer: () => void; onView: (item: DesktopItem) => void; busy: boolean;
}) {
  const [editing, setEditing] = useState(false); const [draft, setDraft] = useState(item.payload.message); const [error, setError] = useState("");
  const run = async (operation: string, extra?: object) => { try { await command(item.id, operation, extra); setError(""); setEditing(false); } catch (reason) { setError(reason instanceof Error ? reason.message : "Could not update queue."); } };
  const editable = ["queued", "paused", "failed"].includes(item.status);
  return <article className="tay-queue-card"><div><strong>{item.payload.message}</strong><span>{item.payload.agent_id.toUpperCase()} · {item.status}</span></div>
    {item.progress || item.error || item.blocked_reason ? <p role="status">{item.progress || item.error || item.blocked_reason}</p> : null}
    {editing ? <form onSubmit={event => { event.preventDefault(); void run("edit", { text: draft }); }}><textarea aria-label="Edit queued objective" value={draft} onChange={event => setDraft(event.target.value)} /><button disabled={busy}>Save objective</button><button type="button" onClick={() => setEditing(false)}>Keep original</button></form> : null}
    <div className="tay-inline-actions">
      {editable ? <><button disabled={busy} onClick={() => { setDraft(item.payload.message); setEditing(true); }}>Edit</button>
        <select aria-label={`Assign ${item.payload.message}`} value={item.payload.agent_id} disabled={busy} onChange={event => void run("assign", { agent_id: event.target.value })}><option value="tay">Tay</option><option value="dawn">Dawn</option><option value="kj">KJ</option></select></> : null}
      {item.status === "queued" ? <><button disabled={busy} onClick={() => void run("prioritize")}>First</button>
        {waiting.findIndex(entry => entry.id === item.id) > 0 ? <button disabled={busy} aria-label="Move objective up" onClick={() => void run("move", { before_id: waiting[waiting.findIndex(entry => entry.id === item.id) - 1].id })}>↑</button> : null}</> : null}
      {item.status === "active" ? <button onClick={steer}>Steer</button> : null}
      {["queued", "active"].includes(item.status) && !item.pending_operation ? <button disabled={busy} onClick={() => void run("pause")}>Pause</button> : null}
      {item.status === "paused" ? <button disabled={busy} onClick={() => void run("resume")}>Resume</button> : null}
      {item.status === "failed" ? <button disabled={busy} onClick={() => void run("retry")}>Retry</button> : null}
      {!["completed", "cancelled"].includes(item.status) && item.pending_operation !== "cancel" ? <button disabled={busy} onClick={() => void run("cancel")}>Cancel</button> : null}
      {item.status === "completed" ? <button onClick={() => onView(item)}>View result</button> : null}
    </div>{error ? <p role="alert">{error}</p> : null}
  </article>;
}

export function WebQueuePanel({ queue, onUpdate, onStart, busy }: {
  queue: QueuedRequest[]; onUpdate: (queue: QueuedRequest[]) => void; onStart: (id: string) => void; busy: boolean;
}) {
  const [editing, setEditing] = useState(""); const [draft, setDraft] = useState("");
  return <section className="panel"><p className="eyebrow">Command queue</p><h2>{queue.length} waiting</h2>
    <p className="muted">This browser keeps your objectives. Start each to review its proposed move; execution still needs the existing approval controls.</p>
    {!queue.length ? <p>Add three or more objectives while reviewing the current move.</p> : queue.map((item, index) => <article key={item.id} className="tay-queue-card">
      <strong>{item.text}</strong><span>{item.agentId.toUpperCase()} · {item.paused ? "paused" : "queued"} · {item.mode}</span>
      {editing === item.id ? <form onSubmit={event => { event.preventDefault(); if (draft.trim()) { onUpdate(queue.map(entry => entry.id === item.id ? { ...entry, text: draft.trim() } : entry)); setEditing(""); } }}><textarea aria-label="Edit queued objective" value={draft} onChange={event => setDraft(event.target.value)} /><button>Save objective</button></form> : null}
      <div className="tay-inline-actions"><button disabled={busy || item.paused} onClick={() => onStart(item.id)}>Start</button>
        <button onClick={() => { setEditing(item.id); setDraft(item.text); }}>Edit</button>
        <button onClick={() => onUpdate(queue.map(entry => entry.id === item.id ? { ...entry, paused: !entry.paused } : entry))}>{item.paused ? "Resume" : "Pause"}</button>
        <button disabled={index === 0} aria-label="Move objective up" onClick={() => { const next = [...queue]; [next[index], next[index - 1]] = [next[index - 1], next[index]]; onUpdate(next); }}>↑</button>
        <button onClick={() => onUpdate(queue.filter(entry => entry.id !== item.id))}>Cancel</button></div>
    </article>)}
  </section>;
}
