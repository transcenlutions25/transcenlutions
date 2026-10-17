# Transcenlutions Arcade — Android

An Android host for the original four-mode arcade in `public/arcade`. The same game files are bundled into the application at build time and run entirely on the device. This module does not connect to Tay identity, entitlements, commerce, or account services. The portable browser and Android forms share source; automatic account-library registration is not implemented.

## Build status and outputs

The workflow is a build pipeline, not Google Play publication. A successful run produces:

| Output | Purpose |
| --- | --- |
| `Transcenlutions-Arcade-debug.apk` | Installable Android test build, signed with the CI runner's temporary debug key. |
| `Transcenlutions-Arcade-unsigned.aab` | Release bundle prepared for owner-controlled production signing; cannot be installed directly or submitted unsigned. |
| `SHA256SUMS` | Checksums of those exact files. |
| Lint reports | Android static-analysis results from that build. |

Until a successful workflow run and device testing are recorded, compilation and Android device behavior remain unverified. A passing build does not establish Play acceptance or publication.

The debug application ID is `com.transcenlutions.arcade.debug`; the proposed release ID is `com.transcenlutions.arcade`. These are build identifiers, not registered Play package names. No release signing key, billing product, developer account, or store listing is created here.

## Reproduce a build

Requirements: JDK 17 with `javac`, Gradle 8.13, and an already installed and licensed Android SDK containing `platforms;android-36` and `build-tools;35.0.0`. Android Gradle Plugin is pinned to 8.13.2 and AndroidX WebKit to 1.17.1.

From the repository root:

```sh
bash android/arcade/verify-environment.sh
gradle -p android/arcade --no-daemon --no-build-cache --console=plain :app:lint :app:assembleDebug :app:bundleRelease
python3 android/arcade/verify-artifacts.py
```

Set `ANDROID_HOME` to your existing SDK directory, or use your IDE's installed SDK. The build does not run `sdkmanager`, accept licenses, or download missing SDK components. Missing components cause a clear failure. Gradle and its Maven dependencies must already be available or retrievable from their official repositories.

The `Arcade Android build` GitHub Actions workflow uses the standard `ubuntu-24.04` image, checks its preinstalled SDK, pins action source commits, and runs with read-only repository permission. It needs no secrets. It runs only for relevant changes in a public repository or a manual dispatch. No paid runner, deployment, Play submission, cloud device farm, or build-scan service is configured. Existing Security gate and Launch gate checks still apply to the repository release.

## Test installation

Download the APK from the matching successful workflow artifact and install it on an Android 8.0+ device using the device's normal package installer. It is a test app and should be identified as such. An AAB is not an APK download.

The CI debug signing key is temporary. A later run may use a different debug certificate; Android can then require uninstalling the previous debug app before installation. Uninstalling clears its local progress. Production updates will require the owner's stable signing setup.

Before claiming Android readiness, check launch in airplane mode; all four modes; restart, pause, and return-home controls; hardware/gesture back; switching away and returning; rotation/resizing; readable large text; screen-reader navigation; and a complete game-over/replay cycle. Verify local progress persists across a normal app restart and that no permissions are requested. Use the lint reports and real device results together.

## Android host behavior

- The local game loads at `https://appassets.androidplatform.net/assets/www/index.html` through AndroidX `WebViewAssetLoader`. It never loads a remote website.
- The module explicitly serves `.mjs` files as `text/javascript`, so ES module imports work in Android WebView.
- Every other origin, file/content URL, and traversal path is rejected. The app requests no Android permissions, including Internet, and blocks network loads.
- There is no native JavaScript interface, file chooser, geolocation, advertising, analytics, payment SDK, account, or push-notification integration.
- Progress stays in local WebView storage. Cloud backup and device-transfer extraction are disabled. Removing app storage or uninstalling the game removes this data.
- Android insets keep gameplay clear of status and navigation controls. The renderer has a native recovery screen rather than silently closing the app.
- The Android game already contains its offline assets. The frontend must skip service-worker registration when the hostname is `appassets.androidplatform.net`, avoiding stale web caches after an APK update.

### Frontend contract

All asset URLs must be relative so the bundle works both in the browser and under `/assets/www/`.

```js
window.TranscenlutionsArcade = {
  androidBack() {
    // Close a modal or return from a game to home, then return true.
    // Return false at the arcade home screen to permit Android to exit.
  }
};
window.addEventListener('transcenlutions:pause', pauseGame);
window.addEventListener('transcenlutions:resume', showResumeControl);
```

The host sends only fixed lifecycle/back scripts. Foregrounding must not silently restart a timed game; the player should choose when to continue. The browser should also handle `visibilitychange` for its own pause behavior.

## Play release preparation

Current build target: API 36, version code 1, version name 1.0.0. The release bundle is unsigned. The owner must complete the actual developer account/verification and signing setup, select accurate audience/content ratings, provide an operational support contact and hosted privacy policy, complete the Data safety and ads declarations, and meet any account-specific testing requirement before submission. No claim of zero-data collection should be reused after adding remote content or SDKs without a fresh audit.

The Android module's intended declaration is no ads, no account, no collected/shared app data, and no requested permissions; verify these against the final package and game code. The app's privacy page is bundled in `public/arcade/privacy.html`. Publishing it at a web URL is a separate hosted-app release.

This is original Transcenlutions work using common game genres. It does not include competitors' source, names, images, music, characters, levels, or store assets. Store assets and claims must describe the actual game, not imply affiliation with other titles or promise download/revenue results.

## Sources checked October 17, 2026

- [Local WebView content and asset loading](https://developer.android.com/develop/ui/views/layout/webapps/load-local-content)
- [Android Gradle Plugin 8.13 compatibility](https://developer.android.com/build/releases/agp-8-13-0-release-notes)
- [AndroidX WebKit releases](https://developer.android.com/jetpack/androidx/releases/webkit)
- [GitHub Ubuntu 24.04 runner contents](https://github.com/actions/runner-images/blob/main/images/ubuntu/Ubuntu2404-Readme.md)
- [Google Play API-level requirements](https://support.google.com/googleplay/android-developer/answer/11926878)
- [New personal-account testing](https://support.google.com/googleplay/android-developer/answer/14151465)
- [Data safety requirements](https://support.google.com/googleplay/android-developer/answer/10787469)
- [Google Play repetitive-content policy](https://support.google.com/googleplay/android-developer/answer/9899034)
