import { fail, json, readJson } from "../../../../lib/tay/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Public owner creation is disabled on every deployment, including first run.
 * Keep the bounded request boundary for old clients, but never open the store,
 * trust submitted owner details, or mint a session from this endpoint.
 */
export async function POST(request: Request) {
  try {
    await readJson(request, 8192);
    return json({ ok: false, error: "Owner setup is unavailable through the website." }, 403);
  } catch (error) {
    return fail(error);
  }
}
