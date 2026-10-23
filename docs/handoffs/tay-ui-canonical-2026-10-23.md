# Tay `/tay` consolidation handoff — 2026-10-23

## Exact location

| Item | Value |
| --- | --- |
| Repository | `https://github.com/transcenlutions25/transcenlutions` |
| Remote | `origin` → `https://github.com/transcenlutions25/transcenlutions.git` |
| Working directory | `/Users/transcenlutionsllc/.config/freebuff-desktop/local-projects/653e0ea0-2a47-41e5-bf5e-d461a9588f9e/threads/work-tay-ui` |
| Branch | `feat/tay-ui-canonical-20261023` |
| Base | `main` at `e094f43` |
| Code commit | `e6571893a38c57eb2fa67355b606ef34768a2bb0` |
| GitHub PR | opened as a **draft**; see the branch's PR link after push |

The branch is a dedicated worktree. It does not replace `main`, the root app,
its APIs, or production.

## What changed

- Added the reviewed `/tay` static cloud client under `public/tay/` and a
  `next.config.mjs` rewrite from `/tay` to `/tay/index.html`. The root `/` app
  and all `/api/**` routes are untouched.
- Enlarged the full-body Tay beside the Tay label from 32×48 to 72×108 CSS px
  (48×72 on phones), using the approved transparent 1024×1536 asset with
  `object-fit: contain`. The complete figure is preserved.
- Changed the left-panel cover to a centered `object-fit: cover` portrait crop
  (`object-position: 50% 6%`; `50% 0%` on phones) captioned exactly
  **Transcenlutions**. The transparent full-body asset is the cover source.
- Reused the reviewed `TayHeaderPresence` motion implementation from PR #66:
  the 50-second whole-cutout standing sway, with its state machine, visibility
  gating, reduced-motion handling and pause/resume. Added the same versioned
  device-local preference (`tay.header.motion.v1`) so Pause survives reload.
  There is still no rig, blink, gesture, speaking or listening animation.
- Kept the optional character docker hidden by default. Its `wave` and `sit`
  commands continue to report that approved layered artwork is required.
- Added `public/tay/assets/manifest.json` with the asset SHA-256, dimensions,
  the only implemented motion, and the explicit missing-animation list.
- Added `scripts/test-tay-presentation.mjs` and `npm run test:tay-ui`; wired it
  into the Launch gate.
- Pinned Next.js and `eslint-config-next` to 15.5.28. This removes the critical
  Image Optimization RCE and Server Actions DoS advisories.
- Made `scripts/security-secrets.sh` runnable on the owner's Intel Mac using
  the pinned Darwin x64 gitleaks release and `shasum`, without weakening the
  existing Linux CI path. Added a narrow, exact allowlist for the known public
  Supabase publishable key in the three client files. No server secret and no
  new credential was added.
- Added the consolidation matrix at
  `docs/consolidation/TAY_CONSOLIDATION_MATRIX_2026-10-23.md` and review
  screenshots under `docs/previews/tay-ui-2026-10-23/`.

## Verification (run on the branch)

| Check | Result |
| --- | --- |
| `npm run test:tay-ui` | 11/11 pass |
| `npm run typecheck` | pass |
| `npm run lint` | pass (ESLint + public-copy guard) |
| `npm run test:workspace` | pass |
| `npm run test:identity` | pass |
| `npm run test:security` | pass |
| `npm run security:dependencies` | 0 production, 0 all |
| `npm run security:secrets` | no leaks after exact publishable-key classification |
| `npm run build` | pass on Next 15.5.28 |
| `next start` route probes | `/` 200, `/tay` 200 HTML, `/tay/index.html` 200, CSS/PNG/manifest 200 |
| Visual | desktop 1280×900, phone 390×844, context panel open; unauthorized sign-in and password-recovery routes |

The workspace screenshots use a temporary local mock of the existing API
response shape because no owner credentials were used. They are layout
evidence, not account or cloud verification. The mock is not committed.

## What is still not verified

- Authenticated Supabase sign-in, recovery callback completion, saved
  conversations, projects, memory and cross-account isolation. The function is
  reachable and returns 401 without an auth header, but no account was used.
- Netlify preview/deployment and any production connection. Production remains
  locked; nothing was deployed.
- Android/cloud release. The existing Android branch and its uncommitted
  release configuration were not touched.
- Admin invitations, admin AI agents, durable approvals, notifications and
  financial ledger.
- Real Tay animation beyond the standing sway: no rig, sprite/video, viseme
  map or layered source exists in the recovered repository.

## Preserved work elsewhere

- `threads/5b3a404c99bdb0984b081f3208fec07b438a24eff94c496fd3420eaf81bcdda7`
  (`feat/tay-consolidated-workspace`) still has uncommitted queue/engineering
  work, docs and screenshots. Nothing there was staged, reverted or overwritten.
- `~/tay-build/work-android` (`feat/tay-android-native`) still has its
  uncommitted release-signing configuration and `docs/tay-cloud-release.md`.
  It was not modified.
- The private Mac runtime and private operational data were not accessed.

## Rollback

Revert commit `e657189` and this handoff commit, or delete
`public/tay/`, the `/tay` rewrite, the test/doc/preview files and the
`.gitleaks.toml`/security-script changes. No data migration occurred. No
deployment is tied to this branch.
