# Transcenlutions

Transcenlutions LLC is building Tay: a chat-first AI command room for turning
business ideas, passive-income systems, creative projects, and operating notes
into visible next moves.

Tay is the face, spokesman, orchestrator, animated operator, and executive brain
of the platform. The current app is **Tay Engine Box 1**, the foundation that
proves the core loop:

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
- `components/` — Tay chat shell, action card, activity log, and workspace panel
- `lib/` — Tay Core, Action Engine, public labels, and shared types
- `docs/tay-engine-box-1-approved-spec.md` — approved Box 1 source spec
- `scripts/check-public-copy.mjs` — guard against exposing internal build-only language

The old `src/` dashboard structure has been removed so the repo has one clear
active direction.

Useful concepts from the old structure were rebuilt as Tay-aligned future module
previews in the active root app. They now sit behind the command-room mindset:
business operations, creator flows, connector governance, insight routing,
founder command, and Crowne Legacy bridge.

## Current Scope

Box 1 includes:

- royal command-room homepage
- Tay chat interface
- intent detection
- structured action proposals
- execute / approve / decline / blocked governance states
- visible result card
- activity log
- next-step suggestion
- passive-income and business-building focus
- revenue launch handoff with paid starter offers
- buyer outreach kits for honest sales conversations
- buyer reply routing for follow-up, pause, and stop-sale decisions
- client fulfillment kits for paid offer delivery
- visible session memory for goals, offers, buyer signals, and boundaries
- per-offer Stripe Payment Link support
- manual invoice email fallback only when a real company or billing email is configured
- company email readiness for official contact, billing, and support inboxes
- setup-required state when payment is not configured

Box 1 does **not** include login, database, direct card processing, external
APIs, memory, agent chains, marketplace, or hidden automation. Payment
collection is handled through an approved external payment link or manual
invoice handoff.

## Revenue Setup

The app includes two buyer-ready starter offers:

- `Tay Command Starter Map` — `$97`
- `Operator Build Sprint` — `$497`

To connect a real checkout button, set:

```bash
NEXT_PUBLIC_STRIPE_STARTER_MAP_PAYMENT_LINK="https://buy.stripe.com/your-starter-map-link"
NEXT_PUBLIC_STRIPE_OPERATOR_SPRINT_PAYMENT_LINK="https://buy.stripe.com/your-operator-sprint-link"
```

Company email setup:

```bash
NEXT_PUBLIC_TRANSCENLUTIONS_COMPANY_EMAIL="hello@transcenlutions.com"
NEXT_PUBLIC_TRANSCENLUTIONS_BILLING_EMAIL="billing@transcenlutions.com"
NEXT_PUBLIC_TRANSCENLUTIONS_SUPPORT_EMAIL="support@transcenlutions.com"
```

Without a valid Stripe Payment Link or company billing inbox, the offer shows a
setup-needed state instead of a fake checkout or empty invoice. Card data is
never collected inside Tay.

See [docs/revenue-payment-setup.md](docs/revenue-payment-setup.md) for the
payment care rules, and [docs/company-email-setup.md](docs/company-email-setup.md)
for the company inbox setup rules.

See [docs/client-fulfillment-playbook.md](docs/client-fulfillment-playbook.md)
for the first paid-offer delivery standards.

See [docs/buyer-outreach-playbook.md](docs/buyer-outreach-playbook.md) for the
first buyer-message and qualification standards.

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
```

Expected behavior:

- safe build, plan, and note requests produce executable actions
- external API, checkout, invoice, or autonomous work pauses for approval
- approval creates a controlled handoff; decline stops the move and logs it
- deletion, direct charging, and hidden background work are blocked and logged
- revenue requests prepare a real offer and handoff path
- outreach cards show buyer-fit rules and careful first messages
- buyer reply commands route replies into clear next steps without auto-sending
- fulfillment cards show buyer artifacts and quality standards for paid offers
- memory snapshot stays visible and session-only
- payment buttons appear only for approved checkout links or configured company email
- every result, pause, blocked request, and clarification is visible

## Product Direction

Transcenlutions is not a product store or generic dashboard. The platform is a
royal AI command center where Tay helps users build, automate, organize, grow,
and operate business systems through chat, action execution, governance, and
eventual memory.
