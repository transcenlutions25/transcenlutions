# Codex Task 01: Build the approval-gated Lead Recovery MVP

## Objective

Implement the Stage 1 internal MVP described in:

- `AGENTS.md`
- `docs/cobalt-current-lead-recovery-master-spec.md`

Work only on branch:

`codex/cobalt-current-lead-recovery-mvp`

Do not merge to `main`.

## Scope

Create a detachable module at `/lead-recovery` using the existing Next.js 14, React, TypeScript, Tailwind, Zustand, and Lucide stack.

### Required routes

- `/lead-recovery`
- `/lead-recovery/prospects`
- `/lead-recovery/prospects/[id]`
- `/lead-recovery/clients`
- `/lead-recovery/leads`
- `/lead-recovery/drafts`
- `/lead-recovery/approvals`
- `/lead-recovery/audit`

### Required source structure

- `app/lead-recovery/**`
- `components/lead-recovery/**`
- `lib/lead-recovery/types.ts`
- `lib/lead-recovery/seed.ts`
- `lib/lead-recovery/store.ts`
- `lib/lead-recovery/rules.ts`
- `lib/lead-recovery/selectors.ts`

Use deterministic seeded data. No credentials or network services are needed for Task 01.

## Functional requirements

1. Show command metrics and due work on the main dashboard.
2. Show prospects with filters for status, category, score, next-follow-up date, and do-not-contact state.
3. Allow only valid prospect stage transitions.
4. Prevent a `DO_NOT_CONTACT` prospect from entering `APPROVED_TO_CONTACT` or appearing in a contact-ready queue.
5. Show prospect research evidence, qualification breakdown, notes, draft history, and audit history.
6. Show clients and their lead limits, approved channels, and escalation rules.
7. Show client leads with status, urgency, consent state, and next action date.
8. Show drafts with subject, body, evidence, risk flags, and approval state.
9. Allow approve, reject, and return-for-revision actions.
10. Write an audit event for every status or approval change.
11. Clearly label all send actions as unavailable in Stage 1.
12. Provide empty, no-result, and guarded-error states.
13. Preserve all existing public routes and Tay behavior.

## Design requirements

- Mobile-first and readable at 360px width.
- Deep black/navy background.
- Cobalt and royal-blue emphasis.
- Sparse royal-purple accents.
- Thin gold borders or dividers.
- Large readable type and touch targets.
- High-contrast focus states.
- Calm command-center style.

Do not make the page visually dense merely to imitate a CRM. The phone view must prioritize the next action.

## State and rule requirements

Create pure rule functions for:

- valid prospect transitions
- valid lead transitions
- draft approval transitions
- do-not-contact enforcement
- audit-event generation
- dashboard metric calculation
- follow-up due-state calculation

Add focused tests if the repository already has an established test pattern. If no test framework exists, add a deterministic Node verification script under `scripts/` and wire it to a new script such as `npm run verify:lead-recovery` without breaking current scripts.

## Forbidden work

- No Gmail API
- No email sending
- No SMS or calling
- No Stripe or payments
- No Supabase yet
- No cron jobs or background workers
- No bulk outreach
- No edits to Hallway Cleaning permissions or deployment
- No claims that messages were sent
- No merge to `main`

## Verification commands

Run:

```bash
npm install
npm run typecheck
npm run lint
npm run smoke
npm run build
```

Run any Lead Recovery verification command added by this task.

## Manual acceptance checks

- Open `/lead-recovery` at desktop and phone widths.
- Move a qualified prospect to `DRAFT_READY`.
- Approve a draft and confirm an audit event appears.
- Reject a second draft with a reason and confirm the audit event.
- Mark a prospect `DO_NOT_CONTACT` and confirm contact approval is blocked.
- Confirm no control sends a message or triggers a network request.
- Confirm the existing homepage, Tay command room, and legal/support routes still load.

## Required completion report

Return:

1. Summary of behavior implemented
2. Changed-file list
3. Commands run and exact results
4. Screenshots at phone and desktop widths
5. Known limitations
6. Next smallest safe task
7. A draft pull request from `codex/cobalt-current-lead-recovery-mvp` to `main`, but do not merge it