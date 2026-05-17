# Transcenlutions

Transcenlutions LLC is building Tay: a chat-first AI command room for turning
business ideas, passive-income systems, creative projects, and operating notes
into visible next moves.

Tay is the face, spokesman, orchestrator, animated operator, and executive brain
of the platform. **Tay Engine Box 1** is complete, and **Box 2 governance** is
now active around the same core loop:

```text
User request
→ Tay interprets intent
→ Tay proposes an action
→ governance shows ready / needs approval / blocked
→ action runs or pauses visibly
→ result appears
→ activity log records the truth
→ next step is suggested
```

## Active App Structure

The active Next.js app lives at the repository root:

- `app/` — App Router entry, layout, and global command-room styling
- `components/` — Tay chat shell, action card, governance, activity log, and workspace panels
- `lib/` — Tay Core, Action Engine, Governance, public labels, and shared types
- `docs/tay-engine-box-1-approved-spec.md` — approved Box 1 source spec
- `docs/tay-engine-box-2-governance.md` — current Box 2 governance map
- `scripts/check-public-copy.mjs` — guard against exposing internal build-only language

The old `src/` dashboard structure has been removed so the repo has one clear
active direction.

Useful concepts from the old structure were rebuilt as Tay-aligned future module
previews in the active root app. They now sit behind the command-room mindset:
business operations, creator flows, connector governance, insight routing,
founder command, and Crowne Legacy bridge.

## Current Scope

The current foundation includes:

- royal command-room homepage
- Tay chat interface
- intent detection
- structured action proposals
- execute / approve / decline / blocked governance states
- centralized governance registry
- action risk tiers, risk scores, and audit fields
- visible result card
- activity log
- next-step suggestion
- passive-income and business-building focus
- revenue launch handoff with paid starter offers
- buyer outreach kits for honest sales conversations
- buyer reply routing for follow-up, pause, and stop-sale decisions
- client fulfillment kits for paid offer delivery
- visible session memory for goals, offers, buyer signals, and boundaries
- structured delivery artifacts when Tay prepares a paid offer
- per-offer Stripe Payment Link support
- manual invoice email fallback only when a real company or billing email is configured
- company email readiness for official contact, billing, and support inboxes
- setup-required state when payment is not configured
- Revenue Setup panel for email, Stripe, support, refund copy, and delivery location
- safe simulated test mode for rehearsing payment flow without collecting money

The current foundation does **not** include login, database, direct card
processing, external APIs, persistent memory, agent chains, marketplace, or
hidden automation. Payment
collection is handled through an approved external payment link or manual
invoice handoff.

## Revenue Setup

The app includes two buyer-ready starter offers:

- `Tay Command Starter Map` — `$97`
- `Operator Build Sprint` — `$497`

To connect a real checkout button, set:

```bash
NEXT_PUBLIC_STRIPE_ACCOUNT_READY="true"
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY="pk_live_or_test_key"
STRIPE_SECRET_KEY="sk_live_or_test_key"
NEXT_PUBLIC_STRIPE_STARTER_MAP_PRICE_ID="price_starter_map"
NEXT_PUBLIC_STRIPE_STARTER_MAP_PAYMENT_LINK="https://buy.stripe.com/your-starter-map-link"
NEXT_PUBLIC_STRIPE_OPERATOR_SPRINT_PRICE_ID="price_operator_sprint"
NEXT_PUBLIC_STRIPE_OPERATOR_SPRINT_PAYMENT_LINK="https://buy.stripe.com/your-operator-sprint-link"
```

Company email setup:

```bash
NEXT_PUBLIC_TRANSCENLUTIONS_COMPANY_EMAIL="hello@transcenlutions.com"
NEXT_PUBLIC_TRANSCENLUTIONS_BILLING_EMAIL="billing@transcenlutions.com"
NEXT_PUBLIC_TRANSCENLUTIONS_SUPPORT_EMAIL="support@transcenlutions.com"
NEXT_PUBLIC_TRANSCENLUTIONS_REFUND_COPY="Refund requests are reviewed against the paid scope and delivery status."
NEXT_PUBLIC_TRANSCENLUTIONS_REVENUE_DISCLAIMER="Transcenlutions does not guarantee income; results depend on execution, market fit, and buyer response."
NEXT_PUBLIC_DELIVERY_ARTIFACT_LOCATION="Tay result card and confirmed buyer delivery folder"
```

Without a valid Stripe Payment Link or company billing inbox, the offer shows a
setup-needed state instead of a fake checkout or empty invoice. Card data is
never collected inside Tay. Checkout and invoice handoff remain
approval-required under governance.

Safe test mode:

```bash
NEXT_PUBLIC_TAY_REVENUE_TEST_MODE="true"
```

When active, checkout is labeled simulated. No checkout opens, no card data is
collected, and no real revenue is claimed.

See [docs/revenue-payment-setup.md](docs/revenue-payment-setup.md) for the
payment care rules, and [docs/company-email-setup.md](docs/company-email-setup.md)
for the company inbox setup rules.

See [docs/client-fulfillment-playbook.md](docs/client-fulfillment-playbook.md)
for the first paid-offer delivery standards.

See [docs/buyer-outreach-playbook.md](docs/buyer-outreach-playbook.md) for the
first buyer-message and qualification standards.

See [docs/tay-engine-box-2-governance.md](docs/tay-engine-box-2-governance.md)
for the action registry, risk tiers, and approval/blocking rules.

See [docs/tay-engine-box-3-revenue.md](docs/tay-engine-box-3-revenue.md) for
the real revenue infrastructure and buyer journey.

## Run Locally

```bash
npm install
npm run dev
```

Open:

```text
http://localhost:3000
```

If port 3000 is busy:

```bash
npm run dev -- -p 3001
```

## Verification

Run:

```bash
npm run lint
npm run typecheck
npm run smoke
npm run build
```

Manual phrases to test in Tay:

```text
Build the first Tay feature
Create a plan for Tay governance
Log a note about command room completion
Use an external API to automate leads
Delete the database
Build a passive income offer
Prepare a $97 Tay Command Starter Map offer
Prepare a $497 Operator Build Sprint offer
Send checkout details for Tay Command Starter Map
Buyer replied: yes, send me the details
```

Expected behavior:

- safe build, plan, and note requests produce executable actions
- external API, checkout, invoice, or autonomous work pauses for approval
- approval creates a controlled handoff; decline stops the move and logs it
- deletion, direct charging, and hidden background work are blocked and logged
- governance panel shows active action rules and risk tiers
- session log entries include governance risk data
- revenue requests prepare a real offer and handoff path
- payment handoff requests require approval before checkout or invoice links appear
- missing Stripe/email setup appears as setup required
- safe test mode states clearly say simulated
- outreach cards show buyer-fit rules and careful first messages
- buyer reply commands route replies into clear next steps without auto-sending
- fulfillment cards show buyer artifacts and quality standards for paid offers
- memory snapshot stays visible and session-only
- prepared offers include a delivery artifact with outcome, intake, flow, and boundaries
- `npm run smoke` verifies the main Tay request, governance, revenue, blocked, and buyer-reply loops
- payment buttons appear only for approved checkout links or configured company email
- every result, pause, blocked request, and clarification is visible

## Product Direction

Transcenlutions is not a product store or generic dashboard. The platform is a
royal AI command center where Tay helps users build, automate, organize, grow,
and operate business systems through chat, action execution, governance, and
eventual memory.
