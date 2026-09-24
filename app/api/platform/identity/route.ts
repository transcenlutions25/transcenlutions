import { NextRequest, NextResponse } from "next/server";
import { resolvePlatformIdentity } from "../../../../lib/platform-identity";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const resolved = resolvePlatformIdentity(request);

  if (!resolved.ok || !resolved.identity) {
    return NextResponse.json(
      { ok: false, authenticated: false, error: resolved.error },
      { status: 401, headers: { "cache-control": "no-store" } },
    );
  }

  return NextResponse.json(
    {
      ok: true,
      authenticated: resolved.identity.source === "authenticated",
      identity: resolved.identity,
      warning:
        resolved.identity.source === "internal_dev"
          ? "Development identity is not production authentication."
          : undefined,
    },
    { status: 200, headers: { "cache-control": "no-store" } },
  );
}
