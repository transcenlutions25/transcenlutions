# Tay consolidated workspace

Status: implemented and locally verified on 2026-10-19. Hosted deployment,
multi-device sign-in and live commerce remain separate, unverified steps.

This release consolidates the hosted Trancenlutions chat and the preserved
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
  the canonical Trancenlutions roster remains the authority for agent identity.
- **Design reference only:** Freebuff's propose-then-approve tools informed the
  approval queue shape. No code was copied from them.

Trancenlutions' own recovered foundation is reused directly: the Agent
Foundation roster and action boundaries (`lib/agent-foundation.ts`,
`docs/agent-authority-boundaries.md`), the governance term rules
(`lib/governance.ts`) and the hardened request reader (`lib/request-security.ts`).

## Architecture

- `lib/tay/db.ts` — Node's built-in SQLite (`node:sqlite`), data in
  `TAY_DATA_DIR` (default `.workspace-data`). No hosted database is required.
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

- Owner authority comes only from `users.is_owner`, set once during bootstrap.
  On a hosted deployment `TAY_OWNER_EMAIL` must match that address.
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
# optional, free: local model
ollama serve                       # if not already running
TAY_MODEL_PROVIDER=ollama TAY_MODEL=qwen2.5-coder:7b \
TAY_OWNER_EMAIL=you@example.com \
TAY_SESSION_SECRET="$(openssl rand -hex 32)" \
npm run dev
```

Open `http://localhost:3000/workspace`. With no owner, the page asks you to
create the founding owner. Without a model provider, Tay still runs projects,
plans, edits, approvals and task runs using its built-in structured writer.

### Environment

| Variable | Purpose |
| --- | --- |
| `TAY_DATA_DIR` | SQLite location. Keep out of source control. |
| `TAY_SESSION_SECRET` | Hashes session tokens. Rotate to invalidate sessions. Required for any shared deployment. |
| `TAY_OWNER_EMAIL` | Binds founding-owner creation to one verified address. Required in production. |
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
npm run test:tay       # 23 checks: identity, isolation, authority, approvals, flow, business
npm run smoke
npm run test:workspace
npm run build
```

Request-level checks performed against the running app with a member session:
`GET /api/tay/projects` returned an empty list, the owner's project returned
404, `GET /api/tay/admin` returned 403, and posting into the owner's project
returned 404. A second bootstrap attempt returned 409.

Origin checks against the running production build (pinned `TAY_PUBLIC_ORIGIN`):
same-origin sign-in 200, cross-origin sign-in 403, same-origin authenticated
memory write 200, cross-origin authenticated write 403, forged
`X-Forwarded-Host`/`X-Forwarded-Proto` 403, forged `Host` header 401 (no session
for that host), and a second bootstrap 409.

## Known blockers and next steps

1. **Hosted deployment is unverified.** Local Next.js and SQLite are proven; no
   deployment target has been built or tested for this branch.
2. **No real payment collection.** Owner must configure Stripe and verify a
   test-mode purchase before any live offer is described as working.
3. **No outbound email.** Invitation tokens are displayed once for manual
   delivery; the interface says so explicitly.
4. **Voice is not connected.** Capability is listed as awaiting configuration.
5. **Local model latency.** A full draft on this Mac takes about two minutes;
   streaming and progress tokens would improve perceived speed.
6. **No self-serve password reset or email verification.** Owner bootstrap is
   intentionally one-shot; account recovery is manual.
7. **SQLite on serverless.** `node:sqlite` requires a persistent Node server or
   a mounted volume. Vercel/Netlify serverless functions will not persist it.
8. **Rate limiting** for the new routes is not configured. The existing Netlify
   edge rules cover the hosted site but were not extended or verified here.
