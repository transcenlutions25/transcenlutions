const { createCheckoutHandler } = require("../../../../lib/apex-checkout.cjs");
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const GET = createCheckoutHandler();
