# Conversation-first usability and interaction repair

Source-only review candidate. Base: `4fec8cd82e39ab257ac93548bf276396c036a569`.

## User-visible changes

- A compact shared header names the current agent and opens conversation controls. The original Crown identity is retained; no reference-app character, portrait, or artwork was copied.
- The mobile conversation uses a light, high-contrast canvas, royal-blue user bubbles and readable 16px body/input text. The desktop workspace and approved artwork retain their established materials.
- Agent, mode, search, pin, preview, browser, queue options and other secondary controls remain available through the existing scrollable workspace panel. The microphone button opens the actual browser voice controls; it does not imply phone calling or a new voice service.
- The composer has a plus/options button, a bounded auto-growing Message Tay field and one submit action at every width. Empty queue/status chrome is omitted. Restore feedback dismisses automatically; other notices can be dismissed, while storage/runtime errors remain visible.
- One pure resolver determines Send/Queue/Steer labels and routing. Busy or unresolved actionable work continues to queue safely, with a reason shown before submission. Blocked/no-action responses alone no longer label Send as Queue. No approval or execution rule is removed.
- Proposed action and dismissal share a container. Operating-intelligence links move from above the full-height app to the navigation drawer, retaining both routes.
- Mobile viewport sizing follows the unzoomed visual viewport when a keyboard changes its height. Pinch zoom is not followed or disabled. Overlay navigation has one Back entry, keyboard focus containment and focus return after dismissal.
- Desktop secondary controls are collapsed by default for new layouts; saved layout preferences remain intact. Explicit root-grid columns fix a reproduced zero-width conversation when the rail is collapsed. The desktop sidecar stays nonmodal and supports keyboard focus return.
- Starting a queued objective or a starting-point command preserves an unrelated draft, clears stale search and reveals the outcome. Blocked operations show their reason in the open panel. Search includes a visible count, clear action and empty state, and resets when conversations change.
- Selecting the current desktop session or project is now a no-op, preserving polling generations, loaded state and outstanding operations.
- Browser-local workspace, writing-block and asset writes use shared Web Locks plus exact baseline comparisons. Writing conflicts pause workspace saves and workspace conflicts pause writing saves, while local editing/copy/export remains available. Same-document coordinators share the current writing/history across conversation and Library views and allow sequential asset saves without mistaking local writes for a second tab. Paused local writing remains recoverable when a panel closes; workspace export includes live writing snapshots beside the original stored records. A conflicting tab, corrupt record, missing lock support or storage failure stops persistence and exposes export recovery; no tab automatically overwrites or merges another. Ordinary hydration preserves stored bytes/order/timestamps; interrupted running work is deliberately marked failed without replay. This is local protection, not account/device synchronization. Legacy writers that do not participate in the lock protocol cannot be made atomic by this change.
- Writing-block More actions use a viewport-bounded native top-layer surface, with a portal fallback inside an active dialog or document body. Nested history, Escape, outside dismissal, focus return and editor actions are retained; the menu respects the existing host badge clearance.
- The current public Netlify HUD iframe is accommodated with reserved footer space. Its badge, script, permissions and hosting plan are not changed or hidden.

## Verified checks

Run `npm run test:mobile` for the focused checks. It is also included in `npm run test:workspace`, so the existing Launch gate runs it.

- Pure intent resolution covers idle, explicit intents, proposed/blocked/no-action responses, completed work, running work, queued work, desktop unavailable/busy/active states and dependencies. Tests exercise 600 state combinations.
- Mounted React/DOM tests use the actual ChatShell, WorkspaceFrame, action, queue and voice components with service boundaries stubbed. They check draft retention, submission routing, repeat submissions, notice dismissal, genuine controls and unavailable voice.
- Simulated speech tests verify capture aborts, callbacks detach and the channel returns to chat on close, Back, panel switch, desktop close/maximize and panel replacement. No real microphone is used.
- Frame tests cover navigation/panel switches, repeated open/close, Tab, Escape, Back/Forward, pending-history races, route changes, focus restoration, persisted desktop layout, viewport events and ignored pinch zoom.
- Cross-tab helper tests exercise simultaneous writers, queued edits, foreign changes/deletion, malformed records, quota/read failures, delayed events, timeout and cleanup. Mounted shell tests confirm the local draft and external bytes survive conflicts, and export options remain reachable. Web Locks are synthetic in these checks, not native-browser concurrency verification.
- Mounted desktop-hook tests cover active-session reselection and project reselection without invalidating polling, plus real switches and queued-operation guards.
- Mounted writing-action tests cover top-layer/fallback placement contracts, nested Escape, action dismissal, focus, revisions/history/copy/export, no-op hydration, blocked persistence, reload, assets and sequential same-tab saves. These are mocked viewport/DOM tests, not measured browser layout.
- Static stylesheet checks cover viewport/target sizes, light content-sized writing blocks and whole-drawer scrolling. Older browsers retain the writing editor's rows/resize fallback where CSS field-sizing is unavailable.
- CSS parses, and the production build compiles the new stylesheet. Existing identity, workspace/writing-block/bridge, Apex, desktop runtime, smoke, lint, type and security gates are required in addition to focused tests.

These DOM tests do not perform browser layout. No real browser rendering of this revision, mobile screenshot comparison, device keyboard, text-enlargement, real speech capture or deployed edge verification has been completed. The available cloud runtime previously rejected browser sockets; that denied route was not retried. No new preview, production deploy, paid service or private-Mac runtime change occurred.

## Required preview/device acceptance before release

Use an authorized deployment preview or supported browser environment; do not treat static/DOM checks as visual acceptance.

1. At 320, 360, 393 and 430 CSS pixels, confirm messages dominate the normal viewport and neither header nor composer clips text or horizontal content. Test 768/900/901px breakpoints and desktop widths 1180/1440/1920 with every rail/panel collapse combination. Confirm the work area never occupies the zero-width resizer track.
2. Test keyboard opening/closing, orientation changes, 200% text enlargement, pinch zoom, notches/safe areas and long multi-line drafts. The composer must remain reachable and long conversations independently scrollable.
3. Open agent/modes/search/options/queue/voice, switch panels, close, use Back/Forward repeatedly, and navigate the operating-intelligence routes. Check focus and draft preservation after each path.
4. Check idle Send, queued/pending/busy states, explicit Queue/Steer, repeated taps, interrupted acceptance and resumed drafts against an isolated test runtime. Approval-required and blocked operations must retain their existing controls.
5. Verify long writing blocks and current action/dismiss controls stay readable. Open More near each viewport edge and confirm all actions/history remain reachable at 200% text enlargement. Do not expose private customer fixtures in screenshots.
6. Confirm the actual current Netlify badge does not cover controls. Source inspection on October 10 found `iframe#nl-badge-frame` mounted by the existing public HUD script at `https://tay-command.netlify.app/.netlify/scripts/hud?variant=public`. Badge internals can change independently; no guarantee is made about a future HUD size or expanded host popover.

7. With two fresh tabs sharing disposable fixtures, verify conversation edits, writing edits and asset saves cause the other tab to pause conflicting saves without data loss; export both copies and reconcile deliberately. Repeat with Web Locks unavailable and storage quota denied. Confirm opening an unchanged saved conversation alone never rewrites storage.

## Integration and ownership

- PR #51 (`a4710488c8c33d8da306a7b82f2280c48109bddc`) remains separate. Its `app/tay-workspace.css` append is untouched here. Applying its current UI patch produces a conflict in `components/chat-shell.tsx` because this repair moves header controls into `conversationControls` and extends sidecar labels.
- When combining later, preserve all five Intelligence Lab hooks: component import, `intelligence` label, sidecar conditional, navigation entry and header-control entry (now inside `conversationControls`). Do not drop them during conflict resolution. Re-run both intelligence and mobile/workspace tests after integration.
- PR #60's isolated sales snapshot files are unchanged and unintegrated. This repair does not claim that feature is connected.
- The offline Mac's unpublished UI work was unavailable and has not been overwritten or reconciled. Main Tay Work must review those private changes before accepting this repair into its checkout.
- There are no dependency, credential, endpoint, checkout, production identity or governance changes. No screenshot inputs or private runtime data are committed.

Rollback: revert this repair commit onto the then-current integration branch, preserving unrelated Intelligence Lab and Mac changes. Do not reset the whole repository to the historical base.
