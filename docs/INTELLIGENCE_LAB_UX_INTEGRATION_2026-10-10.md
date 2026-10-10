# Intelligence Lab / conversation-first workspace integration

Local review candidate only. No branch publication, merge or deployment is implied.

## Source and ownership

- Foundation: PR #64, `3052d0d957674c98254e67c4cbc9ce262bcae55c`.
- Feature source: PR #51, `a4710488c8c33d8da306a7b82f2280c48109bddc`.
- Existing PR branches and the offline Mac's unpublished work are unchanged.
- The Lab's original analyzer, practice scenarios, product specification and dedicated assertions are retained. The shared runtime, queue, permissions, payment gates and production identity are not replaced or expanded.

## Conflict resolution

- `components/chat-shell.tsx`: preserve PR64's intent resolver and compact controls/voice frame; add all five Lab hooks (import, label, renderer, navigation, control-panel action). Do not restore PR51's always-visible header.
- `package.json`: retain PR64's mobile/workspace regression commands and current-main scripts; add PR51's intelligence tests plus mounted integration tests.
- `.github/workflows/launch-gate.yml`: retain the dedicated intelligence gate.
- `app/tay-workspace.css`: add scoped Lab styles without moving or overriding the later mobile/writing-action stylesheets.

## Draft lifecycle and privacy

Lab state is controlled by its owning ChatShell and held only in memory. Its scope is the hosted project/conversation or the desktop project/session. Analyze text, selected Lab mode, practice scenario, response and displayed score survive switching workspace tools, closing/reopening the panel, and leaving/returning to the same conversation during this workspace mount. A new conversation receives an independent empty draft. Desktop loading exposes no editable Lab draft until the session is known.

The panel states this limitation and directs the user to Settings → Export workspace before closing or reloading. That explicit download includes the live Lab draft map, even when normal browser saving is paused. Pasted interactions are not silently copied into localStorage or sent to a service. An example interaction is opt-in rather than appearing as a user's initial content.

A fresh workspace mount clears the transient Lab map. There is no connected hosted account-switch/sign-out lifecycle or verified cloud synchronization here. A future authenticated host must key/remount the entire workspace at a verified account-boundary change; this is a UI isolation contract, not authentication or server authorization. Do not market Lab drafts as durable, cloud-synced, account-scoped history or a finished cross-device service.

## Layout and focus

The default Lab grid is one column. A named inline-size container permits two columns only when the panel itself has at least 34rem, rather than inferring room from the browser width. Older engines without container-query support keep the one-column fallback. Inputs use 16px text and buttons retain 44px minimum targets. Tool content is still inside the existing independently scrolling sidecar.

The frame accepts an explicit content identity so switching an open Lab to another conversation or a loading state focuses the panel heading without changing its title. Existing Back, drawer, voice and compact-header behavior remains shared.

## Verification and remaining release gates

Run `npm run test:intelligence` for the analyzer and mounted integration regressions, in addition to the full existing workspace, workflow, identity, lint, type, build and security gates. Integration checks must exercise every entry point, tool switching, new/restored conversation isolation, desktop project/session/loading isolation, draft export, fresh-mount clearing, focus and narrow-panel layout contracts.

DOM and stylesheet tests are not browser pixel measurements. Native device keyboard/safe-area behavior, 200% text enlargement, actual container-query rendering, screen-reader behavior and deployed edge verification still require an authorized preview/device pass. The offline Mac's unpublished UI and actual local-model workflow remain unreconciled; inspect and preserve those changes when the computer is available. Do not deploy or overwrite that checkout based on this local integration alone.
