# Transcenlutions Arcade — Google Play release materials

**Status: DRAFT — not submitted or published.** Prepared October 17, 2026 from the game code in `public/arcade` and the offline Android host. The product contains four original games. Android compilation, device verification, owner registration, signing, and Google Play review are separate release gates; check the recorded build and test results before submission.

## Store listing text

### App name

Transcenlutions Arcade

### Short description

Four original offline games: place blocks, sort colors, link pipes, and run

### Full description

Make room for play with four original games by Transcenlutions.

CROWN GRID
Choose from a tray of block pieces, rotate them, and fit them onto the board. Complete rows and columns to clear space and keep your next move open. Try free play or the date-based daily challenge.

PRISM SORT
Pour matching colors and symbols between tubes until each color has its own full tube. Plan your moves, undo a pour, or restart the same level.

ORBIT LINK
Turn pipe tiles to build a continuous path from START to END. Follow the powered connection, work around fixed tiles, and use a hint when you want a nudge.

LUMEN RUN
Move between three lanes, collect gold sparks, and avoid barriers. Watch your three shields, choose a standard or relaxed pace, and pause whenever you need.

YOUR GAME, ON YOUR DEVICE
The Android game includes its game files for offline play. Save sessions, best scores, and puzzle progress on your device. No account is required.

Choose larger text, stronger contrast, reduced decorative motion, and optional game sounds. Colors in Prism Sort also have symbols. Touch controls are provided, with keyboard controls available when a keyboard is connected. In-game instructions explain each mode.

This version has no advertising or in-app purchases. Sound is generated on your device and is off by default. Removing app data or uninstalling the game removes local progress.

## Submission fields and declarations

These are preparation notes, not declarations already sent to Google.

| Field | Prepared answer or remaining action | Evidence / scope |
| --- | --- | --- |
| App or game | Game | Four interactive game modes in `app.mjs` and `engine.mjs`. |
| Category | Puzzle is the proposed category; confirm in Play Console | Three puzzle modes and one lane runner. |
| Version | 1.0.0, version code 1 | `android/arcade/app/build.gradle`. |
| Release package | `com.transcenlutions.arcade` | Proposed identifier; not verified as registered/available in Play Console. |
| Debug package | `com.transcenlutions.arcade.debug` | Test-only package; do not use its temporary signing identity for production. |
| Price / paid features | No in-app products are implemented. The draft assumes a free download; verify the chosen store price before submission. | No Billing, Stripe, payment SDK, purchase UI, or paid entitlement. |
| Contains ads | No for this package | No advertising SDK or ad placements in the reviewed game. |
| App access | All four modes are available without an account or reviewer credentials | No login, subscription, geofence, or protected game area. |
| Android permissions | None | Manifest has no `uses-permission`; CI checks the built APK. |
| Advertising ID | Not used | No AD_ID permission or advertising SDK. |
| Support email | `transcenlutions@gmail.com` is the contact displayed in the game; verify the inbox is operational before submission | Do not claim a support response time that has not been established. |
| Website | Proposed: `https://transcenlutions.com` | Verify the operational site and final game entry URL at release. |
| Privacy-policy URL | Required; use the verified HTTPS URL of the deployed `public/arcade/privacy.html` | No URL is asserted live by this file. The Android bundle also includes this page. |
| Target audience | Not selected | Select the intended ages truthfully. The store listing makes no child-directed or “all ages” claim. If children are included, apply the relevant Families requirements. |
| Content rating | Not assigned | Complete Google's actual questionnaire. The runner has abstract barriers and shields; do not invent an IARC rating or mark the questionnaire complete. |
| Android compatibility | Minimum API 26; target API 36 | Actual device support still needs build/install/play verification. |

## Data safety preparation

The table below applies to this **Android package**, not the hosted website or Google's own store services. Recheck the final signed release and every added SDK before using the answers in Play Console.

| Topic | Current implementation | Prepared disclosure |
| --- | --- | --- |
| Data collected by the game off device | No game network requests; Android Internet permission is absent; nonlocal navigation/resource requests are blocked | No app data collected under the current implementation. |
| Data shared with other organizations | No backend, advertising, analytics, messaging, or third-party data transfer integration | No app data shared under the current implementation. |
| Local data | Saved sessions, best scores, unlocked puzzle levels, daily challenge state, display preferences, and sound preference in WebView local storage | On-device processing/storage; explain it in the privacy policy. |
| Personal identifiers and accounts | No registration or login | No account information collected by the game. |
| Location, camera, microphone, contacts | No associated permissions or access | Not used by the game. Synthesized tones are not audio recording. |
| Advertising and analytics | No associated SDKs | Not used. |
| Security in transit | There is no game data transmission | Do not claim independent encryption validation or security certification. Answer only the fields shown for a no-collection app. |
| Data deletion | The Progress panel can clear local arcade data; Android app-data clearing or uninstall also removes it | No server account/deletion request is involved. Confirm the clear-data journey in the final build. |
| Export | Web edition uses a local file download; Android displays selectable JSON with a Copy control and manual-copy fallback | The dialog and both clipboard outcomes pass automated UI checks. Confirm them on the final Android device build. No automatic transmission is implemented. |
| Backup | Android backup is disabled and extraction rules exclude app-data domains | No game-provided cloud synchronization or backup. The operating system and any action the user chooses outside the game remain separate. |

Google requires an accurate Data safety form and privacy-policy link even for a game declaring no data collection. Exclusively internal-test apps are exempt from that form; closed, open, and production releases are not. Do not use a no-collection declaration for a later version that adds a remote service or SDK without reviewing it again.

## Assets still requiring final capture

Use screenshots from the verified build. Capture the actual home screen, Crown Grid, Prism Sort, Orbit Link, Lumen Run, and a useful settings/progress view. Do not fabricate gameplay, scores, features, a download rank, ratings, awards, player counts, or a Google Play badge suggesting publication.

The source includes an original native launcher icon and web SVG icon. `products/arcade/store-assets/` also contains the square listing icon, original feature artwork and a reproducible renderer. The rendered listing icon is 512 × 512 RGBA PNG (37,013 bytes); the feature graphic is 1024 × 500 RGB PNG without alpha (115,825 bytes). Both were visually inspected at their exported sizes. These are artwork, not gameplay screenshots. Actual Android screenshots and any promotional video remain unprepared.

## Release gates

1. Verify a passing Android workflow for the intended commit, including lint, exact packaged asset checks, APK signature, zero permissions, and unsigned AAB checks.
2. Verify real-device offline launch and all four modes, game-over/replay, saved progress, pause/resume, rotation, system back, JSON export, and large-text controls.
3. Complete the owner's actual Google Play developer registration and identity verification. The account signup screen is a blocker; this preparation does not register the developer or pay the fee.
4. Complete owner-controlled production signing and preserve the stable signing identity. The CI debug certificate is temporary and the release AAB is intentionally unsigned.
5. Complete store assets, operational contact, live privacy URL, accurate audience/rating/Data safety/ads declarations, and any required closed testing.
6. Submit the real signed release. Record the live Play listing and successful install before marking the game published.

## Official requirements checked October 17, 2026

- [Create and set up your app — title/description limits, package identity, signing, and support details](https://support.google.com/googleplay/android-developer/answer/9859152)
- [Target API levels — new phone/tablet apps target Android 16 / API 36](https://support.google.com/googleplay/android-developer/answer/11926878)
- [Developer registration — one-time US$25 registration fee, agreement, and verification](https://support.google.com/googleplay/android-developer/answer/6112435)
- [Required developer account information](https://support.google.com/googleplay/android-developer/answer/13628312)
- [Testing for new personal accounts — applicable accounts require at least 12 continuously opted-in testers for 14 days before applying for production access](https://support.google.com/googleplay/android-developer/answer/14151465)
- [Data safety declarations](https://support.google.com/googleplay/android-developer/answer/10787469)
- [Preparing app content and review declarations](https://support.google.com/googleplay/android-developer/answer/9859455)
- [Preview asset requirements](https://support.google.com/googleplay/android-developer/answer/9866151)
- [Intellectual property policy](https://support.google.com/googleplay/android-developer/answer/9888072)
- [Spam and repetitive content policy](https://support.google.com/googleplay/android-developer/answer/9899034)
- [Payments policy, if future monetization is added](https://support.google.com/googleplay/android-developer/answer/9858738)
