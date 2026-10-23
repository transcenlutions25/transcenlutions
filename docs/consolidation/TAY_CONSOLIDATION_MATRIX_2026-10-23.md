# Tay consolidation matrix — 2026-10-23

Source of truth: `transcenlutions25/transcenlutions`. This is a recovery and
routing map, not a claim that the listed work is merged, deployed or verified.

## Snapshot

- Canonical repository: `transcenlutions25/transcenlutions` (public, default `main`).
- Other accessible repositories: 10 additional public repositories, all last
  updated 2025-07 to 2026-08, none an active Tay platform source. They are kept
  separate; none should be absorbed without an ownership/license review.
- `main`: `e094f43` — "Publish Tay Headquarters workspace". `main` contains the
  root Next.js app (Apex, arcade, creative intelligence, social publisher,
  founder/revenue panels) and a Pages workflow. It does **not** contain
  `app/workspace`, `lib/tay`, or the `/tay` static client.
- Open pull requests: 39. Of those, 10 are Dependabot updates.
- Remote branches: at least 80. Most are preserved drafts, canon documents or
  superseded candidates; branch count is not feature count.
- This review branch: `feat/tay-ui-canonical-20261023`, created from `main`
  `e094f43`. Worktree: `threads/work-tay-ui`.

## The end-state target

One platform, one canonical source, multiple businesses and governed agents:

```
transcenlutions25/transcenlutions
  /                 root Transcenlutions app + existing APIs (unchanged)
  /workspace        authenticated Tay command workspace (PR #80 direction)
  /tay              reviewed static cloud client (this patch; additive)
  /api/tay/**       shared server identity, authority, approvals, projects
  Android client    native consumer of the same shared API (PR #82)
```

`/tay` and `/workspace` must not remain two competing command centers. The
static client is an additive bridge for the already-published Supabase account
path; the durable command center belongs in the authenticated `/workspace`
once its server authority, storage and approvals are verified. The Android app,
the static web client and the consolidated workspace should consume one shared
runtime and one authority implementation, not copies.

## Repository inventory

| Repository | Role | Decision |
| --- | --- | --- |
| `transcenlutions` | Canonical platform | Keep as the only platform source |
| `crowne-legacy-rpg` | Separate game/RPG project (updated 2026-08) | Separate product; no automatic merge |
| `CleanComeUp-1171`, `Seamless-Solutions-`, `bidness-royals`, `bidness-family-legacy`, `bidness-app` | Earlier business/app experiments | Archive/reference only; ownership and value review required |
| `pulse-ai`, `pulse-ai-platform`, `pulse-ai-starter`, `pulse-app-demo` | Earlier AI content prototypes | Reference only; not part of the Tay runtime |

No private repositories were visible to the authenticated lookup, so private
master backups and the owner's local `~/Tay` runtime were not inspected or
modified here. The repository already preserves a copy of the Mac source under
`integrations/tay-desktop/legacy/`.

## PR triage

Status from GitHub at this snapshot. "Unstable" means at least one check is not
green, not that the code is proven broken.

| PR | Branch | Base | Files / diff | State | Decision |
| --- | --- | --- | --- | --- | --- |
| #87 | `feat/tay-netlify-preview` | `main` (old head) | 11 / +834 −51 | Draft, unstable | **Source of this patch.** Rebased as a new branch instead of rewriting the draft. Adds `/tay` and Next 15.5.28 |
| #80 | `feat/tay-consolidated-workspace` | `main` | 65 / +9254 | Draft, unstable | Keep as the command-workspace candidate. Reconcile before merge. Local uncommitted engineering/queue work is newer |
| #82 | `feat/tay-android-native` | `fix/tay-handoff-auth-storage` | 31 / +2148 −45 | Draft, unstable | Native Android + `web/tay`. Not verified against a deployed API; do not merge on build success alone |
| #89 | `feat/tay-quiet-completion-notices-20261023` | `main` | 8 / +288 | Draft, unstable | Quiet completion notices; additive. Review/merge after the /tay and workspace paths settle |
| #88 | `feature/hallway-tay-vendor-outreach-20261023` | `main` | 7 / +183 −52 | Open, clean | Hallway Cleaning + vendor campaign. It also carries the identical Next 15.5.28 lock fix. No-send rules must remain |
| #86 | `feature/tay-browser-operator-20261021` | `main` | 8 / +308 | Draft, unstable | Guarded TinyFish browser workbench; keep isolated until provider and approval behavior is verified |
| #83 | `codex/character-agent-identity-handoff` | `fix/tay-handoff-auth-storage` | 8 / +189 | Draft | Character identity handoff; preserve, do not stack blindly on #82 |
| #79 | `codex/tay-groq-online-adapter-draft` | `main` | 7 / +397 | Draft, clean | Groq/persistence candidates; no paid activation authorized |
| #66 | `codex/tay-header-companion-20261010` | #64 | 8 / +1025 | Draft | **Real animation source.** Only standing sway + accessible pause; not integrated |
| #65 | `codex/tay-intelligence-ux-integration-20261010` | #64 | 11 / +1174 | Draft | Supersedes the older #51 direction; needs rebase |
| #64 | `codex/mobile-chat-ux-20261010` | `main` | 22 / +3986 −169 | Draft, dirty | Conflicts; preserve its five Intelligence Lab hooks if rebased |
| #60 | `codex/agency-sales-snapshot-20261009` | `main` | 9 / +658 | Draft | Isolated sales snapshot; integrate into the Sales panel deliberately |
| #51 | `feature/tay-conversation-intelligence-20261007` | `main` | — | Open | Duplicate/superseded by #65; do not merge both |
| #84, #85 | Android Gradle Action bumps | — | — | Open | Tooling only; validate the Android build before merge |
| #28–#35 | Dependabot Actions/npm majors | — | — | Open | Not release-cleared. Major upgrades; do not batch-merge |
| #37, #48, #50, #57, #59, #63, #67–#74 | Various drafts | — | — | Draft/open | Preserve; not part of this patch |

## Consolidation matrix

| Domain | Recovered / existing code | Current status | Destination | Next action / blocker |
| --- | --- | --- | --- | --- |
| Root Transcenlutions app | `app/`, `components/`, `lib/`, Apex, arcade, creative intelligence, social publisher | On `main`, builds | Stays at `/` | Keep unchanged; no API replacement |
| Static Tay client | `public/tay/*` from #87 | This patch, locally verified | `/tay` via rewrite | Reviewed patch; not deployed |
| Tay command workspace | `app/workspace`, `components/tay/*`, `lib/tay/*` (#80) | Draft; local engineering/queue work uncommitted | `/workspace` | Reconcile PR #80 + local work; verify authority and persistence |
| Identity / authority | `lib/tay/accounts.ts`, `registry.ts`, `approvals.ts`, Postgres `pg` adapter | Code exists; hosted DB not connected/verified | Shared server service | Owner provisioning + database migration + fail-closed auth |
| Conversation / memory | Cloud `tay-api` messages and projects; browser-local drafts | Cloud account path exists; authenticated verification blocked (no credentials) | Shared conversation service | Verify sign-in, recovery, saved history with owner account |
| Approvals / proposal review | `lib/tay/approvals.ts`, `components/tay/tay-approval.tsx`, local proposal review in `/tay` | Local preview is explicitly inactive; server approval lifecycle exists in draft | Server-side approval service | Keep local review non-authorizing; verify exact revision + identity on server |
| Queue / Steer / agent runtime | Mac queue + `lib/tay/queue.ts` / engineering routes (local uncommitted) | Not in #80 head; not merged | Shared command runtime | Commit/review local work on a separate branch; no duplicate runtime |
| Notifications | `components/task-completion-notices.tsx`, `lib/task-completion-notices.ts` (#89) | Draft | Root workspace | Review; must remain dismissible, recoverable and non-fabricated |
| Android | `android/tay`, cloud session client (#82) | Builds; origin/API not verified | Native client of shared API | Deploy verification blocked; no production release |
| Mac runtime | `integrations/tay-desktop/` + preserved `legacy/` | Preserved; loopback-only bridge | Local Mac service | Keep private data separate; adapter remains opt-in |
| Hallway Cleaning | `app/hallway-cleaning` (#88) | Open, clean | Business module in root app | No-send, privacy and vendor-contact review |
| Apex Flow | Public offer/intake/checklist + sandbox checkout | Existing; production commerce locked | Existing root app | Owner authorization required before live payments |
| Social publisher | `lib/social-publisher`, API | Existing; external sending prohibited without authorization | Existing root app | Keep Stage-1 no-send |
| Sales snapshot | #60 component/model | Isolated, unintegrated | Sales panel | Deliberate integration + real-browser QA |
| Intelligence Lab | #65 / older #51 | Duplicate drafts | Workspace panel | Choose #65, rebase, do not merge both |
| Product builder / voice / sync / browser | #67, #70, #69, #63, #86 | Drafts | Future module boundaries | Consolidate only after shared identity/queue exist |
| Tay character animation | #66 React component + `/tay` DOM port | Only whole-cutout standing sway; no rig/blink/gesture/speech | Shared presentation component | Reuse; do not claim articulated animation |
| Cover artwork | No recovered "Crowne Legacy" cover | **UNRECOVERED** | Left-panel cover | `/tay` uses approved full body + exact "Transcenlutions" caption; do not invent |
| Admin invitations / admin agents | Founder rules + partial workspace scaffolding | Not implemented/verified | Left-panel Administration | Needs owner-controlled server enforcement + invitations |
| Financial ledger | Revenue UI + sandbox checkout | No shared ledger | Shared financial service | Not started; do not fabricate revenue |

## Duplicate and overlap resolutions

1. **#51 vs #65** — same Intelligence Lab direction. Keep #65, close #51 only
   after owner review; do not merge both.
2. **#64 vs #80** — both touch mobile chat/workspace. #80 is the broader
   command-workspace candidate; #64 owns compact mobile fixes and five
   Intelligence hooks. Reconcile in one branch, not two parallel merges.
3. **`/tay` vs `web/tay` vs `pages`** — three presentations of the same cloud
   account path. Choose one source for the browser client; Android may keep a
   native screen but must consume the same API.
4. **PR #87 vs this patch** — this patch is the rebased/portable version of #87
   on current `main`; it should replace #87's stale base, not compete with it.
5. **Next 15.5.28** — this patch and #88 carry the identical lock update.
   Whichever merges first, the other drops that hunk. No version conflict.

## Release blockers and security findings

- **Critical, fixed on this branch:** Next 15.5.27 had
  `GHSA-2464-fhr4-w9xw` (unauthenticated RCE in Image Optimization with SVG)
  and `GHSA-p3m5-59mp-jv5r` (App Router Server Actions DoS). This branch pins
  Next and `eslint-config-next` to 15.5.28. `npm audit` now reports 0 affected
  production and 0 affected development packages.
- **Pages workflow risk:** `.github/workflows/tay-web-pages.yml` on `main`
  checks out the feature branch `feat/tay-android-native` and deploys
  `web/tay`, not a build of `main`. Any change to that feature branch can
  therefore alter the public Pages site. Do not change or dispatch it without
  owner authorization; it should eventually point at a reviewed `main` build.
- **Cloud identity is unverified:** the Supabase function is live and rejects
  unauthenticated requests (`/functions/v1/tay-api/session` → 401). No owner
  credentials were used, so authenticated projects, history, memory, admin
  flows and cross-account isolation were not verified.
- **Netlify production is locked:** no preview was created. The prior attempt
  returned 503 for `/api/tay/session`; do not describe a cloud connection as
  working.
- **Android release:** signed artifacts exist from earlier work, but the
  requested cloud-connected release remains blocked on a deployed API and
  owner authorization.
- **Major dependency PRs** (#28–#35, #84, #85) are not security-cleared by this
  patch and should not be batch-merged.

## Preserved local work

The separate `feat/tay-consolidated-workspace` worktree has uncommitted,
preserved work not present in PR #80 head:

- `lib/tay/queue.ts`, `lib/tay/engineering.ts`, `lib/tay/migrations.ts`
- `app/api/tay/projects/[id]/queue/route.ts`
- `app/api/tay/projects/[id]/engineering/route.ts`
- `components/tay/tay-engineering.tsx`, related tests and docs

It was not overwritten, staged, reverted or committed by this patch. It must be
reviewed and branched separately before any workspace merge.

## Recommended sequence

1. Land this additive `/tay` + 15.5.28 security patch after review.
2. Reconcile #80 with the uncommitted queue/engineering work; verify the server
   authority and approval lifecycle.
3. Point the Pages workflow at a reviewed `main` build and retire duplicate
   browser clients.
4. Verify cloud sign-in/recovery/history with the owner account, then connect
   workspace persistence and memory to the shared authenticated store.
5. Integrate #89 notifications, #88 Hallway, #60 Sales, #65 Intelligence as
   small reviewable PRs.
6. Only then verify Android/cloud release and any live commerce.

## UNRECOVERED / CONFLICT

- Layered Tay rig, sprite atlas, Lottie/Rive/video, viseme map: **UNRECOVERED**.
- Original cover artwork containing "Crowne Legacy": **UNRECOVERED**.
- Exact private Mac runtime state, conversations and operational databases:
  not in this checkout by design.
- Hosted Postgres/Netlify deployment and authenticated cloud data: **not
  verified**.
- Admin invitation and admin-AI-agent flows: specified, **not implemented and
  verified**.
- Personal-environment economics (office/cabin/throne-room prices and earn
  rules): **UNRECOVERED**; do not invent.
