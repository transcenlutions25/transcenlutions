# Free Private Alpha Deployment

Use this guide when Vercel asks for payment or is not the right fit for the
first private alpha.

## Deployment Decision

Primary free path:

- Netlify

Fallback free path:

- Cloudflare Pages static export

Do not connect `transcenlutions.com` yet. Use the generated preview URL for the
first private alpha testers.

## Current App Compatibility

The Tay app is a Next.js App Router project with static pages, client-side chat
state, session-only feedback, no API routes, no database, and no server SDKs
initialized at module scope.

That means:

- Netlify can deploy the normal Next.js build from `.next`.
- Cloudflare Pages can deploy a static export from `out` as a fallback.
- Missing environment variables do not break the app; they appear as setup
  required, review needed, or simulated test states.

## Primary Option: Netlify

Netlify is the easiest free private-alpha path for this repo because it supports
modern Next.js apps directly and suggests `next build` with `.next` as the
publish directory for Next.js projects.

The repo includes:

```text
netlify.toml
```

Current Netlify settings:

```toml
[build]
  command = "npm run build"
  publish = ".next"

[build.environment]
  NODE_VERSION = "20"
  NEXT_PUBLIC_TAY_DEPLOYMENT_ENV = "test"
  NEXT_PUBLIC_TAY_HOSTING_TARGET = "Netlify"
  NEXT_PUBLIC_STRIPE_MODE = "test"
  NEXT_PUBLIC_TAY_REVENUE_TEST_MODE = "true"
  NEXT_PUBLIC_STRIPE_ACCOUNT_READY = "false"
  NEXT_PUBLIC_TRANSCENLUTIONS_LEGAL_COPY_REVIEWED = "false"
  NEXT_PUBLIC_TRANSCENLUTIONS_SUPPORT_ROUTE = "/support"
```

Security/privacy headers are also set for private alpha:

```text
X-Robots-Tag: noindex, nofollow, noarchive
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
Referrer-Policy: strict-origin-when-cross-origin
```

### Netlify Dashboard Steps

1. Open Netlify.
2. Choose Add new site.
3. Import from Git.
4. Connect GitHub.
5. Select `transcenlutions25/transcenlutions`.
6. Confirm build settings:
   - Branch: `main`
   - Build command: `npm run build`
   - Publish directory: `.next`
7. Deploy.
8. Use the generated `*.netlify.app` URL for private alpha.
9. Do not add a custom domain yet.

### Netlify Free-Plan Care

Keep auto-recharge off. Netlify's current Free plan has a hard monthly limit and
should not incur charges when auto-recharge remains disabled.

This private alpha app should be lightweight, but still monitor usage after
sharing the URL.

## Fallback Option: Cloudflare Pages

Cloudflare Pages is the fallback path because its simple Pages preset expects a
static Next.js export.

The repo supports this without changing normal local development:

```bash
npm run build:cloudflare
```

This sets:

```text
NEXT_OUTPUT=export
```

and generates:

```text
out/
```

### Cloudflare Pages Dashboard Steps

1. Open Cloudflare.
2. Go to Workers & Pages.
3. Create application.
4. Choose Pages.
5. Import the GitHub repository.
6. Select `transcenlutions25/transcenlutions`.
7. Use these build settings:
   - Framework preset: `Next.js (Static HTML Export)`
   - Production branch: `main`
   - Build command: `npm run build:cloudflare`
   - Build output directory: `out`
8. Add the same private-alpha environment variables listed below.
9. Deploy.
10. Use the generated `*.pages.dev` URL for private alpha.
11. Do not add a custom domain yet.

Cloudflare Pages Free plan currently lists 500 builds per month, 1 build at a
time, and a 20,000-file limit for a Pages site. This app is well under that
file-count limit.

## Required Now

Set these for Netlify or Cloudflare private alpha:

```text
NEXT_PUBLIC_TAY_DEPLOYMENT_ENV="test"
NEXT_PUBLIC_TAY_HOSTING_TARGET="Netlify"
NEXT_PUBLIC_STRIPE_MODE="test"
NEXT_PUBLIC_TAY_REVENUE_TEST_MODE="true"
NEXT_PUBLIC_STRIPE_ACCOUNT_READY="false"
NEXT_PUBLIC_TRANSCENLUTIONS_LEGAL_COPY_REVIEWED="false"
NEXT_PUBLIC_TRANSCENLUTIONS_SUPPORT_ROUTE="/support"
```

For Cloudflare, change the hosting target:

```text
NEXT_PUBLIC_TAY_HOSTING_TARGET="Cloudflare Pages"
```

## Optional For Private Alpha

Leave blank unless the value is real:

```text
NEXT_PUBLIC_TRANSCENLUTIONS_DOMAIN=""
NEXT_PUBLIC_TRANSCENLUTIONS_COMPANY_EMAIL=""
NEXT_PUBLIC_TRANSCENLUTIONS_BILLING_EMAIL=""
NEXT_PUBLIC_TRANSCENLUTIONS_SUPPORT_EMAIL=""
NEXT_PUBLIC_TRANSCENLUTIONS_PRIVACY_POLICY_URL=""
NEXT_PUBLIC_TRANSCENLUTIONS_TERMS_URL=""
NEXT_PUBLIC_TRANSCENLUTIONS_REFUND_COPY=""
NEXT_PUBLIC_TRANSCENLUTIONS_REVENUE_DISCLAIMER=""
NEXT_PUBLIC_DELIVERY_ARTIFACT_LOCATION=""
NEXT_PUBLIC_TRANSCENLUTIONS_ONBOARDING_COPY_READY=""
```

## Setup Later

Do not add placeholder Stripe values. Add these only when real:

```text
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=""
STRIPE_SECRET_KEY=""
NEXT_PUBLIC_STRIPE_STARTER_MAP_PRICE_ID=""
NEXT_PUBLIC_STRIPE_STARTER_MAP_PAYMENT_LINK=""
NEXT_PUBLIC_STRIPE_OPERATOR_SPRINT_PRICE_ID=""
NEXT_PUBLIC_STRIPE_OPERATOR_SPRINT_PAYMENT_LINK=""
```

## Stripe Payment Link Readiness

Private alpha should run in simulated payment mode:

```text
NEXT_PUBLIC_TAY_REVENUE_TEST_MODE="true"
NEXT_PUBLIC_STRIPE_MODE="test"
```

Live checkout is not ready until:

- the Stripe account is verified
- real offer-specific Stripe Payment Links exist
- support and billing inboxes are configured
- refund/support copy is reviewed
- delivery artifact location is set
- Tay governance approval happens before payment handoff

The app must never claim money was collected during private alpha.

## Production Limitations

This is not public launch:

- no login or auth
- no database
- no persistent memory
- no external email sending
- no app-side card collection
- no connected custom domain
- no automatic invite system
- legal pages remain starter copy until founder/legal review is complete
- payment handoff remains approval-required

## Private Alpha Limitations

The private alpha URL is for invited testers only:

- onboarding path selection is session-only
- feedback resets on refresh
- Founders Circle tester slots are visual only
- session log is browser-session only
- tester invites are prepared as guidance, not sent automatically

## Pre-Deploy Checks

Run before deploying:

```bash
npm run lint
npm run typecheck
npm run smoke
npm run build
```

For Cloudflare fallback, also run:

```bash
npm run build:cloudflare
```

## Post-Deploy Private Alpha Checklist

Open the generated Netlify or Cloudflare URL and test:

- page loads with no console errors
- no custom domain is connected
- private alpha promise is visible
- onboarding paths render
- `I have too many ideas and need help choosing what to do first.` routes to a
  private alpha action
- Execute shows running state, result, activity log, next step, and feedback
- `Create a plan for Tay governance` remains allowed
- `Delete the database` remains blocked and logged
- `Prepare a $97 Tay Command Starter Map offer` creates an offer artifact
- `Send checkout details for Tay Command Starter Map` requires approval
- payment state says simulated or setup required
- `/privacy`, `/terms`, `/refund`, and `/support` render
- Deployment Readiness does not claim public launch readiness
