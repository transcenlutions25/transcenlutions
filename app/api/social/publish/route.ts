import { NextRequest, NextResponse } from "next/server";
import { resolvePlatformIdentity } from "../../../../lib/platform-identity";
import { readJson, requestError, RequestError } from "../../../../lib/request-security";
import {
  dispatchSocialPublish,
  getSocialPublisherStatus,
  parseSocialPublishCommand,
} from "../../../../lib/social-publisher";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function requireFoundingOwner(request: NextRequest): void {
  const resolved = resolvePlatformIdentity(request);
  if (!resolved.ok || !resolved.identity) {
    throw new RequestError(401, resolved.error ?? "Authenticated platform identity is required.");
  }
  if (resolved.identity.role !== "owner") {
    throw new RequestError(403, "Founding-owner authorization is required for social publishing.");
  }
}

export async function GET(request: NextRequest) {
  try {
    requireFoundingOwner(request);
    return NextResponse.json(
      { ok: true, status: getSocialPublisherStatus() },
      { status: 200, headers: { "cache-control": "no-store" } },
    );
  } catch (error) {
    return requestError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    requireFoundingOwner(request);
    const body = await readJson(request, 32_768);
    const command = parseSocialPublishCommand(body);
    const results = await dispatchSocialPublish(command);
    return NextResponse.json(
      {
        ok: results.every(result => result.ok),
        requestId: command.requestId,
        campaignId: command.campaignId,
        productId: command.productId,
        mode: command.mode,
        results,
      },
      { status: results.every(result => result.ok) ? 200 : 207, headers: { "cache-control": "no-store" } },
    );
  } catch (error) {
    return requestError(error);
  }
}
