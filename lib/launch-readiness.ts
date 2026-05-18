import type { ActionArtifact, ActionResult } from "./types";
import {
  createRevenueSetupState,
  isStripePaymentSetupReady,
  type RevenueSetupState,
} from "./revenue-setup";

export type LaunchSetupStatus = "configured" | "missing";

export interface LaunchSetupItem {
  id: string;
  label: string;
  status: LaunchSetupStatus;
  detail: string;
  envKeys: string[];
  required: boolean;
}

export interface OnboardingPath {
  id: string;
  label: string;
  prompt: string;
  firstMove: string;
}

export interface LaunchReadinessState {
  currentPhase: string;
  launchReadinessPercent: number;
  revenueReadinessPercent: number;
  topPriority: string;
  firstUseCase: string;
  blockedItems: string[];
  setupItems: LaunchSetupItem[];
  onboardingQuestion: string;
  onboardingPaths: OnboardingPath[];
  revenueSetup: RevenueSetupState;
}

export const onboardingPaths: OnboardingPath[] = [
  {
    id: "business",
    label: "Business",
    prompt: "What business offer, workflow, or operating system are you building?",
    firstMove: "Route the request into offer generation or revenue planning.",
  },
  {
    id: "personal_growth",
    label: "Personal Growth",
    prompt: "What habit, confidence block, or execution rhythm needs support?",
    firstMove: "Route the request into a founder focus or daily execution plan.",
  },
  {
    id: "content",
    label: "Content",
    prompt: "What message, audience, or publishing rhythm should Tay shape?",
    firstMove: "Route the request into a content workflow or offer-aware plan.",
  },
  {
    id: "wealth",
    label: "Wealth",
    prompt: "What income goal, asset, or buyer path should Tay clarify?",
    firstMove: "Route the request into a careful revenue plan with governance.",
  },
  {
    id: "relationship",
    label: "Relationship",
    prompt: "What communication, trust, or family alignment goal needs structure?",
    firstMove: "Route the request into a private planning or alignment workflow.",
  },
  {
    id: "community",
    label: "Community",
    prompt: "What group, challenge, or cooperative growth system should Tay shape?",
    firstMove: "Route the request into a community concept plan, not a full app build.",
  },
];

export function getLaunchReadinessState() {
  return createLaunchReadinessState(process.env);
}

export function createLaunchReadinessState(
  env: Record<string, string | undefined>,
): LaunchReadinessState {
  const revenueSetup = createRevenueSetupState(env);
  const setupItems: LaunchSetupItem[] = [
    {
      id: "domain",
      label: "Domain",
      status: isConfigured(env.NEXT_PUBLIC_TRANSCENLUTIONS_DOMAIN)
        ? "configured"
        : "missing",
      detail: "Set the public Transcenlutions domain before launch.",
      envKeys: ["NEXT_PUBLIC_TRANSCENLUTIONS_DOMAIN"],
      required: true,
    },
    {
      id: "company_email",
      label: "Company email inbox",
      status:
        isEmailConfigured(env.NEXT_PUBLIC_TRANSCENLUTIONS_COMPANY_EMAIL) &&
        isEmailConfigured(env.NEXT_PUBLIC_TRANSCENLUTIONS_BILLING_EMAIL)
          ? "configured"
          : "missing",
      detail: "Configure company and billing inboxes before buyer handoff.",
      envKeys: [
        "NEXT_PUBLIC_TRANSCENLUTIONS_COMPANY_EMAIL",
        "NEXT_PUBLIC_TRANSCENLUTIONS_BILLING_EMAIL",
      ],
      required: true,
    },
    {
      id: "support_email",
      label: "Support email",
      status: isEmailConfigured(env.NEXT_PUBLIC_TRANSCENLUTIONS_SUPPORT_EMAIL)
        ? "configured"
        : "missing",
      detail: "Set the support inbox buyers can use after payment.",
      envKeys: ["NEXT_PUBLIC_TRANSCENLUTIONS_SUPPORT_EMAIL"],
      required: true,
    },
    {
      id: "stripe",
      label: "Stripe",
      status: isStripePaymentSetupReady(revenueSetup) ? "configured" : "missing",
      detail:
        "Stripe must be live-ready before any buyer sees a checkout handoff.",
      envKeys: [
        "NEXT_PUBLIC_STRIPE_ACCOUNT_READY",
        "NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY",
        "STRIPE_SECRET_KEY",
        "NEXT_PUBLIC_STRIPE_STARTER_MAP_PAYMENT_LINK",
        "NEXT_PUBLIC_STRIPE_OPERATOR_SPRINT_PAYMENT_LINK",
      ],
      required: true,
    },
    {
      id: "privacy_policy",
      label: "Privacy policy",
      status: isConfigured(env.NEXT_PUBLIC_TRANSCENLUTIONS_PRIVACY_POLICY_URL)
        ? "configured"
        : "missing",
      detail: "Publish a privacy policy URL before public launch.",
      envKeys: ["NEXT_PUBLIC_TRANSCENLUTIONS_PRIVACY_POLICY_URL"],
      required: true,
    },
    {
      id: "terms",
      label: "Terms",
      status: isConfigured(env.NEXT_PUBLIC_TRANSCENLUTIONS_TERMS_URL)
        ? "configured"
        : "missing",
      detail: "Publish terms before paid buyer onboarding.",
      envKeys: ["NEXT_PUBLIC_TRANSCENLUTIONS_TERMS_URL"],
      required: true,
    },
    {
      id: "refund_policy",
      label: "Refund policy",
      status: isConfigured(env.NEXT_PUBLIC_TRANSCENLUTIONS_REFUND_COPY)
        ? "configured"
        : "missing",
      detail: "Set refund/support wording before payment handoff.",
      envKeys: ["NEXT_PUBLIC_TRANSCENLUTIONS_REFUND_COPY"],
      required: true,
    },
    {
      id: "onboarding_copy",
      label: "Onboarding copy",
      status: isConfigured(env.NEXT_PUBLIC_TRANSCENLUTIONS_ONBOARDING_COPY_READY)
        ? "configured"
        : "missing",
      detail: "Approve the first-entry onboarding question and path copy.",
      envKeys: ["NEXT_PUBLIC_TRANSCENLUTIONS_ONBOARDING_COPY_READY"],
      required: true,
    },
  ];

  const requiredItems = setupItems.filter((item) => item.required);
  const configuredItems = requiredItems.filter(
    (item) => item.status === "configured",
  );
  const blockedItems = requiredItems
    .filter((item) => item.status === "missing")
    .map((item) => item.label);

  return {
    currentPhase: "Launch Readiness Layer",
    launchReadinessPercent: percent(configuredItems.length, requiredItems.length),
    revenueReadinessPercent: percent(
      revenueSetup.configuredCount,
      revenueSetup.configuredCount + revenueSetup.missingCount,
    ),
    topPriority: blockedItems[0] ?? "Run one live buyer journey check.",
    firstUseCase: "AI business guidance",
    blockedItems,
    setupItems,
    onboardingQuestion: "What are you building?",
    onboardingPaths,
    revenueSetup,
  };
}

export function looksLikeLaunchReadinessRequest(input: string) {
  return [
    "launch",
    "launch readiness",
    "readiness",
    "onboarding",
    "what are you building",
    "privacy policy",
    "terms",
    "refund policy",
    "domain",
    "support email",
    "company email",
    "blocked items",
    "top priority",
    "first use case",
    "ai business guidance",
  ].some((term) => input.includes(term));
}

export function createLaunchReadinessResult(
  request: string,
  currentState?: LaunchReadinessState,
): ActionResult {
  const state = currentState ?? createLaunchReadinessState(process.env);
  const normalized = request.toLowerCase();
  const artifact = createLaunchReadinessArtifact(state);

  if (normalized.includes("onboarding") || normalized.includes("what are you building")) {
    return {
      status: "completed",
      result:
        "Launch onboarding prepared: Tay asks what the user is building, then routes the answer into one controlled first move.",
      nextStep:
        "Next step: test the onboarding question with one real founder use case before adding more paths.",
      artifact,
    };
  }

  if (normalized.includes("blocked") || normalized.includes("top priority")) {
    return {
      status: "completed",
      result: `Launch blockers reviewed: ${formatList(state.blockedItems)}. Top priority: ${state.topPriority}.`,
      nextStep:
        "Next step: clear the top missing launch item before adding any new product surface.",
      artifact,
    };
  }

  if (normalized.includes("first use case") || normalized.includes("ai business guidance")) {
    return {
      status: "completed",
      result:
        "First launch use case selected: AI business guidance. Tay should help one user clarify an offer, plan revenue, and choose the next governed action.",
      nextStep:
        "Next step: run one buyer or founder through the AI business guidance flow and log where they stall.",
      artifact,
    };
  }

  return {
    status: "completed",
    result: `Launch readiness reviewed: ${state.launchReadinessPercent}% launch ready and ${state.revenueReadinessPercent}% revenue ready. Top priority: ${state.topPriority}.`,
    nextStep:
      "Next step: complete the top priority, then rerun launch readiness before expanding scope.",
    artifact,
  };
}

function createLaunchReadinessArtifact(
  state: LaunchReadinessState,
): ActionArtifact {
  return {
    title: "Launch Readiness Artifact",
    subtitle:
      "A truth panel for moving Transcenlutions from foundation to controlled launch.",
    sections: [
      {
        heading: "Current phase",
        items: [
          state.currentPhase,
          `Launch readiness: ${state.launchReadinessPercent}%`,
          `Revenue readiness: ${state.revenueReadinessPercent}%`,
        ],
      },
      {
        heading: "Top priority",
        items: [state.topPriority],
      },
      {
        heading: "Blocked items",
        items: state.blockedItems.length > 0 ? state.blockedItems : ["No launch blockers detected."],
      },
      {
        heading: "Onboarding question",
        items: [
          state.onboardingQuestion,
          ...state.onboardingPaths.map(
            (path) => `${path.label}: ${path.firstMove}`,
          ),
        ],
      },
      {
        heading: "First use case",
        items: [
          state.firstUseCase,
          "Help one founder clarify an offer, plan revenue, and choose the next governed action.",
        ],
      },
      {
        heading: "External setup",
        items: state.setupItems.map(
          (item) => `${item.label}: ${item.status === "configured" ? "configured" : "setup required"}`,
        ),
      },
    ],
    careNote:
      "Launch readiness is a truth layer. It shows what is ready, what is blocked, and what must be finished before public launch.",
  };
}

function isConfigured(value: string | undefined) {
  return Boolean(value?.trim());
}

function isEmailConfigured(value: string | undefined) {
  const trimmed = value?.trim() ?? "";
  return trimmed.includes("@") && trimmed.includes(".");
}

function percent(done: number, total: number) {
  if (total === 0) return 0;
  return Math.round((done / total) * 100);
}

function formatList(items: string[]) {
  return items.length > 0 ? items.join(", ") : "no blockers detected";
}
