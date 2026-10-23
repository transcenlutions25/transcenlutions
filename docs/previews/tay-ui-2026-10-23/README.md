# `/tay` visual review — 2026-10-23

These images were captured locally on 2026-10-23 from this branch. They are
review evidence, not a deployment or an authenticated account test.

## Unauthenticated production-route captures

`next build` + `next start` on commit under review, opened at `/tay`:

- `sign-in.png` — 1280×900 sign-in view.
- `password-recovery.png` — recovery view rendered from local hash tokens;
  no reset request was sent.
- `sign-in-mobile.png` — 390×844 sign-in view.

## Workspace harness captures

The signed-in workspace cannot be opened without the owner's credentials, so
`workspace-desktop.png`, `workspace-mobile.png` and `workspace-panel.png` use a
temporary local page that loads the real `public/tay` scripts and CSS but mocks
the existing `tay-api` responses. The mock is not committed and no network
request reached Supabase. The images verify layout, the 72×108 full-body header
companion, the centered left-panel portrait crop, caption text, panel
suspension, and mobile reflow. They do **not** verify account data, saved
history, permissions or a live cloud connection.

The Freebuff badge visible in the top-left is the browser preview overlay, not
part of the page.
