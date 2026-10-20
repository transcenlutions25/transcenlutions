# Tay — native Android alpha

This module is a native Android client for the consolidated Tay workspace. It is
not the Transcenlutions Arcade wrapper and it does not embed the web workspace in
a WebView.

## Current native flow

- Configure an HTTPS Tay server URL.
- Sign in through `/api/tay/session`.
- Store only the session cookie, encrypted with Android Keystore.
- List and create projects.
- Open a project and read its saved conversation.
- Send a message to Tay through the same project API used by the web workspace.
- Sign out or change servers.
- Show an honest unavailable state when the server has no durable workspace
  storage.

The password starts hidden and has an eye-icon visibility toggle. The password
is never written to preferences, logs, command arguments, or build output.

## Build outputs

The GitHub workflow produces:

| Output | Purpose |
| --- | --- |
| `Tay-Android-debug.apk` | Installable alpha build signed with the CI runner's temporary debug key. |
| `Tay-Android-unsigned.aab` | Unsigned release bundle for later owner-controlled production signing. |
| `SHA256SUMS` | Checksums for the exact generated files. |
| `BUILD-METADATA.txt` | Producing Git commit and package/version details. |

The debug application ID is `com.transcenlutions.tay.debug`. The proposed
release ID is `com.transcenlutions.tay`.

## Reproduce locally

Requirements: JDK 17, Gradle 8.13, and an installed/licensed Android SDK with
`platforms;android-36` and `build-tools;35.0.0`.

```sh
bash android/tay/verify-environment.sh
gradle -p android/tay --no-daemon --no-build-cache --console=plain :app:lint :app:assembleDebug :app:bundleRelease
python3 android/tay/verify-artifacts.py
```

## Server requirements

A functional account requires the consolidated Tay API and durable hosted
storage. The current Netlify preview intentionally returns an unavailable state
because local SQLite is not a safe shared serverless database. The app handles
that response; it does not create a fake local account or silently use a second
data store.

Release builds require HTTPS. Debug builds may use HTTP for local development,
for example an emulator connected to `http://10.0.2.2:3000`.

## Distribution boundaries

This is an installable native alpha, not a Google Play production release.
Production distribution still requires a stable owner-controlled signing key,
Play Console enrollment, store listing and policy declarations, device testing,
privacy/support URLs, durable backend storage, production identity, and release
approval. A debug APK may need to be uninstalled before installing a later build
signed by a different temporary debug certificate.
