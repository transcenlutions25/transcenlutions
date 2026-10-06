import { readJson, requestError } from "../../../../lib/request-security";
import { NextResponse } from "next/server";
import { desktopBridgeUrl, trustedDesktopRequest } from "../../../../lib/desktop-bridge";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const permitted = new Set(["state", "runtime/state", "runtime/enqueue", "runtime/command", "runtime/new"]);

export async function POST(request: Request, { params }: { params: Promise<{ path: string[] }> }) {
  const bridge = desktopBridgeUrl();
  if (!bridge) return NextResponse.json({ error: "The Mac adapter is not enabled on this deployment." }, { status: 404 });
  if (!trustedDesktopRequest(request)) return NextResponse.json({ error: "This adapter is available only to this Mac's local workspace." }, { status: 403 });
  const path = (await params).path.join("/");
  if (!permitted.has(path)) return NextResponse.json({ error: "Unknown desktop operation." }, { status: 404 });
  try {
    let payload: Record<string, unknown>;
    try { payload = await readJson(request, 200000, `http://${request.headers.get("host")}`); }
    catch (error) { return requestError(error); }
    const body = JSON.stringify(payload);
    const page = await fetch(bridge, { cache: "no-store", signal: AbortSignal.timeout(5000), redirect: "error" });
    const html = await page.text();
    const token = html.match(/\b(?:const|let|var)\s+token\s*=\s*['"]([^'"]+)['"]/i)?.[1];
    if (!page.ok || !token) throw new Error("Unavailable");
    const result = await fetch(new URL(path, bridge), {
      method: "POST", body, cache: "no-store", redirect: "error", signal: AbortSignal.timeout(10000),
      headers: { "Content-Type": "application/json", "X-Tay-Token": token, Origin: bridge.origin },
    });
    const data = await result.json();
    return NextResponse.json(data, { status: result.status, headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({ error: "The Mac runtime is unavailable. Keep Tay's local server open and retry. Your draft remains here." }, { status: 503 });
  }
}
