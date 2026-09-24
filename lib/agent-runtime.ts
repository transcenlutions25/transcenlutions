import {
  agentRegistry,
  appendMessage,
  createConversationSession,
  delegate,
  type AgentId,
  type Channel,
  type ConversationSession,
  type GraphTrace,
} from "./agent-foundation";

export interface AgentRuntimeState {
  session: ConversationSession;
  traces: GraphTrace[];
}

export function createAgentRuntime(channel: Channel = "chat"): AgentRuntimeState {
  return { session: createConversationSession(channel), traces: [] };
}

export function setRuntimeChannel(runtime: AgentRuntimeState, channel: Channel): AgentRuntimeState {
  return { ...runtime, session: { ...runtime.session, channel } };
}

export function routeRuntimeInput(runtime: AgentRuntimeState, text: string): AgentRuntimeState {
  // Follow-ups keep their selected agent. Mentioning content or children is
  // not consent to change the conversation's agent.
  const match = text.match(/^(?:please\s+)?(?:switch to|talk to|speak to|route (?:this )?to)\s+(tay|dawn|rory)\b/i);
  const next = match ? selectRuntimeAgent(runtime, match[1].toLowerCase() as AgentId) : runtime;
  return { ...next, session: appendMessage(next.session, {
    role: "user", agentId: next.session.activeAgentId, text,
  }) };
}

export function selectRuntimeAgent(runtime: AgentRuntimeState, agentId: AgentId): AgentRuntimeState {
  if (!Object.prototype.hasOwnProperty.call(agentRegistry, agentId)) throw new Error("Unknown agent");
  if (agentId === runtime.session.activeAgentId) return runtime;
  let session = runtime.session;
  const traces = [...runtime.traces];
  // Record both legs of specialist-to-specialist handoffs through Tay.
  if (session.activeAgentId !== "tay" && agentId !== "tay") {
    const returned = delegate(session, "tay", "Return to executive orchestrator");
    session = returned.session;
    traces.push(returned.trace);
  }
  const handed = delegate(session, agentId, "User requested agent selection; no action authority granted");
  return { session: handed.session, traces: [...traces, handed.trace] };
}

export function activeAgentName(runtime: AgentRuntimeState): string {
  return agentRegistry[runtime.session.activeAgentId].name;
}
