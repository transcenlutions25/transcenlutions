# Tay — native cloud-connected Android alpha

This module is a native Android client for the shared Transcenlutions Tay Cloud
account. It does not embed the web workspace in a WebView and it does not depend
on the owner's Mac, LAN address, localhost, or a manually entered server URL.

## Cloud flow

- Sign in through Supabase Auth over HTTPS.
- Store access and refresh tokens encrypted with Android Keystore.
- List and create durable cloud projects.
- Open saved conversations and message Tay through the authenticated `tay-api`
  Edge Function.
- Open the shared web workspace backed by the same project tables.
- Revoke the server session before clearing the local encrypted copy.
- Refresh expiring sessions without storing the password.

The password starts hidden and has an accessible eye-icon visibility toggle. The
password is never written to preferences, logs, build output, or source.

## Live endpoints

- API: `https://efmbtmlfqeiaczcqovkb.supabase.co/functions/v1/tay-api`
- Web: `https://efmbtmlfqeiaczcqovkb.supabase.co/functions/v1/tay-web`

The Supabase publishable key is intentionally a public client identifier. No
service-role key or database password is included in the Android application.
Database authorization is enforced with authenticated JWTs, server-side RPCs,
and row-level security.

## Build outputs

The GitHub workflow produces:

| Output | Purpose |
| --- | --- |
| `Tay-Cloud-Android-debug.apk` | Installable cloud-connected alpha signed with the CI debug certificate. |
| `Tay-Cloud-Android-unsigned.apk` | Release package for owner-controlled final signing. |
| `Tay-Cloud-Android-unsigned.aab` | Play bundle for owner-controlled final signing. |
| `SHA256SUMS` | Checksums of all exact outputs. |
| `BUILD-METADATA.txt` | Commit, package, version, backend, and release-state metadata. |

Debug application ID: `com.transcenlutions.tay.debug`.
Release application ID: `com.transcenlutions.tay`.
Version: `0.3.0-alpha` / code `3`.

## Reproduce locally

Requirements: JDK 17, Gradle 8.13, and an installed/licensed Android SDK with
`platforms;android-36` and `build-tools;35.0.0`.

```sh
bash android/tay/verify-environment.sh
gradle -p android/tay --no-daemon --no-build-cache --console=plain :app:lint :app:assembleDebug :app:assembleRelease :app:bundleRelease
python3 android/tay/verify-artifacts.py
```

## Distribution boundary

The debug APK is installable and cloud-connected for private alpha use. A public
Play release still requires owner-controlled stable signing, a Play Console
listing, policy declarations, real-device acceptance testing, and an explicit
release decision. The app requests only Internet access and disables cleartext
traffic in every build.
