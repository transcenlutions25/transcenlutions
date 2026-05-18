import { readFileSync } from "node:fs";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const ts = require("typescript");

function loadTypeScript(module, filename) {
  const source = readFileSync(filename, "utf8");
  const { outputText } = ts.transpileModule(source, {
    compilerOptions: {
      esModuleInterop: true,
      jsx: ts.JsxEmit.ReactJSX,
      module: ts.ModuleKind.CommonJS,
      moduleResolution: ts.ModuleResolutionKind.NodeJs,
      target: ts.ScriptTarget.ES2022,
    },
    fileName: filename,
  });

  module._compile(outputText, filename);
}

require.extensions[".ts"] = loadTypeScript;
require.extensions[".tsx"] = loadTypeScript;

const React = require("react");
const { renderToStaticMarkup } = require("react-dom/server");

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
const { createLaunchReadinessState } = require("../lib/launch-readiness.ts");
const {
  createDeploymentReadinessState,
} = require("../lib/deployment-readiness.ts");
const {
  createAlphaAhaCommand,
  createAlphaOnboardingCommand,
  createPrivateAlphaState,
} = require("../lib/private-alpha.ts");
const {
  classifyFeedbackImprovement,
  createFeedbackInsights,
  createNaturalFeedbackEntry,
  createOneTapFeedbackEntry,
  createWeeklyCheckInEntry,
  isFeedbackOnlyInput,
} = require("../lib/feedback.ts");
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
    request: "Show launch readiness",
    intent: "prepare_launch",
    action: "route_launch_readiness",
    permission: "allowed",
    riskTier: "low",
    resultStatus: "completed",
    resultIncludes: "Launch readiness reviewed",
    artifactHeadings: [
      "Current phase",
      "Top priority",
      "Blocked items",
      "Onboarding question",
      "First use case",
      "External setup",
    ],
  },
  {
    request: "Prepare Tay onboarding question",
    intent: "prepare_launch",
    action: "route_launch_readiness",
    permission: "allowed",
    riskTier: "low",
    resultStatus: "completed",
    resultIncludes: "Launch onboarding prepared",
  },
  {
    request: "Show private alpha readiness",
    intent: "prepare_alpha",
    action: "route_private_alpha",
    permission: "allowed",
    riskTier: "low",
    resultStatus: "completed",
    resultIncludes: "Private alpha readiness reviewed",
    artifactHeadings: [
      "One clear promise",
      "Current stage",
      "Selected path",
      "First 10-minute win",
      "Tester invite support",
      "Feedback loop",
    ],
  },
  {
    request: "Private alpha path: Business. Help me choose one business move to execute first.",
    intent: "prepare_alpha",
    action: "route_private_alpha",
    permission: "allowed",
    riskTier: "low",
    resultStatus: "completed",
    resultIncludes: "Business path prepared",
  },
  {
    request: "I have too many ideas and need help choosing what to do first.",
    intent: "prepare_alpha",
    action: "route_private_alpha",
    permission: "allowed",
    riskTier: "low",
    resultStatus: "completed",
    resultIncludes: "Aha moment prepared",
  },
  {
    request: "Prepare Founders Circle tester invite",
    intent: "prepare_alpha",
    action: "route_private_alpha",
    permission: "allowed",
    riskTier: "low",
    resultStatus: "completed",
    resultIncludes: "Founders Circle invite prepared",
  },
  {
    request: "Show Stripe setup readiness",
    intent: "prepare_launch",
    action: "route_launch_readiness",
    permission: "allowed",
    riskTier: "low",
    resultStatus: "completed",
    resultIncludes: "Launch readiness reviewed",
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

const livePaymentLinkSetup = createRevenueSetupState({
  NEXT_PUBLIC_TAY_REVENUE_TEST_MODE: "false",
  NEXT_PUBLIC_STRIPE_ACCOUNT_READY: "true",
  NEXT_PUBLIC_STRIPE_STARTER_MAP_PAYMENT_LINK:
    "https://buy.stripe.com/test_starter123",
  NEXT_PUBLIC_STRIPE_OPERATOR_SPRINT_PAYMENT_LINK:
    "https://buy.stripe.com/test_operator123",
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
  livePaymentLinkSetup.mode,
  "live_ready",
  "approved Stripe Payment Links should allow live-ready revenue setup without API keys",
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

const missingLaunch = createLaunchReadinessState({});
assertEqual(
  missingLaunch.launchReadinessPercent,
  0,
  "missing launch setup should be 0 percent ready",
);
assertEqual(
  missingLaunch.firstUseCase,
  "AI business guidance",
  "first launch use case should stay focused",
);

const missingDeployment = createDeploymentReadinessState({});
assertEqual(
  missingDeployment.mode,
  "local_development",
  "missing deployment setup should stay local development",
);
assertEqual(
  missingDeployment.blockedCount > 0,
  true,
  "missing deployment setup should expose blocked production items",
);

const placeholderDeployment = createDeploymentReadinessState({
  NEXT_PUBLIC_TAY_DEPLOYMENT_ENV: "live",
  NEXT_PUBLIC_TAY_HOSTING_TARGET: "your-hosting-target",
  NEXT_PUBLIC_TRANSCENLUTIONS_DOMAIN: "example.com",
  NEXT_PUBLIC_STRIPE_MODE: "live",
  NEXT_PUBLIC_STRIPE_ACCOUNT_READY: "true",
  NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: "pk_live_key_here",
  STRIPE_SECRET_KEY: "sk_live_key_here",
  NEXT_PUBLIC_STRIPE_STARTER_MAP_PAYMENT_LINK:
    "https://buy.stripe.com/your-starter-map-link",
  NEXT_PUBLIC_TRANSCENLUTIONS_COMPANY_EMAIL: "hello@transcenlutions.com",
  NEXT_PUBLIC_TRANSCENLUTIONS_BILLING_EMAIL: "billing@transcenlutions.com",
  NEXT_PUBLIC_TRANSCENLUTIONS_SUPPORT_EMAIL: "support@transcenlutions.com",
  NEXT_PUBLIC_TRANSCENLUTIONS_REFUND_COPY:
    "Refund requests are reviewed against the paid scope.",
  NEXT_PUBLIC_TRANSCENLUTIONS_LEGAL_COPY_REVIEWED: "true",
  NEXT_PUBLIC_TRANSCENLUTIONS_SUPPORT_ROUTE: "/support",
});
assertEqual(
  placeholderDeployment.mode,
  "production_setup_required",
  "placeholder production values should not be production ready",
);

const alphaState = createPrivateAlphaState();
assertEqual(
  alphaState.stage,
  "Private Alpha Preparation",
  "private alpha should show the current stage",
);
assertEqual(
  alphaState.paths.length,
  6,
  "private alpha onboarding should expose six starting paths",
);
assertEqual(
  alphaState.testerSlots.length,
  5,
  "Founders Circle should prepare five tester slots",
);
assertEqual(
  createAlphaOnboardingCommand("business").includes("Private alpha path: Business"),
  true,
  "business onboarding command should route through private alpha",
);
assertEqual(
  createAlphaAhaCommand("too_many_ideas").includes("too many ideas"),
  true,
  "aha command should support too-many-ideas flow",
);

const naturalFeedback = createNaturalFeedbackEntry("This confused me.");
assertEqual(
  naturalFeedback.category,
  "confusion",
  "natural feedback should detect confusion",
);
assertEqual(
  isFeedbackOnlyInput("This confused me."),
  true,
  "pure feedback should be captured without becoming a build request",
);
assertEqual(
  isFeedbackOnlyInput("Build a plan but this is confusing"),
  false,
  "mixed feedback plus command should still allow Tay routing",
);

const feedbackResponse = createTayResponse("Build the first Tay feature");
const feedbackResult = executeSuggestedAction(feedbackResponse);
const oneTapFeedback = createOneTapFeedbackEntry({
  response: feedbackResponse,
  result: feedbackResult,
  rating: "helped",
});
assertEqual(
  oneTapFeedback.category,
  "praise",
  "helped one-tap feedback should map to praise",
);

const negativeFeedback = createOneTapFeedbackEntry({
  response: feedbackResponse,
  result: feedbackResult,
  rating: "didnt_help",
  category: "bug",
  note: "The button did not do what I expected.",
});
assertEqual(
  negativeFeedback.category,
  "bug",
  "negative feedback reason should be captured",
);
assertEqual(
  negativeFeedback.note,
  "The button did not do what I expected.",
  "optional feedback note should be preserved",
);

const helpedNaturalFeedback = createNaturalFeedbackEntry("This helped.");
assertEqual(
  helpedNaturalFeedback.category,
  "praise",
  "natural feedback should detect praise",
);
const wrongNaturalFeedback = createNaturalFeedbackEntry("This is wrong.");
assertEqual(
  wrongNaturalFeedback.category,
  "wrong_answer",
  "natural feedback should detect wrong answers",
);
const featureNaturalFeedback = createNaturalFeedbackEntry("I wish it did exports.");
assertEqual(
  featureNaturalFeedback.category,
  "missing_feature",
  "natural feedback should detect missing features",
);

const weeklyFeedback = createWeeklyCheckInEntry({
  score: 4,
  helpedMost: "clearer steps",
  frustrated: "too much text",
  improveNext: "shorter answers",
});
assertEqual(
  weeklyFeedback.category,
  "didnt_solve",
  "low weekly score should become a problem signal",
);

const highConfusionInsights = createFeedbackInsights(
  [
    oneTapFeedback,
    negativeFeedback,
    helpedNaturalFeedback,
    wrongNaturalFeedback,
    featureNaturalFeedback,
    weeklyFeedback,
    ...Array.from({ length: 7 }, (_, index) => ({
    ...naturalFeedback,
    id: `feedback-confusion-${index}`,
    })),
  ],
);
assertEqual(
  highConfusionInsights.signalStrength,
  "high",
  "seven matching signals should become high signal",
);
assertEqual(
  highConfusionInsights.topConfusion.value,
  "Confusion",
  "insights should surface top confusion",
);
assertEqual(
  highConfusionInsights.ratingCounts.helped,
  1,
  "insights should count helpful one-tap feedback",
);
assertEqual(
  highConfusionInsights.ratingCounts.didntHelp,
  1,
  "insights should count not-helpful one-tap feedback",
);
assertEqual(
  highConfusionInsights.naturalSignalCount,
  10,
  "insights should count natural feedback signals",
);
assertEqual(
  highConfusionInsights.improvementPolicy.status,
  "auto_allowed",
  "confusion improvement should stay in auto-allowed clarity lane",
);

const protectedImprovement = classifyFeedbackImprovement(
  "Change payment handling and privacy rules",
);
assertEqual(
  protectedImprovement.status,
  "blocked_protected",
  "protected boundary classification should block payment and privacy changes",
);
const featureImprovement = classifyFeedbackImprovement("missing_feature");
assertEqual(
  featureImprovement.status,
  "approval_required",
  "missing feature improvement should require approval",
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

const legalPages = [
  {
    path: "../app/privacy/page.tsx",
    title: "Privacy Policy",
  },
  {
    path: "../app/terms/page.tsx",
    title: "Terms of Service",
  },
  {
    path: "../app/refund/page.tsx",
    title: "Refund Policy",
  },
  {
    path: "../app/support/page.tsx",
    title: "Support",
  },
];

for (const legalPage of legalPages) {
  const Page = require(legalPage.path).default;
  const markup = renderToStaticMarkup(React.createElement(Page));

  if (!markup.includes(legalPage.title)) {
    throw new Error(`${legalPage.title} page should render its title`);
  }

  if (!markup.includes("Founder review needed")) {
    throw new Error(`${legalPage.title} page should show founder review copy`);
  }
}

console.log(
  `Smoke tests passed: ${cases.length} Tay flows plus revenue, launch, deployment, feedback, and legal-page checks verified.`,
);

function assertEqual(actual, expected, label) {
  if (actual !== expected) {
    throw new Error(`${label}: expected ${expected}, received ${actual}`);
  }
}
