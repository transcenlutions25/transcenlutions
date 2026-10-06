const { createCheckoutHandlers } = require("../../../../lib/apex-checkout.cjs");
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const handlers = createCheckoutHandlers();
export const GET = handlers.status;
export const POST = handlers.create;
