# Vercel Deployment Checklist

Use this checklist for the first private alpha deployment of Tay for
Transcenlutions.

## Current Deployment Truth

The app is ready for a private Vercel deployment, but it is not public-launch
complete until domain, legal, support, and live payment setup have been reviewed.

Private alpha can run safely with missing production values because the app
shows setup-required states instead of pretending external services are live.

## Vercel Project Settings

Import the GitHub repository into Vercel:

- Repository: `transcenlutions25/transcenlutions`
- Framework preset: `Next.js`
- Root directory: repository root
- Install command: `npm install`
- Build command: `npm run build`
- Output directory: leave blank / Vercel default
- Development command: leave default / `next dev`
- Production branch: `main`
- Node.js version: Vercel default is acceptable for this Next.js 14 app; Node 20
  or newer is recommended.

No `vercel.json` is required for the current app.

## Environment Variables

Set environment variables in Vercel Project Settings -> Environment Variables.
Scope private alpha values to Preview and Production only when you intend both
deployments to use the same behavior.

### Required Now For Private Alpha

These values make the deployment mode honest and keep the support route stable:

```text
NEXT_PUBLIC_TAY_DEPLOYMENT_ENV="test"
NEXT_PUBLIC_TAY_HOSTING_TARGET="Vercel"
NEXT_PUBLIC_STRIPE_MODE="test"
NEXT_PUBLIC_TAY_REVENUE_TEST_MODE="true"
NEXT_PUBLIC_STRIPE_ACCOUNT_READY="false"
NEXT_PUBLIC_TRANSCENLUTIONS_LEGAL_COPY_REVIEWED="false"
NEXT_PUBLIC_TRANSCENLUTIONS_SUPPORT_ROUTE="/support"
```

Private alpha may deploy without live Stripe, final legal review, or a public
custom domain. Those missing items must remain visible as setup-required or
review-needed.

### Optional For Private Alpha

Use these when available. Leave blank if not configured yet:

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

### Setup Later For Live Payments Or Public Launch

Use real Stripe values only when ready. Placeholder-looking values are rejected
by the app and remain setup-required.

```text
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=""
STRIPE_SECRET_KEY=""
NEXT_PUBLIC_STRIPE_STARTER_MAP_PRICE_ID=""
NEXT_PUBLIC_STRIPE_STARTER_MAP_PAYMENT_LINK=""
NEXT_PUBLIC_STRIPE_OPERATOR_SPRINT_PRICE_ID=""
NEXT_PUBLIC_STRIPE_OPERATOR_SPRINT_PAYMENT_LINK=""
```

Stripe-hosted Payment Links can support the current handoff path without custom
server-side checkout code when every active offer has a real approved Stripe
Payment Link. Custom checkout, subscriptions, customer portal, and server-side
Stripe automation are later work and require server-only Stripe keys.

## Stripe Payment Link Readiness

Live payment handoff is not enabled unless:

- `NEXT_PUBLIC_STRIPE_ACCOUNT_READY="true"`
- `NEXT_PUBLIC_STRIPE_MODE="live"`
- real `https://buy.stripe.com/...` links exist for active offers, or valid
  Stripe price IDs plus future server checkout work exist
- company or billing email is configured for invoice fallback
- support email, refund copy, disclaimer, and delivery artifact location are set
- Tay governance approval occurs before a checkout or invoice handoff

For private alpha, keep:

```text
NEXT_PUBLIC_TAY_REVENUE_TEST_MODE="true"
NEXT_PUBLIC_STRIPE_MODE="test"
```

This makes checkout states simulated and prevents fake revenue claims.

## Production Limitations

Current deployment is safe for private alpha, not full public launch:

- no login or auth
- no database
- no persistent user memory
- no external email sending
- no app-side card collection
- no hidden automation
- no automatic invite system
- legal pages are starter copy until founder/legal review is complete
- payment handoff remains approval-required

## Private Alpha Limitations

The private alpha system is session-only:

- onboarding path choice is not persisted
- feedback resets on page refresh
- Founders Circle tester tracking is visual only
- session logs are local to the browser session
- tester invites are prepared as guidance, not sent automatically

This is intentional for the first five testers.

## Graceful Missing-Env Behavior

Missing or placeholder environment values must never break deployment.

Expected behavior:

- deployment readiness shows setup-required or review-needed states
- revenue setup shows setup-required or simulated test mode
- payment buttons do not appear until approved live links or invoice email exist
- placeholder Stripe keys, price IDs, and Payment Links do not count as configured
- legal and support routes still render
- Tay continues to route onboarding, governance, action results, logs, and feedback

## Pre-Deploy Verification

Run locally before importing or redeploying on Vercel:

```bash
npm run lint
npm run typecheck
npm run smoke
npm run build
```

The app must pass all four before private alpha deployment.

## Post-Deploy Testing Checklist

After Vercel deploys, open the deployment URL and test:

- homepage loads without console errors
- private alpha promise is visible
- onboarding paths render: Business, Focus & Productivity, Revenue, Planning,
  Content, Personal Growth
- `I have too many ideas and need help choosing what to do first.` routes to a
  private alpha action
- Execute button shows running state, result, session log, next step, and
  feedback strip
- `Create a plan for Tay governance` remains allowed
- `Delete the database` remains blocked and logged
- `Prepare a $97 Tay Command Starter Map offer` creates an offer artifact
- `Send checkout details for Tay Command Starter Map` requires approval
- missing Stripe setup shows setup-required or simulated test state
- `/privacy`, `/terms`, `/refund`, and `/support` render
- Deployment Readiness panel does not claim production ready unless all live
  values are truly configured

## Custom Domain After Private Alpha Deploy

After the Vercel project exists:

1. Open Vercel project Settings -> Domains.
2. Add the custom domain.
3. Add the DNS records Vercel shows at the domain registrar.
4. Keep existing email DNS records intact.
5. Wait for Vercel domain verification and automatic SSL.

Do not switch `NEXT_PUBLIC_TAY_DEPLOYMENT_ENV` to `live` until domain, support,
legal review, and payment readiness are complete.
