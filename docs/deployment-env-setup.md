# Deployment Environment Setup Guide

Use this guide when preparing Transcenlutions for a real deployment.

## Required Deployment Values

```bash
NEXT_PUBLIC_TAY_DEPLOYMENT_ENV="local"
NEXT_PUBLIC_TAY_HOSTING_TARGET=""
NEXT_PUBLIC_TRANSCENLUTIONS_DOMAIN=""
NEXT_PUBLIC_TRANSCENLUTIONS_SUPPORT_ROUTE="/support"
```

Use `local` for development, `test` for staging, and `live` only when the
production setup is ready.

## Email Values

```bash
NEXT_PUBLIC_TRANSCENLUTIONS_COMPANY_EMAIL=""
NEXT_PUBLIC_TRANSCENLUTIONS_BILLING_EMAIL=""
NEXT_PUBLIC_TRANSCENLUTIONS_SUPPORT_EMAIL=""
```

Do not use invoice handoff until the company or billing inbox exists and can be
accessed by the owner.

## Stripe Values

```bash
NEXT_PUBLIC_STRIPE_MODE="test"
NEXT_PUBLIC_TAY_REVENUE_TEST_MODE="false"
NEXT_PUBLIC_STRIPE_ACCOUNT_READY="false"
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=""
STRIPE_SECRET_KEY=""
NEXT_PUBLIC_STRIPE_STARTER_MAP_PRICE_ID=""
NEXT_PUBLIC_STRIPE_STARTER_MAP_PAYMENT_LINK=""
NEXT_PUBLIC_STRIPE_OPERATOR_SPRINT_PRICE_ID=""
NEXT_PUBLIC_STRIPE_OPERATOR_SPRINT_PAYMENT_LINK=""
```

Live deployment requires live Stripe mode and real approved Stripe values.
Placeholder-looking values remain setup-required.

For the current Box 3 revenue path, Stripe-hosted Payment Links are enough for
live checkout handoff when each active offer has its own approved link. Stripe
API keys are still needed later for custom checkout, subscriptions, customer
portal workflows, or server-side Stripe automation.

## Legal Values

```bash
NEXT_PUBLIC_TRANSCENLUTIONS_PRIVACY_POLICY_URL=""
NEXT_PUBLIC_TRANSCENLUTIONS_TERMS_URL=""
NEXT_PUBLIC_TRANSCENLUTIONS_REFUND_COPY=""
NEXT_PUBLIC_TRANSCENLUTIONS_REVENUE_DISCLAIMER=""
NEXT_PUBLIC_TRANSCENLUTIONS_LEGAL_COPY_REVIEWED="false"
```

Keep `NEXT_PUBLIC_TRANSCENLUTIONS_LEGAL_COPY_REVIEWED="false"` until the
starter pages have been reviewed and finalized.

## Delivery Values

```bash
NEXT_PUBLIC_DELIVERY_ARTIFACT_LOCATION=""
NEXT_PUBLIC_TRANSCENLUTIONS_ONBOARDING_COPY_READY=""
```

These values should describe where paid-offer artifacts are delivered and
whether the launch onboarding copy has been approved.
