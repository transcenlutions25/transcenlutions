import type { AgentId } from "./agent-foundation";

export interface QueuedRequest { id: string; text: string; agentId: AgentId; mode: string; paused: boolean }
export interface WorkspaceProject { id: string; name: string; repository: string; branch: string; localPath?: string }
export interface MomentumEvent { id: string; at: string }
export const workspaceStorageKey = "tay:workspace:v1";

export function newWorkspaceId(prefix = "request") {
  return `${prefix}-${globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`}`;
}

export function addQueuedRequest(queue: QueuedRequest[], request: QueuedRequest) {
  if (queue.some(item => item.id === request.id)) return queue;
  return [...queue, request];
}

export function moveQueuedRequest(queue: QueuedRequest[], id: string, direction: -1 | 1) {
  const index = queue.findIndex(item => item.id === id);
  const target = index + direction;
  if (index < 0 || target < 0 || target >= queue.length) return queue;
  const next = [...queue];
  [next[index], next[target]] = [next[target], next[index]];
  return next;
}

export function recordMomentum(events: MomentumEvent[], id: string, at = new Date().toISOString()) {
  return events.some(event => event.id === id) ? events : [...events, { id, at }];
}

export function completedToday(events: MomentumEvent[], date = new Date()) {
  return events.filter(event => new Date(event.at).toDateString() === date.toDateString()).length;
}

export function readWorkspaceState(raw: string | null = localStorage.getItem(workspaceStorageKey)): Record<string, unknown> | null {
  if (!raw) return null;
  const value: unknown = JSON.parse(raw);
  if (!value || typeof value !== "object" || Array.isArray(value) || (value as Record<string, unknown>).version !== 1) return null;
  return value as Record<string, unknown>;
}
