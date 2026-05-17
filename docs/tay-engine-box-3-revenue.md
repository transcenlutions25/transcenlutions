# Tay Engine Box 3: Real Revenue Infrastructure

Box 3 formalizes the buyer journey without pretending external systems are
already connected.

## Buyer Journey

```text
outreach
→ buyer reply
→ offer prepared
→ governance review
→ approval-required payment handoff
→ delivery artifact
→ visible log and next step
```

## What Is Real In The App

- buyer outreach scripts
- buyer reply routing
- paid-offer preparation
- setup visibility for email, Stripe, support, refund copy, and delivery
- governance-required checkout or invoice handoff
- delivery artifacts with scope, timeline, support note, and next step
- smoke coverage for the core buyer journey

## What Requires External Accounts

- real company-domain email inbox
- Stripe account
- Stripe publishable key
- server-only Stripe secret key
- Stripe price IDs or approved Payment Links
- support inbox
- final refund/support policy copy
- delivery artifact storage or delivery location

## Safe Test Mode

Set:

```bash
NEXT_PUBLIC_TAY_REVENUE_TEST_MODE="true"
```

When test mode is active, Tay labels checkout as simulated. No checkout opens,
no card data is collected, and no money is claimed as collected.

## Payment Governance

- Offer preparation can run locally.
- Checkout or invoice handoff requires approval.
- Direct charging, card collection, wallet movement, and fake payment success
  are blocked.
- Live checkout links must be approved Stripe URLs.
- Invoice handoff requires a configured company or billing inbox.

## Definition Of Done

- Revenue setup panel shows configured/missing states.
- Missing Stripe/email setup shows setup required.
- Test mode is visibly simulated.
- Payment handoff remains approval-required.
- Delivery artifacts include offer title, buyer problem, outcome, scope, price,
  delivery format, timeline, support/refund note, and next step.
- lint, typecheck, smoke, and build pass.
