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
  if (status === "needs_clarification" || status === "unsupported") return "result";
  return "intent";
}

export function createOperatingGraphEventFromLog(
  response: TayResponse,
  entry: SessionLogEntry,
): ClientOperatingGraphEvent {
  const isInitialReview = entry.status === "executed" && /reviewed\./i.test(entry.detail);
  const effectiveStatus: SessionLogEntry["status"] = isInitialReview ? "detected" : entry.status;
  const eventType = eventTypeForLogStatus(effectiveStatus);
  const outcomeStatus =
    effectiveStatus === "executed" || effectiveStatus === "approved"
      ? "completed"
      : effectiveStatus === "blocked" || effectiveStatus === "declined"
        ? "failed"
        : effectiveStatus;

  return {
    eventKey: `${response.id}:${effectiveStatus}:${response.action.type}`,
    eventType,
    correlationId: response.id,
    intent: response.intent,
    actionType: response.action.type,
    permissionStatus:
      effectiveStatus === "approved" || effectiveStatus === "declined"
        ? effectiveStatus
        : response.action.permissionStatus,
    governanceRuleId: response.action.governance.ruleId,
    riskTier: response.action.governance.riskTier,
    riskScore: response.action.governance.riskScore,
    auditStatus: response.action.governance.auditStatus,
    executionStatus: outcomeStatus,
    resultSummary: entry.detail.slice(0, 1000),
    humanInterventionCount:
      effectiveStatus === "approved" || effectiveStatus === "declined" ? 1 : 0,
    failureCode:
      effectiveStatus === "blocked"
        ? "governance_blocked"
        : effectiveStatus === "declined"
          ? "approval_declined"
          : effectiveStatus === "unsupported"
            ? "unsupported_action"
            : null,
    metadata: {
      userText: response.userText.slice(0, 2000),
      actionTitle: response.action.title,
      permissionReason: response.action.permissionReason,
      nextStep: response.nextStep,
      localTimestamp: entry.timestamp,
      sourceLogStatus: entry.status,
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
