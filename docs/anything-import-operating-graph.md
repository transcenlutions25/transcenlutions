# Anything.com Import — Tay Operating Graph

## Source of truth
Repository: `https://github.com/transcenlutions25/transcenlutions`
Branch: `main`

Anything.com should import the repository root as the application root. Do **not** extract from an old `src/` dashboard or create a second Tay architecture.

## Moat code added in place
Extract and preserve these files exactly, then integrate them into the existing app:

- `docs/operating-graph-schema.sql` — Postgres schema for the five graph layers and append-only evidence ledger.
- `lib/operating-graph-db.ts` — server-side Postgres event store and measured evidence queries.
- `lib/operating-graph-client.ts` — client event shaping and best-effort evidence ingest.
- `app/api/operating-graph/events/route.ts` — governed event ingest endpoint.
- `app/api/operating-graph/evidence/route.ts` — measured internal evidence endpoint.
- `lib/action-engine.ts` — already instrumented so Tay session/action logs emit Operating Graph events.
- `package.json` — now includes `pg` and `@types/pg` requirements.

## Install
Run `npm install` after importing. This updates the lockfile for the newly added Postgres dependency before build/deploy.

## Database
Provision Postgres/Neon and run the complete SQL in:

`docs/operating-graph-schema.sql`

Required environment variables:

```env
DATABASE_URL="postgresql://..."
TAY_INTERNAL_TENANT_SLUG="transcenlutions-internal"
TAY_INTERNAL_TENANT_NAME="Transcenlutions Internal"
```

For local/internal testing only, event ingest works automatically outside production.

Production ingest is intentionally blocked by default because the current app has no login/tenant authentication. Do **not** bypass this safety boundary for a public deployment. The next production step is to wire authenticated user/session tenant IDs into the API instead of routing public users into the Transcenlutions internal tenant.

If a temporary private, access-controlled founder deployment is used, `TAY_ALLOW_UNAUTHENTICATED_EVIDENCE=true` may be set only when access to the entire deployment is separately restricted. Remove it before any public alpha.

## Canonical trace
Preserve this sequence:

`intent -> plan -> policy decision -> approval -> action -> result -> failure/recovery -> feedback`

Every trace is correlated by `correlation_id`. The event ledger is append-only. Duplicate lifecycle events are prevented by `(tenant_id, event_key)`.

## Five graph layers
1. Authority Graph
2. Outcome Graph
3. Organization Graph
4. Skill Graph
5. Recovery Graph

Do not reduce the moat to a governance UI. Governance is a feature; permissioned operational intelligence accumulated from real work is the moat.

## Evidence rules
The dashboard/API must derive metrics from `tay_operating_events` / `tay_workflow_evidence`; never hard-code traction numbers.

Keep these categories separate:
- Transcenlutions internal production usage
- external alpha/pilot usage
- paid customer/revenue traction

Never relabel internal usage as external customer traction.

## Next implementation work in Anything.com
1. Preserve the current Tay Core, Action Engine, Governance, result, activity log, and Founder OS.
2. Configure Postgres and run the schema.
3. Run `npm install`, `npm run typecheck`, `npm run lint`, `npm run smoke`, and `npm run build`.
4. Add authenticated tenant routing before public evidence ingest.
5. Add workflow/run start timestamps so `duration_ms` is measured from actual execution rather than estimated.
6. Instrument one-tap feedback into `feedback` events.
7. Instrument explicit `failure` and `recovery` events for retries/reroutes.
8. Add an owner-only Evidence dashboard using `/api/operating-graph/evidence`.
9. Select one killer workflow and establish a truthful manual baseline before claiming hours saved.
10. Keep marketplace, broad autonomous device control, and ecosystem expansion parked until the evidence core is stable.

## Acceptance check
Anything.com should report the exact imported commit, successful build status, database migration status, and which of the ten next-work items are implemented vs. still pending. Do not say a feature is live unless it is actually wired and tested.
