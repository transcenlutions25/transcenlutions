import { Pool } from "pg";

let pool: Pool | null = null;

function getPool(): Pool {
  if (pool) return pool;

  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL is required for persistent Tay Operating Graph storage.");
  }

  pool = new Pool({
    connectionString,
    max: 5,
    ssl:
      process.env.NODE_ENV === "production"
        ? { rejectUnauthorized: false }
        : undefined,
  });

  return pool;
}

export interface OperatingGraphEventInput {
  eventKey: string;
  eventType: string;
  occurredAt?: string;
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
  estimatedCostUsd?: number | null;
  humanInterventionCount?: number;
  failureCode?: string | null;
  recoveryCode?: string | null;
  feedbackRating?: string | null;
  source?: string;
  environment?: string;
  metadata?: Record<string, unknown>;
}

export async function resolveInternalTenantId(): Promise<string> {
  const tenantSlug = process.env.TAY_INTERNAL_TENANT_SLUG?.trim();
  if (!tenantSlug) {
    throw new Error("TAY_INTERNAL_TENANT_SLUG is required before evidence collection is enabled.");
  }

  const db = getPool();
  const existing = await db.query<{ id: string }>(
    "select id from tay_tenants where slug = $1 limit 1",
    [tenantSlug],
  );

  if (existing.rows[0]?.id) return existing.rows[0].id;

  const displayName =
    process.env.TAY_INTERNAL_TENANT_NAME?.trim() || "Transcenlutions Internal";
  const inserted = await db.query<{ id: string }>(
    `insert into tay_tenants (slug, name)
     values ($1, $2)
     on conflict (slug) do update set name = excluded.name
     returning id`,
    [tenantSlug, displayName],
  );

  return inserted.rows[0].id;
}

export async function appendOperatingGraphEvent(
  tenantId: string,
  input: OperatingGraphEventInput,
) {
  const db = getPool();
  const values = [
    tenantId,
    input.eventKey,
    input.eventType,
    input.occurredAt ?? new Date().toISOString(),
    input.correlationId,
    input.causationId ?? null,
    input.intent ?? null,
    input.actionType ?? null,
    input.permissionStatus ?? null,
    input.governanceRuleId ?? null,
    input.riskTier ?? null,
    input.riskScore ?? null,
    input.auditStatus ?? null,
    input.executionStatus ?? null,
    input.resultSummary ?? null,
    input.durationMs ?? null,
    input.estimatedCostUsd ?? null,
    input.humanInterventionCount ?? 0,
    input.failureCode ?? null,
    input.recoveryCode ?? null,
    input.feedbackRating ?? null,
    input.source ?? "tay",
    input.environment ?? process.env.NEXT_PUBLIC_TAY_DEPLOYMENT_ENV ?? process.env.NODE_ENV ?? "unknown",
    JSON.stringify(input.metadata ?? {}),
  ];

  const result = await db.query(
    `insert into tay_operating_events (
      tenant_id, event_key, event_type, occurred_at, correlation_id, causation_id,
      intent, action_type, permission_status, governance_rule_id, risk_tier,
      risk_score, audit_status, execution_status, result_summary, duration_ms,
      estimated_cost_usd, human_intervention_count, failure_code, recovery_code,
      feedback_rating, source, environment, metadata
    ) values (
      $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24::jsonb
    )
    on conflict (tenant_id, event_key) do nothing
    returning id, event_key, occurred_at`,
    values,
  );

  return result.rows[0] ?? { event_key: input.eventKey, duplicate: true };
}

export async function getOperatingGraphEvidence(tenantId: string) {
  const db = getPool();
  const result = await db.query(
    `select
       workflows_started,
       workflows_completed,
       approvals,
       declines,
       recoveries,
       failures,
       human_interventions,
       median_duration_ms,
       measured_cost_usd
     from tay_workflow_evidence
     where tenant_id = $1`,
    [tenantId],
  );

  return (
    result.rows[0] ?? {
      workflows_started: 0,
      workflows_completed: 0,
      approvals: 0,
      declines: 0,
      recoveries: 0,
      failures: 0,
      human_interventions: 0,
      median_duration_ms: null,
      measured_cost_usd: null,
    }
  );
}
