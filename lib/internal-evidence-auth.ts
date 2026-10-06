import { resolvePlatformIdentity } from "./platform-identity";
/** Internal telemetry is never a public read/write service. No production bypass. */
export function internalEvidenceAllowed(request: Request): boolean {
  const result = resolvePlatformIdentity(request);
  return process.env.NODE_ENV !== "production" && result.ok && !!result.identity
    && result.identity.source === "internal_dev" && result.identity.role === "owner"
    && !!process.env.TAY_INTERNAL_TENANT_SLUG
    && result.identity.tenantId === process.env.TAY_INTERNAL_TENANT_SLUG;
}
