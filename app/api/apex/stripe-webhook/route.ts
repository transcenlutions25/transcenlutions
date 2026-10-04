const payments = require("../../../../lib/apex-payments.cjs");
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function POST(request: Request) {
  const c=payments.config();
  if (!payments.ready(c)) return new Response("Fulfillment disabled",{status:503});
  const body=await request.text();
  if(body.length>1000000||!payments.validSignature(body,request.headers.get("stripe-signature"),c.webhook))return new Response("Invalid signature",{status:400});
  try {
    const event=JSON.parse(body);
    if(!["checkout.session.completed","checkout.session.async_payment_succeeded"].includes(event.type))return new Response("Ignored",{status:200});
    if(event.livemode!==c.live)return new Response("Wrong mode",{status:400});
    const session=await payments.loadSession(c,event.data?.object?.id);
    if(payments.entitled(session,c))await payments.markReady(c,session);
    return new Response("Received",{status:200});
  } catch {
    // A non-2xx response asks Stripe to retry; no false fulfillment success.
    return new Response("Fulfillment temporarily unavailable",{status:503});
  }
}
