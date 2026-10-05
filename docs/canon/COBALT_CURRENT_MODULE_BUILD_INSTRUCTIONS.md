# AGENTS.md

## Mission

Build **Cobalt Current Lead Recovery**, an approval-gated operations module inside the existing Transcenlutions Next.js application. The module helps Cobalt Current sell and fulfill remote lead-follow-up services for cleaning companies, property-maintenance vendors, landscapers, pressure washers, handymen, and similar local service businesses.

The first release is an internal operator system, not an autonomous communications bot. It must help the owner research prospects, organize opportunities, prepare follow-up drafts, review approvals, and measure outcomes without travel or phone calls.

## Protected rules

These rules are binding:

1. AI may research, classify, summarize, and draft.
2. The owner must approve before anything is sent, posted, charged, refunded, assigned, shared, deleted, or materially changed.
3. Do not activate payments, Stripe, SMS, calling, bulk email, marketplace logic, contractor matching, payouts, or background sending.
4. Do not expose secrets or commit `.env` files.
5. Do not weaken existing Tay governance, approval gates, legal pages, or revenue safeguards.
6. Do not claim income, booked jobs, delivered messages, or completed integrations without evidence.
7. Stop after the scoped task is complete. Do not expand into unrelated Transcenlutions products.

## Existing stack

- Next.js 14 App Router
- React 18
- TypeScript
- Tailwind CSS
- Zustand
- Lucide React

Use the current repository conventions. Avoid adding dependencies unless the task cannot be completed safely without them.

## Product location

Keep the module isolated and detachable:

- Routes: `app/lead-recovery/**`
- Components: `components/lead-recovery/**`
- Logic and types: `lib/lead-recovery/**`
- Documentation: `docs/cobalt-current-lead-recovery-*.md`

Do not rewrite the existing homepage or Tay command room. A small internal navigation link may be added only if it does not alter public launch copy.

## Visual direction

- Deep black and navy foundations
- Royal blue and cobalt emphasis
- Royal purple used sparingly
- Thin gold accents
- High contrast and large readable text
- Mobile-first controls
- Calm command-center presentation
- Tagline: `Intelligence Under Pressure.`

## Stage 1 scope

Build an internal MVP containing:

- Command dashboard
- Prospect pipeline
- Client pipeline
- Lead/opportunity records
- Draft queue
- Approval center
- Follow-up sequence preview
- Activity and audit log
- Weekly report preview
- Deterministic seed/demo data

Stage 1 must have no external side effects. Data may use a typed local adapter or deterministic in-memory seed layer, but the architecture must make a later Supabase adapter straightforward.

## Required statuses

### Prospect

`RESEARCHED`, `QUALIFIED`, `DRAFT_READY`, `APPROVED_TO_CONTACT`, `CONTACTED`, `REPLIED`, `MEETING_OR_ASYNC_AUDIT`, `PROPOSAL_SENT`, `WON`, `LOST`, `DO_NOT_CONTACT`

### Draft

`DRAFT`, `NEEDS_REVIEW`, `APPROVED`, `REJECTED`, `SENT_EXTERNALLY`

`SENT_EXTERNALLY` is display-only in Stage 1. The application must not send anything.

### Client lead

`NEW`, `QUALIFIED`, `ESTIMATE_PENDING`, `ESTIMATE_SENT`, `FOLLOW_UP_DUE`, `BOOKED`, `COMPLETED`, `LOST`, `DO_NOT_CONTACT`

## Engineering requirements

- Strict TypeScript. Avoid `any`.
- Accessible labels, keyboard navigation, and visible focus states.
- Large touch targets for mobile.
- Empty, loading, error, and no-results states.
- No fake success states.
- No direct network calls in client components.
- Business rules belong in `lib/lead-recovery`.
- UI components should receive typed data and callbacks.
- All approval-state transitions must create an audit event.
- `DO_NOT_CONTACT` records must never appear in a send-ready queue.

## Verification

Run and report all of the following:

```bash
npm install
npm run typecheck
npm run lint
npm run smoke
npm run build
```

Also manually verify at mobile and desktop widths:

1. `/lead-recovery` loads.
2. A prospect can move between allowed stages.
3. A draft can be approved or rejected.
4. Approval and rejection create audit events.
5. A `DO_NOT_CONTACT` prospect cannot enter an approved-contact state.
6. No button sends email, text, payment, or external request.
7. Existing public routes still work.

## Definition of done

A task is complete only when the requested behavior exists, tests and checks pass, the change is confined to scope, and the final report lists changed files, commands run, results, limitations, and the next smallest safe task.