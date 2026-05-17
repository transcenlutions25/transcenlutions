# Tay Engine Box 6: Real External Setup + Deployment Prep

Box 6 prepares Transcenlutions for a serious public deployment without faking
external services.

## Purpose

The app is not public-launch ready until real-world doors are configured. Tay
now shows deployment readiness separately from product readiness so local work,
test setup, and live setup cannot be confused.

## Deployment Checklist

- production domain
- hosting target
- environment variables
- Stripe live/test mode separation
- company email
- support email
- privacy policy
- terms of service
- refund policy
- contact/support route

## Public Info Pages

Starter pages now exist at:

```text
/privacy
/terms
/refund
/support
```

Each page is marked founder-review-needed. The copy is honest launch-prep copy,
not legal advice, and must be reviewed before public launch or live payments.

## Environment Modes

Box 6 distinguishes:

- `local` - local development only
- `test` - test or staging setup
- `live` - production setup

Set:

```bash
NEXT_PUBLIC_TAY_DEPLOYMENT_ENV="local"
NEXT_PUBLIC_TAY_HOSTING_TARGET=""
NEXT_PUBLIC_STRIPE_MODE="test"
NEXT_PUBLIC_TAY_REVENUE_TEST_MODE="false"
```

Production launch requires `NEXT_PUBLIC_TAY_DEPLOYMENT_ENV="live"` plus real
domain, hosting, email, legal review, support route, and live Stripe setup.

## Stripe Separation

- Local/test mode can remain test-only.
- Live mode requires live Stripe mode and real approved payment setup.
- Placeholder Stripe keys, price IDs, and payment links remain setup-required.
- Tay never collects card data inside the app.
- Payment handoff still requires governance approval.

## Legal And Support Setup

Set when finalized:

```bash
NEXT_PUBLIC_TRANSCENLUTIONS_DOMAIN=""
NEXT_PUBLIC_TRANSCENLUTIONS_COMPANY_EMAIL=""
NEXT_PUBLIC_TRANSCENLUTIONS_BILLING_EMAIL=""
NEXT_PUBLIC_TRANSCENLUTIONS_SUPPORT_EMAIL=""
NEXT_PUBLIC_TRANSCENLUTIONS_PRIVACY_POLICY_URL=""
NEXT_PUBLIC_TRANSCENLUTIONS_TERMS_URL=""
NEXT_PUBLIC_TRANSCENLUTIONS_REFUND_COPY=""
NEXT_PUBLIC_TRANSCENLUTIONS_LEGAL_COPY_REVIEWED="false"
NEXT_PUBLIC_TRANSCENLUTIONS_SUPPORT_ROUTE="/support"
```

Do not set `NEXT_PUBLIC_TRANSCENLUTIONS_LEGAL_COPY_REVIEWED="true"` until the
privacy, terms, refund, and support copy has been reviewed and approved.

## Definition Of Done

- Deployment Readiness panel appears in the command room.
- Local/test/live mode is visible.
- Missing production values show setup required.
- Placeholder values never count as configured.
- Public info pages render.
- Starter legal/support copy is clearly marked founder-review-needed.
- No fake live payments are created.
- lint, typecheck, smoke, and build pass.
