import { createLaunchReadinessState } from "./launch-readiness";
import {
  createRevenueSetupState,
  isStripePaymentSetupReady,
  type RevenueSetupState,
} from "./revenue-setup";

export type DeploymentEnvironment = "local" | "test" | "live";
export type DeploymentChecklistStatus =
  | "configured"
  | "missing"
  | "review_needed"
  | "test_only";

export interface DeploymentChecklistItem {
  id: string;
  label: string;
  status: DeploymentChecklistStatus;
  detail: string;
  envKeys: string[];
  requiredForPublicLaunch: boolean;
}

export interface DeploymentReadinessState {
  mode:
    | "local_development"
    | "test_setup"
    | "production_setup_required"
    | "production_ready";
  environment: DeploymentEnvironment;
  title: string;
  description: string;
  hostingTarget: string;
  productionReadyPercent: number;
  configuredCount: number;
  blockedCount: number;
  reviewNeededCount: number;
  topPriority: string;
  checklist: DeploymentChecklistItem[];
  legalRoutes: string[];
}

export function getDeploymentReadinessState() {
  return createDeploymentReadinessState(process.env);
}

export function createDeploymentReadinessState(
  env: Record<string, string | undefined>,
): DeploymentReadinessState {
  const environment = normalizeEnvironment(env.NEXT_PUBLIC_TAY_DEPLOYMENT_ENV);
  const hostingTarget = cleanValue(env.NEXT_PUBLIC_TAY_HOSTING_TARGET);
  const revenueSetup = createRevenueSetupState(env);
  const launchReadiness = createLaunchReadinessState(env);
  const legalCopyReviewed =
    env.NEXT_PUBLIC_TRANSCENLUTIONS_LEGAL_COPY_REVIEWED === "true";
  const stripeMode = normalizeStripeMode(env.NEXT_PUBLIC_STRIPE_MODE);
  const supportRoute = cleanValue(env.NEXT_PUBLIC_TRANSCENLUTIONS_SUPPORT_ROUTE);

  const checklist: DeploymentChecklistItem[] = [
    {
      id: "production_domain",
      label: "Production domain",
      status: isDomainConfigured(env.NEXT_PUBLIC_TRANSCENLUTIONS_DOMAIN)
        ? "configured"
        : "missing",
      detail:
        "Set the public domain that will serve the Transcenlutions command room.",
      envKeys: ["NEXT_PUBLIC_TRANSCENLUTIONS_DOMAIN"],
      requiredForPublicLaunch: true,
    },
    {
      id: "hosting_target",
      label: "Hosting target",
      status: hostingTarget ? "configured" : "missing",
      detail:
        "Choose and record the production hosting target before public launch.",
      envKeys: ["NEXT_PUBLIC_TAY_HOSTING_TARGET"],
      requiredForPublicLaunch: true,
    },
    {
      id: "environment_variables",
      label: "Environment variables",
      status: environment === "live" ? "configured" : "test_only",
      detail: `Current environment is ${environment}. Public launch requires live environment values.`,
      envKeys: ["NEXT_PUBLIC_TAY_DEPLOYMENT_ENV"],
      requiredForPublicLaunch: true,
    },
    {
      id: "stripe_mode",
      label: "Stripe live/test separation",
      status: getStripeSeparationStatus(
        environment,
        stripeMode,
        revenueSetup,
      ),
      detail:
        "Live deployment must use live Stripe mode and real approved payment handoff values. Local/test remains clearly test-only.",
      envKeys: [
        "NEXT_PUBLIC_STRIPE_MODE",
        "NEXT_PUBLIC_TAY_REVENUE_TEST_MODE",
        "NEXT_PUBLIC_STRIPE_ACCOUNT_READY",
        "NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY",
        "STRIPE_SECRET_KEY",
      ],
      requiredForPublicLaunch: true,
    },
    {
      id: "company_email",
      label: "Company email",
      status:
        isEmailConfigured(env.NEXT_PUBLIC_TRANSCENLUTIONS_COMPANY_EMAIL) &&
        isEmailConfigured(env.NEXT_PUBLIC_TRANSCENLUTIONS_BILLING_EMAIL)
          ? "configured"
          : "missing",
      detail:
        "Configure company and billing inboxes before payment or buyer handoff.",
      envKeys: [
        "NEXT_PUBLIC_TRANSCENLUTIONS_COMPANY_EMAIL",
        "NEXT_PUBLIC_TRANSCENLUTIONS_BILLING_EMAIL",
      ],
      requiredForPublicLaunch: true,
    },
    {
      id: "support_email",
      label: "Support email",
      status: isEmailConfigured(env.NEXT_PUBLIC_TRANSCENLUTIONS_SUPPORT_EMAIL)
        ? "configured"
        : "missing",
      detail: "Configure the support inbox before public buyers arrive.",
      envKeys: ["NEXT_PUBLIC_TRANSCENLUTIONS_SUPPORT_EMAIL"],
      requiredForPublicLaunch: true,
    },
    {
      id: "privacy_policy",
      label: "Privacy policy",
      status:
        legalCopyReviewed &&
        isConfigured(env.NEXT_PUBLIC_TRANSCENLUTIONS_PRIVACY_POLICY_URL)
          ? "configured"
          : "review_needed",
      detail:
        "Starter /privacy page exists, but founder/legal review is required before public launch.",
      envKeys: [
        "NEXT_PUBLIC_TRANSCENLUTIONS_PRIVACY_POLICY_URL",
        "NEXT_PUBLIC_TRANSCENLUTIONS_LEGAL_COPY_REVIEWED",
      ],
      requiredForPublicLaunch: true,
    },
    {
      id: "terms",
      label: "Terms of service",
      status:
        legalCopyReviewed &&
        isConfigured(env.NEXT_PUBLIC_TRANSCENLUTIONS_TERMS_URL)
          ? "configured"
          : "review_needed",
      detail:
        "Starter /terms page exists, but founder/legal review is required before public launch.",
      envKeys: [
        "NEXT_PUBLIC_TRANSCENLUTIONS_TERMS_URL",
        "NEXT_PUBLIC_TRANSCENLUTIONS_LEGAL_COPY_REVIEWED",
      ],
      requiredForPublicLaunch: true,
    },
    {
      id: "refund_policy",
      label: "Refund policy",
      status:
        legalCopyReviewed && isConfigured(env.NEXT_PUBLIC_TRANSCENLUTIONS_REFUND_COPY)
          ? "configured"
          : "review_needed",
      detail:
        "Starter /refund page exists. Final refund wording must be reviewed before live payments.",
      envKeys: [
        "NEXT_PUBLIC_TRANSCENLUTIONS_REFUND_COPY",
        "NEXT_PUBLIC_TRANSCENLUTIONS_LEGAL_COPY_REVIEWED",
      ],
      requiredForPublicLaunch: true,
    },
    {
      id: "support_route",
      label: "Contact/support route",
      status: supportRoute === "/support" ? "configured" : "review_needed",
      detail:
        "Starter /support route exists. Set the public support route value before deployment.",
      envKeys: ["NEXT_PUBLIC_TRANSCENLUTIONS_SUPPORT_ROUTE"],
      requiredForPublicLaunch: true,
    },
  ];

  const requiredItems = checklist.filter((item) => item.requiredForPublicLaunch);
  const configuredCount = requiredItems.filter(
    (item) => item.status === "configured",
  ).length;
  const blockedItems = requiredItems.filter((item) => item.status === "missing");
  const reviewItems = requiredItems.filter(
    (item) => item.status === "review_needed" || item.status === "test_only",
  );
  const productionReady =
    environment === "live" &&
    blockedItems.length === 0 &&
    reviewItems.length === 0 &&
    launchReadiness.blockedItems.length === 0;
  const mode = getDeploymentMode(environment, productionReady);
  const topPriority =
    blockedItems[0]?.label ?? reviewItems[0]?.label ?? "Run production launch review.";

  return {
    mode,
    environment,
    title: getDeploymentTitle(mode),
    description: getDeploymentDescription(mode),
    hostingTarget: hostingTarget || "setup required",
    productionReadyPercent: percent(configuredCount, requiredItems.length),
    configuredCount,
    blockedCount: blockedItems.length,
    reviewNeededCount: reviewItems.length,
    topPriority,
    checklist,
    legalRoutes: ["/privacy", "/terms", "/refund", "/support"],
  };
}

function getStripeSeparationStatus(
  environment: DeploymentEnvironment,
  stripeMode: "missing" | "test" | "live",
  revenueSetup: RevenueSetupState,
): DeploymentChecklistStatus {
  if (environment === "live") {
    return stripeMode === "live" && isStripePaymentSetupReady(revenueSetup)
      ? "configured"
      : "missing";
  }

  if (stripeMode === "test" || revenueSetup.mode === "test_mode") {
    return "test_only";
  }

  return "missing";
}

function getDeploymentMode(
  environment: DeploymentEnvironment,
  productionReady: boolean,
): DeploymentReadinessState["mode"] {
  if (productionReady) return "production_ready";
  if (environment === "local") return "local_development";
  if (environment === "test") return "test_setup";
  return "production_setup_required";
}

function getDeploymentTitle(mode: DeploymentReadinessState["mode"]) {
  if (mode === "production_ready") return "Production setup ready";
  if (mode === "test_setup") return "Test deployment setup";
  if (mode === "production_setup_required") {
    return "Production setup required";
  }
  return "Local development setup";
}

function getDeploymentDescription(mode: DeploymentReadinessState["mode"]) {
  if (mode === "production_ready") {
    return "Required deployment settings appear configured. Run a final founder review before public traffic.";
  }

  if (mode === "test_setup") {
    return "The app can be tested, but live domain, Stripe, legal, and support settings must be verified before public launch.";
  }

  if (mode === "production_setup_required") {
    return "Live mode is selected, but required production values are still missing or awaiting review.";
  }

  return "The app is running locally. Deployment settings are visible, but public launch is not ready yet.";
}

function normalizeEnvironment(value: string | undefined): DeploymentEnvironment {
  const normalized = cleanValue(value).toLowerCase();

  if (normalized === "live" || normalized === "production") return "live";
  if (normalized === "test" || normalized === "staging") return "test";
  return "local";
}

function normalizeStripeMode(value: string | undefined) {
  const normalized = cleanValue(value).toLowerCase();

  if (normalized === "live") return "live";
  if (normalized === "test") return "test";
  return "missing";
}

function isConfigured(value: string | undefined) {
  return Boolean(cleanValue(value));
}

function isDomainConfigured(value: string | undefined) {
  const trimmed = cleanValue(value);
  return trimmed.includes(".") && !trimmed.includes(" ");
}

function isEmailConfigured(value: string | undefined) {
  const trimmed = cleanValue(value);
  return trimmed.includes("@") && trimmed.includes(".");
}

function cleanValue(value: string | undefined) {
  const trimmed = value?.trim() ?? "";
  if (!trimmed || looksLikePlaceholder(trimmed)) return "";
  return trimmed;
}

function looksLikePlaceholder(value: string) {
  const normalized = value.toLowerCase();

  return (
    normalized.includes("your-") ||
    normalized.includes("_here") ||
    normalized.includes("placeholder") ||
    normalized.includes("example") ||
    normalized.includes("todo") ||
    normalized.includes("changeme")
  );
}

function percent(done: number, total: number) {
  if (total === 0) return 0;
  return Math.round((done / total) * 100);
}
