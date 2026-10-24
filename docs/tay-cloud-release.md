# Tay cloud release — readiness and blocking authority

Status date: 2026-10-20. This record separates what was executed from what still
needs an owner action or further engineering. It is the durable handoff for the
`feat/tay-android-native` work.

## Verified working

| Item | Evidence |
| --- | --- |
| Native client builds | `:app:lint :app:assembleDebug :app:assembleRelease :app:bundleRelease` all pass locally with JDK 17, Android SDK 36 / build-tools 35.0.0, Gradle 8.13, AGP 8.13.2. |
| Release APK signature | `apksigner verify --print-certs` → `CN=Transcenlutions Tay Release, O=Transcenlutions LLC`, SHA-256 `86:03:D1:77:F5:AB:52:EA:74:B7:C7:BF:65:54:A4:9D:A8:03:98:31:62:2D:95:D7:E3:8C:14:D1:D6:83:0D:3C`. |
| Release AAB signature | `jarsigner -verify` → `jar verified.` with the same certificate (self-signed upload key). |
| Package and version | `com.transcenlutions.tay`, versionCode `2`, versionName `0.2.0-alpha`, targetSdk 36, minSdk 26. |
| Cleartext policy | Release manifest `usesCleartextTraffic=false`; debug APK `true`. |
| Compiled endpoint | The release APK embeds the build property `tayReleaseBaseUrl`; builds without an `https://` origin or without the keystore fail instead of producing an unsigned file. |
| Signing key custody | Keystore at `~/Library/Application Support/Transcenlutions/signing/tay-release.jks` (`0700` dir, `0600` file); password only in the macOS Keychain item `transcenlutions-tay-android-signing`. |
| CI contract | `tay-android.yml` builds lint + developer APK on every PR, and produces signed release artifacts only when `TAY_ANDROID_KEYSTORE_BASE64`, `TAY_KEYSTORE_PASSWORD` and `TAY_RELEASE_BASE_URL` are configured. |

## Blocked

The deployed Tay origin does not serve the workspace. Probes on 2026-10-20:

```
GET https://tay-command.netlify.app/api/build-info   -> 200 (commit 9f0af4a)
GET https://deploy-preview-81--tay-command.netlify.app/api/tay/session -> 503
     {"ok":false,"error":"Tay's workspace storage is unavailable."}
GET https://tay-command.netlify.app/api/tay/session  -> 404 (branch not in production)
GET https://deploy-preview-82--tay-command.netlify.app -> 404 (no deploy for this PR)
```

Two owner actions and one engineering block remain.

1. **Public TLS origin with a durable Postgres database.** This machine holds no
   Netlify, Vercel, Cloudflare or Postgres credential, so the site's environment
   variables and a dedicated deploy cannot be created from here, and the Neon
   console signup requires the owner's email verification.
2. **Netlify environment and branch deploys.** Required variable names (values
   never in chat or source): `DATABASE_URL`, `TAY_SESSION_SECRET`,
   `TAY_PUBLIC_ORIGIN`, `TAY_OWNER_EMAIL`, `TAY_OWNER_NAME`, plus the existing
   `NEXT_PUBLIC_TAY_*` labels.
3. **Postgres storage adapter.** `lib/tay/db.ts` is synchronous `node:sqlite`
   behind a `Database` interface used by 26 modules (`registry`, `approvals`,
   `projects`, `orchestrator`, `engineering`, `queue`, routes). A hosted store is
   an asynchronous migration of that surface, not a configuration change. `pg`
   and `@types/pg` are already dependencies.

## Security blocker to fix before any public deploy

`app/api/tay/bootstrap/route.ts` creates the founding owner for the first caller
once the database is empty. On a public origin that hands system-wide authority
to whoever posts first. Before the hosted environment is reachable, bootstrap
must require a server-only token from the protected console workflow and stop
accepting anonymous requests.

## Unblock sequence

1. Owner creates a free Neon Postgres project, copies its pooled connection
   string, and stores it in the file named below — not in chat.
2. Owner adds `DATABASE_URL` and the `TAY_*` variables in Netlify, enables branch
   deploys for `feat/tay-android-native`, and confirms the site is not on a paid
   plan.
3. Engineering: async Postgres store behind the migration runner, bootstrap
   token gate, session revocation verified across devices.
4. Push the branch; confirm `/api/build-info` reports the deployed commit and
   `/api/tay/session` answers without `503`.
5. Rebuild the Android release with
   `-PtayReleaseBaseUrl=https://<deployed-origin>`, sign with the existing key,
   regenerate `SHA256SUMS` and `BUILD-METADATA.txt`, and attach both files to a
   draft release.
6. Run the twelve-step synchronization acceptance flow on a physical device over
   cellular data. Until it passes, synchronization must not be described as
   complete.

## Local secrets file convention

`~/.config/transcenlutions/tay-cloud.env` (mode `0600`), never inside the
repository:

```
DATABASE_URL=
TAY_SESSION_SECRET=
TAY_PUBLIC_ORIGIN=
TAY_OWNER_EMAIL=
TAY_OWNER_NAME=
```

## Rollback

The Android artifact is additive; reverting the draft release and deleting the
attached APK/AAB restores the prior state. The database work is guarded by the
versioned migration runner, so a failed deploy is rolled back by redeploying the
previous commit; migrations are forward-only and must be reviewed before a
production rollout.

## Signing key backup

Back up `tay-release.jks` and its Keychain password to separate owner-controlled
locations. Loss of either prevents updates to an installed release, because the
certificate cannot be reissued.
