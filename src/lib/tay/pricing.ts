/**
 * Pure pricing derivation for Tay capabilities.
 * Read-only: returns what charging would look like; never charges.
 */

export const BASE_UNIT_PRICE = 3;

export type CapabilityStatus = "finished" | "in-progress" | "queued";

export interface Capability {
  label: string;
  description: string;
  weight: number;
  status: CapabilityStatus;
}

export interface CapabilityRegistry {
  capabilities: Record<string, Capability>;
}

export interface BillableCapability {
  key: string;
  label: string;
  description: string;
  weight: number;
  status: CapabilityStatus;
}

export interface TayPricing {
  total_units: number;
  single_use_price: number;
  bundle_5_price: number;
  supporter_price: number;
  billable_capabilities: BillableCapability[];
}

const roundToInt = (n: number): number => {
  const num = typeof n === "number" && Number.isFinite(n) ? n : 0;
  return Math.round(num);
};

export function deriveTayPricing(registry: CapabilityRegistry): TayPricing {
  const capabilities = registry?.capabilities || {};

  const billable: BillableCapability[] = Object.entries(capabilities)
    .filter(([, cap]) => cap?.status === "finished")
    .map(([key, cap]) => ({
      key,
      label: cap.label || key,
      description: cap.description || "",
      weight: typeof cap.weight === "number" ? cap.weight : 0,
      status: cap.status,
    }));

  const totalUnits = billable.reduce((sum, c) => sum + (c.weight || 0), 0);

  if (!totalUnits) {
    return {
      total_units: 0,
      single_use_price: 0,
      bundle_5_price: 0,
      supporter_price: 0,
      billable_capabilities: billable,
    };
  }

  const singleUse = BASE_UNIT_PRICE * totalUnits;
  const bundle5 = roundToInt(singleUse * 5 * 0.65);
  const supporter = singleUse * 5;

  return {
    total_units: totalUnits,
    single_use_price: singleUse,
    bundle_5_price: bundle5,
    supporter_price: supporter,
    billable_capabilities: billable,
  };
}
