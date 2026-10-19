# Tay consolidated workspace

Status: implemented and locally verified on 2026-10-19. Hosted deployment,
multi-device sign-in and live commerce remain separate, unverified steps.

## GitHub pickup corrections

The follow-up to draft PR #80 preserves the password eye control and closes
public first-owner creation. `POST /api/tay/bootstrap` now refuses all creation
requests. Initial owner provisioning is an operator-only server-console step;
matching an email address is never treated as proof of ownership. Existing
accounts retain their IDs and credentials. Invitation acceptance now uses the
password-manager `new-password` hint.

The SQLite adapter is for a persistent Node server. Known serverless runtimes
and Netlify builds reject it before creating any data directory. Storage-open
failures render an unavailable screen; API requests return a safe HTTP 503.
This is failure handling, not a working hosted database connection. No fallback
to temporary or in-memory workspace storage is used. Full hosted operation
still requires a verified durable database adapter and a reachable model.

`npm run test:tay` includes the workspace, owner-provisioning, storage and
password-control regressions, and is now part of the Launch gate.

This release consolidates the hosted Transcenlutions chat and the preserved
Tay Command workspace into one application at `/workspace`. Tay is the central
assistant and orchestrator. One conversation surface owns most of the screen;
the left navigation and the right preview panel are collapsible and resizable,
with a mobile drawer that traps focus and returns it on close.

## What is working, and what is not

| Capability | State | Evidence |
| --- | --- | --- |
| Project conversations with saved history | Working | Server persistence; `/api/tay/projects/[id]` bundle; browser flow exercised |
| Project memory | Working | "remember that…" turn, Memory panel, durable rows |
| File and code editing | Working | Editor saves are audited; Tay edits are proposals until approved |
| Approval lifecycle (approve / reject / review later) | Working | Approval queue, three real states, apply-on-approve only |
| Visual change preview | Working | Three-slide preview built from the proposed content and line diff |
| Authorized task execution | Working | Owner grant → run → report artifact; grant is project-scoped and revocable |
| Live progress checklist | Working | Per-turn plan and per-task steps with honest statuses |
| Agent Tree / Skill Tree / Authority Tree | Working | `/api/tay/registry`, rendered in the workspace |
| Backend permission enforcement | Working | Project scoping, owner-only administration, server-side agent policy |
| Owner administration | Working (local) | Invitations with single-use tokens, admin AI agent drafts, grant revocation |
| Customer, delivery, invoice records | Working (local records) | Real database rows; delivery artifacts link to project files |
| Model-written drafting | Working locally, awaiting hosted configuration | Ollama `qwen2.5-coder:7b` wrote the demonstrated 40-line draft in ~241s in the production build (latency varies with load; ~20s for a short 60-token reply) |
| Voice input and playback | Awaiting configuration | No provider or microphone pipeline is wired |
| Live Stripe payment collection | Awaiting configuration | Invoice stays `awaiting_configuration`; no charge is possible here |
| Outbound email and publishing | Blocked | No provider connected; needs owner authorization |

A capability is never rendered as connected because a variable exists. The
model chip is populated from a live probe, and payment status is derived from
configuration plus recorded approvals.

## Freebuff / Codebuff provenance

Upstream: <https://github.com/CodebuffAI/freebuff>, pinned commit
`cf94e966da87d477b6b46dddc1ea87956c624642`, Apache License 2.0. The unmodified
`LICENSE` and `NOTICE` live in `third_party/freebuff/`.

- **Reused and adapted:** `packages/agent-runtime/src/process-str-replace.ts`
  as `third_party/freebuff/str-replace.ts`. This is the exact-match,
  unique-match, indentation-tolerant and whitespace-tolerant replacement
  matcher used by approved file edits. It is adapted to run synchronously and
  to omit upstream's `diff`/logger dependencies.
- **Not reused:** the `@codebuff/sdk` (requires a Codebuff account, API key and
  hosted service), the vendored AI-SDK provider fork, and the model-specific
  agent prompts. Those cannot back an independent zero-cost application, and
  the canonical Transcenlutions roster remains the authority for agent identity.
- **Design reference only:** Freebuff's propose-then-approve tools informed the
  approval queue shape. No code was copied from them.

Transcenlutions' own recovered foundation is reused directly: the Agent
Foundation roster and action boundaries (`lib/agent-foundation.ts`,
`docs/agent-authority-boundaries.md`), the governance term rules
(`lib/governance.ts`) and the hardened request reader (`lib/request-security.ts`).

## Architecture

- `lib/tay/db.ts` — Node's built-in SQLite (`node:sqlite`), data in
  `TAY_DATA_DIR` (default `.workspace-data`) on a persistent Node server.
  Serverless hosts are refused until a durable adapter is implemented.
- `lib/tay/accounts.ts` — users, scrypt password hashes, sessions, immutable
  founding-owner binding, project access decisions.
- `lib/tay/auth.ts` — HttpOnly cookie wrapper around `accounts.ts`.
- `lib/tay/registry.ts` — the single server-side authority decision point plus
  the agent, skill and authority trees.
- `lib/tay/orchestrator.ts` — Tay's turn loop: intent → plan → governance →
  proposal or work → result → audit.
- `lib/tay/approvals.ts` — proposal storage and the only place a change is
  applied.
- `lib/tay/projects.ts` — projects, conversations, messages, memory, sandbox
  files, artifacts, tasks.
- `lib/tay/business.ts` — customers, deliveries, invoices with configuration
  state.
- `lib/tay/diff.ts` — dependency-free line diff and slide builder.
- `lib/tay/model.ts` — Ollama or OpenAI-compatible adapter with an honest
  unconfigured state and built-in structured drafting fallback.
- `app/api/tay/**` — session, bootstrap, invites, projects, messages, files,
  memory, approvals, business, registry and owner administration.
- `components/tay/**` — the workspace, approval cards, panels and auth screen.
- `app/workspace/page.tsx` — server-rendered identity gate.

### Enforcement rules

- Owner authority comes only from `users.is_owner`, set by the protected
  operator-console provisioning command. It requires `TAY_OWNER_EMAIL`, creates
  an immutable user ID, and never promotes or overwrites an existing account.
  The email is a contact identifier, not identity proof. Operator access to
  the server is the provisioning boundary. A transaction and a database unique
  index permit only one founding owner; the public bootstrap route is disabled.
- Every protected route resolves the signed-in user server-side. Project data is
  returned only to its owner, a recorded project member, or the founding owner.
- New endpoints use `readJson`, which rejects cross-site origins, oversized
  bodies, encoded bodies and reserved JSON keys.
- Approvals apply only from a recorded human decision. A client flag cannot
  authorize an action.
- Payments, outbound sending and workforce change are blocked or
  approval-gated in `registry.ts` regardless of what the client sends.

## Run locally

```bash
npm ci
# In the same protected server-console session:
export TAY_OWNER_EMAIL=you@example.com
export TAY_OWNER_NAME="Founding owner"
export TAY_SESSION_SECRET="$(openssl rand -hex 32)"
# Set TAY_DATA_DIR to persistent storage for shared deployments.
npm run provision:tay-owner        # hidden password entry; creates no session
# optional, free: local model
ollama serve                       # if not already running
TAY_MODEL_PROVIDER=ollama TAY_MODEL=qwen2.5-coder:7b \
npm run dev
```

Open `http://localhost:3000/workspace` and sign in with the provisioned account.
Keep the same session secret across restarts. Without an owner, the page shows
that setup is pending and provides no public account-creation form. Without a
model provider, Tay still runs projects,
plans, edits, approvals and task runs using its built-in structured writer.

Only the founding owner or an explicitly authorized server operator should run
provisioning. The command refuses a second owner and does not recover, rebind,
or alter an existing account. It requires the normal installed project
dependencies. For automation, `--password-stdin` accepts a protected pipe; do
not put a password in command arguments, source files, or logs.

### Environment

| Variable | Purpose |
| --- | --- |
| `TAY_DATA_DIR` | SQLite location on persistent local storage. Keep out of source control. A temporary serverless directory cannot supply durable storage. |
| `TAY_SESSION_SECRET` | Hashes session tokens. Rotate to invalidate sessions. Required for any shared deployment. |
| `TAY_OWNER_EMAIL` | Required contact identifier for protected console provisioning; does not verify an email address. |
| `TAY_OWNER_NAME` | Optional display name for console provisioning; never grants authority. |
| `TAY_PUBLIC_ORIGIN` | Canonical public origin (e.g. `https://tay.example.com`). When set, no Host or `X-Forwarded-*` header can change which origin is accepted. Required behind a proxy that rewrites the request host. |
| `TAY_MODEL_PROVIDER` | `ollama` or `openai_compatible`. Unset means built-in drafts only. |
| `TAY_MODEL` | Model name, e.g. `qwen2.5-coder:7b`. |
| `TAY_OLLAMA_URL` | Defaults to `http://127.0.0.1:11434`. |
| `TAY_MODEL_BASE_URL` / `TAY_MODEL_API_KEY` | OpenAI-compatible endpoint and key, server-side only. |
| `TAY_STRIPE_PAYMENT_LINK` | Enables recording a payment handoff after approval. Never collects card data. |

No value is exposed to the browser. `.env.example` contains empty templates.

## Interface behaviour verified in the production build

- The password field hides by default, with an eye button inside its right end.
  Click, tap or Space/Enter toggles visibility, keeps the typed value, flips the
  icon, and updates `aria-label` / `aria-pressed`; the button is `type="button"`
  and never submits the form. Target size is 44×44 CSS px with a visible focus ring.
- The `TRANSCENLUTIONS` wordmark stays on one line and scales down
  (`clamp(11px, 8vw - 8px, 17px)`) in the mobile drawer so it is never clipped
  behind the close control, measured at 240, 320 and 390 CSS px.
- A recorded approval updates immediately: the card chip, the "Waiting on you"
  count, the message label (`Tay · applied` / `Tay · rejected`) and every task
  step change before the confirmed project reload finishes. A failed reload is
  reported without hiding the recorded decision.

## Verification

```bash
npm run typecheck
npm run lint
npm run test:tay       # workspace + owner provisioning + storage + password control
npm run smoke
npm run test:workspace
npm run build
```

Historical Freebuff request-level checks against its original local build:
`GET /api/tay/projects` returned an empty list, the owner's project returned
404, `GET /api/tay/admin` returned 403, and posting into the owner's project
returned 404. Bootstrap now always refuses creation; see the pickup corrections.

Historical Freebuff origin checks against its local production build (pinned `TAY_PUBLIC_ORIGIN`):
same-origin sign-in 200, cross-origin sign-in 403, same-origin authenticated
memory write 200, cross-origin authenticated write 403, forged
`X-Forwarded-Host`/`X-Forwarded-Proto` 403, forged `Host` header 401 (no session
for that host). The historical second-bootstrap response was 409; the protected
console flow replaces that public creation path.

## Known blockers and next steps

1. **Hosted workspace remains unavailable.** PR #80 deployed to a Netlify preview
   but `/workspace` returned 500. The follow-up handles unavailable storage;
   it does not supply durable hosting. Exact original error details require
   function logs.
2. **No real payment collection.** Owner must configure Stripe and verify a
   test-mode purchase before any live offer is described as working.
3. **No outbound email.** Invitation tokens are displayed once for manual
   delivery; the interface says so explicitly.
4. **Voice is not connected.** Capability is listed as awaiting configuration.
5. **Local model latency.** A full draft on this Mac takes about two minutes;
   streaming and progress tokens would improve perceived speed.
6. **No self-serve password reset or email verification.** Initial owner
   provisioning is operator-only; account recovery remains manual.
7. **SQLite on serverless.** `node:sqlite` requires a persistent Node server or
   a mounted volume. Vercel/Netlify serverless functions will not persist it.
8. **Rate limiting** for the new routes is not configured. The existing Netlify
   edge rules cover the hosted site but were not extended or verified here.
