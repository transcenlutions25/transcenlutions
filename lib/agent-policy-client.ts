import type {
  AgentAction,
  AgentActionPolicy,
  AgentId,
} from "./agent-foundation";

interface AgentPolicyResponse {
  ok?: boolean;
  policy?: AgentActionPolicy;
  error?: string;
}

export async function requestAgentActionPolicy(
  agentId: AgentId,
  action: AgentAction,
  approved = false,
): Promise<AgentActionPolicy> {
  const response = await fetch("/api/agent/policy", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ agentId, action, approved }),
    cache: "no-store",
  });

  let body: AgentPolicyResponse = {};
  try {
    body = (await response.json()) as AgentPolicyResponse;
  } catch {
    throw new Error("The server authority response was not readable.");
  }

  if (!body.policy) {
    throw new Error(body.error ?? "The server authority check failed.");
  }

  return body.policy;
}
