# Tay Mac → ONE TAY migration

**Target:** Tay Mac and Tay dot/hosted operate as two surfaces of ONE TAY.

This file is an implementation directive, not a claim that cross-device synchronization is already complete.

## Preserve

Do not replace the existing Mac app blindly. Preserve:

- existing Tay visual identity and interaction model;
- local queue and recovery data;
- local tools and device capabilities;
- existing legacy workflows until replacements pass acceptance;
- all private credentials and device-only state locally.

## Existing bridge foundation

The repository already supports the shared Next interface on Mac through the shared launcher while keeping the original local service available. Use that shared launcher as the migration path rather than creating a third Tay surface.

## Required change

Move authoritative user/work state from separate browser/local silos into the shared authenticated runtime defined by:

- `docs/canon/ONE_TAY_SELF_BUILD_FOUNDRY_CANON_2026-10-08.md`
- `config/one-tay-runtime.json`

Tay Mac must become a local privileged client/worker for the same shared state used by Tay dot.

## Sync scope

Synchronize supported:

- conversations;
- memory references;
- objectives;
- command queue state;
- steering;
- approvals;
- agent assignments;
- Operating Graph events;
- business/app registry;
- revenue state;
- Cost Displacement Ledger;
- approved workspace assets;
- deployment/release state.

Keep local-only:

- API keys and provider secrets;
- browser profiles;
- direct local filesystem authorization;
- local model process state;
- hardware state;
- protected offline cache.

## Mac capability adapter

Expose authorized Mac-only tools to ONE TAY through a narrow local capability adapter. The shared runtime may request a local action, but the adapter must enforce:

- authenticated device identity;
- user/session authority;
- action scope;
- approval requirements;
- idempotency;
- audit event creation;
- explicit offline/unavailable response;
- no secret leakage to browser/client state.

The local adapter is a tool endpoint, not a second orchestration brain.

## Offline behavior

When disconnected, Mac may continue supported local work against its protected local cache/queue. Each local mutation must retain stable IDs, revisions, timestamps, and provenance so reconnect can reconcile safely.

On reconnect:

- never overwrite newer shared state silently;
- deduplicate by stable operation/event IDs;
- detect conflicting edits;
- merge non-conflicting queue/events automatically where safe;
- surface true conflicts for Tay/owner resolution;
- record reconciliation in the Operating Graph.

## Migration stages

1. Shared authenticated runtime/API available from hosted Transcenlutions.
2. Mac shared launcher authenticates to the same owner identity.
3. Read-only shared conversations/business/ledger state appears on Mac.
4. Mac queue writes use shared stable objective IDs.
5. Steering/approval/completion state becomes bidirectional.
6. Operating Graph events unify.
7. Workspace assets/revenue/cost state unify.
8. Offline reconciliation passes conflict/idempotency tests.
9. Local capability adapter can receive governed ONE TAY jobs.
10. Legacy duplicated state paths retire only after backup, export, parity, and recovery verification.

## Acceptance test

The migration is not complete until a test objective can be created on Tay dot, appear on Tay Mac, be safely executed with an authorized Mac-only capability, and return the same objective/result/audit history to Tay dot without duplicate objectives, lost steering, or silent conflict.

A second acceptance path must start on Mac and finish on hosted Tay with the same identity and history.

## Recovery rule

Keep the legacy Mac service and local database intact during migration. Never delete local state as a synchronization fix. Roll back code separately from user/runtime data.
