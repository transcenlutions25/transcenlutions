import { NextResponse } from "next/server";

export function GET() {
  return NextResponse.json({
    app: "Tay Command", workspace: "mac-shared-v1", commit: process.env.NEXT_PUBLIC_TAY_BUILD_SHA,
    environment: process.env.NEXT_PUBLIC_TAY_DEPLOYMENT_ENV || "test",
    stripeMode: process.env.NEXT_PUBLIC_STRIPE_MODE || "test",
  });
}
