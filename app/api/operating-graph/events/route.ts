import { NextRequest, NextResponse } from "next/server";
import {
  appendOperatingGraphEvent,
  resolveInternalTenantId,
  type OperatingGraphEventInput,
} from "../../../../lib/operating-graph-db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const allowedEventTypes = new Set([
  "intent",
  "plan",
  "policy_decision",
  "approval",
  "action",
  "result",
  "failure",
  "recovery",
  "feedback",
]);

function evidenceIngestEnabled() {
  return (
    process.env.NODE_ENV !== "production" ||
    process.env.TAY_ALLOW_UNAUTHENTICATED_EVIDENCE === "true"
  );
}

function cleanText(value: unknown, max = 1000): string | null {
  if (typeof value !== "string") return null;
  return value.trim().slice(0, max) || null;
}

function cleanNumber(value: unknown): number | null {
  if (typeof value !== "number" || !Number.isFinite(value)) return null;
  return value;
}

export async function POST(request: NextRequest) {
  if (!evidenceIngestEnabled()) {
    return NextResponse.json(
      {
        ok: false,
        error:
          "Persistent evidence ingest is disabled until authenticated tenant routing is configured.",
      },
      { status: 503 },
    );
  }

  if (!process.env.DATABASE_URL || !process.env.TAY_INTERNAL_TENANT_SLUG) {
    return NextResponse.json(
      {
        ok: false,
        error: "Operating Graph storage is not configured.",
      },
      { status: 503 },
    );
  }

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON." }, { status: 400 });
  }

  const eventKey = cleanText(body.eventKey, 220);
  const eventType = cleanText(body.eventType, 80);
  const correlationId = cleanText(body.correlationId, 220);

  if (!eventKey || !eventType || !correlationId || !allowedEventTypes.has(eventType)) {
    return NextResponse.json(
      { ok: false, error: "eventKey, correlationId, and a valid eventType are required." },
      { status: 400 },
    );
  }

  const metadataInput =
    body.metadata && typeof body.metadata === "object" && !Array.isArray(body.metadata)
      ? (body.metadata as Record<string, unknown>)
      : {};

  // Never accept arbitrary secrets/tokens in evidence metadata.
  const safeMetadata: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(metadataInput)) {
    if (/secret|token|password|cookie|authorization|api[-_]?key/i.test(key)) continue;
    if (typeof value === "string") safeMetadata[key] = value.slice(0, 2000);
    else if (typeof value === "number" || typeof value === "boolean" || value === null) {
      safeMetadata[key] = value;
    }
  }

  const event: OperatingGraphEventInput = {
    eventKey,
    eventType,
    correlationId,
    causationId: cleanText(body.causationId, 220),
    intent: cleanText(body.intent, 120),
    actionType: cleanText(body.actionType, 120),
    permissionStatus: cleanText(body.permissionStatus, 80),
    governanceRuleId: cleanText(body.governanceRuleId, 160),
    riskTier: cleanText(body.riskTier, 40),
    riskScore: cleanNumber(body.riskScore),
    auditStatus: cleanText(body.auditStatus, 80),
    executionStatus: cleanText(body.executionStatus, 80),
    resultSummary: cleanText(body.resultSummary, 1000),
    durationMs: cleanNumber(body.durationMs),
    estimatedCostUsd: cleanNumber(body.estimatedCostUsd),
    humanInterventionCount: cleanNumber(body.humanInterventionCount) ?? 0,
    failureCode: cleanText(body.failureCode, 120),
    recoveryCode: cleanText(body.recoveryCode, 120),
    feedbackRating: cleanText(body.feedbackRating, 80),
    source: "tay-web",
    metadata: safeMetadata,
  };

  try {
    const tenantId = await resolveInternalTenantId();
    const stored = await appendOperatingGraphEvent(tenantId, event);
    return NextResponse.json({ ok: true, stored }, { status: 201 });
  } catch (error) {
    console.error("Operating Graph event persistence failed", error);
    return NextResponse.json(
      { ok: false, error: "Operating Graph persistence failed." },
      { status: 500 },
    );
  }
}
