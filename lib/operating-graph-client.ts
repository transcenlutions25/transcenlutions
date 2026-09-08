import type { SessionLogEntry, TayResponse } from "./types";

export interface ClientOperatingGraphEvent {
  eventKey: string;
  eventType: string;
  correlationId: string;
  causationId?: string | null;
  intent?: string | null;
  actionType?: string | null;
  permissionStatus?: string | null;
  governanceRuleId?: string | null;
  riskTier?: string | null;
  riskScore?: number | null;
  auditStatus?: string | null;
  executionStatus?: string | null;
  resultSummary?: string | null;
  durationMs?: number | null;
  humanInterventionCount?: number;
  failureCode?: string | null;
  recoveryCode?: string | null;
  feedbackRating?: string | null;
  metadata?: Record<string, unknown>;
}

export function eventTypeForLogStatus(
  status: SessionLogEntry["status"],
): ClientOperatingGraphEvent["eventType"] {
  if (status === "approval_required") return "policy_decision";
  if (status === "approved" || status === "declined") return "approval";
  if (status === "executed" || status === "blocked") return "result";
  if (status === "needs_clarification" || status === "unsupported") {
    return "result";
  }
  return "intent";
}

export function createOperatingGraphEventFromLog(
  response: TayResponse,
  entry: SessionLogEntry,
): ClientOperatingGraphEvent {
  const eventType = eventTypeForLogStatus(entry.status);
  const outcomeStatus =
    entry.status === "executed" || entry.status === "approved"
      ? "completed"
      : entry.status === "blocked" || entry.status === "declined"
        ? "failed"
        : entry.status;

  return {
    eventKey: `${response.id}:${entry.status}:${response.action.type}`,
    eventType,
    correlationId: response.id,
    intent: response.intent,
    actionType: response.action.type,
    permissionStatus:
      entry.status === "approved" || entry.status === "declined"
        ? entry.status
        : response.action.permissionStatus,
    governanceRuleId: response.action.governance.ruleId,
    riskTier: response.action.governance.riskTier,
    riskScore: response.action.governance.riskScore,
    auditStatus: response.action.governance.auditStatus,
    executionStatus: outcomeStatus,
    resultSummary: entry.detail.slice(0, 1000),
    humanInterventionCount:
      entry.status === "approved" || entry.status === "declined" ? 1 : 0,
    failureCode:
      entry.status === "blocked"
        ? "governance_blocked"
        : entry.status === "declined"
          ? "approval_declined"
          : entry.status === "unsupported"
            ? "unsupported_action"
            : null,
    metadata: {
      userText: response.userText.slice(0, 2000),
      actionTitle: response.action.title,
      permissionReason: response.action.permissionReason,
      nextStep: response.nextStep,
      localTimestamp: entry.timestamp,
    },
  };
}

export async function recordOperatingGraphEvent(
  event: ClientOperatingGraphEvent,
): Promise<void> {
  if (typeof window === "undefined") return;

  try {
    const response = await fetch("/api/operating-graph/events", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(event),
      keepalive: true,
    });

    if (!response.ok && process.env.NODE_ENV !== "production") {
      console.warn("Tay Operating Graph event was not persisted", response.status);
    }
  } catch (error) {
    if (process.env.NODE_ENV !== "production") {
      console.warn("Tay Operating Graph persistence unavailable", error);
    }
  }
}
