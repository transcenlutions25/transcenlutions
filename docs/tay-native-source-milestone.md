# Tay Android native source milestone

Status: source-only, October 10, 2026. This is the first native Android surface in the canonical `transcenlutions25/transcenlutions` repository. It is not an installable APK release, connected assistant, or replacement backend. The shared [Tay canon](canon/MASTER_CANON_AND_SYSTEM_MAP.md) and [same-runtime directive](canon/TAY_COMMAND_BUILD_DIRECTIVE_2026-09-24.md) still apply.

## What this source does

- A real framework-native Java Activity, Android 12/API 31 or later: editable text and one Talk/Stop button, with an explicit Cancel control during dictation. No WebView or duplicate web app.
- Uses the existing black/purple/gold materials and the unchanged canonical `public/assets/tay-command-v1.png` artwork when packaging. Text scales in `sp`; controls are at least 56dp high; content scrolls with system/keyboard insets, visible native focus and labeled text input. Actual accessibility/layout QA is pending.
- Requests only microphone runtime permission, from a deliberate Talk action after explanation. Grants never auto-start listening. Denial retains text input. Normal Internet/network-state permissions support the future identity seam and an informational offline indicator.
- Uses `createOnDeviceSpeechRecognizer`, not a cloud-capable fallback. Installed language support is device-dependent. No model download, raw-audio file, background service, always-on microphone, Accessibility service, broad storage permission, or device-control grant.
- Final recognized text appends to the current draft without replacing edits made while speaking. Stop is idempotent; late results after cancel, timeout, pause or a new turn are ignored. Capture ends on screen pause. Dictation is bounded to a 60-second turn, with an 8-second finishing timeout.
- Saves one explicitly **device-local, unauthenticated scratch draft**, up to 16,000 UTF-16 code units. App-private no-backup storage uses a versioned, bounded, strict UTF-8 format and atomic replacement, explicit fsync, then read-back confirmation. Corrupt/unknown data remains untouched. Save failures remain visible; unsaved text is retained through Activity configuration recreation. Sudden process death before a confirmed save can still lose pending text.
- Shows Not synced, offline when Android reports no validated network, and Last confirmed sync: never. Editing does not wait for account connectivity. Nothing says Sent, Synced, or Tay replied.

Device-local text is not account authentication, not end-to-end encryption, and is accessible to someone using this unlocked app. It is not copied automatically into any signed-in account. A future import needs an explicit ownership decision and destination-account review; logout/revocation must not silently expose or merge another account's cache.

## Identity and shared-service boundary

`TrustedEndpoint` permits only the reviewed canonical HTTPS origin and fixed `/api/platform/identity` route. The resource origin defaults to empty. There is no URL/token entry UI, Intent/deep-link credential import, embedded key, or real session provider. The injected native session seam defaults to unavailable.

If a reviewed provider is integrated later, the read-only transport sends its short-lived session credential to that origin, rejects redirects and non-JSON/non-200 responses, bounds response bytes/time, accepts only the existing `source: authenticated` identity shape, and fences session changes and Activity cancellation. Identity verification never implies synchronization or grants authority. The current production endpoint still fails closed; configuring the URL alone cannot make sign-in work.

The authoritative continuity contracts remain [PR63](https://github.com/transcenlutions25/transcenlutions/pull/63) and the browser persistence/transport slice [PR69](https://github.com/transcenlutions25/transcenlutions/pull/69). They are not silently copied into a competing native backend. Real native integration must reuse their mutation IDs, contiguous server cursor, conflict retention, account boundaries, and non-executable task semantics. Every verified sign-in should attempt catch-up without blocking safe local use. Session/device/membership revocation is checked server-side on every request. Sync must never replay payments or execute tasks/tools.

Missing connected-path dependencies: chosen/approved authenticated backend, server-enforced account scope and durable sync route, reviewed native OAuth/PKCE and token custody/revocation, explicit account-cache/offline-unlock policy, same-agent context/model gateway, and native transport integration tests. No provider credential or sleeping private Mac is presumed available. Model inference, remote auth and cross-device reconciliation need a reachable service; local typing and available on-device dictation do not.

## Application identity

Proposed application ID: `com.transcenlutions.tay`, grounded in the canonical company and Tay names. Repository and public web/Play-index searches on October 10 found no conflicting Tay package. This is **not** proof of Play Console availability or a reservation. Confirm ownership before first signed distribution; do not reuse `com.transcenlutions.somebodyelse` from the unrelated local Capacitor app. No store registration or native signing identity was created.

## Verification and exact build

Run `node scripts/check-tay-native.mjs`. It compiles and executes the actual framework-independent draft, turn-fencing and trust-policy classes on the host JVM; parses all Java source syntax; checks XML/source safeguards and shell syntax. Host compilation uses Java 8 source/bytecode with the installed JVM libraries. It does **not** validate Android API types, run an Activity, exercise storage or microphone hardware, or authenticate an account.

`bash android/tay/scripts/build-sdk.sh /absolute/fresh/output` requires an already installed JDK17, `ANDROID_HOME/platforms/android-36/android.jar`, and Build Tools36.0.0 including its compile-only `core-lambda-stubs.jar`. It checks installed package metadata and the existing license hashes read-only. Missing tools or license records fail the build; there is no installer or license acceptance. It stages resources, runs AAPT2, compiles against the Android bootclasspath plus those SDK lambda stubs, runs D8, builds and aligns an **unsigned** APK, and checks manifest/package/minSDK/targetSDK/launcher/ZIP contents and checksum. SDK lambda stubs are not packaged into application classes/DEX. There are no Gradle/Maven downloads, AARs, manifest merging, generated BuildConfig assumptions, keys, signing or uploads. API31 compatibility still requires review/device testing despite compilation against API36.

The reviewed `.github/workflows/tay-native-source.yml` runs source-only verification on pull requests. It has `contents: read`, uses a pinned official checkout action and standard `ubuntu-24.04`, checks public canonical repository and same-repo head identity, checks out/logs the exact proposed head SHA, and uploads no artifacts or caches. It is limited to PR open/synchronize/reopen events targeting main and native-source/check-script/canonical-artwork/workflow paths; drafts are not excluded. GitHub documents standard public-runner compute as free; normal job logs remain. Private/larger runners or future artifact/cache uploads require a separate cost check. Unlike `workflow_dispatch`, normal `pull_request` evaluates the proposed merge-tree workflow without first merging into the default branch. The owner-authorized source build does not authorize a main merge.

These no-download/no-cache constraints describe the new Android job. Publishing the source PR also triggers the repository's existing, unchanged Launch and Security gates, which install their established web/test dependencies and use their established cache. Those safeguards are not removed or weakened. No new Android tool, dependency or signing credential is installed by the native job.

Compilation cannot produce a downloadable delivery in that recipe: the unsigned APK stays on the disposable runner. Installable development/release signing, trusted checksum delivery, physical-device QA and any store publishing are separate gates.

## Required Android/device acceptance before distribution

1. Build exact reviewed commit against real SDK; validate min31 and target36 APIs, manifest, permissions and signing certificate.
2. On API31 and a current Android device: microphone deny, grant, permanent denial, revocation, missing recognizer/language, silence, repeated Talk/Stop/Cancel, app switch, screen lock, process interruption, headset/audio interruption and stale callback.
3. Type while dictating; rotate/change theme while editing, while writing, and after injected write failure. Verify unsaved text remains through recreation and confirmed text survives restart. Corrupt/truncate the draft in a test harness: no overwrite. Test storage-full and retry. Process-kill-before-save loss must not be called saved.
4. TalkBack, external keyboard, large font/display scaling, landscape, narrow phone, tablet and keyboard insets. Keep every control reachable; check focus after dialogs/cancel.
5. Airplane mode: typing and supported on-device recognition work, with honest unsynced status. No remote STT fallback, audio upload or download. Inspect network behavior on a test device.
6. After real backend integration only: verified sign-in → nonblocking catch-up → persisted user message → second-device read → offline branch → reconnect/conflict preservation; account switch, revoked session/device, token expiry, redirects and adversarial responses. An identity badge alone never passes this test.

## Official technical sources

- [SpeechRecognizer lifecycle and on-device APIs](https://developer.android.com/reference/android/speech/SpeechRecognizer), [runtime permissions](https://developer.android.com/training/permissions/requesting), [Activity lifecycle](https://developer.android.com/guide/components/activities/activity-lifecycle)
- [AtomicFile](https://developer.android.com/reference/android/util/AtomicFile), [network security configuration](https://developer.android.com/privacy-and-security/security-config)
- [AAPT2](https://developer.android.com/tools/aapt2), [D8](https://developer.android.com/tools/d8), [zipalign](https://developer.android.com/tools/zipalign), [JDK17 javac](https://docs.oracle.com/en/java/javase/17/docs/specs/man/javac.html)
- [Official runner inventory](https://github.com/actions/runner-images/blob/main/images/ubuntu/Ubuntu2404-Readme.md), [Actions billing](https://docs.github.com/en/billing/concepts/product-billing/github-actions), [pull request workflow events](https://docs.github.com/en/actions/reference/workflows-and-actions/events-that-trigger-workflows#pull_request), [workflow trigger evaluation](https://docs.github.com/en/actions/how-tos/write-workflows/choose-when-workflows-run/trigger-a-workflow)
- [Android installed-license hash algorithm](https://android.googlesource.com/platform/tools/base/%2B/mirror-goog-studio-master-dev/repository/src/main/java/com/android/repository/api/License.java)

- [Android compile-only lambda stubs](https://android.googlesource.com/platform/libcore/%2B/refs/heads/android16-security-release/toolchainapi/Android.bp)
