# Cross-device continuity: phase 1 contract

Status: disconnected reference implementation and synthetic tests. No login, database migration, server route, SDK installation, credential, device enrollment, UI integration, deployment or APK is supplied by this change. Passing these tests is not evidence that devices are connected.

## Outcome and source boundary

The target is the same authenticated user's Tay conversations, agent selection, writing, artifacts and task status across phone, tablet and computer. Shared data is authoritative on a common backend; each device retains local drafts and an offline outbox. Switching hardware does not create a new persona or grant new authority. Network interruption, suspended mobile apps and a sleeping Mac remain observable states.

This additive change starts from canonical commit `4fec8cd82e39ab257ac93548bf276396c036a569`. It imports the existing `AgentId` registry, adds no parallel application, and changes no existing UX, payment, desktop-runtime or identity file. Existing `resolvePlatformIdentity` remains production fail-closed. The reference supports user-authored messages, agent selection, draft versions, non-executable task drafts and conversation archive tombstones. Model replies, artifacts, server task-status projections, actual execution and conflict-resolution UI are later adapter work.

Sources to preserve:
- [Platform architecture](canon/PLATFORM_ARCHITECTURE_V1_2026-09-24.md): shared identity/runtime/queue, provider-neutral boundaries, additive contracts.
- [Founder authority rules](canon/FOUNDER_PRODUCT_AND_AUTHORITY_RULES_2026-10-05.md): immutable server-verified founding owner; account admins are not system owners.
- [Reliability foundation](canon/RELIABILITY_FOUNDATION_V1_2026-09-24.md): preserve work, stable idempotency keys, fail-closed approvals, honest recovery.
- `lib/workspace-state.ts` and `components/chat-shell.tsx`: browser-local workspace snapshots, currently not cross-device persistence.
- `lib/platform-identity.ts`: production authentication is deliberately unconfigured.
- `docs/operating-graph-schema.sql`: PostgreSQL evidence/authority vocabulary, not an authenticated conversation store. Its sample schema does not enable RLS; never expose it directly as a Supabase API.
- `integrations/tay-desktop/tay_runtime/queue_store.py`: local transactional claims, request IDs, attempts/revisions, pause-on-restart. Its uniqueness key does not itself compare changed duplicate payloads; a remote adapter must do that before forwarding.
- [Preserved Mac checkpoint](checkpoints/TAY_LOCAL_STATE_CHECKPOINT_2026-10-01.md): unpushed mobile/PWA/Supabase work exists separately. Recover and reconcile it before choosing Android scaffolding. Do not overwrite it or assume it is current.

## Files and repeatable verification

- `lib/platform-sync-contract.ts`: versioned mutation allowlist; fresh server-authority port; immutable reference transitions; conflict branches; idempotent receipts; account-bound paginated pulls.
- `lib/platform-sync-client.ts`: account-partitioned outbox; exact-payload receipt correlation; acknowledged-ID ledger; gap-safe event reconciliation; account-switch isolation.
- `scripts/check-platform-sync.mjs`: synthetic fixtures only. Run `node --test scripts/check-platform-sync.mjs` after the repository dependencies are present. No new dependency is required.
- Strict scoped type check: `./node_modules/.bin/tsc --noEmit --strict --target ES2022 --module commonjs --moduleResolution node --skipLibCheck lib/platform-sync-contract.ts lib/platform-sync-client.ts`.

The test simulates four clients representing phone, tablet, computer and a reopened phone. It proves contract transitions and convergence, not device persistence, real auth, database isolation, browser rendering or native permissions. The suite is intentionally standalone in this new-file-only change; wire it into the existing CI job in the subsequent reviewed integration change.

## Wire and authority contract

1. Every mutation carries protocol version, account hint, globally random stable mutation ID, conversation ID, expected entity version and one allowed operation. IDs are bounded; unknown fields and operation kinds fail closed. The account hint binds saved offline work to its original account; it never establishes authority. Canonicalized payload equality is computed by the server, not accepted from a client hash.
2. The server authority adapter verifies the access token signature, issuer, audience and expiry, resolves immutable user ID plus account membership, and checks current device/session revocation on every write and pull, including retries and empty pulls. It produces `VerifiedSyncContext` only inside the server trust boundary. A TypeScript interface or a field named `verified` is not authentication. User-editable profile metadata, browser headers, first signup and `role: owner` cannot mint account or founding-owner authority.
3. Current scope is one user's private workspace in a tenant. Every ID, record, cursor, receipt, conflict and cache is bound to both tenant and user. Shared team conversations require an explicit resource-membership model before activation; being in the same tenant is insufficient.
4. Mutations can create/archive a conversation, select an existing agent, append a user message, replace a versioned draft, or save a task draft. They cannot write agent/system messages, mark tasks complete, submit tool calls, grant roles, enroll devices, record approval or perform payments. A task draft always remains `draft`.
5. Current role/permission checks are repeated when any later task is dispatched or completed. Displaying a selected agent does not authorize that agent. The desktop queue currently permits Tay, Dawn and KJ; the wider registry includes Rory. Do not silently make Rory executable or claim child-safe isolation from registry membership.

## Durability, conflicts and retries

- Mutation IDs are retained across retry, process restart and device handoff. Exactly the same canonical request returns the original receipt; a different body under the same ID is rejected. Clients correlate receipts with the original full mutation, not just its ID, and remember accepted IDs after removing them from the outbox. Mismatches leave the local draft intact.
- Draft and task-draft changes compare their own expected version. Stale edits become durable conflict branches with the full proposed text; no last-write-wins or client-clock arbitration is used. Resolution creates a new mutation against the current version and preserves prior branches as history. The integration must show/recover the conflicting local work rather than silently clearing it.
- Messages are append-only and user-attributed. An ID collision preserves the competing text as a conflict. Agent selection/archive compare conversation metadata version. Archive is a tombstone: old offline work cannot resurrect the conversation. Keep a rejected archived draft locally for explicit recovery into another conversation.
- In the real database, authority/revocation checks, exact request/receipt lookup, version comparison, mutation/conflict write, event append and receipt insert must commit atomically. For the first account-sized implementation, lock an account sequence row in the same transaction, then allocate the next commit-visible sequence. A global sequence allocated before commit can produce a later-committing event that an advanced cursor misses.
- An account-bound pull cursor represents the last contiguous durable event delivered/applied. Out-of-order pages buffer gaps; duplicate pages are harmless. Receipts do not advance that cursor. Realtime is an invalidation hint, followed by durable catch-up; it is not the only source of truth.
- The reference keeps all events/receipts in memory. Do not use it as a production store. Define bounded batching, retention, encrypted local storage, quota/error recovery and snapshot compaction in the adapter. If a cursor is too old, return explicit `resync_required` with a consistent authorized snapshot; preserve unsent/conflicting local work before resetting. Do not silently trim the idempotency ledger while old device outboxes remain eligible to retry.
- Persist outbox insertion before displaying an offline save as durable. Persist each page/application and cursor atomically. Retry only transient failures with bounded exponential backoff and jitter; stop on authentication, scope, validation or conflict failures. Resetting/switching account must not rebind or transmit its old outbox. The caller must retain or explicitly discard prior-account work in a separate protected partition.

## Task and model integration after phase 1

Publish server-owned task state as read-only projections: waiting for connection, queued, running, awaiting approval, paused, failed, cancelled and completed, with stable task/attempt IDs and evidence. Never infer completion from a model sentence. Separate safe content sync from the command/approval API. An offline task draft or replayed chat transcript is never an execution instruction.

The shared coordinator owns the dispatch ledger and one active claim/lease per task. Workers use fencing/attempt IDs so a stale Mac cannot publish a second completion after a newer claim. Stable operation IDs and payload digests must flow through the existing queue/provider gateway. Never replay payment, tool-action or approval records as effects. Revalidate the current authenticated actor, scope, approval target/digest/expiry and policy at dispatch; consume consequential approval atomically. Ambiguous external outcomes require reconciliation, not blind retries. This prevents duplicates within the tested contract; it must not be marketed as universal exactly-once external delivery.

Keep the current local-first model path: an explicitly enrolled Mac worker may make outbound authenticated connections to the shared coordinator and use its local Ollama endpoint. Never expose the legacy server or Ollama port publicly and never weaken the existing loopback guard. A sleeping/offline Mac yields `waiting for computer`; it is not an always-on cloud model. The existing free-online mode still needs its authorized provider credentials and has provider limits. No paid fallback, new credential or background access is authorized by this code change. Preserve agent identity/context and disclose the actual provider/model in server-produced replies.

## Sessions, device keys and voice

Each device signs in separately. Never synchronize refresh tokens, private keys or provider credentials in workspace data. Native token/cache protection should use app-private storage backed by Android Keystore; register only the public half of a separately authorized device key if proof of possession is adopted. A device ID is an identifier, not a credential. Key registration/rotation and persistent worker enrollment are separate security-sensitive operations. Browser storage does not inherit native hardware guarantees.

Revoking a device blocks its future API calls and worker claims immediately according to the server registry, even if its JWT has not expired. Supabase token signature verification alone does not guarantee immediate logout: check the session/device record for strict revocation. Local cached content cannot be remotely erased while a device is offline; state that limit, protect the cache, and clear it locally on verified sign-out/revocation when possible.

Voice handoff initially means committed transcript and conversation/agent context, with a visible resume control. Stop/finish capture on the previous device, synchronize acknowledged transcript segments, then request microphone access on the next. Use transcript segment IDs and a server-fenced capture session if live handoff is added. Do not sync microphone permission, raw audio or an active speech-recognition object. Interrupted uncommitted audio may require repeating the last phrase. Background capture, Android WebView speech support, interruptions, speaker changes and real microphone playback require physical-device QA; this contract makes no uninterrupted live-call promise.

## Actual backend and deployment prerequisites

Read-only inspection on October 10, 2026 found the connected `transcenlutions` Supabase organization on the Free plan with five projects, all `INACTIVE`. No project could be identified from canonical main as the Tay backend. Do not repurpose an unrelated project, restore one, provision another, expose tables, configure auth grants or upload credentials without the required project selection and authorization. No live application schema or auth configuration was read from an inactive project; those remain unverified.

Before the real adapter:
1. Reconcile the Mac's preserved mobile/Supabase work; establish which project owns Tay, its existing data, region and restore status. Inspect schema, grants/RLS, migrations, auth settings and redirects read-only before making changes.
2. Use existing provider identity and explicit account membership; bind the founding owner to a verified immutable identity. Implement the supported SSR/mobile sign-in flow with exact redirect allowlists and per-device sessions. Keep cookies/session responses private and uncached. No client-visible service-role key.
3. Design additive app-schema tables for memberships/device registry, conversations/messages/draft revisions, task projections, conflicts, operation receipts and commit-ordered events. Add least-privilege grants, RLS with ownership/resource predicates, composite account-scoped constraints, an atomic append transaction, and revocation checks. Preserve the existing evidence graph rather than making it a second command database. Do not modify Supabase's internal auth/realtime schemas.
4. Review migration/backfill/rollback and local-state import explicitly. Existing browser data is not authenticated; show an account-bound import preview, deduplicate it, preserve a backup and never infer owner authority from imported records. Device-specific local paths remain local.
5. Add authenticated route adapters behind existing body/origin/rate protections, then browser/native persistence adapters and UX. Private API responses must not enter public CDN/service-worker caches. Use established secure credential handoffs when configuring the deployment.
6. Test real PostgreSQL transaction races and RLS with at least two users/two tenants; authenticated browser sessions on separate clients; reload/restart/offline/reconnect; logout/device revocation; and actual phone/tablet/computer return handoff. Verify committed deployment SHA and flags. The deployed build at assessment was `9f0af4a416d3aa1ac6365923df465aea54b65a87`, with production identity still returning 401.
7. Recover/reconcile the Android project, install the authorized build toolchain, implement secure storage/login/deep-link/lifecycle integration, and test a debug-signed APK on emulator and physical Android. Release signing and Store publication have their own final checks. A web wrapper cannot fill any of the authentication, model or sync gaps above.

Free hosting is suitable for a bounded prototype but not a promise of continuous availability: Supabase documents inactivity pausing on Free. No paid upgrade is implied. The core supports saving local drafts and truthful waiting states through backend/network outages.

## Current primary documentation

- [Supabase verified server claims and uncached sessions](https://supabase.com/docs/guides/auth/server-side/creating-a-client?queryGroups=framework&framework=nextjs): verify claims; do not trust a cookie's unvalidated session object.
- [Supabase session lifecycle/revocation](https://supabase.com/docs/guides/auth/sessions): separate per-device sessions; sensitive immediate-revocation checks need active-session validation.
- [Supabase row-level security](https://supabase.com/docs/guides/database/postgres/row-level-security): explicit row authorization and safe policy design; never use user-editable metadata for authorization.
- [Data API exposure change](https://supabase.com/changelog/45329-breaking-change-tables-not-exposed-to-data-and-graphql-api-automatically): new tables are not necessarily exposed; explicit grants and RLS must be reviewed together.
- [Realtime internal-schema restriction](https://supabase.com/changelog/realtime-schema-locked-down-against-modification): keep custom objects in the application's schema.
- [Supabase production checklist](https://supabase.com/docs/guides/deployment/going-into-prod): Free inactivity pause and backup/availability limits.
- [Android Keystore](https://developer.android.com/privacy-and-security/keystore): app-bound, non-exportable keys; hardware backing depends on the device.
- [Android build artifacts](https://developer.android.com/build/building-cmdline): debug APKs are signed; unsigned APKs and AABs are not directly installable equivalents.

## Release boundary

This draft is held from Netlify with `[skip netlify]` in the commit and draft PR title. There is no deployment approval in this milestone. Existing launch/security suites still apply, but a deliberately absent preview cannot pass deployed-preview verification. Do not remove protections to manufacture a green result. Keep the new synthetic suite visible in review and add CI wiring before integrating the real adapter. Rollback of this isolated contract is removal of these unused new files; no migration or user data rollback is involved.
