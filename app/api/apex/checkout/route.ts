const { createCheckoutHandler } = require("../../../../lib/apex-public-checkout.cjs");
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
// Netlify CONTEXT exists at build time, not in the function runtime.
export const GET = createCheckoutHandler(process.env.APEX_BUILD_CONTEXT);
