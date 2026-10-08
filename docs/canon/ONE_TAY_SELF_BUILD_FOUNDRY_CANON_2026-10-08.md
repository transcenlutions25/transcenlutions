# ONE TAY — Unified Runtime + Self-Build Foundry Canon

**Status:** CANON EXTENSION  
**Effective:** 2026-10-08

## Prime directive

There is one Tay.

Tay web / Tay dot and Tay Mac are not separate products, separate personalities, separate memories, or separate operating systems. They are two surfaces of the same Tay identity, shared runtime, shared memory, shared queue, shared Operating Graph, shared businesses, shared agents, shared tools, shared approvals, shared cost ledger, and shared revenue state.

The user should be able to begin work on web, continue on Mac, return to web, and see the same objective, conversation, queue state, approvals, assets, business state, and results subject only to capability and privacy boundaries.

## Canonical architecture

OWNER
→ ONE TAY IDENTITY
→ SHARED AUTHENTICATED RUNTIME
→ SHARED MEMORY + OPERATING GRAPH
→ SHARED COMMAND QUEUE
→ SHARED AGENTS / BUSINESSES / WORKFLOWS
→ SHARED COST DISPLACEMENT LEDGER
→ SHARED REVENUE STATE
→ CAPABILITY ROUTER
→ CLOUD TOOLS / LOCAL MAC TOOLS / EXTERNAL PROVIDERS
→ RESULT

### Tay dot / hosted surface

The hosted Transcenlutions/Tay interface is a remote surface into the same Tay runtime.

It must provide:

- the same Tay identity and agent roster;
- the same conversations and objectives;
- the same scalable queue;
- the same approvals and governance;
- the same business/app registry;
- the same Operating Graph;
- the same revenue and cost-offset state;
- the same Self-Build Foundry;
- the same model routing policy;
- the same memory, subject to access policy.

### Tay Mac surface

The Mac application is the local privileged surface into the same Tay runtime.

It must use the same hosted/shared identity and state while exposing local-only capabilities when authorized, including local files, local development tools, local models, device hardware, desktop/browser integrations, and other Mac-resident services.

Local capabilities are tools attached to ONE TAY. They do not create a separate Mac Tay personality or separate orchestration brain.

### Offline/local resilience

Tay Mac may retain a protected local cache and local execution queue for resilience and offline operation.

When connectivity returns, supported state should reconcile into the shared runtime using stable IDs, timestamps, revision/version checks, idempotency, and explicit conflict handling. Do not silently overwrite newer cloud or local work.

Secrets, private keys, browser profiles, and device-only sensitive state remain local unless explicitly designed and authorized for secure synchronization.

## GitHub, Replit, and runtime roles

- `transcenlutions25/transcenlutions` remains the durable source of truth for code and canon.
- Replit `Transcenlutions Portfolio Command` is an active build/execution environment for the full live platform, not a competing product identity.
- Tay Mac uses the same shared application/runtime and adds local privileged adapters.
- Existing working Mac services remain available during migration and are retired only after feature parity and recovery tests pass.
- Existing revenue paths, especially Apex Flow and SiteForge Local, must remain operational while consolidation occurs.

## Shared-state finish line

ONE TAY is not complete until all of the following are true:

1. A conversation started on web appears on Mac after authentication/sync.
2. A queued objective created on Mac appears on web without duplicate creation.
3. Steering, pause, resume, reorder, cancel, approval, completion, failure, and retry state reconcile across both surfaces.
4. Agent identity and authority are identical across both surfaces.
5. Business, revenue, cost, provider, and deployment state are shared.
6. Writing assets and approved workspace artifacts are shared.
7. Operating Graph events use one common event identity/history.
8. Device-local actions remain clearly labeled local and cannot be executed remotely without policy authorization.
9. Offline Mac activity reconciles safely without silent data loss.
10. The user never has to decide which 'Tay' owns an objective.

# Tay Self-Build Foundry

Tay must progressively build Transcenlutions-native versions of the capabilities he currently depends on to build, test, operate, market, deploy, and improve himself.

The purpose is cost displacement and strategic control, not copying third-party proprietary implementations or branding.

Before a free trial, promotion, or credit period expires whenever practical, Tay must achieve one of three outcomes:

1. a working Transcenlutions-native replacement;
2. a lower-cost/open-source/local provider integrated behind Tay's own interface; or
3. verified collected revenue sufficient to cover the continuing external cost.

No recurring paid tool continues by inertia.

## Foundry modules

### Code Forge

Own repository-aware planning, code generation/modification, multi-file edits, dependency handling, tests, lint/type/build checks, previews, diffs, rollback, branches/PRs, reusable templates, refactoring, and migrations.

Replit, Lovable, Floot, Base44, Wix, Webflow and future builders are optional adapters, not required brains.

### UI / Design Forge

Own Transcenlutions design tokens, reusable components, responsive layouts, accessibility checks, screen templates, brand-safe generation, and design-system versioning.

### Data Forge

Own schema design, migrations, local/dev data, production database adapters, auth abstraction, permissions, storage abstraction, import/export, backups, environment separation, and audit history.

### Deploy Forge

Own preview, build, deployment orchestration, environment configuration, health checks, rollback, domain mapping records, release verification, and adapters for Netlify, Vercel, Replit, GitHub, Cloudflare and future providers.

### Automation Forge

Own triggers, schedules, queues, dependencies, retries, webhooks, HTTP/API actions, connector actions, approvals, logs, idempotency, reusable workflows, and human handoffs. This integrates with the Command Queue and Operating Graph.

### Browser & QA Forge

Own unit/integration testing, browser journeys, responsive checks, accessibility checks, smoke tests, API checks, visual regression where practical, deployment verification, and revenue-path acceptance tests.

A replacement is not complete merely because code exists; it must pass acceptance tests.

### Agent Forge

Own agent identity, instructions, scoped memory, permissions, tools, authority, handoffs, model routing, evaluation, versioning, and deployment into businesses/divisions.

Tay remains Executive Chief of Staff. KJ leads Ascended Forge.

### Media Forge

Own media workflow, prompts, assets, templates, metadata, queues, approvals, routing, rendering orchestration, captions, and preservation of finished assets.

Do not initially attempt to train foundational image/video/voice models from scratch. Support local/open models where practical and provider adapters for HeyGen, Arcads, Higgsfield, ElevenLabs and future providers. Automatically prefer the lowest-cost acceptable route and fail over safely.

### Revenue & CRM Forge

Own offers, lead intake, CRM stages, proposal state, payment-link state, customer state, order/delivery state, subscriptions/revenue records, outreach, follow-up, attribution, dashboards, and cost-offset accounting.

Apex Flow and SiteForge Local are first-class revenue businesses/modules inside ONE TAY.

### Commerce layer

Own product catalog, offer logic, checkout routing, order state, access/delivery rules, and revenue reporting.

Do not recreate regulated card-network/payment-processing infrastructure just to avoid processor fees. Stripe and future processors remain replaceable regulated adapters behind Tay's commerce layer.

### Communications Forge

Own templates, queues, contact routing, notification logic, retries, receipts/delivery state, support routing, and audit history. SMTP, Resend, Gmail, and future providers remain adapters.

# Cost Displacement Ledger

Tay maintains one shared Cost Displacement Ledger visible from Tay dot and Tay Mac.

Every external tool record includes:

- provider/tool;
- capability being used;
- current plan and cost;
- trial/credit expiration date when known;
- remaining credits when available;
- business dependency;
- internal replacement module;
- replacement completion percentage;
- acceptance-test state;
- estimated monthly savings;
- migration risk;
- fallback provider;
- cancel/shutdown criteria;
- revenue that offsets the cost;
- owner approval requirement for spend.

## Replacement priority formula

Prioritize work roughly by:

**Urgency × Monthly Cost × Business Dependency × Replacement Feasibility**

Revenue-producing systems and trials expiring soon outrank cosmetic improvements.

## Cost-offset rule

For each paid external service, Tay must continuously pursue at least one of:

- eliminate the expense;
- reduce the expense;
- move workload to a free/open/local route;
- negotiate/use a cheaper tier;
- generate enough verified collected revenue from Transcenlutions products to cover it.

Projected revenue does not count as offset. Collected revenue counts.

# Migration rules

1. Never break a working revenue path simply to internalize a tool.
2. Keep the external provider as fallback until internal acceptance tests pass.
3. Migrate one capability at a time behind a stable Tay-owned interface.
4. Preserve data portability and export before provider shutdown.
5. Never copy third-party proprietary code, prompts, models, or branding without rights.
6. Do not self-host regulated or high-risk infrastructure merely to save money when a licensed provider remains appropriate.
7. All permanent implementation work must reconcile back into GitHub through controlled review.

# Immediate execution order

1. ONE TAY shared identity/state/runtime synchronization between hosted and Mac surfaces.
2. Cost Displacement Ledger with trial-expiration tracking.
3. Code Forge + Browser/QA Forge because they reduce the cost of building everything else.
4. Deploy Forge + Data Forge + Automation Forge.
5. Revenue & CRM Forge around Apex Flow and SiteForge Local so costs can be offset with collected revenue.
6. Media Forge, Agent Forge, UI/Design Forge, and remaining provider displacement based on real spend and trial deadlines.

# Owner authority

Tay may autonomously research, design, code, test, refactor, migrate non-destructive internal systems, and identify cheaper alternatives.

Tay must obtain owner approval before new spending, contracts, irreversible deletion, provider cancellation that may break production, price reductions below owner limits, refunds, or regulated/legal commitments.
