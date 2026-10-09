# TapShare Product Spec

Status: Future build
Product owner: Transcenlutions / Tay
Execution rule: Preserve now; build when selected by the revenue-first roadmap.

## Product promise
Authenticate once, bring devices together, and securely share only the information the sender chooses.

## Primary experience
1. Launch TapShare from the lock screen or equivalent quick system surface.
2. Authenticate using the device's native biometric or device credential.
3. Choose My Card, a sharing preset, or an allowed contact.
4. Choose exactly which fields to share.
5. Bring the recipient device nearby.
6. Transport router chooses the best supported method.
7. Recipient previews the data and explicitly saves/opens it.

## Supported information
- name
- phone
- email
- photo
- company/title
- website
- address
- social profiles
- booking link
- payment link
- selected emergency contact information
- secure temporary link/file handoff

## Transport architecture
TapShare must not rely on legacy NFC beaming alone. Use a transport abstraction with platform-appropriate options:
- supported Android NFC/HCE flows
- native nearby/proximity mechanisms where available
- signed short-lived HTTPS token/link
- QR fallback
- web receiver for recipients without the app

## Security / privacy
- No private contact data on the unauthenticated lock screen.
- Native authentication before private selection/transfer.
- Least-data defaults and field-level consent.
- Explicit contacts permission only when needed.
- One-time, signed, expiring transfer tokens preferred.
- Recipient preview/accept before import.
- Minimal sensitive logging.
- Expired/replayed tokens must fail closed.

## Sharing presets
Personal, Business, Networking, Social, Emergency, Website, Payment, Guest Wi-Fi, Secure Link/File.

## Core modules
- system/lock-screen entry
- native auth gateway
- contacts/profile adapter
- preset manager
- field-consent UI
- transport router
- one-time token service
- recipient web/native preview
- vCard/contact export/import
- privacy-safe telemetry
- SDK/API layer

## Cross-platform rule
Treat Android and iOS as separate native capability surfaces behind one product behavior. Re-check current Android/iOS APIs and app-store policy before implementation. Do not assume unrestricted NFC card emulation on iOS.

## Transcenlutions integration
Build TapShare as a reusable Secure TapShare Engine for Tay and other Transcenlutions products. Candidate integrations include lead capture, digital business cards, checkout/payment links, appointment/booking links, company profiles, product links, and secure app-to-app handoff.

## Monetization
- Free: personal card/basic sharing
- Pro: advanced presets, branding, analytics
- Business: team cards, lead capture, CRM/webhooks
- Platform: white-label + SDK/API
- Enterprise: managed identity/handoff workflows where supported

## MVP acceptance criteria
- quick lock-screen/equivalent entry on supported Android and iOS
- native auth gates private information
- sender chooses a card/contact and individual fields
- at least one proximity transport works
- QR/link fallback works
- recipient can receive without installing TapShare
- preview + save/import works
- one-time token expiry/replay protection works
- denied-permission, offline, unsupported-NFC and cross-platform paths are tested
- no new paid dependency is added without owner approval

## Tay build instruction
When activated, Tay should first validate current mobile platform constraints, then produce the lowest-cost shippable MVP plan, reuse existing Transcenlutions infrastructure, create an implementation branch, add tests, and keep the build tied to a clear monetization path.