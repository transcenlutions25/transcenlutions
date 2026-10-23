# Tay engineering sessions (Devin-style)

Status: implemented and verified on this Mac against the local SQLite workspace.
No hosted deployment, remote sandbox, branch push or pull request has been
verified. Payments remain unconfigured and this module never touches them.

A session is a scoped piece of engineering work: it reads the running
repository, produces a phased plan with acceptance criteria, records a
worklog, runs allowlisted checks, proposes diffs into the project sandbox,
captures checkpoints, and writes a reviewable handoff pack. Every write waits
for a recorded human approval.

## What was studied

The capability model comes from Cognition's Devin documentation, not from
copying its product:

- first session and Ask/Agent modes: <https://docs.devin.ai/get-started/first-run>
- when Devin is a good fit: <https://docs.devin.ai/essential-guidelines/when-to-use-devin>
- session shell, IDE, browser and takeover: <https://docs.devin.ai/work-with-devin/devin-session-tools>
- environment snapshots and blueprints: <https://docs.devin.ai/onboard-devin/environment>
- playbooks: <https://docs.devin.ai/product-guides/creating-playbooks>
- multi-session management: <https://cognition.com/blog/devin-can-now-manage-devins>
- verification limits in agentic development: <https://cognition.com/blog/testing-development>

Engineering patterns for sandboxed agents and plan/execute/review loops were
cross-checked against OpenHands (<https://docs.openhands.dev/sdk/guides/security>),
SWE-agent's agent-computer interface (<https://arxiv.org/abs/2405.15793>) and
LangChain's Open SWE planner/programmer/reviewer split
(<https://www.langchain.com/blog/introducing-open-swe-an-open-source-asynchronous-coding-agent>).

## Capability map

| Devin capability | What this build does | Status |
| --- | --- | --- |
| Session with a scoped task | `engineering_sessions` row with request, mode, plan, status and worklog | Working |
| Ask vs Agent mode | `ask` is read-only; `agent` may propose sandbox patches | Working |
| Plan before execution | Seven-phase plan with per-step acceptance text and named checks | Working |
| Repository inspection | Bounded map, regex search, file reads of this checkout | Working, read-only |
| Shell and test runs | Fixed allowlist of check commands, no shell argument from the client | Working |
| Code edits | Project-sandbox patches and find/replace edits, approval-gated | Working |
| Checkpoints and rewind | Sandbox snapshots, restore through a `checkpoint_restore` approval | Working |
| Playbooks | Per-project reusable instructions with a `!macro` token | Working |
| Handoff / pull request | PR-style pack saved as an artifact; no push, commit or PR | Working as a pack only |
| Cloud VM or container per session | None. Sessions run in the server process | Not implemented |
| Git clone, branch, commit, push | None. Branch name is recorded for a human to create | Not implemented |
| Browser / computer use | None | Not implemented |
| Managed child sessions | Sequential sessions per project; no coordinator | Not implemented |
| Devin API | This module's own same-origin API, authenticated per project | Working locally |

## Boundaries

- **Reads** the checkout the server is running from. `.env*`, `node_modules`,
  `.git`, runtime-state folders, key and database files are refused, and every
  path is resolved inside the repository root.
- **Writes** only into the project sandbox (`project_files`), and only when an
  approval created by `lib/tay/approvals.ts` is applied. The application source
  itself is never written by a session.
- **Checks** are fixed server-side:
  `typecheck`, `lint`, `test:tay`, `test:security`, `smoke`, `git status`,
  `git diff --stat`. A client cannot pass a command string, so `npm install`,
  `npm run dev`, builds, pushes and deploys are impossible.
- **Never** charges, sends, publishes, deploys or pushes. The handoff pack says
  so in its own risk section.
- Authority is resolved by `lib/tay/registry.ts` for the `kj` engineering agent
  (`read_context`, `run_task`, `edit_project_file`) before any tool runs.

## Where it lives

| File | Purpose |
| --- | --- |
| `lib/tay/engineering.ts` | Repository tools, planner, verification allowlist, sessions, checkpoints, handoff |
| `lib/tay/types.ts` | Session, event, checkpoint, playbook and repository-fact contracts |
| `lib/tay/db.ts` | `engineering_sessions`, `engineering_events`, `engineering_checkpoints`, `engineering_playbooks` |
| `lib/tay/approvals.ts` | `checkpoint_restore` application; the only place a restore writes |
| `app/api/tay/projects/[id]/engineering/route.ts` | Project-scoped API, same-origin JSON and identity checks |
| `components/tay/tay-engineering.tsx` | Engineering panel: plan, worklog, tools, checkpoints, playbooks |
| `components/tay/tay-workspace.tsx` | Panel registration |

## API

`GET /api/tay/projects/:id/engineering?sessionId=...` returns sessions,
playbooks, repository facts, the selected session, its events and checkpoints.
Only a member of that project with a valid session cookie reaches it.

`POST /api/tay/projects/:id/engineering` with `action`:

| Action | Effect | Requires edit access |
| --- | --- | --- |
| `create_session` | Persists a plan and worklog; never writes files | Yes |
| `ask` | Answers from repository facts, using the configured model when reachable | No |
| `tool` | `repo_map`, `search`, `read_file`, `verify`, `checkpoint`, `pause`, `resume`, `complete` | No (checkpoint yes) |
| `tool` | `propose_patch`, `rewind`, `handoff` return an approval id | Yes |
| `create_playbook` | Saves reusable instructions for this project | Yes |

Patches accept either full `content` (create or replace) or exactly one
`find`/`replace` pair that must match once in the current file.

## Using it

1. Open a project in `/workspace` and choose the **Engineering** panel.
2. Describe the work, pick `agent` (propose changes) or `ask` (read-only), and
   start the session.
3. Inspect the plan and worklog. Optionally search, read files and run a check.
4. Propose a patch; it appears in **Approvals** with the same explanation and
   diff slides as any other change. Approve to write it into the sandbox.
5. Capture a checkpoint before a risky change. **Rewind** proposes one
   restore approval covering every checkpointed file.
6. **Prepare pack** writes the handoff as an artifact. Merging, pushing and
   deploying stay with the owner.

## Verification

Run from the repository root:

```bash
npm run typecheck     # passed
npm run lint          # passed, including the public-copy guard
npm run test:security # passed: payloads, approval forgery, edge coverage
npm run test:tay      # passed: 31 checks, 8 of them covering engineering sessions
```

The engineering checks cover: repository facts and lockfile detection, secret
and traversal refusals on reads, plan shape, the verification allowlist
rejecting `rm -rf /` and `npm install`, session persistence, a patch staying
unwritten until approval, Ask sessions refusing writes, checkpoint rewind
restoring sandbox content through an approval, and the handoff pack landing as
an artifact with its risk section intact.A live check command was not executed during the test run, because a check can
take minutes and the suite must stay fast. The allowlist itself is fixed and
tested; running one is exercised from the panel.

The production build (`npm run build`) includes the route and the panel. The
built app was then started on port 3119 against a temporary data directory and
exercised over HTTP:

| Check | Result |
| --- | --- |
| Owner bootstrap, then sign-in with the seeded owner | 200, session cookie issued |
| Create a project and an agent session | 200; 7-step plan, status `running` |
| `POST` with a foreign `Origin` | 403 "Cross-site request rejected." |
| Engineering `GET` without a session | 401 |
| Read the proposed file before approval | 404 |
| Approve the patch, then read the file | `applied=true`; content present |
| Worklog after the flow | observation, plan, proposal |
| Session title, repository and plan after the reload | "Fix the approval checklist…", `transcenlutions`, 3/7 steps done |

Screenshots: [panel](../screenshots/07-engineering-worklog.png) and
[plan view](../screenshots/09-engineering-plan-view.png).

## Remaining work

1. **Isolated runner.** Execute in a container or VM with a fresh clone and a
   scrubbed environment, behind an owner-approved queue. Today the session runs
   in the Next.js server process against this checkout.
2. **Git handoff.** Branch creation, commit and draft PR as new explicit
   approval kinds, with the push credentials held server-side.
3. **Model-driven planning.** The plan is currently deterministic; the model is
   used for repository questions only. A structured plan proposal with a
   reviewer pass is the next step.
4. **Streaming progress.** The worklog updates per tool call, but a running
   check blocks the request until it finishes.
5. **Playbook learning.** Suggest a playbook from a successful session instead
   of requiring the operator to write it.
6. **Cost and time budgets.** Per-session limits for check time and model
   tokens, reported the way Devin reports compute.


## Recovery review limits — October 23, 2026

See `docs/handoffs/tay-desktop-recovery-review-2026-10-23.md`. Repository verification is local-only; production owner bootstrap is disabled. SQLite is a single-server adapter, not a verified serverless or cross-device cloud store. No account migration, hosted authentication or production deployment is established by these local checks.
