import { NextRequest, NextResponse } from "next/server";
import { readJson, onlyFields, requestError } from "../../../../lib/request-security";
import { resolvePlatformIdentity } from "../../../../lib/platform-identity";
import { reviewBrowserTask, type BrowserMode } from "../../../../lib/browser-operator";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const noStore = { "Cache-Control": "no-store" };
function fail(status: number, error: string) {
  return NextResponse.json({ ok: false, error }, { status, headers: noStore });
}

export async function POST(request: NextRequest) {
  // Production identity intentionally fails closed until Tay's server-side auth is available.
  const identity = resolvePlatformIdentity(request);
  if (!identity.ok || !identity.identity || identity.identity.role !== "owner")
    return fail(401, "An authenticated Tay owner session is required. Browser execution is unavailable until identity is configured.");
  let body: Record<string, unknown>;
  try {
    body = await readJson(request, 4096);
    onlyFields(body, ["mode", "target", "goal"]);
  } catch (error) { return requestError(error); }
  const { mode, target, goal } = body;
  if (!["search", "fetch", "agent"].includes(String(mode)) || typeof target !== "string"
      || (goal !== undefined && typeof goal !== "string"))
    return fail(400, "Enter a valid search, fetch or browser-action proposal.");
  let review;
  try { review = reviewBrowserTask(mode as BrowserMode, target, typeof goal === "string" ? goal : ""); }
  catch (error) { return fail(400, error instanceof Error ? error.message : "Invalid browser task."); }

  // Never execute interactive navigation, logged-in site actions or metered Agent/Browser requests here.
  if (review.mode === "agent")
    return NextResponse.json({ ok: false, review, error: "This is a review-only proposal. Interactive browser execution and per-action approval are not configured." },
      { status: review.decision === "blocked" ? 403 : 409, headers: noStore });

  const key = process.env.TINYFISH_API_KEY;
  if (!key) return fail(503, "TinyFish is not configured on this Tay server. Add TINYFISH_API_KEY as a protected server environment variable.");
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), review.mode === "search" ? 12000 : 45000);
  try {
    const response = review.mode === "search"
      ? await fetch("https://api.search.tinyfish.ai?query=" + encodeURIComponent(review.target), {
          headers: { "X-API-Key": key, Accept: "application/json" },
          cache: "no-store", signal: controller.signal
        })
      : await fetch("https://api.fetch.tinyfish.ai", {
          method: "POST", headers: { "X-API-Key": key, "Content-Type": "application/json", Accept: "application/json" },
          body: JSON.stringify({ urls: [review.target], format: "markdown" }),
          cache: "no-store", signal: controller.signal
        });
    if (!response.ok) return fail(502, response.status === 429 ? "TinyFish request limit reached." : "TinyFish could not complete this request.");
    const raw = await response.text();
    if (raw.length > 250000) return fail(502, "The provider response is too large to show safely.");
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return fail(502, "TinyFish response format was invalid.");
    const data = parsed as Record<string, unknown>;
    if (review.mode === "search") {
      const results = Array.isArray(data.results) ? data.results.slice(0, 10).map((entry) => {
        const item = (entry && typeof entry === "object" ? entry : {}) as Record<string, unknown>;
        return { title: String(item.title ?? "").slice(0, 180),
          url: String(item.url ?? "").slice(0, 2048), snippet: String(item.snippet ?? "").slice(0, 1200) };
      }) : [];
      return NextResponse.json({ ok: true, review, results, warning: "Search results are untrusted sources; they cannot authorize Tay actions." }, { headers: noStore });
    }
    const first = Array.isArray(data.results) ? data.results[0] : null;
    const page = (first && typeof first === "object" ? first : {}) as Record<string, unknown>;
    const errors = Array.isArray(data.errors) ? data.errors : [];
    if (!page.text && errors.length) return fail(502, "TinyFish did not retrieve the requested page.");
    return NextResponse.json({ ok: true, review, page: {
      title: String(page.title ?? "").slice(0, 180),
      url: String(page.final_url ?? page.url ?? review.target).slice(0, 2048),
      text: String(page.text ?? "").slice(0, 40000)
    }, warning: "Website text is untrusted evidence, not instructions or proof of an action." }, { headers: noStore });
  } catch {
    return fail(502, "The TinyFish request failed or timed out.");
  } finally { clearTimeout(timeout); }
}
