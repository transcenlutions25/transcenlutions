# Tay GitHub pickup review

Source: [draft PR #80](https://github.com/transcenlutions25/transcenlutions/pull/80),
`feat/tay-consolidated-workspace` at
`6ee2d34c2d90ff48eae74b2f9eb8040a07f7775c`.

Follow-up branch: `fix/tay-handoff-auth-storage`, intended as a draft PR against
the Freebuff feature branch. This is a source repair and review; it is not a
production release or a private-Mac installation.

## What the pickup changes

### Password control

The original eye button is preserved inside the right end of the password
field. It starts hidden, keeps the entered value while showing/hiding, has an
accessible label and visible focus, and is a native `type="button"` control.
Invitation acceptance now advertises `new-password` to password managers;
sign-in retains `current-password`. Developer implementation details have been
removed from the sign-in copy.

### Initial owner provisioning

The original public bootstrap accepted the configured owner email as proof of
identity. That permitted an unauthenticated caller who knew that address to
claim a fresh deployment. Matching an email does not verify ownership.

The public endpoint now refuses owner creation. `npm run provision:tay-owner`
is the replacement protected operator-console command. It requires the
configured owner email, reads a password without exposing it in command
arguments, generates an immutable user ID, and records an audit event. It
creates no browser session. The operator must be the founder or be explicitly
authorized to provision that identity. Email control is not claimed to have
been verified by this local credential flow.

Provisioning checks and inserts execute in one transaction; a partial unique
index enforces at most one owner across connections. An existing owner is never
rebound, overwritten or promoted from a different account. Ordinary sign-in
and invitation acceptance retain their existing account/session checks.

### Workspace storage failure

The current adapter is synchronous local SQLite. It needs a persistent Node
server and stable disk. Known serverless runtimes and Netlify builds now refuse
that adapter before creating a data directory, even when a temporary path is
supplied. SQLite is loaded only when opening storage. Failed initialization
does not leave a cached partial connection, and test resets close handles.

The workspace renders an honest unavailable screen when storage cannot open;
API boundaries return HTTP 503 with a safe message and no filesystem/provider
details. This does not establish a functioning hosted workspace, and there is
no temporary/in-memory fallback for accounts or saved work.

## Corrections to the original hosting diagnosis

- The original Netlify `/workspace` 500 was reported by Freebuff; its exact
  exception is not proven without function logs.
- Netlify automatically installs its Next.js adapter. Absence of an explicit
  plugin in `netlify.toml` is not itself a configuration defect.
- A local writable SQLite path is incompatible with the required shared
  durable serverless state. Using `/tmp` cannot repair that requirement.
- `lib/tay/archil-storage.ts` is unused by the workspace database. Merely
  configuring its key would not persist users, sessions or projects.
- The existing `pg` dependency and `lib/operating-graph-db.ts` provide a possible
  path through an already provisioned database, but repository code does not
  prove service availability or preview credentials. The synchronous Tay
  database contract would need a reviewed asynchronous adapter and migrations.
- Hosted `127.0.0.1:11434` does not reach Ollama on the owner's Mac. Hosted model
  access remains unresolved; built-in drafting must remain honestly labelled.

References: [Netlify Next.js adapter](https://docs.netlify.com/build/frameworks/framework-setup-guides/nextjs/overview/),
[Lambda filesystem requirements](https://docs.aws.amazon.com/lambda/latest/dg/images-create.html).

## Verification

Verified in the isolated Linux checkout with Node 24.19.0 and the checked-in
lockfile. Fresh test databases were separate from all user data. The historical
Mac screenshots remain Freebuff's evidence.

| Check | Result |
| --- | --- |
| TypeScript, lint and public-copy guard | Pass |
| Production `next build` | Pass |
| Tay workspace regressions | 23 pass |
| Owner-provisioning regressions | 9 pass |
| Real SQLite storage regressions | 9 pass |
| React DOM password regressions | 4 pass |
| Platform identity, workspace, writing blocks, desktop bridge and social publisher | Pass |
| Smoke checks | 21 Tay flows plus agent/session/authority checks pass |
| Apex JavaScript suite | 57 pass |
| Arcade suite | Pass |
| Preserved desktop Python suite | 17 pass; queue syntax check passes |
| Apex Python suite | 2 pass |
| Security request/authority regression | Pass |
| Production dependency audit | Zero affected runtime packages |
| Secret scan | No findings in 120 reachable commits or tracked working files |

The existing development-only dependency exception remains unchanged: seven
dependency-chain entries trace to the build-tool advisory recorded in
`security/dependency-exception.json`, expiring 2026-10-20T00:00:00Z. The security
gate passed under that existing exception; this patch does not resolve or
extend it.

Seven additional HTTP scenarios passed against the actual production build on
temporary loopback servers: pending initial setup; denied correct-email public
bootstrap with no owner/session; protected console provisioning and rendered
password eye; cross-origin sign-in denial plus valid protected-cookie sign-in;
authenticated project creation/render; the same session and project surviving
a full server-process restart; and a simulated serverless runtime rendering
the unavailable page with safe API HTTP 503 responses.

A real terminal check confirmed hidden password entry and confirmation, a
0600 database file, one owner and zero minted sessions. DOM tests verify actual
click/input/submission behavior and CSS declarations, not native browser key
activation, mobile geometry or screen-reader speech. The serverless HTTP test
uses the runtime marker locally; it does not claim a working Netlify database.

The complete Tay suite now runs in the Launch gate. GitHub/preview checks must
still be assessed on the exact published commit before any promotion.

## Remaining release dependencies

1. Verify the original hosted exception from the function log if an exact root
   cause is required.
2. Implement and verify shared durable storage on the intended host, with
   isolated preview credentials and reviewed migrations. No service is
   provisioned or connected by this patch.
3. Verify authenticated multi-user behavior, persistence across instances and
   deployed edge protections on the exact preview commit before promotion.
4. Resolve a reachable authorized model endpoint for hosted model-written
   drafting. This patch does not activate a paid provider.

Rollback reference is the source SHA above. Prefer a targeted correction:
reverting the owner fix would reopen public first-owner claiming. The added
unique index changes no valid existing owner row. If legacy data has multiple
owners, initialization refuses it for operator review rather than silently
choosing one or changing data.
