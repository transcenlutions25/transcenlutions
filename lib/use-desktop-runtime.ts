"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { AgentId } from "./agent-foundation";
import { newWorkspaceId } from "./workspace-state";

export interface DesktopItem {
  updated: number;
  id: string; status: "queued" | "active" | "paused" | "completed" | "failed" | "cancelled";
  payload: { message: string; agent_id: AgentId; thread_mode: string; steering: string[] };
  pending_operation: string | null; error?: string; progress?: string; blocked_reason?: string;
  result?: { answer: string; provider: string; model: string };
}
export interface DesktopState {
  session_id: string; sessions: { id: string; created: number }[]; items: DesktopItem[];
  messages: { id?: string; role: "user" | "assistant"; content: string; agent_id: AgentId }[];
  agents: { id: AgentId; name: string; role: string; enabled: boolean }[];
}

export async function callDesktop<T>(path: string, data: object): Promise<T> {
  const response = await fetch(`/api/desktop/${path}`, {
    method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data),
  });
  const result = await response.json();
  if (!response.ok || result.error) throw new Error(result.error || "The desktop operation failed.");
  return result as T;
}

export function useDesktopRuntime(enabled: boolean) {
  const [state, setState] = useState<DesktopState | null>(null);
  const [projects, setProjects] = useState<string[]>([]);
  const [project, setProject] = useState("");
  const [session, setSession] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const generation = useRef(0);
  const mutations = useRef(0);
  const pending = useRef(0);
  const tail = useRef<Promise<unknown>>(Promise.resolve());
  const stateRef = useRef(state); stateRef.current = state;

  useEffect(() => {
    if (!enabled) return;
    let disposed = false;
    callDesktop<{ projects: string[]; project: string }>("state", {}).then(value => {
      if (disposed) return;
      let chosenProject = value.project; let chosenSession = "";
      try {
        const saved = JSON.parse(localStorage.getItem("tay:desktop-selection:v1") || "null");
        if (saved && value.projects.includes(saved.project) && typeof saved.session === "string" && /^[a-f0-9]{32}$/.test(saved.session)) {
          chosenProject = saved.project; chosenSession = saved.session;
        }
      } catch { /* The server still owns and validates conversation scope. */ }
      setProjects(value.projects); setProject(chosenProject); setSession(chosenSession);
    }).catch(reason => { if (!disposed) setError(reason.message); });
    return () => { disposed = true; };
  }, [enabled]);

  useEffect(() => {
    if (!enabled || !project) return;
    let disposed = false; let timer: ReturnType<typeof setTimeout>;
    const guard = ++generation.current;
    const poll = async () => {
      const version = mutations.current;
      try {
        const next = await callDesktop<DesktopState>("runtime/state", { project, session_id: session || undefined });
        if (!disposed && guard === generation.current && version === mutations.current && pending.current === 0) {
          setState(next); setError(""); if (!session) setSession(next.session_id);
          try { localStorage.setItem("tay:desktop-selection:v1", JSON.stringify({ project, session: next.session_id })); }
          catch { /* Queue state remains durable on the Mac even if a view preference cannot be saved. */ }
        }
      } catch (reason) { if (!disposed && guard === generation.current && version === mutations.current && pending.current === 0) setError(reason instanceof Error ? reason.message : "Could not refresh the queue."); }
      if (!disposed) timer = setTimeout(poll, 2000);
    };
    void poll();
    return () => { disposed = true; clearTimeout(timer); };
  }, [enabled, project, session]);

  const change = useCallback(async (path: string, data: object) => {
    const selectedSession = stateRef.current?.session_id;
    if (!project || !selectedSession) throw new Error("Wait for the selected conversation to load. Your draft remains here.");
    const guard = generation.current;
    mutations.current++;
    pending.current++;
    setBusy(true);
    const payload = { project, session_id: selectedSession, ...data };
    const request = tail.current.then(() => callDesktop<DesktopState>(path, payload));
    tail.current = request.catch(() => {});
    try {
      const next = await request;
      if (guard === generation.current) {
        setState(next); setError(""); if (path === "runtime/new") setSession(next.session_id);
        try { localStorage.setItem("tay:desktop-selection:v1", JSON.stringify({ project, session: next.session_id })); } catch { /* View preference only. */ }
      }
      return next;
    } catch (reason) {
      if (guard === generation.current) setError(reason instanceof Error ? reason.message : "Could not save this request.");
      throw reason;
    } finally { pending.current--; if (guard === generation.current) setBusy(pending.current > 0); mutations.current++; }
  }, [project]);

  const switchProject = (path: string) => { generation.current++; stateRef.current = null; setState(null); setSession(""); setProject(path); setBusy(false); };
  const switchSession = (id: string) => { generation.current++; stateRef.current = null; setState(null); setSession(id); setBusy(false); };
  const enqueue = (text: string, agentId: AgentId, mode: string, dependsOn = "", requestId = newWorkspaceId()) => change("runtime/enqueue", {
    message: text, agent_id: agentId, thread_mode: mode, mode: "local", privacy: "offline", model: "", files: [],
    request_id: requestId, depends_on: dependsOn ? [dependsOn] : [],
  });
  const command = (id: string, operation: string, extra: object = {}) => change("runtime/command", { id, operation, ...extra });

  return { state, projects, project, error, busy, switchProject, switchSession, enqueue, command, newSession: () => change("runtime/new", {}) };
}
