/** Agent Foundation v1: shared runtime for chat and voice channels. */
export type AgentId = "tay" | "dawn" | "rory";
export type Channel = "chat" | "voice";
export type Authority = "orchestrator" | "specialist" | "child_safe";
export type MemoryScope = "session" | "agent" | "tenant";

export interface AgentConstitution {
  mission: string;
  principles: string[];
  approvalRequiredFor: string[];
}
export interface AgentDefinition {
  id: AgentId;
  name: string;
  role: string;
  authority: Authority;
  constitution: AgentConstitution;
  allowedDelegates: AgentId[];
}
export interface SessionMessage { role: "user" | "agent" | "system"; agentId?: AgentId; text: string; at: string; }
export interface ConversationSession { id: string; activeAgentId: AgentId; channel: Channel; messages: SessionMessage[]; memory: Partial<Record<MemoryScope, Record<string, string>>>; }
export interface GraphTrace { sessionId: string; from: AgentId; to: AgentId; reason: string; at: string; }

const constitution: AgentConstitution = {
  mission: "Advance the founder and Transcenlutions toward a better, revenue-producing life through truthful, governed execution.",
  principles: ["Tell the truth about capability and completion.", "Protect the founder's priorities and wellbeing.", "Ask for approval before consequential human actions.", "Preserve auditability and user control."],
  approvalRequiredFor: ["hire_human", "fire_human", "external_commitment", "payment"],
};

export const agentRegistry: Record<AgentId, AgentDefinition> = {
  tay: { id: "tay", name: "Tay", role: "Executive orchestrator and primary relationship agent", authority: "orchestrator", constitution, allowedDelegates: ["dawn", "rory"] },
  dawn: { id: "dawn", name: "Dawn", role: "Creator, marketing, and audience growth specialist", authority: "specialist", constitution, allowedDelegates: [] },
  rory: { id: "rory", name: "Rory", role: "Child-safe learning and family-side guide", authority: "child_safe", constitution, allowedDelegates: [] },
};

export function createConversationSession(channel: Channel = "chat", id = `session-${Date.now()}`): ConversationSession {
  return { id, activeAgentId: "tay", channel, messages: [], memory: { session: {}, agent: {}, tenant: {} } };
}
export function appendMessage(session: ConversationSession, message: Omit<SessionMessage, "at">): ConversationSession {
  return { ...session, messages: [...session.messages, { ...message, at: new Date().toISOString() }] };
}
export function switchAgent(session: ConversationSession, agentId: AgentId): ConversationSession {
  if (!agentRegistry[session.activeAgentId].allowedDelegates.includes(agentId) && agentId !== "tay") throw new Error("Agent is not authorized for this handoff");
  return { ...session, activeAgentId: agentId };
}
export function delegate(session: ConversationSession, to: AgentId, reason: string): { session: ConversationSession; trace: GraphTrace } {
  const next = switchAgent(session, to);
  return { session: next, trace: { sessionId: session.id, from: session.activeAgentId, to, reason, at: new Date().toISOString() } };
}
export function canPerform(agentId: AgentId, action: string, approved = false): boolean {
  if (["hire_human", "fire_human"].includes(action)) return approved;
  return agentId === "tay" || agentRegistry[agentId].authority === "specialist";
}
export function resolveAgentForInput(text: string): AgentId {
  const t = text.toLowerCase();
  if (t.includes("child") || t.includes("kid") || t.includes("rory")) return "rory";
  if (t.includes("content") || t.includes("creator") || t.includes("dawn")) return "dawn";
  return "tay";
}
