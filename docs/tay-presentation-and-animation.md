# Tay presentation and animation (static `/tay` client)

Status: implemented and visually checked locally on 2026-10-23. Not deployed. The
root Next.js app and its APIs are unchanged.

## What is actually animated

There is **one** implemented motion: a whole-cutout standing sway.

| Item | Value |
| --- | --- |
| Source | `components/tay-header-presence.tsx`, `lib/tay-header-presence.ts` on PR #66 (`codex/tay-header-companion-20261010`) |
| Ported runtime | `public/tay/portrait-presence.js` |
| Motion | 50-second CSS cycle; still for 47 seconds, then a 3-second ±0.6° rotation |
| Origin | `50% 98%` |
| Asset | `public/tay/assets/Tay-approved-suit-fullbody-transparent-2026-10-17.png` (1024×1536, RGBA) |
| Pause | Visible Pause/Resume button, `aria-pressed`, device-local preference `tay.header.motion.v1` |
| Reduced motion | `prefers-reduced-motion: reduce` keeps the image static and disables the control with an explanatory label |
| Visibility | Plays only when the document is visible and the element is at least 25% intersecting |
| Suspension | The host pauses it while the context panel is open or while the mobile sidebar is covering the conversation |
| Failure | Missing image, missing `matchMedia`, missing `IntersectionObserver`, or failed image leaves static art and the rest of the workspace usable |

The same state machine and manifest shape as the reviewed React component are
preserved; the implementation is a dependency-free DOM port for this static
client. The only additional behavior is device-local pause persistence, using
the component's existing versioned storage contract.

## What does **not** exist

No rig, sprite atlas, Lottie/Rive file, video, viseme map, or layered artwork
was recovered. Therefore the following are not implemented and must not be
described as working:

- blinking or eye movement
- walking, weight shifts, or limb motion
- gestures (wave, sit, hat tip)
- facial expression or lip sync
- speaking/listening/thinking visual states
- live agent-activity indication

`public/tay/character-chat.mjs` contains the reviewed optional docker and the
`/tay show|hide|pause|resume|left|right|wave|sit` command surface. It is hidden
by default. `wave` and `sit` explicitly report that approved layered artwork is
required; they do not fake a pose. Its small perch reaction on ordinary button
presses is a 280 ms translation, not a gesture or status.

To add real animation later, the missing source is a layered character rig
(or equivalent sprite/video asset) with separately addressable face and limbs,
plus a documented idle/blink/talk state mapping. A single flattened PNG cannot
provide those states without inventing artwork.

## Composition rules

- The Tay header companion is the approved full-body cutout at 72×108 CSS px
  (48×72 on phones). It keeps its complete body, transparency, and aspect ratio.
- Every other Tay image uses the same complete source except the left-panel
  cover portrait.
- The left-panel cover uses `object-fit: cover` with `object-position: 50% 6%`
  inside a 160 px (88 px phone) frame. That is the one intentional centered
  portrait crop. Its caption is exactly **Transcenlutions**.
- The older `public/assets/tay-command-v1.png` is untouched. It reads
  "TAY COMMAND" and is not used as the `/tay` cover.
- No recovered cover artwork containing the words **Crowne Legacy** was found
  in the repository or history. That original cover is **UNRECOVERED**. The
  `/tay` cover therefore reuses the approved full-body asset and the exact
  required caption rather than inventing a replacement image or text.
- The unused non-transparent `Tay-canonical-ornate-suit-v1.png` is not shipped;
  it was a duplicate pose with an opaque background.

Asset bytes are recorded in `public/tay/assets/manifest.json`, including
SHA-256 and the explicit `notImplemented` list.

## Accessibility

- The decorative images have empty alt text or a descriptive cover alt; the
  stable text "Tay" carries identity.
- Pause is a real button with a visible label, visible focus, a 44 px target,
  an accessible description and `aria-pressed`.
- The description explicitly says the sway is decoration, not thinking,
  listening, or task progress.
- OS reduced-motion is respected live; the control explains why it is off.
- The optional character docker uses a labelled region, keyboard-reachable
  controls and an in-flow dock on small screens so it cannot cover the composer.

## Functional surface preserved

The static client's sign-in, password recovery, account setup, project list,
saved conversation reload, local writing drafts, copy/export, proposal-review
preview, and tool safety copy are unchanged. The `/tay` entry point is served
by a Next rewrite to `/tay/index.html`, with `<base href="/tay/">`, so the root
app and its API routes are not replaced or shadowed.

## Verification

- `node --test scripts/test-tay-presentation.mjs` covers asset hashes, the
  single-motion manifest, cover caption/framing, pause persistence, reduced
  motion, missing-observer failure, and functional-copy preservation.
- `npm run typecheck` passes on the branch.
- Local Next dev verified `/tay` returns 200 HTML, `/tay/index.html` returns
  200, and the CSS/PNG assets return 200 with the correct content types.
- Desktop 1280×900 and phone 390×844 render checks were captured locally. The
  signed-in workspace was rendered through a local mock of the existing cloud
  API shape; that is a UI harness, not proof of a live account connection.

## Review artifacts

- [Desktop workspace](previews/tay-ui-2026-10-23/workspace-desktop.png)
- [Mobile workspace](previews/tay-ui-2026-10-23/workspace-mobile.png)
- [Workspace panel open](previews/tay-ui-2026-10-23/workspace-panel.png)
- [Sign-in route](previews/tay-ui-2026-10-23/sign-in.png)
- [Password recovery route](previews/tay-ui-2026-10-23/password-recovery.png)
- [Mobile sign-in](previews/tay-ui-2026-10-23/sign-in-mobile.png)

The workspace images use a temporary local mock of the existing API shape
because no owner credentials were used; the sign-in and recovery images are
real unauthenticated `next start` captures. See the preview README for the
boundary.

## Limits and rollback

The Supabase project is reachable (`/functions/v1/tay-api/session` returns 401
without an auth header), but no owner credentials were used, so authenticated
conversation, saved history, and account data were not verified. Production
stays locked. Nothing was deployed, merged, or published.

Rollback is deleting `public/tay`, the `/tay` rewrite in `next.config.mjs`, and
the test/doc/manifest files. The root application has no dependency on them.
