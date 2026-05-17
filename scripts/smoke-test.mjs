import { readFileSync } from "node:fs";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const ts = require("typescript");

require.extensions[".ts"] = function loadTypeScript(module, filename) {
  const source = readFileSync(filename, "utf8");
  const { outputText } = ts.transpileModule(source, {
    compilerOptions: {
      esModuleInterop: true,
      module: ts.ModuleKind.CommonJS,
      moduleResolution: ts.ModuleResolutionKind.NodeJs,
      target: ts.ScriptTarget.ES2022,
    },
    fileName: filename,
  });

  module._compile(outputText, filename);
};

const {
  executeSuggestedAction,
  resolveApproval,
} = require("../lib/action-engine.ts");
const {
  createOfferPaymentState,
  isApprovedPaymentUrl,
  isConfiguredStripePriceId,
  revenueOffers,
} = require("../lib/revenue.ts");
const { createRevenueSetupState } = require("../lib/revenue-setup.ts");
const { createTayResponse } = require("../lib/tay-core.ts");

const cases = [
  {
    request: "Build the first Tay feature",
    intent: "build_feature",
    action: "create_task",
    permission: "allowed",
    riskTier: "low",
    resultStatus: "completed",
  },
  {
    request: "Create a plan for Tay governance",
    intent: "write_plan",
    action: "draft_plan",
    permission: "allowed",
    riskTier: "low",
    resultStatus: "completed",
  },
  {
    request: "Log a note about Box 1 completion",
    intent: "record_note",
    action: "log_note",
    permission: "allowed",
    riskTier: "low",
    resultStatus: "completed",
  },
  {
    request: "Delete the database",
    intent: "unsupported_request",
    action: "none",
    permission: "blocked",
    riskTier: "critical",
    resultStatus: "failed",
  },
  {
    request: "Charge the buyer now",
    intent: "unsupported_request",
    action: "none",
    permission: "blocked",
    riskTier: "critical",
    resultStatus: "failed",
  },
  {
    request: "Send checkout details to the buyer",
    intent: "sell_offer",
    action: "prepare_offer",
    permission: "requires_approval",
    riskTier: "high",
    resultStatus: "failed",
  },
  {
    request: "Prepare a $97 Tay Command Starter Map offer",
    intent: "sell_offer",
    action: "prepare_offer",
    permission: "allowed",
    riskTier: "medium",
    resultStatus: "completed",
    artifactHeadings: [
      "Offer title",
      "Buyer problem",
      "Promised outcome",
      "Scope",
      "Price",
      "Delivery format",
      "Timeline",
      "Refund/support note",
      "Next step",
    ],
  },
  {
    request: "Buyer replied: yes, send me the details",
    intent: "handle_buyer_reply",
    action: "recommend_follow_up",
    permission: "allowed",
    riskTier: "medium",
    resultStatus: "completed",
  },
  {
    request: "Buyer replied: can you guarantee I will make money?",
    intent: "handle_buyer_reply",
    action: "recommend_follow_up",
    permission: "allowed",
    riskTier: "medium",
    resultStatus: "failed",
  },
  {
    request: "Show today's Box 4 priorities",
    intent: "manage_focus",
    action: "route_focus",
    permission: "allowed",
    riskTier: "low",
    resultStatus: "completed",
    resultIncludes: "Founder command prepared",
    artifactHeadings: [
      "Current focus",
      "Daily priorities",
      "Revenue actions",
      "Not now backlog",
      "Weekly review",
      "Family alignment",
    ],
  },
  {
    request: "Run weekly founder review",
    intent: "manage_focus",
    action: "route_focus",
    permission: "allowed",
    riskTier: "low",
    resultStatus: "completed",
    resultIncludes: "Weekly review prepared",
  },
  {
    request: "Park Crowne Legacy until Box 4 is complete",
    intent: "manage_focus",
    action: "route_focus",
    permission: "allowed",
    riskTier: "low",
    resultStatus: "completed",
    resultIncludes: "Current box incomplete",
  },
  {
    request: "Use an external API to automate leads",
    intent: "build_feature",
    action: "create_task",
    permission: "requires_approval",
    riskTier: "high",
    resultStatus: "failed",
  },
];

const missingSetup = createRevenueSetupState({});
assertEqual(
  missingSetup.mode,
  "setup_required",
  "missing revenue setup should require setup",
);

const placeholderSetup = createRevenueSetupState({
  NEXT_PUBLIC_STRIPE_ACCOUNT_READY: "true",
  NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: "pk_test_or_live_key_here",
  STRIPE_SECRET_KEY: "sk_test_or_live_key_here",
  NEXT_PUBLIC_STRIPE_STARTER_MAP_PRICE_ID: "price_starter_map",
  NEXT_PUBLIC_STRIPE_STARTER_MAP_PAYMENT_LINK:
    "https://buy.stripe.com/your-starter-map-link",
  NEXT_PUBLIC_TRANSCENLUTIONS_COMPANY_EMAIL: "hello@transcenlutions.com",
  NEXT_PUBLIC_TRANSCENLUTIONS_BILLING_EMAIL: "billing@transcenlutions.com",
  NEXT_PUBLIC_TRANSCENLUTIONS_SUPPORT_EMAIL: "support@transcenlutions.com",
  NEXT_PUBLIC_TRANSCENLUTIONS_REFUND_COPY:
    "Refund requests are reviewed against the paid scope.",
  NEXT_PUBLIC_TRANSCENLUTIONS_REVENUE_DISCLAIMER:
    "Income is not guaranteed.",
  NEXT_PUBLIC_DELIVERY_ARTIFACT_LOCATION: "Confirmed buyer delivery folder",
});
assertEqual(
  placeholderSetup.mode,
  "setup_required",
  "placeholder Stripe values should not show live ready",
);

assertEqual(
  isApprovedPaymentUrl("https://buy.stripe.com/your-starter-map-link"),
  false,
  "placeholder Stripe payment link should be rejected",
);

assertEqual(
  isApprovedPaymentUrl("https://buy.stripe.com/test_1234567890"),
  true,
  "real-looking Stripe payment link should be accepted",
);

assertEqual(
  isConfiguredStripePriceId("price_starter_map"),
  false,
  "placeholder Stripe price ID should be rejected",
);

assertEqual(
  isConfiguredStripePriceId("price_1ABCdef2345678"),
  true,
  "real-looking Stripe price ID should be accepted",
);

const missingPayment = createOfferPaymentState(
  { ...revenueOffers[0], checkoutUrl: "", priceId: "" },
  { invoiceRecipientEmail: "", isTestMode: false },
);
assertEqual(
  missingPayment.mode,
  "setup_required",
  "missing Stripe should show setup required",
);

const simulatedPayment = createOfferPaymentState(revenueOffers[0], {
  invoiceRecipientEmail: "",
  isTestMode: true,
});
assertEqual(
  simulatedPayment.mode,
  "test_simulated",
  "test checkout state should be simulated",
);

for (const testCase of cases) {
  const response = createTayResponse(testCase.request);
  const result = executeSuggestedAction(response);

  assertEqual(response.intent, testCase.intent, `${testCase.request} intent`);
  assertEqual(response.action.type, testCase.action, `${testCase.request} action`);
  assertEqual(
    response.action.permissionStatus,
    testCase.permission,
    `${testCase.request} permission`,
  );
  assertEqual(
    response.action.governance.riskTier,
    testCase.riskTier,
    `${testCase.request} risk`,
  );
  assertEqual(result.status, testCase.resultStatus, `${testCase.request} result`);

  if (testCase.resultIncludes && !result.result.includes(testCase.resultIncludes)) {
    throw new Error(
      `${testCase.request} result should include ${testCase.resultIncludes}`,
    );
  }

  if (testCase.artifactHeadings && !result.artifact) {
    throw new Error(`${testCase.request} should return a delivery artifact`);
  }

  if (testCase.artifactHeadings) {
    const artifactHeadings = result.artifact.sections.map(
      (section) => section.heading,
    );
    for (const requiredHeading of testCase.artifactHeadings) {
      if (!artifactHeadings.includes(requiredHeading)) {
        throw new Error(`artifact missing ${requiredHeading}`);
      }
    }
  }
}

const handoffRequest = createTayResponse(
  "Send checkout details for Tay Command Starter Map",
);
assertEqual(
  handoffRequest.action.permissionStatus,
  "requires_approval",
  "payment handoff should require approval",
);
const handoffResult = resolveApproval(handoffRequest, "approved");
if (handoffResult.status === "completed" && !handoffResult.handoff) {
  throw new Error("approved payment handoff should return a handoff object");
}

if (
  handoffResult.status === "failed" &&
  !handoffResult.result.toLowerCase().includes("cannot accept payment yet")
) {
  throw new Error("missing payment setup should fail with setup-required copy");
}

console.log(
  `Smoke tests passed: ${cases.length} Tay flows plus revenue setup checks verified.`,
);

function assertEqual(actual, expected, label) {
  if (actual !== expected) {
    throw new Error(`${label}: expected ${expected}, received ${actual}`);
  }
}
