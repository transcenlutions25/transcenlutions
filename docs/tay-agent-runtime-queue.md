# Tay agent runtime: migrations and the durable queue

Status: implemented and tested locally on the SQLite workspace. No hosted
deployment has been verified. Nothing here charges, sends, deploys or pushes.

This is the first installment of the launch-critical runtime work. It covers the
schema-migration seam and a durable, leased, audited agent queue. The remaining
launch-critical items are listed at the end with their exact blockers.

## Versioned schema migrations

`lib/tay/migrations.ts` owns the workspace schema. Opening the database applies
pending migrations in order and records each one in `schema_migrations`:

```sql
CREATE TABLE schema_migrations (id TEXT PRIMARY KEY, description TEXT NOT NULL, applied_at TEXT NOT NULL);
```

| Migration | Contents |
| --- | --- |
| `001_workspace_core` | users, sessions, projects, conversations, messages, memory, tasks, approvals, files, artifacts, audit, grants, agents, invites, business records |
| `002_engineering_sessions` | engineering sessions, worklog, checkpoints, playbooks |
| `003_agent_jobs` | durable agent job queue |

Properties that matter:

- **Idempotent adoption.** Every statement is `IF NOT EXISTS`, so an existing
  database created before this module is adopted on the next boot and then
  recorded. No data is rewritten.
- **One transaction per migration.** A failure rolls back and names the
  migration; the database never half-applies a version.
- **Readable status.** `migrationStatus(db)` returns the applied version,
  applied ids and pending ids. `GET /api/tay/projects/:id/queue` exposes it.

To add a migration, append `{ id, description, sql }` to `MIGRATIONS`. Never
edit an applied migration; its checksum is not tracked, so editing one would
silently diverge between deployments.

**Hosted database is not done.** The workspace still runs on `node:sqlite`.
The Operating Graph evidence layer already uses `pg` with
`DATABASE_URL`/`DATABASE_SSL_CA` and `docs/operating-graph-schema.sql`, but the
workspace tables have no Postgres equivalent yet. Moving them needs a hosting
decision and a dual-dialect adapter; neither is invented here.

## Durable agent queue

`lib/tay/queue.ts` stores work that outlives one HTTP request.

```
queued ──claim──► leased ──complete──► completed
                     │
                     ├──fail (attempts < max)──► queued (backoff)
                     └──fail (attempts = max)──► failed
```

Rules enforced in code:

- **Authority is re-checked at enqueue.** `enqueueJob` calls
  `decideAuthority(agentId, "run_task")`; an agent without that action is
  refused before a row is written. A client cannot supply an approval or a role.
- **One lease holder.** `claimNextJob` is conditional on the job still being
  ready, then re-reads the row to confirm the lease owner. `completeJob` and
  `failJob` reject anyone who is not the lease holder.
- **Expired leases are reclaimable.** A worker that dies leaves `leased` plus an
  expired `lease_expires_at`; the next claim picks it up and increments
  `attempts`, so a crash loop cannot hide.
- **Bounded retries.** Failures requeue with linear backoff (30s × attempts, cap
  5 minutes) until `max_attempts`, then become `failed` with `last_error`.
- **Every transition is audited.** `agent_job_enqueued`, `agent_job_claimed`,
  `agent_job_completed`, `agent_job_retry_scheduled`, `agent_job_failed`,
  `agent_job_requested`.

### Job kinds

| Kind | Handler | Effect |
| --- | --- | --- |
| `engineering_checkpoint` | captures a project-sandbox checkpoint | Project files only |
| `engineering_verify` | runs one allowlisted check through the engineering session | Records output; cannot install, build, deploy or push |

Both handlers resolve the session inside the job's project, so a job for
another project cannot be steered by a payload.

### API

`GET /api/tay/projects/:id/queue` → jobs, per-status counts, schema version.

`POST /api/tay/projects/:id/queue`:

| Action | Body | Effect |
| --- | --- | --- |
| `enqueue` | `{ kind, sessionId, command?, label? }` | Queues a job after authority and session checks |
| `tick` | `{}` | Claims and runs at most one job in this request |

`tick` exists for operators and tests, not as a pretend background service. The
web process runs one job and returns; long work belongs to the worker.

### Worker

```bash
node scripts/tay-queue-worker.mjs --once
node scripts/tay-queue-worker.mjs --minutes=30 --project=prj_...
```

The worker is a foreground process with a lease owner label, JSON log lines and
a health snapshot on exit. Run it under a supervisor in production with the same
`TAY_DATA_DIR` (or future hosted database) as the app. It does not approve
anything: handlers that need a human decision create an approval and stop.

## Verification

```bash
npm run typecheck     # passed
npm run test:tay      # passed: 36 checks, 5 of them migrations/queue
npm run lint          # passed
npm run test:security # passed
npm run build         # passed
```

The queue checks cover: migrations recorded and safe to re-run, refusal of an
agent without `run_task`, single lease, rejection of a non-holder's completion,
audit entries, backoff blocking an immediate retry, permanent failure at
`max_attempts`, and a worker tick producing a real checkpoint.

The built app was also exercised over HTTP on a temporary data directory:

| Step | Result |
| --- | --- |
| Fresh database opened | `schema v3`, no pending migrations |
| Enqueue an `engineering_checkpoint` job | `queued`, stats `{queued:1}` |
| `action: tick` | `processed: 1`, job `completed`, stats `{completed:1}` |
| Engineering session after the tick | 1 checkpoint, label `Live queue` |
| `POST` with a foreign `Origin` | 403 "Cross-site request rejected." |
| `GET` without a session | 401 |
| Worker CLI `--once` on a fresh directory | clean exit, health snapshot |

## Devin-style capability mapping (original implementation)

These are Transcenlutions-native implementations of publicly documented
capability categories. No Devin source, API, branding, artwork, copy or
interface asset is used, and nothing here is a separate application: it lives in
the Tay workspace, uses `lib/tay/registry.ts` for authority,
`lib/tay/approvals.ts` for decisions and `lib/tay/audit.ts` for evidence.

| Capability | Where it lives now | State |
| --- | --- | --- |
| Long-running objectives | `agent_jobs` with leases and retries | Working |
| Repository inspection | `lib/tay/engineering.ts` read-only tools | Working |
| Planning and progress | Engineering session plan and worklog | Working |
| Terminal and test execution | Fixed verification allowlist | Working |
| Test execution through the queue | `engineering_verify` job | Working |
| Checkpoints and resumable sessions | Checkpoint + `checkpoint_restore` approval, queued checkpoints | Working |
| Approval gates | `lib/tay/approvals.ts` for every sandbox write | Working |
| Human takeover and steering | Pause/resume, per-tool operator control | Working, one session at a time |
| Isolated workspaces | None; runs in the server process against this checkout | Missing |
| Browser or preview verification | None | Missing |
| Branch, commit, pull-request handoff | Handoff pack artifact only; no git writes | Missing |
| Multi-session coordination | Sequential sessions per project | Missing |

## Remaining launch-critical work

1. **Durable hosted database.** Needs a chosen Postgres provider, a dual-dialect
   data layer and the workspace tables ported. Migrations are ready; the adapter
   and the host are not.
2. **Authenticated account and tenant boundaries.** Owner binding, scrypt
   passwords, HttpOnly sessions and per-project access exist. Still missing:
   email verification, password reset, session revocation UI and a tenant column
   that survives the move to Postgres.
3. **Versioned sync API.** No change log or device cursor exists yet. This is
   the prerequisite for desktop and Android offline work.
4. **Mac packaging and signing.** No signing identity, notarization profile or
   packaged build is configured in this repository.
5. **Android client.** No Android project exists. The Arcade APK is a different
   product and is not a base for Tay.
6. **Model routing.** `lib/tay/model.ts` speaks one OpenAI-compatible shape and
   reports honestly when nothing is configured. Per-capability routing, budgets
   and spend reporting are not implemented.


## Recovery review limits — October 23, 2026

See `docs/handoffs/tay-desktop-recovery-review-2026-10-23.md`. Repository verification is local-only; production owner bootstrap is disabled. SQLite is a single-server adapter, not a verified serverless or cross-device cloud store. No account migration, hosted authentication or production deployment is established by these local checks.
