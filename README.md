# Transcenlutions

Transcenlutions LLC is building Tay: a chat-first AI command room for turning
business ideas, passive-income systems, creative projects, and operating notes
into visible next moves.

Tay is the face, spokesman, orchestrator, animated operator, and executive brain
of the platform. **Box 1 foundation**, **Box 2 governance**, **Box 3 revenue
infrastructure**, **Box 4 Founder Operating System**, **Box 5 Launch
Readiness**, and **Box 6 Deployment Prep** are active around the same core loop:

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
- `docs/tay-engine-box-3-revenue.md` — real revenue infrastructure map
- `docs/tay-engine-box-4-founder-os.md` — founder execution and focus map
- `docs/tay-engine-box-5-launch-readiness.md` — launch setup and onboarding map
- `docs/tay-engine-box-6-deployment-prep.md` — deployment readiness and external setup map
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
- Founder Command Layer for daily priorities, weekly review, focus lanes, and family alignment
- anti-distraction routing for NOW / NEXT / LATER / PARKED work
- structured delivery artifacts when Tay prepares a paid offer
- per-offer Stripe Payment Link support
- manual invoice email fallback only when a real company or billing email is configured
- company email readiness for official contact, billing, and support inboxes
- setup-required state when payment is not configured
- Revenue Setup panel for email, Stripe, support, refund copy, and delivery location
- safe simulated test mode for rehearsing payment flow without collecting money
- Launch Readiness panel for domain, inbox, Stripe, policy, onboarding, and blocker truth
- first launch use case focused on AI business guidance
- Deployment Readiness panel for hosting, environment, legal pages, and support route setup
- starter public pages at `/privacy`, `/terms`, `/refund`, and `/support`

The current foundation does **not** include login, database, direct card
processing, external APIs, persistent memory, agent chains, marketplace, or
hidden automation. Payment
collection is handled through an approved external payment link or manual
invoice handoff.

## Founder Operating System

Box 4 keeps Transcenlutions focused on launch execution instead of expansion
drift. Tay now routes founder-focus requests through one allowed local action:

```text
manage_focus -> route_focus
```

The Founder Command Layer shows:

- today's priorities
- one-box focus
- revenue actions
- weekly review prompts
- anti-distraction backlog
- family-visible alignment summary

Expansion ideas such as the dating app, Crowne Legacy, advanced agents, full
autonomy, or marketplaces are kept in `PARKED` until the current box is stable.

## Launch Readiness

Box 5 keeps the launch path honest before public release. Tay routes launch
readiness through:

```text
prepare_launch -> route_launch_readiness
```

The Launch Readiness panel shows:

- current phase
- launch readiness percent
- revenue readiness percent
- top priority
- blocked setup items
- onboarding question
- first use case

First-entry onboarding starts with:

```text
What are you building?
```

The first real use case is `AI business guidance`: Tay helps one user clarify an
offer, plan revenue, and choose the next governed action.

## Deployment Prep

Box 6 adds the real-world launch doors without pretending they are already
configured. The Deployment Readiness panel tracks:

- production domain
- hosting target
- environment variables
- Stripe live/test separation
- company email
- support email
- privacy policy
- terms of service
- refund policy
- contact/support route

Starter public pages exist at:

```text
/privacy
/terms
/refund
/support
```

These pages are marked founder-review-needed until finalized. Live payments
remain disabled unless real Stripe and support setup are configured.

## Revenue Setup

The app includes two buyer-ready starter offers:

- `Tay Command Starter Map` — `$97`
- `Operator Build Sprint` — `$497`

To connect a real checkout button, set:

```bash
NEXT_PUBLIC_STRIPE_ACCOUNT_READY="true"
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=""
STRIPE_SECRET_KEY=""
NEXT_PUBLIC_STRIPE_STARTER_MAP_PRICE_ID=""
NEXT_PUBLIC_STRIPE_STARTER_MAP_PAYMENT_LINK=""
NEXT_PUBLIC_STRIPE_OPERATOR_SPRINT_PRICE_ID=""
NEXT_PUBLIC_STRIPE_OPERATOR_SPRINT_PAYMENT_LINK=""
```

Company email setup:

```bash
NEXT_PUBLIC_TRANSCENLUTIONS_COMPANY_EMAIL="hello@transcenlutions.com"
NEXT_PUBLIC_TRANSCENLUTIONS_BILLING_EMAIL="billing@transcenlutions.com"
NEXT_PUBLIC_TRANSCENLUTIONS_SUPPORT_EMAIL="support@transcenlutions.com"
NEXT_PUBLIC_TRANSCENLUTIONS_REFUND_COPY="Refund requests are reviewed against the paid scope and delivery status."
NEXT_PUBLIC_TRANSCENLUTIONS_REVENUE_DISCLAIMER="Transcenlutions does not guarantee income; results depend on execution, market fit, and buyer response."
NEXT_PUBLIC_DELIVERY_ARTIFACT_LOCATION="Tay result card and confirmed buyer delivery folder"
NEXT_PUBLIC_TRANSCENLUTIONS_DOMAIN=""
NEXT_PUBLIC_TRANSCENLUTIONS_PRIVACY_POLICY_URL=""
NEXT_PUBLIC_TRANSCENLUTIONS_TERMS_URL=""
NEXT_PUBLIC_TRANSCENLUTIONS_ONBOARDING_COPY_READY=""
```

Without a valid Stripe Payment Link or company billing inbox, the offer shows a
setup-needed state instead of a fake checkout or empty invoice. Card data is
never collected inside Tay. Checkout and invoice handoff remain
approval-required under governance. Placeholder-looking Stripe keys, price IDs,
and Payment Links stay setup-required until replaced with real account values.

Safe test mode:

```bash
NEXT_PUBLIC_TAY_REVENUE_TEST_MODE="true"
NEXT_PUBLIC_TAY_DEPLOYMENT_ENV="local"
NEXT_PUBLIC_TAY_HOSTING_TARGET=""
NEXT_PUBLIC_STRIPE_MODE="test"
NEXT_PUBLIC_TRANSCENLUTIONS_LEGAL_COPY_REVIEWED="false"
NEXT_PUBLIC_TRANSCENLUTIONS_SUPPORT_ROUTE="/support"
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

See [docs/tay-engine-box-4-founder-os.md](docs/tay-engine-box-4-founder-os.md)
for the founder command layer and focus rules.

See [docs/tay-engine-box-5-launch-readiness.md](docs/tay-engine-box-5-launch-readiness.md)
for launch readiness, onboarding, and first-use-case rules.

See [docs/tay-engine-box-6-deployment-prep.md](docs/tay-engine-box-6-deployment-prep.md)
for deployment readiness, external setup, and public info page rules.

See [docs/deployment-env-setup.md](docs/deployment-env-setup.md) for the full
environment variable setup guide.

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
Show launch readiness
Prepare Tay onboarding question
Prepare first use case: AI business guidance
Show today's Box 4 priorities
Run weekly founder review
Park Crowne Legacy until Box 4 is complete
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
- founder-focus requests produce a Founder Command Artifact
- launch-readiness requests produce a Launch Readiness Artifact
- deployment panel shows local/test/live mode and production blockers
- `/privacy`, `/terms`, `/refund`, and `/support` render starter pages
- Stripe setup visibility is allowed, but payment handoff still requires approval
- future expansion requests are parked instead of started
- family alignment summary states current focus, expected finish, completed boxes, and money readiness
- `npm run smoke` verifies the main Tay request, governance, revenue, blocked, buyer-reply, founder-focus, and launch-readiness loops
- payment buttons appear only for approved checkout links or configured company email
- every result, pause, blocked request, and clarification is visible

## Product Direction

Transcenlutions is not a product store or generic dashboard. The platform is a
royal AI command center where Tay helps users build, automate, organize, grow,
and operate business systems through chat, action execution, governance, and
eventual memory.
