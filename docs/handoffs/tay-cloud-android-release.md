# Tay Cloud Android private-alpha release

Source branch: `feat/tay-android-native`.

## Deployed shared services

- Supabase project: `Tay` (`efmbtmlfqeiaczcqovkb`).
- Native API: `https://efmbtmlfqeiaczcqovkb.supabase.co/functions/v1/tay-api`.
- Shared web workspace: `https://efmbtmlfqeiaczcqovkb.supabase.co/functions/v1/tay-web`.
- Database: Supabase Postgres with RLS, authenticated RPC boundaries and one immutable founding-owner profile.

The Android client and web workspace use the same Supabase Auth identity, project,
conversation, message and memory rows. They do not require the owner's Mac or a
LAN address.

## Android release

- Package: `com.transcenlutions.tay`.
- Version: `0.3.0-alpha` / code `3`.
- Native Java/views client; no WebView wrapper.
- HTTPS-only; no server-selector screen.
- Password show/hide toggle.
- Access and refresh tokens encrypted with Android Keystore.
- Server-side global logout/revocation before local token removal.
- Build produces a debug-signed installable APK plus owner-signing handoff APK/AAB.

## Verified

- Cloud schema and RPCs created successfully.
- Existing confirmed Transcenlutions auth identity bound as the sole founding owner.
- RLS owner access and project listing verified.
- Conversation append/get tested transactionally without retaining test rows.
- Edge Functions deployed active.
- Android lint, debug APK, release APK, AAB, artifact verification and upload passed in GitHub Actions.
- Owner APK signature verifies with Android signature schemes v2 and v3.
- Owner AAB JAR signature verifies with the same stable signing certificate.

## Honest boundaries

This is a private alpha, not a Google Play publication. Tay replies currently use
a deterministic built-in cloud response layer. Paid model providers, live
payments, outbound communications, background autonomous work and public account
registration are not enabled. Approval records are readable and decision RPCs
exist, but the native alpha does not yet render the complete visual approval
slideshow or apply arbitrary project-file changes.

The owner-signed APK and AAB are handed off outside GitHub because the stable
keystore and its password must never enter the public repository or CI logs.
