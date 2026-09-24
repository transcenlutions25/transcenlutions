# TRANSCENLUTIONS LLC — RELIABILITY FOUNDATION V1

Status: CANON IMPLEMENTATION STANDARD
Date: 2026-09-24
Parent: Platform Architecture V1

Reliability is a platform feature. Tay Command must fail safely, recover predictably, preserve user work, expose truthful status, and remain portable across deployment providers.

## Reliability principles

1. GitHub main is releasable. Changes reach main only through a reviewed/tested branch path except an explicitly documented emergency procedure.
2. Fail closed for consequential actions. A timeout, missing identity, unavailable policy service, invalid approval, or ambiguous authority never becomes permission.
3. Preserve work. Queued objectives and accepted work survive process/browser restarts where persistence is supported. Recovery must not duplicate execution.
4. Idempotency by default. Retries of external or consequential operations require stable operation/idempotency keys and must not silently duplicate payments, messages, jobs, or commitments.
5. Timeouts and bounded retries. External dependencies receive explicit timeouts. Retries are bounded and use backoff; permanent/validation failures do not retry endlessly.
6. Dependency isolation. A provider outage should degrade the affected capability instead of taking down unrelated Tay modules.
7. Truthful state. UI/runtime distinguish queued, active, waiting approval, paused, retrying, failed, cancelled, and completed states. Never report success before verification.
8. Auditability. Consequential decisions/actions carry correlation IDs, actor/agent identity, authority decision, approval evidence when applicable, result, and timestamps.
9. Secrets stay out of persisted queue payloads, logs, client bundles, and repository content.
10. Backward-compatible contracts. Shared-core API/schema changes are additive when practical. Breaking changes require versioning or coordinated migration.
11. Accessibility is reliability. Critical status/actions must work without color, animation, pointer precision, or vision-dependent cues.
12. Learning Mode uses the same reliable platform contracts; it cannot create a second execution path.

## Release gates

Every pull request must pass:
- dependency install
- TypeScript/type checks
- lint/public-copy checks
- smoke/regression tests
- production build
- desktop runtime tests when affected
- syntax validation for queue/runtime assets

Core/platform changes additionally require targeted tests for authority, approvals, persistence/recovery, migration compatibility, and failure behavior before production promotion.

A green test suite is necessary but not sufficient for production. Deployment configuration, migrations, secrets, external integrations, and rollback readiness must also be verified for releases that touch them.

## Environment progression

local/development -> preview/staging -> production

Configuration is environment-scoped. Production secrets and live payment credentials never enter preview/local defaults.

A deployment provider is replaceable infrastructure. Provider-specific adapters/configuration stay at the edge and may not leak into platform domain contracts.

## Data and migration rules

Before introducing or changing durable platform schemas:
- identify owner/service and data classification;
- define forward migration;
- define rollback or forward-fix strategy;
- make migrations repeatable/idempotent where possible;
- back up valuable production data before destructive migration;
- never silently destroy unknown/legacy data;
- validate tenant and authorization boundaries server-side.

## Observability

Platform services should emit structured events sufficient to answer:
- what was requested?
- which user/tenant/agent acted?
- what correlation/objective ID connects the work?
- what authority/approval decision applied?
- what dependency/provider was used?
- what state/result occurred?
- how long did it take?
- did it retry/fail/recover?

Do not log credentials, private tokens, raw payment data, or unnecessary sensitive content.

## Recovery and rollback

For each production release, prefer reversible deployment and forward-compatible data changes. If a release harms core functionality, restore the last known-good application version while preserving user data, then diagnose through logs/audit events.

Queue recovery must prevent abandoned active work from being treated as completed and must require safe reclaim/resume semantics.

## Reliability definition of done

A capability is not reliable merely because it works once. It is ready when its normal path, denied path, dependency-failure path, retry/recovery path, and relevant restart/persistence path are tested or otherwise verified at the appropriate layer.
