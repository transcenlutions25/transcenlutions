# Tay header companion: isolated implementation

Status: additive implementation prepared for review, **not wired into the app or deployed**. Publishing a draft pull request does not integrate this component into the UI.
Base: PR64 head `3052d0d957674c98254e67c4cbc9ce262bcae55c`.

## Scope and artwork

`TayHeaderPresence` displays the approved full-body Kangol image beside the unchanged text **Tay**. A three-second, 0.6-degree standing-pose sway occurs after 47 quiet seconds in a 50-second CSS cycle. This is whole-cutout movement, not walking, blinking, speech, hat tipping, or a rig. It is decoration, never evidence of agent execution.

The exact owner-approved `TayCommand-fullbody-Kangol-gray-patch-v2.png` is bundled under `public/assets/tay-header/`. Pixel inspection verified the black Kangol/gold kangaroo emblem, visible front gray hair patch, royal black/gold jeweled clothing, purple pocket square, both legs and shoes, and the original standing pose. Its SHA-256 is `427ae508d23e794f92bd9a011793172a5f2f76999d19fe079e7c37e8c9e4015b`; dimensions are 1024 × 1536 with alpha. The original bytes are unchanged.

The original is 1,727,605 bytes and approximately 6 MiB decoded as RGBA. Existing Next Image optimization and a component-size `sizes` hint request appropriately sized delivery candidates without adding a dependency or external integration. The original remains bundled for static export and other surfaces. Delivery byte counts and device performance have not been measured. The separate approved hat is not loaded or bundled because the standing artwork already contains its hat.

`public/assets/tay-header/manifest.json` records the asset hash, dimensions, standing-pose timing, transform anchors and unsupported motions. The assets are owner-approved project artwork. No separate embedded license or creation record was found; they must not be relabelled as public-domain or third-party stock. The protected older `public/assets/tay-command-v1.png` is untouched.

## Component contract

Props:
- `agentId` (required): the canonical `AgentId`; nothing renders for Dawn, KJ or Rory.
- `size`: `compact` by default; `roomy` is an explicit larger, 96px art variant for a separate view. Compact art is 44px high within a minimum-48px companion.
- `tone`: `dark` by default, or `light` for the light mobile surface.
- `suspended`: the host can stop decoration while a dialog or competing experience covers it.
- `onOpenControls`, `controlsExpanded`, `controlsId`: optional connection to the existing conversation-controls action. The identity button and motion button remain siblings; never put the entire component inside another button.

The text never transforms, fades, changes spelling, or depends on an image loading. The art has empty alt text and is hidden from the accessibility tree. The Pause/Resume button has a visible label, a descriptive accessible name, keyboard support, visible focus and a minimum 44px target. The art is clipped inside its own in-flow non-interactive slot and cannot overlay the composer or another control. At larger text sizes the group can wrap rather than shrinking its text. Final host layout still needs visual verification.

The compact image is deliberately small; it does not make the detailed face or gray patch independently legible. Stable text carries identity. The roomier view is optional and must not enlarge the main chat header by default.

## Motion and persistence behavior

- Server output and initial hydration are static until preferences, image loading and visibility have been checked.
- The operating system's `prefers-reduced-motion: reduce` keeps animation off, including when changed live. A CSS override protects the pre-hydration state too. Pause/Resume is disabled with an explanatory accessible label while reduced motion is enabled.
- Missing motion-preference or IntersectionObserver support fails safely to static artwork. No polling or per-frame JavaScript loop is introduced.
- Document visibility and at least 25% element intersection are required to play. Offscreen, hidden, suspended, paused, failed-image and not-yet-loaded states do not animate.
- Pause/resume uses CSS playback state, so no missed-cycle catch-up occurs. The only motion is rotation of the image; the label and controls remain still.
- A versioned, local motion preference stores only `{version: 1, paused: boolean}`. Hydration never writes the preference. Changes are persisted after explicit user action. Malformed or unreadable settings default to still; storage write failure retains the user's in-memory choice. Same-batch repeated clicks use the latest state. In-memory pause survives agent changes while this component remains mounted.
- A saved pause survives a component remount or page reload. No account synchronization or cross-tab live synchronization is claimed.
- Failed artwork leaves the title and optional conversation-controls action working. Only decoration becomes unavailable. No generic avatar substitutes for the approved image.

## Integration boundary

This change does not modify `workspace-frame.tsx`, `chat-shell.tsx`, app/global/mobile CSS, dependencies, package scripts, runtime state, authority, external connections or deployment settings.

After independent review, the integrating builder should place the component in the current identity area, pass the active canonical agent ID and the existing controls handler/ARIA state, retain other agents' identity rendering, supply the current tone, and suspend it for covering dialogs. Keep pause separate from the identity action. Do not mount it inside the current title button, duplicate the visible Tay name, or remove existing Voice/Menu buttons. The new tests are invoked directly; the integrating builder must add them to the relevant aggregate gate when integration is approved.

The host **must** pass `suspended` while a covering mobile dialog is open. IntersectionObserver reports geometric intersection; it cannot determine that a different layer covers the artwork. Preserve the existing dialog controls and focus-restoration behavior when wiring this condition.

The shared Mac Chrome launcher can use the same React/CSS component. A genuinely native mobile renderer may reuse the original asset and manifest, but that renderer and native accessibility behavior are not implemented here. Bundled images do not by themselves make the hosted application work offline; no new offline shell or service worker is claimed.

## Verification and exact limits

Run from the worktree:

```sh
node --test scripts/test-tay-header-presence.cjs
npm run typecheck
npm run lint
npm run test:workspace
npm run test:identity
npm run security
npm run test:workflows
npm run build
```

Verified locally on 2026-10-10: all 22 focused tests passed, as did typecheck, lint/public-copy guard, workspace/mobile regression suite, identity, security, workflow/Apex/Python/desktop-runtime tests, smoke tests, desktop queue JavaScript syntax check, and the production build. Checks used the existing installed dependencies and Node 24.19.0; no installation was performed. `NEXT_TELEMETRY_DISABLED=1` was used for the final Next checks because this executor's telemetry-config directory is read-only. The production build does not mount this unintegrated component and is not a substitute for its isolated/browser verification.

The focused suite covers preference parsing, all motion gates, static server rendering, Tay-only rendering, image loading/failure, pause/reload/agent changes, same-batch and repeated clicks, live reduced-motion changes, offscreen/hidden/suspended states, denied/quota storage, missing/legacy/partial browser support, sibling controls, Strict Mode cleanup, optional variants and exact asset provenance. Its mounted DOM tests do not prove visual layout or screen-reader behavior.

Optional repeatable browser check using an already-installed Playwright and Chromium:

```sh
TAY_HEADER_SCREENSHOTS=/absolute/path/for/screenshots node scripts/browser-tay-header-presence.cjs
```

Set `TAY_TEST_CHROME` for a different installed executable. This script creates and removes a throwaway local Next app, imports the real component and scoped CSS alongside the existing workspace/mobile CSS, and never creates a production route. It checks keyboard pause, persistence, live reduced motion, active sway, offscreen pause, narrow layout, larger text, variant selection and Tay-only rendering. It requires no package installation and never publishes.

On this executor the temporary Next fixture compiled and served, but Chromium could not launch: its process-singleton socket returned `Operation not permitted`, including after an approved elevated retry. Therefore **browser assertions and screenshots have not run**. Actual integrated layout, mobile devices, 200%/400% browser zoom, screen readers, forced colors, battery/paint behavior and cold offline loading remain unverified. Do not describe the component as visually approved or release-ready on the strength of the DOM tests alone.

The existing security audit reports zero affected production dependencies and seven existing build-tool findings under a dated exception. This additive change neither updates nor relaxes that exception.

## Technical references

- [W3C Pause, Stop, Hide](https://www.w3.org/WAI/WCAG22/Understanding/pause-stop-hide.html)
- [MDN reduced-motion preference](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/At-rules/@media/prefers-reduced-motion)
- [MDN animation playback state](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Properties/animation-play-state)
- [MDN Page Visibility](https://developer.mozilla.org/en-US/docs/Web/API/Page_Visibility_API)
- [Chrome team animation performance guide](https://web.dev/articles/animations-guide)
