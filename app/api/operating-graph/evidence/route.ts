import { NextResponse } from "next/server";
import {
  getOperatingGraphEvidence,
  resolveInternalTenantId,
} from "../../../../lib/operating-graph-db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  if (!process.env.DATABASE_URL || !process.env.TAY_INTERNAL_TENANT_SLUG) {
    return NextResponse.json(
      { ok: false, configured: false, evidence: null },
      { status: 503 },
    );
  }

  try {
    const tenantId = await resolveInternalTenantId();
    const evidence = await getOperatingGraphEvidence(tenantId);

    return NextResponse.json({
      ok: true,
      configured: true,
      scope: "internal_production_usage",
      evidence,
      warning:
        "Internal Transcenlutions usage is not external customer traction. Report external pilots and paid revenue separately.",
    });
  } catch (error) {
    console.error("Operating Graph evidence read failed", error);
    return NextResponse.json(
      { ok: false, configured: true, evidence: null },
      { status: 500 },
    );
  }
}
