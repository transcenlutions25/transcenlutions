const { createHandlers } = require("../../../../lib/apex-handlers.cjs");
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const POST = createHandlers().download;
