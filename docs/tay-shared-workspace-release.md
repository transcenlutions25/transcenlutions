# Mac Tay becomes the shared workspace

## Source and preservation

The existing Mac Tay interface is the visual reference and the face of the shared application. GitHub `transcenlutions25/transcenlutions` remains the durable source. This integration starts at GitHub main `914305066231c9dae3b2772e32eec93b993c0564`.

The working Mac source at `~/Tay/window` and its parent dependencies are preserved under `integrations/tay-desktop/legacy/`. Original source hashes and migration limits are recorded in `docs/tay-desktop-feature-map.md`. No chat history, SQLite database, API key, browser profile, or private project state belongs in GitHub.

The other dirty checkout at `~/Documents/Transcenlutions` was left intact. Its newer cleaning/dispatch/PWA and Somebody Else work is preserved there and in `~/Tay/checkpoints/20261001-safe-recovery/github-worktree`. It is separate work, not a replacement for the Mac Tay face. The original Mac server and local projects remain available.

## Implemented shared experience

- Mac Tay image, purple/black/gold glass styling, persistent left navigation, center conversation, bottom input, and one resizable contextual side panel.
- Pinned, Projects, Scheduled, Plugins, Explore, Recent, and Workspace Library remain discoverable. Collapse, resize, maximize, mobile drawers, keyboard resizing and focus restoration are functional.
- Chat, Plan and Execute preserve existing governance. Self-dev opens the existing reviewed Mac workflow where available. Hosted Tay Core remains a guided foundation rather than claiming a connected generative model.
- Tay, Dawn, KJ (Head of Ascended Forge), and Rory maintain their distinct authority. Rory remains disabled in the desktop model adapter until child-safety controls exist. KJ cannot spend, publish, or execute local tasks by selecting its name.
- Web objectives queue without replacing unfinished moves. Three or more objectives can wait, be edited, paused, reordered, cancelled and explicitly started. Execution and approval remain separate. Completed actions cannot execute again after reload.
- The same Next interface can connect to the existing durable Mac queue through a server-only loopback adapter. The server maintains serial execution, request idempotency, conversation scope, dependencies, checkpoint steering, retries and recovery. Provider keys are not persisted or forwarded from browser cookies.
- Reusable writing is directly editable, copies the exact current text, preserves original/user/AI revisions, supports undo/redo, exports text, and saves assets. Clipboard errors have a legacy and manual fallback. Mac selection rewrites use a real isolated local model objective and reject stale results. Hosted rewrites clearly say they are not connected. Rich formatted copy, send and publish are not claimed implemented.
- Existing sales, revenue, fulfillment, founder, launch, deployment, governance, memory, feedback, activity and operating-graph integration remain behind the shared face. Voice puts its transcript into the editable draft rather than sending prematurely.
- Optional Crowne Momentum counts completed work once. A three-move daily crown has no missed-day penalty. It is not revenue, demand validation, or evidence of an external deployment.

## Design research applied

We adopted interaction patterns, with original Transcenlutions styling and artwork. No third-party platform source code, brand asset, or proprietary screen was copied.

- [Notion sidebar documentation](https://www.notion.com/help/navigate-with-the-sidebar): persistent navigation, collapsible categories, favorites and recents help users resume work. Applied to Tay's existing section names and brand.
- [Linear custom views](https://linear.app/docs/custom-views): focused context and visible work status. Applied to a dominant conversation and a single contextual tool panel, rather than stacked dashboards.
- [Duolingo's published streak experiments](https://blog.duolingo.com/improving-the-streak/): short achievable goals and reduced pressure. Applied as optional completion-based momentum without punitive streak loss or fabricated rewards.

These are design hypotheses for Tay. Their success elsewhere does not validate Tay's retention, conversion, demand, or virality. Actual user feedback and completed-work usefulness are still required.

## Verified procedure and release gate

1. Inspect remote main, all local dirty trees, Mac entry points, local services and private-state locations before editing.
2. Preserve local work; build in the isolated recovery checkout on a feature branch. Do not reset the dirty checkout or replace Mac runtime data.
3. Preserve the Mac's source and visual assets, then place existing web modules behind the shared workspace.
4. Validate TypeScript, lint and public copy, identity rules, existing smoke flows, writing state, queue helpers, loopback boundaries, durable Python runtime, and original legacy tests.
5. Browser-test the real shared UI with fresh browser storage. Test Mac queue behavior against `integrations/tay-desktop/tests/fixture_server.py` using temporary state and a held test provider; never use owner conversations for destructive testing.
6. Test exact copy, authored reload persistence, history recovery, three waiting objectives, steering, blocked/approved action behavior, mobile widths and focus restoration.
7. Build with locked dependencies. Create a Git checkpoint and push a feature branch to the existing repository; do not force-push main.
8. Open a PR and wait for Launch Gate. Merge only the tested head after all required checks pass. Netlify continues from main with existing test configuration.
9. Verify the deployed homepage and legal/support routes, test payment behavior, and `/api/build-info` against the merged SHA. A green Netlify build alone is insufficient.

Integration defects corrected during verification: captured queue scope before dispatch; prevented stale poll responses replacing accepted mutations; retained stable acceptance IDs; protected drafts during failed conversation switches; pinned the owner-selected desktop conversation across reload; kept concurrent hosted/desktop build directories separate; restored mobile focus after removing inert background; froze writing block types and identities during editing; prevented saved-asset duplication; made malformed adapter JSON a client error rather than a false runtime outage.

Dependency maintenance was necessary before release: the baseline Next 14.2.15 had known critical advisories. The older 14.2 patch did not cover newer advisories. Next and its lint configuration were upgraded to 15.5.24 while retaining React 18.3.1, with the one dynamic adapter route updated for asynchronous parameters. [The official Next advisory](https://github.com/vercel/next.js/security/advisories/GHSA-2xp9-vwfh-vxw4) identifies the patched release. PostCSS is pinned to 8.5.24 and the Next transitive copy uses the same patched version through an explicit override. The dependency lock is regenerated and verified; no forced framework/Tailwind/React upgrade was used.

The regenerated dependency audit reports no production vulnerabilities. Seven development-tool findings remain in the Tailwind/ESLint glob tooling; the package manager recommends a breaking Tailwind upgrade for them. This release does not force that unrelated migration or claim all dependencies are vulnerability-free. Production audit is now part of Launch Gate.

## Running and checking

Normal hosted application: `npm ci`, `npm run typecheck`, `npm run test:identity`, `npm run test:workspace`, `npm run lint`, `npm run smoke`, `npm run build`.

Desktop runtime: `python3 -m unittest discover -s integrations/tay-desktop/tests -v`.

Existing original Mac tests are in `integrations/tay-desktop/legacy/window/`; their documented isolated invocation preserves the owner's state.

Optional shared Mac launcher: `python3 integrations/tay-desktop/legacy/launch_shared.py --checkout /path/to/transcenlutions --build`. It builds this checkout to `.next-desktop`, serves the same app on `127.0.0.1:18745`, and connects to the existing Mac service on `127.0.0.1:18743`. It refuses port collisions, never installs dependencies, and does not restart or overwrite the original server. The consolidated release uses Node 24 (24.15.0 or later) for local development, CI and Netlify; the Apex DOM test harness requires this baseline.

Optional browser suite uses an installed Playwright environment and Chrome: `node scripts/browser-workspace.cjs`. Set `TAY_TEST_WEB_URL` for the hosted test instance. Desktop fixture tests require explicit `TAY_TEST_DESKTOP_URL` and `TAY_TEST_FIXTURE_URL`; point them only at the isolated fixture. Start a separate Next instance with `TAY_DESKTOP_BRIDGE_URL=http://127.0.0.1:18744` and the fixture at that port. Keep it distinct from the owner runtime. The test provider only releases after the suite requests `/test/release`.

## Honest remaining limits and recovery

The shared UI is implemented; a full migration of legacy selfdev, native Coding/Game/3D/Browser engines, provider settings and local project inspection into native shared components is unfinished. Those existing workflows are reachable in the Mac tools sidecar. Selfdev still edits the legacy window, not the shared Next source. Hosted model execution, account-backed conversation/assets synchronization, timed scheduling and externally executed plugins are not connected by this change. Operating-graph integration is retained, but persistent graph storage still requires the existing database, internal-tenant and identity configuration; browser verification without those settings confirmed a setup-required response rather than persisted graph evidence.

Browser storage holds writing, web conversations, drafts and preferences. The Mac queue has separate durable SQLite storage. Switching devices does not synchronize them. Export before clearing browser storage; never delete the runtime database as a code recovery step.

Netlify test configuration is preserved. The existing site was previously verified as publicly reachable without visitor protection. Test mode is not access control; no paid upgrade, custom domain, live Stripe or claim of public-production readiness is authorized by this integration.

Recovery: use a normal Git revert of the release commit and the usual Launch Gate. Keep the old Mac service available while the shared launcher is verified. A launcher failure leaves the existing app and runtime untouched. Restore only code from the preserved source or existing change backups after checking active work; preserve all queue and conversation data.
