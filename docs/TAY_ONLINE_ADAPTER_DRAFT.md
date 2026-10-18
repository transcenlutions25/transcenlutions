# Groq online adapter candidate

Server-only source: `lib/online-provider.cjs`. Run `node scripts/test-online-provider.cjs` with Node 24.15+.

No HTTP endpoint, UI default, auth setting, loopback exposure or provider connection is activated. This is the text inference component of the shared backend, not a working shared backend or voice service.

## Current production blockers

The canonical `lib/platform-identity.ts` resolver deliberately fails closed in production. It accepts only development identity headers outside production; those cannot authorize this adapter. `security/README.md` prohibits exposing the legacy desktop server. Preserve both restrictions.

Before a route may call onlineTurn, supply the canonical verified server session resolver, server-owned adult pilot eligibility, durable conversation service and org-wide atomic quota ledger. These are explicit dependencies; do not implement permissive placeholders.

## Dependency contracts

- resolveIdentity(request): existing authoritative server identity resolver returning {ok,identity}. Only identity.source authenticated is accepted. Verify revoked/expired sessions on each turn; never translate client headers or role labels to authenticated.
- isAdultPilot(identity): server-owned adult pilot eligibility, no client checkbox.
- conversations.beginTurn(identity,input): transactionally authorize user/tenant/conversation, compare expectedVersion, claim unique (tenant,conversation,requestId), append user text once and load history including this turn. Reject stale versions and active duplicate IDs. Completed duplicate IDs must return prior receipt without model invocation through the eventual route.
- completeTurn(turn,text,metadata): persist full reply, version and completion atomically with turn lease/ownership checks.
- failTurn(turn,{status:incomplete}): preserve user message and newer committed work. Incomplete work is not completed; reconnect requires reconciliation by request ID before resubmission.
- budget.reserve(reservation): atomic distributed ledger shared by every instance/key/model in the Groq organization. Conservative reservations are not automatically refunded after provider failures. Account limits may tighten these limits.
- wait(ms,signal): abort-aware bounded delay. fetch: server fetch implementation.

No durable-store implementation is invented here. These contracts must reuse shared platform services, not create independent Mac/web/Android histories.

## Cost and privacy boundaries

Default model is openai/gpt-oss-20b; only the explicitly selected 120b alternative is allowed. No fallback provider or arbitrary URL is supported. Keep GROQ_API_KEY server-only. Default enabled state is off. TAY_GROQ_FREE_ONLY_VERIFIED is an operator attestation, not an API proof of billing status; activation requires verified free-only org and no paid upgrade. Do not enable from this code flag alone.

At most 20 requests/minute, 500/day, 7500 reserved tokens/minute and 150000/day. Each attempt reserves 7200 tokens including conservative input/framing and 512 output allowance; thus max-size pilot turns effectively one/minute. Not a public-scale capacity claim. Replace with verified tokenizer accounting before relaxing reservations. 429 retry occurs at most once and reserves again; only numeric Retry-After <=2 seconds. No network/partial-response auto retry.

Verify zero-data-retention setting and provider terms before transmitting user text. Family/minor use is not cleared. No secrets or real conversations were used in tests.

## HTTP and release wiring still required

Use existing bounded request reader/origin and edge controls, appropriate session/CSRF/CORS protections and the verified owner binding. Render deltas as text. Never report complete before durable commit. Client status uses online/provider/model explicitly; quota exhausted is visible and cannot silently use paid or local fallback.

Mac, web and Android must point to the same authenticated service and conversation IDs. Migrating existing local histories needs a separate ownership-aware migration. Hosting availability/persistence are separate from free inference. STT/TTS and real voice conversation are separate adapters/tests.

## Validation

17 focused synthetic assertions passed under Node 24.19.0, no network/provider calls: disabled gate, model/config, forged privileged role, input bound, dev-auth rejection, no inference before auth, streaming completion, budget denial, truncated output, incomplete-turn recording and bounded 429 retry. Node code was executed in memory because executor filesystem is read-only.

Required full checks after checkout: npm run security; npm run typecheck; npm run test:identity; npm run test:workspace; npm run test:workflows; npm run build; node scripts/test-online-provider.cjs. These aggregate checks have not been run in this executor. Existing CI results must be checked for final commit. No deployment or live latency test is implied.

Baseline b90ead3170a4f10ea873d1a2d4ed06ca201d89e1; rollback removes these three additive files. No production route or behavior changed.

Official references: https://console.groq.com/docs/openai ; https://console.groq.com/docs/rate-limits ; https://console.groq.com/docs/your-data .
