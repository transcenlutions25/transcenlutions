# Tay / Transcenlutions platform readiness and synchronization contract

Status: active release contract for the consolidated Tay handoff.

Canonical source repository: `transcenlutions25/transcenlutions`.

This document distinguishes **shared source**, **released binaries**, and
**synchronized user data**. They are separate claims and must be verified
separately.

## Current surface status

| Surface | Current implementation | Launch status |
| --- | --- | --- |
| Web | The root Next.js application, including `/workspace`, approvals, project files, memory, business records, and the Agent/Skill/Authority views | Previewable and locally verified, but not launchable for users until durable hosted storage, hosted identity, and the release gates pass |
| macOS desktop | The same root Next.js application launched locally by `integrations/tay-desktop/legacy/launch_shared.py`, with an optional loopback bridge to Mac-only capabilities | Runnable on the owner's Mac, but not a signed/notarized distributable desktop application |
| Native Tay Android alpha | `android/tay` is a native Android client for the canonical Tay session, project, and message APIs. It stores only the server session cookie through Android Keystore and does not embed the web workspace in a WebView. | An installable debug APK and unsigned AAB can be built, but production use still requires durable hosted storage, device testing, stable signing, Play setup, and release approval |
| Android Arcade | `android/arcade` remains a separate offline wrapper for the shared `public/arcade` game assets | A test Arcade APK can be built; it is not the Tay client and is not a Play release |
| Full Transcenlutions platform | Canon, shared command-room UI, partial governed runtime, approvals, local/project persistence, selected business and revenue foundations | Not a single production platform release; major shared services remain incomplete |

## Source synchronization already enforced

1. The web application and Mac shared launcher use the same repository root and
   the same Next.js source. Desktop output is separated into `.next-desktop` so
   it cannot silently overwrite the hosted build output.
2. Native Tay Android calls the same authenticated `/api/tay` account, project,
   conversation, and message routes as the web workspace. It does not create a
   second account or project store.
3. Android Arcade copies its web content directly from `public/arcade` through
   the Gradle `syncArcadeAssets` task before every build. There is no second
   hand-maintained copy of the game frontend.
4. Hosted builds expose the exact Git commit through `/api/build-info`.
5. Android workflow artifacts are named with the producing Git commit SHA and
   include checksums/build metadata.
6. `npm run test:platform-sync` checks these invariants and is part of the
   Launch gate.

These controls keep **source, API contracts, and artifact provenance** aligned.
They do not by themselves create working cross-device account/data
synchronization.

## Data synchronization is not implemented yet

The following state is not yet unified by a production durable backend:

- Mac Tay private SQLite files, local conversations, queue state, project files,
  provider credentials, and browser profile.
- The consolidated workspace SQLite database used by a persistent local Node
  server.
- Browser-local state used by older/shared surfaces.
- Android Arcade local WebView progress.

The native Tay Android alpha deliberately does not create a local project or
conversation database. It reads server state through the canonical API, so it
will share projects and conversations only after that API is backed by durable
hosted storage and production identity. Its encrypted session cookie and server
address are device-local configuration, not synchronized business data.

A matching UI, API path, or Git commit is not evidence that conversations,
memory, approvals, artifacts, entitlements, or business records are available
across devices.

## Required architecture for real Tay synchronization

Before Tay may be described as synchronized across web, desktop, and Android,
the platform needs:

1. One authenticated tenant/account service and immutable founding-owner
   binding.
2. A durable shared database for accounts, projects, conversations, memory,
   approvals, artifacts, entitlements, operating events, and audit history.
3. A versioned sync API with stable record IDs, optimistic concurrency/version
   checks, idempotency keys, deletion/tombstone rules, and explicit conflict
   handling.
4. A desktop device bridge that exposes only authorized local capabilities;
   private Mac files remain local unless the owner explicitly imports or shares
   them.
5. Productionize the native Tay Android client with complete approval/artifact
   flows, compatibility/version checks, device/session revocation, and verified
   behavior against the durable backend.
6. Encryption in transit, protected secrets, data export/deletion,
   backup/recovery, rate limits, and auditable migrations.
7. A shared release manifest containing product version, schema/API version,
   commit SHA, surface, and compatibility range.

## Cross-surface acceptance test

Synchronization is verified only when all of the following pass with test
accounts and isolated data:

1. Create a project on web; it appears on desktop and the Tay Android client.
2. Add a conversation turn and project memory on one surface; both appear on the
   others after an authenticated refresh.
3. Create a proposed file change on one surface, decide it on another, and see
   the same final approval, artifact version, and audit event everywhere.
4. Queue an authorized task on desktop; web/mobile show its state without
   receiving private Mac filesystem access.
5. Make concurrent edits and prove the system detects or resolves the conflict
   without silently losing either change.
6. Sign out or revoke a device and prove it can no longer read or mutate data.
7. Verify another tenant cannot access any project, artifact, approval, memory,
   or device capability.
8. Restart every server/client involved and prove the synchronized state
   persists.
9. Confirm every surface reports a compatible release manifest and the exact
   deployed/built commit.

## Release rule

Do not market or label the product as a launchable synchronized Tay web,
desktop, and APK suite until the acceptance test above passes on the exact
release candidates. Until then, use these truthful labels:

- **Web:** development/private-alpha preview.
- **Desktop:** owner-Mac local shared app and bridge.
- **Native Tay Android:** installable native alpha connected to the canonical
  API; not sync-verified and not a Play production release.
- **Android Arcade:** separate offline test APK.
- **Cross-device synchronization:** not implemented.

Merging, production deployment, stable desktop signing/notarization, Android
production signing, Play submission, live payments, and provider activation
remain separate owner-controlled release decisions.
