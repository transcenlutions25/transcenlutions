# Persistent browser sync adapter slice

Status: source-only adapter depending on PR63's unchanged sync contract/client. It is not imported by the current UI, exposes no application route, changes no identity resolver, and provisions no backend. This change supplies actual IndexedDB persistence, same-origin fetch transport and a usable session coordinator, rather than another in-memory production store. It does not supply sign-in, an APK, a model provider, native voice, or real cross-device connectivity.

## Behavior and integration

- Instantiate `IndexedDbSyncPersistence`, `SameOriginSyncTransport` and `PersistentSyncSession` in the browser integration. The persistent store contains content/receipts only, never tokens, role grants or device keys.
- After the actual provider finishes sign-in, call `connect()`. It accepts only the existing identity endpoint's `ok: true`, `authenticated: true`, `source: authenticated` result. Production and development identities remain fail-closed. It returns the correct account's local state without awaiting catch-up, and automatically starts one bounded sync pass on **every** verified sign-in.
- Display `getStatus()` as syncing, unsynced or last-confirmed synchronization. Failed sync does not disable local writing within that signed-in session. `enqueue()` waits for the local transaction to commit. Call `synchronize()` on the explicit retry/reconnect action; this slice adds no background timer or automatic sender. A later UI integration must subscribe/refresh status and wire connectivity events.
- `disconnect()` must run synchronously on logout/account switch. It aborts requests and invalidates their generation. The previous account's writing stays in its own partition. A shared-cookie change is also detected through fresh identity preflight, per-response binding and the server precondition below. Opening arbitrary account caches is not a sign-in mechanism.
- `lastConfirmedAt` is a local observation timestamp, not the server clock or conflict resolver. It resets on each sign-in; the durable event cursor does not. `synced` means the last completed pass, not a guarantee that another device has not subsequently changed anything.
- Read/validate/transform/write happen within one IndexedDB readwrite transaction over the latest account row. Resolve only after transaction completion. An aborted update, corrupt row or unsupported version is not replaced with an empty workspace. IndexedDB may be evicted or unavailable and is not encrypted by this code. Native secure storage/offline-unlock policy and UI recovery/export remain separate work.
- Current guardrails cap each ledger collection at 2,048 entries and the serialized record at 8 MiB. Capacity errors preserve the previous row; no automatic trimming of old receipts is permitted. Snapshot compaction/retention must be designed before production-scale use.

## Required real server adapter

This is the hosted browser transport. A future native Capacitor origin needs its own reviewed HTTPS/auth transport and secure token storage; this implementation does not silently permit cross-origin credential forwarding.

The fixed endpoint `/api/platform/sync` does **not yet exist**. POST sends a strict PR63 mutation. GET sends tenantId/userId/sequence as cursor hints. Both include `X-Tay-Sync-Session`, a precondition, not a credential. Server authorization must resolve the real cookie/session on every request, verify membership/device revocation and reject any session/account mismatch **before** mutation effects. Never trust the header, body account, selected agent or client role as authority.

Responses are private/no-store JSON: mutation responses contain only `ok`, the freshly verified `identity` and `receipt`; pull responses contain only `ok`, verified `identity` and `page`. Identity follows the existing PlatformIdentity shape. The server must implement PR63's transactional idempotency/version/event ordering. Account authorization, receipt lookup, event/state writes and sequence allocation belong in one database transaction. Client fetch settings do not replace server cache/CSRF/origin/body/rate controls. No service-worker cache may retain these authenticated API responses.

Mutation receipts do not advance the catch-up cursor. A missing acknowledged event, page gap, regressed cursor, conflict, malformed response or bounded-pass limit prevents a synced claim. Exact IDs and payloads survive ambiguous HTTP failures; no payment, approval or executable task is synchronized.

## Verification and limits

Run `node scripts/check-platform-sync-persistence.mjs --node-check` for real loopback HTTP transport tests and strict coordinator/cache tests. This uses existing TypeScript, Node HTTP/Fetch and synthetic identity/server state. It is not cookie-authentication or PostgreSQL testing.

For combined real-browser IndexedDB/HTTP acceptance, run `node scripts/check-platform-sync-persistence.mjs`, open its printed loopback URL in a browser on that same machine, and read the page or `/results`. The harness is bound to loopback, uses synthetic fixtures and must never be deployed as an application route. A separate `--storage-only` option generates a browser fixture for environments that permit opening local test HTML. The browser fixtures test independent database connections and connection reopen; they do not substitute for separate-tab, full-browser-restart, quota-exhaustion or physical-device tests.

At this handoff, the Node HTTP/coordinator suite passes 21 checks. Scoped strict TypeScript, full typecheck, lint, identity/workspace/security-regression suites, workflows, smoke checks and the production Next build pass on the final source. The initial telemetry-config failure was resolved by disabling telemetry and directing configuration to a writable temporary directory. No dependency install or permission escalation was used for that repair. Dependency-audit and secret-scanner download steps were not run in this slice. Browser suites are **not run**: shell networking is isolated from the cloud browser, launching another Chromium fails its Unix socket initialization, and the cloud browser explicitly disallows file URLs. No restriction was bypassed. Actual IndexedDB transaction/lifecycle testing therefore remains a gate, not an inferred pass.

Review fixes include strict account projection before persistence, duplicate-sequence cache rejection, missing-acknowledged-event detection, late-response and late-local-commit generation fences and rejecting a fresh pull that regresses the requested cursor.

The inspected Supabase organization has five inactive projects. Schema reads time out, and no canonical project binding identifies Tay. A dedicated project is the recommended next decision, but service creation/auth configuration/credentials have not been authorized or performed by this slice. The existing source PostgreSQL dependency is compatible with a later reviewed adapter; no unrelated business schema is repurposed.

## Primary technical references

- [IndexedDB transaction scheduling](https://www.w3.org/TR/IndexedDB-3/#transaction-scheduling)
- [Fetch standard: credentials, redirects and requests](https://fetch.spec.whatwg.org/)
- [Android offline-first data architecture](https://developer.android.com/topic/architecture/data-layer/offline-first)

Rollback: remove these unused adapter/test/document files. No deployment or user-data migration was made. Do not delete an eventual user's IndexedDB data as part of rollback without a recovery plan.
