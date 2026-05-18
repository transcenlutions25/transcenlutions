import { billingEmail, companyEmail, supportEmail } from "./company";
import {
  isApprovedPaymentUrl,
  isConfiguredStripePriceId,
  revenueOffers,
} from "./revenue";

export type RevenueSetupItemStatus =
  | "configured"
  | "missing"
  | "not_required"
  | "simulated"
  | "server_only";

export interface RevenueSetupItem {
  id: string;
  label: string;
  status: RevenueSetupItemStatus;
  detail: string;
  envKeys: string[];
  required: boolean;
}

export interface RevenueSetupState {
  mode: "live_ready" | "test_mode" | "setup_required";
  title: string;
  description: string;
  isTestMode: boolean;
  configuredCount: number;
  missingCount: number;
  items: RevenueSetupItem[];
}

export function getRevenueSetupState() {
  return createRevenueSetupState(process.env);
}

export function isStripePaymentSetupReady(state: RevenueSetupState) {
  const stripeAccount = state.items.find((item) => item.id === "stripe_account");
  const paymentPath = state.items.find(
    (item) => item.id === "price_ids_or_payment_links",
  );
  const publishableKey = state.items.find(
    (item) => item.id === "stripe_publishable_key",
  );
  const secretKey = state.items.find((item) => item.id === "stripe_secret_key");

  return (
    stripeAccount?.status === "configured" &&
    paymentPath?.status === "configured" &&
    publishableKey?.status !== "missing" &&
    secretKey?.status !== "missing"
  );
}

export function createRevenueSetupState(
  env: Record<string, string | undefined>,
): RevenueSetupState {
  const isTestMode = env.NEXT_PUBLIC_TAY_REVENUE_TEST_MODE === "true";
  const hasBusinessEmail = isEmailConfigured(
    env.NEXT_PUBLIC_TRANSCENLUTIONS_COMPANY_EMAIL ?? companyEmail,
  );
  const hasBillingEmail = isEmailConfigured(
    env.NEXT_PUBLIC_TRANSCENLUTIONS_BILLING_EMAIL ?? billingEmail,
  );
  const hasSupportEmail = isEmailConfigured(
    env.NEXT_PUBLIC_TRANSCENLUTIONS_SUPPORT_EMAIL ?? supportEmail,
  );
  const hasPublishableKey = isStripePublishableKey(
    env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY,
  );
  const hasSecretKey = isStripeSecretKey(env.STRIPE_SECRET_KEY);
  const hasLivePaymentLinks = hasEveryOfferPaymentLink(env);
  const hasPaymentPath = hasEveryOfferPaymentPath(env);
  const stripeApiKeysRequired = !hasLivePaymentLinks;
  const hasRefundCopy = Boolean(
    env.NEXT_PUBLIC_TRANSCENLUTIONS_REFUND_COPY?.trim(),
  );
  const hasDisclaimer = Boolean(
    env.NEXT_PUBLIC_TRANSCENLUTIONS_REVENUE_DISCLAIMER?.trim(),
  );
  const hasDeliveryLocation = Boolean(
    env.NEXT_PUBLIC_DELIVERY_ARTIFACT_LOCATION?.trim(),
  );

  const items: RevenueSetupItem[] = [
    {
      id: "business_email",
      label: "Business email/domain inbox",
      status: hasBusinessEmail && hasBillingEmail ? "configured" : "missing",
      detail:
        hasBusinessEmail && hasBillingEmail
          ? "Company and billing inboxes are configured."
          : "Set company and billing inboxes before invoice handoff.",
      envKeys: [
        "NEXT_PUBLIC_TRANSCENLUTIONS_COMPANY_EMAIL",
        "NEXT_PUBLIC_TRANSCENLUTIONS_BILLING_EMAIL",
      ],
      required: true,
    },
    {
      id: "stripe_account",
      label: "Stripe account",
      status:
        env.NEXT_PUBLIC_STRIPE_ACCOUNT_READY === "true"
          ? "configured"
          : "missing",
      detail:
        env.NEXT_PUBLIC_STRIPE_ACCOUNT_READY === "true"
          ? "Stripe account readiness is marked configured."
          : "Create and verify the Stripe account, then mark readiness.",
      envKeys: ["NEXT_PUBLIC_STRIPE_ACCOUNT_READY"],
      required: true,
    },
    {
      id: "stripe_publishable_key",
      label: "Stripe publishable key",
      status: hasPublishableKey
        ? "configured"
        : stripeApiKeysRequired
          ? "missing"
          : "not_required",
      detail: hasPublishableKey
        ? "Publishable key format is present."
        : stripeApiKeysRequired
          ? "Set a Stripe publishable key beginning with pk_ for API checkout."
          : "Stripe-hosted Payment Links are configured, so a browser publishable key is not required for the current checkout path.",
      envKeys: ["NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY"],
      required: stripeApiKeysRequired,
    },
    {
      id: "stripe_secret_key",
      label: "Stripe secret key",
      status: hasSecretKey
        ? "server_only"
        : stripeApiKeysRequired
          ? "missing"
          : "not_required",
      detail: hasSecretKey
        ? "Secret key is present server-side and not exposed to the browser."
        : stripeApiKeysRequired
          ? "Set STRIPE_SECRET_KEY server-side only; never use NEXT_PUBLIC for it."
          : "Stripe-hosted Payment Links handle checkout outside the app, so a server secret key is not required for the current handoff.",
      envKeys: ["STRIPE_SECRET_KEY"],
      required: stripeApiKeysRequired,
    },
    {
      id: "price_ids_or_payment_links",
      label: "Stripe price IDs or payment links",
      status: hasPaymentPath ? "configured" : "missing",
      detail: hasPaymentPath
        ? "Every current offer has a Stripe price ID or approved Payment Link."
        : "Set per-offer Stripe price IDs or approved Payment Links.",
      envKeys: revenueOffers.flatMap((offer) => [
        offer.priceIdEnvKey,
        offer.paymentLinkEnvKey,
      ]),
      required: true,
    },
    {
      id: "support_email",
      label: "Support email",
      status: hasSupportEmail ? "configured" : "missing",
      detail: hasSupportEmail
        ? "Support inbox is configured for buyer help."
        : "Set a support inbox before taking live buyers.",
      envKeys: ["NEXT_PUBLIC_TRANSCENLUTIONS_SUPPORT_EMAIL"],
      required: true,
    },
    {
      id: "refund_disclaimer",
      label: "Refund/disclaimer copy",
      status: hasRefundCopy && hasDisclaimer ? "configured" : "missing",
      detail:
        hasRefundCopy && hasDisclaimer
          ? "Refund and revenue disclaimer copy are configured."
          : "Set refund/support wording and revenue disclaimer copy before live payment.",
      envKeys: [
        "NEXT_PUBLIC_TRANSCENLUTIONS_REFUND_COPY",
        "NEXT_PUBLIC_TRANSCENLUTIONS_REVENUE_DISCLAIMER",
      ],
      required: true,
    },
    {
      id: "delivery_artifact_location",
      label: "Delivery artifact location",
      status: hasDeliveryLocation ? "configured" : "missing",
      detail: hasDeliveryLocation
        ? "Delivery artifact location is configured."
        : "Set where paid-offer artifacts are stored or delivered.",
      envKeys: ["NEXT_PUBLIC_DELIVERY_ARTIFACT_LOCATION"],
      required: true,
    },
    {
      id: "safe_test_mode",
      label: "Safe test mode",
      status: isTestMode ? "simulated" : "missing",
      detail: isTestMode
        ? "Test mode is active. Checkout states are simulated and collect no money."
        : "Optional. Enable only when intentionally testing without real payment.",
      envKeys: ["NEXT_PUBLIC_TAY_REVENUE_TEST_MODE"],
      required: false,
    },
  ];

  const missingCount = items.filter(
    (item) => item.required && item.status === "missing",
  ).length;
  const configuredCount = items.filter((item) => {
    return (
      item.status === "configured" ||
      item.status === "server_only" ||
      item.status === "not_required"
    );
  }).length;

  if (isTestMode) {
    return {
      mode: "test_mode",
      title: "Revenue test mode active",
      description:
        "Revenue flow can be rehearsed, but checkout is simulated and no real money is collected.",
      isTestMode,
      configuredCount,
      missingCount,
      items,
    };
  }

  if (missingCount === 0) {
    return {
      mode: "live_ready",
      title: "Revenue setup ready",
      description:
        "Required revenue setup appears configured. Payment handoff still requires Tay approval.",
      isTestMode,
      configuredCount,
      missingCount,
      items,
    };
  }

  return {
    mode: "setup_required",
    title: "Revenue setup required",
    description:
      "Tay can prepare offers and delivery artifacts, but live payment/email systems still need setup.",
    isTestMode,
    configuredCount,
    missingCount,
    items,
  };
}

function isEmailConfigured(value: string | undefined) {
  const trimmed = value?.trim() ?? "";
  return trimmed.includes("@") && trimmed.includes(".");
}

function isStripePublishableKey(value: string | undefined) {
  const trimmed = value?.trim() ?? "";
  return /^pk_(live|test)_[A-Za-z0-9]{8,}$/.test(trimmed);
}

function isStripeSecretKey(value: string | undefined) {
  const trimmed = value?.trim() ?? "";
  return /^sk_(live|test)_[A-Za-z0-9]{8,}$/.test(trimmed);
}

function hasEveryOfferPaymentPath(env: Record<string, string | undefined>) {
  return revenueOffers.every((offer) => {
    const paymentLink = env[offer.paymentLinkEnvKey] ?? offer.checkoutUrl;
    const priceId = env[offer.priceIdEnvKey] ?? offer.priceId;
    return isApprovedPaymentUrl(paymentLink) || isConfiguredStripePriceId(priceId);
  });
}

function hasEveryOfferPaymentLink(env: Record<string, string | undefined>) {
  return revenueOffers.every((offer) => {
    const paymentLink = env[offer.paymentLinkEnvKey] ?? offer.checkoutUrl;
    return isApprovedPaymentUrl(paymentLink);
  });
}
