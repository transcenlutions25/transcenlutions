# Handoff: Freebuff-based Transcenlutions / Tay workspace

Branch: `feat/tay-consolidated-workspace`
Repository: <https://github.com/transcenlutions25/transcenlutions> (public)
Prepared: 2026-10-19; final verification run 2026-10-19 19:09–19:15 local time
Status: implemented, committed and verified locally against `next build` +
`next start`. A Netlify deploy preview was created for this branch, but
`/workspace` returned **HTTP 500** there (see §14), so **no working hosted URL
exists yet**. Payments, email, publishing and voice remain unconfigured.

| Pickup item | Value |
| --- | --- |
| Final commit | Branch head of `feat/tay-consolidated-workspace`; the verified build is `3e5cf149519c772cd5d4185d375db3c0000ed17a` (see §14) |
| Draft pull request | <https://github.com/transcenlutions25/transcenlutions/pull/80> |
| Runs on | This Mac only — no verified hosted deployment |
| Password toggle | Implemented and verified (HTTP + production build, mouse + keyboard) |
| Build / tests | `next build` exit 0; typecheck, lint, `test:tay`, `test:workspace`, `test:security`, `security:dependencies` all pass |

This document is the pickup point for the work that consolidates the hosted
Transcenlutions chat and the preserved Tay Command workspace into one
application at `/workspace`, built on components reused from Freebuff.

---

## 1. What changed

### The workspace

- `app/workspace/page.tsx` — server-rendered identity gate. Signed-out visitors
  get the sign-in / founding-owner screen; signed-in users get the workspace.
- `components/tay/**` — `TayWorkspace` (conversation-first shell, panels,
  composer), `ApprovalCard` + `ProgressChecklist`, side panels, `TayAuth`.
- `app/api/tay/**` — session, bootstrap, invite acceptance, projects, messages,
  files, memory, approvals, business records, registry, owner administration.
- `lib/tay/**` — the whole server side:
  - `db.ts` — Node's built-in `node:sqlite`; data in `TAY_DATA_DIR`
    (default `.workspace-data`, gitignored). No hosted database required.
  - `accounts.ts` / `auth.ts` — users, scrypt password hashes, HttpOnly session
    cookies, immutable founding-owner binding, project access decisions.
  - `registry.ts` — the single authority decision point plus the agent, skill
    and authority trees.
  - `orchestrator.ts` — Tay's turn loop: intent → plan → governance → proposal
    or work → result → audit.
  - `approvals.ts` — proposal storage and the **only** place a change is applied.
  - `projects.ts`, `business.ts`, `diff.ts`, `model.ts`, `audit.ts`, `http.ts`.
  - `archil-storage.ts` — server-side Archil disk adapter (see §9).
- `app/tay-command-consolidated.css` — the workspace material language layered on
  the preserved Tay Command/Mac canon: royal blue, royal purple, black and gold,
  translucent panels, conversation-first layout, collapsible side panels,
  adjustable preview panel, mobile drawer.

### What was reused from Freebuff

Upstream: <https://github.com/CodebuffAI/freebuff>, pinned commit
`cf94e966da87d477b6b46dddc1ea87956c624642`, Apache License 2.0. Unmodified
`LICENSE` and `NOTICE` are preserved in `third_party/freebuff/`.

| Upstream | Local | Status |
| --- | --- | --- |
| `packages/agent-runtime/src/process-str-replace.ts` | `third_party/freebuff/str-replace.ts` | Reused and adapted (synchronous, no `diff`/logger dependency). Drives reviewed file edits. |
| `packages/llm-providers/src/openai-compatible/**` | — | Not reused: a vendored AI-SDK fork for one HTTP shape; replaced with a small local adapter (`lib/tay/model.ts`). |
| `sdk/**` (`@codebuff/sdk`) | — | Not reused: requires a Codebuff account/API key and the hosted service, so it cannot back an independent zero-cost application. |
| `agents/**` model prompts | — | Not reused: bound to Codebuff's model router; the Transcenlutions roster stays the authority for agent identity. |
| propose-then-approve tool shape | approval queue | Design reference only, no code copied. |

Also reused from this repository's own foundation: the Agent Foundation roster
and action boundaries (`lib/agent-foundation.ts`), governance terms
(`lib/governance.ts`) and the hardened request reader (`lib/request-security.ts`).

---

## 2. Verified in the final production build

Checks were run against `next build` + `next start` on an isolated data
directory, in Chromium, with test accounts only.

| Behaviour | Result | Evidence |
| --- | --- | --- |
| Open a project, talk to Tay, get a plan | Working | Model-written draft with a 5-step plan (`3/5 complete` while awaiting approval) |
| Review the proposed change | Working | Three-slide preview (what it does / new file / result) plus the diff body |
| Approve and apply | Working | `briefs/launch-founder-launch-brief.md` written, listed under Saved artifacts, preview renders its content |
| Immediate post-decision state | Working | On approve: chip `Applied`, `Waiting on you (0)`, message label `Tay · applied`, plan `5/5 complete`, notice, all in the same tick as the response — no manual reload |
| Reject | Working | Chip `Rejected`, `Tay · rejected`, steps `done, done, blocked`, notice "Nothing was written." |
| Saved history, memory, tasks | Working | SQLite rows; reload keeps conversation, memory and artifacts |
| Owner administration | Working (local) | Owner invites an admin; invitation token shown once, not emailed |
| Password visibility toggle | Working | See §3 |
| Brand at narrow widths | Working | See §4 |
| Same-origin vs cross-origin writes | Working | See §6 |
| Owner vs member permissions | Working | See §7 |

Screenshots (test data only; the small “Freebuff” pill at the top left is the
preview client’s own overlay, not part of this app):

- `screenshots/12-final-signin-mobile.png` — final build, 390 px sign-in, password hidden, eye button inside the field
- `screenshots/13-final-mobile-applied.png` — final build, 390 px, decided task and artifact
- `screenshots/14-final-brand-drawer-320.png` — final build, 320 px drawer, wordmark on one line
- `screenshots/15-final-desktop-applied.png` — final build, 1280 px, `Applied` chip, `Waiting on you (0)`, all five steps done
- `screenshots/04-signin-password-hidden-mobile.png` — password hidden, eye button
- `screenshots/05-brand-mobile-drawer.png` — wordmark in the 390 px drawer
- `screenshots/06-production-workspace-empty.png` — production build, owner signed in
- `screenshots/07-production-approval-pending.png` — approval with preview, `1 awaiting decision`
- `screenshots/08-production-approval-applied.png` — immediately after approve
- `screenshots/09-production-mobile-applied.png` — the same state at 390 px
- `screenshots/10-production-mobile-conversation.png` — mobile conversation
- `screenshots/11-production-artifact-preview.png` — saved artifact preview

---

## 3. Password visibility control

`components/tay/tay-auth.tsx` + `.tl-password-*` rules in
`app/tay-command-consolidated.css`:

- Eye button sits **inside the right end** of the password input (44×44 px,
  `position: absolute`), and the input reserves space so text never runs under it.
- Password is hidden by default (`type="password"`).
- Click, tap, or Space/Enter on the focused button toggles
  `type="password"` ↔ `type="text"`, swaps the `Eye` / `EyeOff` icon and updates
  `aria-label` ("Show password" / "Hide password") and `aria-pressed`.
- `type="button"` — toggling never submits the form, and the typed value is
  preserved (verified: 27-character value unchanged across toggles, URL stayed
  `/workspace`).
- The button is a real focusable control with a visible gold focus ring, so
  screen readers announce it as a labelled, pressed-state toggle.
- Verified in the development build and again in the production build.

## 4. Brand readability at narrow widths

The wordmark is one line (`white-space: nowrap`, normal word breaking) and the
mobile drawer now scales it instead of clipping it:

```css
font-size: clamp(11px, calc(8vw - 8px), 17px); /* drawer, ≤900px */
```

Measured `scrollWidth` vs `clientWidth` and the neighbouring close button:
240 px → 11.2 px font, fits, no overlap; 320 px → 17 px, fits, no overlap;
390 px → 17 px, fits, no overlap. On desktop the rail keeps its own clamp.

## 5. Authentication, owner binding, permissions, persistence

- Passwords: scrypt with per-user salt. Sessions: random token, HttpOnly,
  `SameSite=Lax`, `Secure` in production. Token hashes are stored.
- **Founding owner is one-shot.** `POST /api/tay/bootstrap` works only while no
  owner exists; afterwards it returns 409. In production an owner cannot be
  created unless `TAY_OWNER_EMAIL` is set and matches the submitted email
  (fail-closed). Verified: without it the UI shows "Set TAY_OWNER_EMAIL before
  creating the founding owner…"; with it, bootstrap succeeded.
- Administrators are created only by an owner invitation (single-use, expiring,
  bound to the invited email) and carry only the delegated scopes. An arbitrary
  new signup has no path to owner authority.
- Every protected route resolves the user server-side. A client-supplied role,
  agent id or approval flag is never trusted.
- Persistence: one SQLite file in `TAY_DATA_DIR`; WAL, foreign keys on, schema
  created on first open. No migration files — the schema is additive
  (`CREATE TABLE IF NOT EXISTS`).

## 6. Origin handling (Host / forwarded headers)

`lib/tay/http.ts`:

- `TAY_PUBLIC_ORIGIN`, when set, is the **only** accepted origin. No request
  header can change it.
- Otherwise a forwarded pair (`X-Forwarded-Host` + `X-Forwarded-Proto`) is
  honoured only when it is single-valued and names the same host the server
  received (or a loopback host); the protocol no longer comes from an untrusted
  header. Falls back to the received `Host` after validation, then to the request
  URL origin.
- `readJson` still rejects a mismatched `Origin` and `Sec-Fetch-Site: cross-site`.

Verified against the production server with the origin pinned:

| Request | Status |
| --- | --- |
| Same-origin sign-in | 200 |
| Cross-origin sign-in (`Origin: https://evil.example`) | 403 |
| Same-origin authenticated memory write | 200 |
| Cross-origin authenticated memory write | 403 |
| Forged `X-Forwarded-Host` + `X-Forwarded-Proto` with a forged origin | 403 |
| Forged `Host` header | 401 (no session for that host) |
| Second bootstrap attempt | 409 |

## 7. Owner vs member permissions (normal auth path)

1. Owner creates an admin invitation through `POST /api/tay/admin`.
2. The invited member accepts it through `POST /api/tay/invites/accept` and gets
   an ordinary session (`role: admin`, `isOwner: false`).
3. Member checks: `GET /api/tay/admin` → 403 "Only the founding owner…";
   `GET /api/tay/projects` → empty list; `GET /api/tay/projects/<owner project>`
   → 404; posting into the owner's project → 404.

All tests used throw-away data directories (`/tmp/tay-verify`,
`/tmp/tay-prod-verify`). The repository's existing `.workspace-data` was not
opened or modified.

## 8. Environment and services

Node 24 line: **v24.21.0** (repository requires `>=24.15.0 <25`). npm 11.19.0.
Next.js 15.5.27, React 18.3.1.

| Variable | Purpose |
| --- | --- |
| `TAY_DATA_DIR` | SQLite location; keep out of source control |
| `TAY_SESSION_SECRET` | Session token hashing; rotate to invalidate sessions |
| `TAY_OWNER_EMAIL` | Binds founder creation to one address; required in production |
| `TAY_PUBLIC_ORIGIN` | Canonical public origin; set it behind any proxy |
| `TAY_MODEL_PROVIDER` | `ollama` or `openai_compatible`; unset = built-in drafts |
| `TAY_MODEL` | Model name, e.g. `qwen2.5-coder:7b` |
| `TAY_OLLAMA_URL` | Defaults to `http://127.0.0.1:11434` |
| `TAY_MODEL_BASE_URL`, `TAY_MODEL_API_KEY` | OpenAI-compatible endpoint/key (server-only) |
| `TAY_STRIPE_PAYMENT_LINK` | Enables recording a payment handoff after approval; no card data |
| `ARCHIL_API_KEY`, `ARCHIL_REGION`, `ARCHIL_DISK_ID` | Optional Archil disk persistence (see §9) |

`.env.example` carries empty templates only; `.env*` is gitignored. No value is
exposed under a `NEXT_PUBLIC_` prefix.

Services required for what was verified: **none beyond a local Node server**.
Optional: a local Ollama daemon for model-written drafting.

## 9. Local model: what actually worked

- Ollama 0.17.4, model **`qwen2.5-coder:7b`** (also installed: `gemma3:12b`,
  `gpt-oss:20b`). Endpoint used by the app: Ollama's OpenAI-compatible
  `/v1/chat/completions`.
- Probe: a 60-token completion took **~19.5 s**; `gemma3:12b` took **~34.3 s** for
  the same probe.
- Full turn in the production build: a 700-token, 40-line launch brief finished in
  **~241 s** wall clock, labelled "Ollama (local machine) · qwen2.5-coder:7b".
- Timeout behaviour: drafts allow **300 s** (`timeoutMs` in `draftDeliverable`),
  other model calls default to 120 s; the UI status probe uses 1.5 s. If the
  model is unreachable, times out, or returns nothing, Tay falls back to its
  built-in structured writer and says so. Latency varies with machine load —
  earlier runs on this Mac produced a similar draft in ~121 s.
- No hosted model, API key or spend is involved.

## 10. Install, build, test, run

```bash
# install (lockfile in repo)
npm ci

# checks
npm run typecheck          # pass
npm run lint               # pass (ESLint clean + public-copy guard)
npm run test:tay           # 23 checks: identity, isolation, authority, approvals, flow, business
npm run test:workspace     # workspace, writing blocks, desktop bridge, social publisher
npm run test:security      # request boundary + edge coverage
npm run security:dependencies

# build and start
npm run build              # pass
TAY_DATA_DIR=/tmp/tay-data \
TAY_PUBLIC_ORIGIN=http://localhost:3210 \
TAY_OWNER_EMAIL=you@example.com \
TAY_MODEL_PROVIDER=ollama TAY_MODEL=qwen2.5-coder:7b \
npm run start -- -p 3210
```

Open `http://localhost:3210/workspace`. Dev instead:
`TAY_DATA_DIR=... npm run dev`.

Do not run `next dev` and `next start` against the same `.next` directory at the
same time; both write to it. Stop the dev server before `npm run build`.

## 11. Test and build results (this run)

| Command | Result |
| --- | --- |
| `npm run typecheck` | pass, exit 0 |
| `npm run lint` | pass, no ESLint warnings; public-copy guard passed |
| `npm run test:tay` | pass, 23 checks |
| `npm run test:workspace` | pass (workspace, writing blocks, desktop bridge, social) |
| `npm run test:security` | pass (payloads, approval forgery, prototype fields, edge coverage, signed bodies) |
| `npm run security:dependencies` | production audit 0 affected; all-deps audit 7 affected via a disclosed build-only exception expiring 2026-10-20 |
| `npm run security:secrets` | **could not run on macOS** — the script verifies the gitleaks tarball with GNU `sha256sum`, which macOS lacks. Worked around with gitleaks 8.30.1 (darwin_x64): 2 commits of history and the 342 files of this commit, **no leaks found**. A directory-mode scan reported 13 findings, all inside untracked build output (`.next/**`) and a vendored toolchain header — none in a tracked file |
| `npm run build` | pass, exit 0; `/workspace` 12.5 kB route, 125 kB first load |
| `npm run check:archil` | **expected failure**: `ARCHIL_API_KEY is not set`. Archil persistence is unwired and unverified (§9, §13) |

The table above was re-run after the last source changes; the flow below was
exercised again against that exact build on `http://localhost:3210` with a
throw-away `TAY_DATA_DIR=/tmp/tay-final`:

| Flow check | Result |
| --- | --- |
| Founding owner bootstrap | 200, owner created |
| Second bootstrap (arbitrary new account) | 409, no owner path |
| Sign-in sets session cookie | 200, `HttpOnly` + `Secure` present |
| Turn → pending approval | `apr_…` `pending`; task `awaiting_approval`, `review:awaiting_approval`, `save:pending` |
| Approve | decision response `status: applied`, `applied: true`, `error: null` |
| Project bundle immediately after | approval `applied` + `appliedAt`, task `completed`, steps `done,done,done,done,done`, file + artifact `briefs/launch-final-verification.md`, result message recorded |
| Browser UI after decision | chip `Applied`, `Waiting on you (0)`, plan `5/5 complete`, every step `Done`, no “Needs your decision” anywhere |
| Same-origin sign-in / memory write | 200 / 200 |
| Cross-origin sign-in / memory write | 403 / 403 |
| Forged `X-Forwarded-Host` + `X-Forwarded-Proto` with forged `Origin` | 403, nothing written |
| Forged `Host` header | 401 (no session for that host) |
| Owner invites member → member accepts | 200 → 200 (`role: admin`, `isOwner: false`, only delegated scopes) |
| Member `GET /api/tay/admin` | 403 |
| Member `GET /api/tay/projects` | `[]`; owner project `404`; write into it `404` |
| Password toggle | hidden by default (`type=password`), 44×44 button inside the field, click and Space both toggle to `type=text` and back, value preserved (23 chars), icon `eye`↔`eye-off`, `aria-label` and `aria-pressed` follow, URL stays `/workspace`, never submits |
| Brand at 240 / 320 / 390 px | one line, `scrollWidth == clientWidth`, no overlap with the close button; 11.2 px font at 240 px, 17 px above ~320 px |

Not run in this environment: `npm run test:apex` / `test:workflows` (they need
`python3`; the Xcode command-line tools are not installed here) and the Netlify
edge runtime.

## 12. Safe integration and migration

1. Review the diff on `feat/tay-consolidated-workspace`, pushed as a draft pull
   request against `main`. Nothing is merged and production is untouched.
2. Nothing in this change rewrites existing tables. The SQLite schema is created
   with `CREATE TABLE IF NOT EXISTS`, so pointing `TAY_DATA_DIR` at a fresh
   directory is the safe first run; existing `.workspace-data` files are untouched.
3. Set `TAY_OWNER_EMAIL` **before** the first production boot, then create the
   owner with that exact address. It cannot be re-bound later.
4. Set `TAY_PUBLIC_ORIGIN` to the real public origin when deploying behind a
   proxy or custom domain, and set `TAY_SESSION_SECRET`.
5. Keep `TAY_DATA_DIR` on persistent storage. `node:sqlite` needs a long-running
   Node server or a mounted volume; serverless functions will not persist it.
6. This repository deploys through Netlify (`netlify.toml`). A feature-branch
   push / pull request produces a deploy preview; production follows the
   production branch. The production branch was not pushed or merged here.
7. Rollback: the workspace lives in new files (`app/workspace`, `app/api/tay`,
   `lib/tay`, `components/tay`, `app/tay-command-consolidated.css`) plus small
   additive edits to `app/layout.tsx`, `app/page.tsx`, `.env.example`,
   `.gitignore`, `package.json` and the lockfile. Reverting the branch removes
   the workspace without touching user data.

## 13. Remaining blockers and unfinished work (exact)

1. **No working hosted deployment.** The app runs locally on this Mac. A Netlify
   deploy preview was built for this branch, but `/workspace` answers 500 there
   (§14); the cause (serverless + `node:sqlite`) is suspected, not confirmed.
2. **Payments are unconfigured.** `TAY_STRIPE_PAYMENT_LINK` is empty; invoice
   status stays `awaiting_configuration`; no charge is possible.
3. **No outbound email.** Invitation tokens are shown once for manual delivery.
4. **Voice input/playback** is not connected.
5. **Model drafting requires a local Ollama daemon** and a manual env setting;
   without it Tay answers with its built-in structured writer and says so.
6. **Archil disk persistence is unwired.** `lib/tay/archil-storage.ts` and
   `npm run check:archil` exist, but no `ARCHIL_API_KEY` was available, so the
   two-exec write/read-back check has never run against a real disk. Nothing uses
   it yet.
7. **`npm run security:secrets` is not portable to macOS** (GNU `sha256sum`
   only). The equivalent gitleaks scan passed when run directly.
8. **Rate limiting** is not configured for the `/api/tay/**` routes.
9. **No password reset or email verification.** Account recovery is manual.
10. **Deployment target does not fit the app yet.** `netlify.toml` runs
    `next build` and publishes `.next` with no declared Next.js runtime plugin;
    the branch preview builds but its `/workspace` route returns 500, and
    `node:sqlite` needs a long-running Node process or a mounted volume rather
    than a serverless function. Hosting here needs a separate, approved
    decision: a Node server with persistent storage, or a database swap.
11. **Not exercised here:** `npm run test:apex`, `npm run test:workflows`
    (need `python3`), `npm run smoke`, the Netlify edge runtime, hosted auth, and
    any multi-device or multi-user session behaviour.
12. **Gallery:** `screenshots/01`–`03` were captured before the last UI changes
    and are kept only as history; `screenshots/12`–`15` are the current build.

## 14. GitHub handoff

- Repository: <https://github.com/transcenlutions25/transcenlutions> (public; unchanged visibility)
- Branch: `feat/tay-consolidated-workspace`
- Draft pull request: <https://github.com/transcenlutions25/transcenlutions/pull/80> (65 files, 0 deletions against `main`)
- Branch head at handoff: the commit that contains this document
- Commit with the verified build: `3e5cf149519c772cd5d4185d375db3c0000ed17a`
- Application commit below it: `4aef301e5f099c5796b94103c5bb620621f8f38b`

`main` was not modified. Merging, production migrations, production deployment
and any spend remain separate approvals.

The HTTPS remote had no stored credential in this checkout, so the push used the
existing SSH key (`git push git@github.com:transcenlutions25/transcenlutions.git
feat/tay-consolidated-workspace`). The `origin` remote is still the HTTPS URL.

Pushing the branch did **not** release anything to production: Netlify builds
production from `main` only, and `main` was not touched. The checked-in
workflows (`launch-gate.yml`, `security.yml`, `arcade-android.yml`) run checks
only — none deploy — and `arcade-android.yml` is restricted to `main`.

However, the Netlify GitHub app **is** connected to project `tay-command` and did
create a deploy preview for this branch. Checked on 2026-10-19:

| Preview request | Result |
| --- | --- |
| `https://6ad6a4dd133e4f3f729748c6--tay-command.netlify.app/` | 200 |
| `https://6ad6a4dd133e4f3f729748c6--tay-command.netlify.app/workspace` | **500**, Next error digest `4080282439` |
| `https://tay-command.netlify.app/workspace` (production, `main`) | 404 — branch not released |

The preview failure is consistent with the serverless runtime rejecting
`node:sqlite` and the local SQLite data directory, but that diagnosis is
unconfirmed: deployment logs are behind the Netlify dashboard. Do not describe
this preview as working.

GitHub checks on this commit all passed: `verify`, `desktop-runtime`,
`Security regression`, `Secret scan`, `Dependency vulnerabilities` and
`Deployed edge security` (launch-gate and security workflows), plus Netlify's
redirect-rule check.

No secrets, local databases, `.env` files, model weights, `node_modules` or
build output were included. `git archive HEAD` was scanned with gitleaks before
pushing: 342 files, no findings.
