import { readFile } from "node:fs/promises";
import { join } from "node:path";
// Shared server-only module also exercised by Node acceptance tests.
const payments = require("../../../../lib/apex-payments.cjs");
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const headers = { "Cache-Control": "no-store, private", "Referrer-Policy": "no-referrer", "X-Content-Type-Options": "nosniff" };
export async function POST(request: Request) {
  const c = payments.config();
  if (!payments.ready(c)) return Response.json({error:"Paid downloads are not enabled. Contact product support."},{status:503,headers});
  const origin = request.headers.get("origin");
  if (origin && origin !== new URL(request.url).origin) return Response.json({error:"Invalid request."},{status:403,headers});
  try {
    const raw = await request.text();
    if (raw.length > 1000) return Response.json({error:"Invalid request."},{status:400,headers});
    const data = JSON.parse(raw);
    const session = await payments.loadSession(c, data.session_id);
    if (!payments.entitled(session,c)) return Response.json({error:"A completed payment for this checklist could not be verified. Pending payments must finish first. Contact support if needed."},{status:403,headers});
    await payments.markReady(c,session);
    const file = await readFile(join(process.cwd(),"products/funnel-checklist/funnel-leak-emergency-checklist.html"),"utf8");
    return new Response(file,{headers:{...headers,"Content-Type":"text/html; charset=utf-8","Content-Disposition":'attachment; filename="funnel-leak-emergency-checklist.html"'}});
  } catch {
    // Never log a session ID, customer record, payment data or provider credential.
    return Response.json({error:"Download verification is temporarily unavailable. Retry or contact product support."},{status:503,headers});
  }
}
