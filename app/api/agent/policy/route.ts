import { NextRequest, NextResponse } from "next/server";
import {
  agentRegistry,
  getAgentActionPolicy,
  type AgentId,
} from "../../../../lib/agent-foundation";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function isAgentId(value: unknown): value is AgentId {
  return (
    typeof value === "string" &&
    Object.prototype.hasOwnProperty.call(agentRegistry, value)
  );
}

export async function POST(request: NextRequest) {
  let body: Record<string, unknown>;

  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json(
      { ok: false, error: "Invalid JSON." },
      { status: 400 },
    );
  }

  const agentId = body.agentId;
  const action = body.action;
  const approved = body.approved === true;

  if (!isAgentId(agentId) || typeof action !== "string" || !action.trim()) {
    return NextResponse.json(
      { ok: false, error: "agentId and action are required." },
      { status: 400 },
    );
  }

  const policy = getAgentActionPolicy(agentId, action, approved);
  const status = policy.allowed ? 200 : policy.requiresApproval ? 409 : 403;

  return NextResponse.json(
    {
      ok: policy.allowed,
      policy,
      scope: "shared-agent-policy",
      warning:
        "This endpoint evaluates authority but does not establish authenticated tenant identity or execute an outside action.",
    },
    {
      status,
      headers: { "cache-control": "no-store" },
    },
  );
}
