# Freebuff Desktop recovery review — October 23, 2026

This is a draft local candidate, not a release. Repository: transcenlutions25/transcenlutions.

## Provenance and preservation

Freebuff Desktop's state identifies the local project at
`~/.config/freebuff-desktop/local-projects/653e0ea0-2a47-41e5-bf5e-d461a9588f9e`.
Its `threads/work-tay-ui` worktree is PR #90 at fcbb746; the original
`threads/5b3a404c99bdb0984b081f3208fec07b438a24eff94c496fd3420eaf81bcdda7`
is `feat/tay-consolidated-workspace` at 6ee2d34 (PR #80).
Fetch remote is HTTPS and push remote SSH, both transcenlutions25/transcenlutions.

The recovery candidate branches from 6ee2d34. It copies the original uncommitted
queue, engineering, migration, approval, UI, test and documentation work. Original
screenshots stay in place; they are not fresh verification evidence. The original
worktree's modified/untracked file hashes were recorded before copying and checked
again after the review. Neither original branch was switched, reset or rewritten.
The Android worktree was not edited. No private operational database was opened.

## Changes and security corrections

- Recover versioned SQLite migrations, scoped engineering sessions, proposal and
  checkpoint review, and a leased queue with a foreground worker.
- Check current user, project edit access and agent authority when queuing and
  again immediately before execution. Disabled/revoked users cannot keep running.
- Claim and complete leases with conditional UPDATE RETURNING; prevent duplicate
  completion audit entries; terminate exhausted expired leases; heartbeat long
  jobs; do not overwrite a replacement worker after lease loss. Failed verification
  is a failed job. This is at-least-once processing, not exactly-once side effects.
- Report the real Git worktree branch rather than guessing main.
- Reject repository symlink aliases; run local checks without inherited service
  credentials; disable repository command execution in production until isolation
  is verified. Repository scripts remain trusted local code, not a sandbox.
- Reject public owner bootstrap in production. Hosted session signing requires a
  server-managed secret. No secret was generated or configured for deployment.
- Refuse the SQLite account adapter on detected serverless hosts and reject an
  implicit production data directory. A configured path does not prove a durable
  volume; release still requires operator verification and backups.
- Reuse Next/eslint-config-next 15.5.28 and pinned Mac secret-scanner support from
  PR #90, including its exact existing public publishable-key classification for
  cross-branch history scanning; retain the disk dependency and lockfile.
  Removing that classification reproduces four historical public-key findings;
  it is not a new credential exception. Both scans pass with the reviewed config.
- Resolve Mac project paths before comparing attachment containment. This fixes
  /var versus /private/var temporary-directory aliases. Denial tests tolerate a
  macOS connection reset only after parsing an HTTP error status.
- Add the recovered Tay integration suite to the Launch gate.

## Verified locally

- 42 Tay module checks: password validation, revocable sessions, account/project
  isolation, authority, approvals, engineering, migrations, queue, symlink denial,
  hosted fail-closed configuration, independent database connections.
- Actual HTTP requests against the local Next production build with synthetic
  fixture accounts (no mocked auth): wrong password 401; unauthenticated 401;
  two independently authenticated sessions; shared saved projects/memory;
  unrelated account 404; wrong-origin mutation 403; owner setup denied;
  logout invalidates one session while the other remains valid.
- Restart the local server: the prior session and saved memory remain readable.
  This tests persistence on one local server, not separate physical devices.
- Typecheck, lint/public-copy guard, identity, workspace/writing/desktop bridge,
  arcade, 57 Apex tests, smoke, 17 desktop-runtime tests, two Apex Python tests,
  Next 15.5.28 production build. Dependency audits: zero affected packages.
- Original desktop tests reproduced the Mac path and HTTP-reset failures before
  the candidate corrections; all 17 pass in the candidate afterward.

## Unverified and blocked release requirements

No authenticated hosted Supabase sign-in/recovery, real owner credentials,
email verification, production persistence, physical cross-device use, deployment
preview of this candidate, edge throttling, backup recovery, or Android release
was verified. The /tay Supabase client and /workspace local-account adapter still
have different identity/storage implementations. Do not call them consolidated
account services or migrate real users without a reviewed identity bridge.
Password reset and rate limits for the native workspace remain open.

PR #90 stays unchanged; its /tay artwork/client is not replaced here. Quiet
completion recovery is a separate review branch based on PR #90. No main merge,
production deployment, service provisioning, outbound communication, live payment,
financial commitment, or secret change occurred. Native desktop UI automation is
unavailable in this session; evidence comes from local files, processes, local
HTTP/browser tests and GitHub metadata.

Rollback: discard the new draft branch or revert its commits. Do not reset the
original worktree or delete its uncommitted work. No real data migration ran.
