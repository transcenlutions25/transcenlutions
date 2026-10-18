# Groq online adapter candidate

Server-only source: `lib/online-provider.cjs`. Run `node scripts/test-online-provider.cjs` with Node 24.15+.

No HTTP endpoint, UI default, auth setting, loopback exposure or provider connection is activated. This is the text inference component of the shared backend, not a working shared backend or voice service.

## Current production blockers

The canonical `lib/platform-identity.ts` resolver deliberately fails closed in production. It accepts only development identity headers outside production; those cannot authorize this adapter. `security/README.md` prohibits exposing the legacy desktop server. Preserve both restrictions.

Before a route may call onlineTurn, supply the canonical verified server session resolver, server-owned adult pilot eligibility, durable conversation service activation and org-wide atomic quota ledger. These are explicit dependencies; do not implement permissive placeholders.

## Dependency contracts

- resolveIdentity(request): existing authoritative server identity resolver returning {ok,identity}. Only identity.source authenticated is accepted. Verify revoked/expired sessions on each turn; never translate client headers or role labels to authenticated.
- isAdultPilot(identity): server-owned adult pilot eligibility, no client checkbox.
- conversations.beginTurn(identity,input): transactionally authorize user/tenant/conversation, compare expectedVersion, claim unique (tenant,conversation,requestId), append user text once and load history including this turn. Reject stale versions and active duplicate IDs. Completed duplicate IDs must return prior receipt without model invocation through the eventual route.
- completeTurn(turn,text,metadata): persist full reply, version and completion atomically with turn lease/ownership checks.
- failTurn(turn,{status:incomplete}): preserve user message and newer committed work. Incomplete work is not completed; reconnect requires reconciliation by request ID before resubmission.
- budget.reserve(reservation): atomic distributed ledger shared by every instance/key/model in the Groq organization. Conservative reservations are not automatically refunded after provider failures. Account limits may tighten these limits.
- wait(ms,signal): abort-aware bounded delay. fetch: server fetch implementation.

A PostgreSQL conversation candidate now exists in lib/shared-conversations.cjs with draft schema docs/shared-conversations-schema.sql. It accepts an injected pool to reuse the existing verified-TLS connection infrastructure in lib/operating-graph-db.ts; no second database is provisioned. It has not been wired or migrated. The existing getPool function is private and needs a reviewed shared export at wiring time rather than duplicating its TLS/configuration logic. The schema uses server identity scope columns; it does not replace or create authoritative account records.

## Cost and privacy boundaries

Default model is openai/gpt-oss-20b; only the explicitly selected 120b alternative is allowed. No fallback provider or arbitrary URL is supported. Keep GROQ_API_KEY server-only. Default enabled state is off. TAY_GROQ_FREE_ONLY_VERIFIED is an operator attestation, not an API proof of billing status; activation requires verified free-only org and no paid upgrade. Do not enable from this code flag alone.

At most 20 requests/minute, 500/day, 7500 reserved tokens/minute and 150000/day. Each attempt reserves 7200 tokens including conservative input/framing and 512 output allowance; thus max-size pilot turns effectively one/minute. Not a public-scale capacity claim. Replace with verified tokenizer accounting before relaxing reservations. 429 retry occurs at most once and reserves again; only numeric Retry-After <=2 seconds. No network/partial-response auto retry.

Verify zero-data-retention setting and provider terms before transmitting user text. Family/minor use is not cleared. No secrets or real conversations were used in tests.

## HTTP and release wiring still required

Use existing bounded request reader/origin and edge controls, appropriate session/CSRF/CORS protections and the verified owner binding. Render deltas as text. Never report complete before durable commit. Client status uses online/provider/model explicitly; quota exhausted is visible and cannot silently use paid or local fallback.

Mac, web and Android must point to the same authenticated service and conversation IDs. Migrating existing local histories needs a separate ownership-aware migration. Hosting availability/persistence are separate from free inference. STT/TTS and real voice conversation are separate adapters/tests.

## Validation

19 focused provider synthetic assertions passed under Node 24.19.0, no network/provider calls: disabled gate, model/config, forged privileged role, input bound, dev-auth rejection, no inference before auth, streaming completion, budget denial, truncated output, incomplete-turn recording and bounded 429 retry. Node code was executed in memory because executor filesystem is read-only.

Required full checks after checkout: npm run security; npm run typecheck; npm run test:identity; npm run test:workspace; npm run test:workflows; npm run build; node scripts/test-online-provider.cjs. These aggregate checks have not been run in this executor. Existing CI results must be checked for final commit. No deployment or live latency test is implied.

Baseline b90ead3170a4f10ea873d1a2d4ed06ca201d89e1; rollback removes these three additive files. No production route or behavior changed.

Official references: https://console.groq.com/docs/openai ; https://console.groq.com/docs/rate-limits ; https://console.groq.com/docs/your-data .

## Shared history candidate and limits

The additive shared store persists conversations, turns and ordered user/assistant messages in PostgreSQL. Every operation scopes queries to verified tenant and user; conversation IDs alone are insufficient. A conversation row lock serializes turn changes; version comparison rejects conflicting device submissions. Request IDs and payload hashes prevent duplicate user messages and inference. Server-generated leases expire after 60 seconds; only the matching active lease/version may complete. Partial or cancelled turns preserve user text and incomplete status. A completed retry returns its stored receipt without calling the provider.

read(identity,id,afterVersion) returns up to 100 ordered messages and the server version for reconnect/pagination. All clients must use these APIs against one service. No automatic import of private Mac SQLite or browser storage occurs.

26 shared-history synthetic assertions passed: auth/dev denial, owner-filtered SQL, inaccessible conversations, transaction rollback, bounded context, idempotency conflicts, completed replay, version conflict, append flow, expired/lost lease rejection and failure preservation. These use a scripted pg client. Real PostgreSQL schema execution, locking under concurrent processes, restart durability and database grants remain untested. No database was available in this read-only environment. Do not equate scripted tests with real persistence verification.

Required real database acceptance: apply reviewed schema to isolated existing test database; create A/B owners and conversations; verify B cannot read/append A; concurrently send same and different request IDs from two processes; verify one accepted turn and conflict/replay outcomes; terminate generator after user append; reconnect and observe incomplete; restart server and read identical committed history; try stale completion after lease expiry; verify no duplicate assistant reply. Run before declaring shared history live.

Run node scripts/test-shared-conversations.cjs in addition to the adapter harness and repository gates. Existing Launch gate now invokes both focused harnesses.

## Existing resume work must be reused

The governed queue, paused recovery and resume controls already exist in integrations/tay-desktop/tay_runtime and the canonical desktop runtime hook. Do not create another Resume My Work module or duplicate queue. A subsequent bounded acceptance scenario should connect the existing resume control to the same saved task and last verified step, verify it after restart, and exercise an isolated authorized reversible change with tests and rollback. This PR adds no self-modification or autonomous execution and does not mark that scenario delivered.
