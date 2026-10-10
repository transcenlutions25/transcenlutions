/**
 * Cost truth at the evidence read boundary.
 *
 * The existing database view's measured_cost_usd column is a legacy name for a
 * SUM of estimated_cost_usd. It is not a billing source. Keep that database name
 * readable without a migration, but never expose its value as measured charges.
 */
export type EstimatedCostUsd = number | string | null;

export interface OperatingCostEvidence {
  estimated_cost_usd: EstimatedCostUsd;
  /** @deprecated Kept for response compatibility; no measured-cost source exists. */
  measured_cost_usd: null;
  billed_cost_usd: null;
  cost_evidence: {
    estimate_status: "available" | "unknown";
    estimate_source: "workflow_event_estimates";
    billed_status: "unverified";
    currency: "USD";
    legacy_measured_field: "deprecated_unknown";
  };
}

function validEstimate(value: unknown): EstimatedCostUsd {
  if (typeof value === "number") {
    return Number.isFinite(value) && value >= 0 ? value : null;
  }
  // pg returns NUMERIC aggregates as decimal strings. Retain those exact bytes
  // instead of rounding them through a JavaScript number conversion.
  if (
    typeof value === "string" &&
    value.length <= 100 &&
    /^(?:0|[1-9]\d*)(?:\.\d+)?$/.test(value)
  ) {
    return value;
  }
  return null;
}

export function createOperatingCostEvidence(
  legacyEstimateAggregate: unknown,
): OperatingCostEvidence {
  const estimate = validEstimate(legacyEstimateAggregate);
  return {
    estimated_cost_usd: estimate,
    // Unknown actual/billed cost must remain unknown, including when estimate=0.
    measured_cost_usd: null,
    billed_cost_usd: null,
    cost_evidence: {
      estimate_status: estimate === null ? "unknown" : "available",
      estimate_source: "workflow_event_estimates",
      billed_status: "unverified",
      currency: "USD",
      legacy_measured_field: "deprecated_unknown",
    },
  };
}
