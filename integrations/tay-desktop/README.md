# Tay desktop command queue

This extension adds a persistent objective queue to the existing local Tay Command desktop app. The versioned source belongs to `transcenlutions25/transcenlutions`; the installed app remains in `~/Tay`. Installation adds a small server hook and loads queue controls alongside the existing interface, navigation, chat scripts, and styling.

This is a foundation for the [canon build directive](../../docs/canon/TAY_COMMAND_BUILD_DIRECTIVE_2026-09-24.md), not completion of Agent Runtime V1. See the [implementation status](../../docs/canon/TAY_COMMAND_IMPLEMENTATION_STATUS_2026-09-24.md) for all eleven directive sections.

## What this extension does

- Saves objectives, conversations, results, state changes, and local audit events in SQLite before executing accepted work.
- Shows **Active**, a three-item **Up next** preview, and an expandable **Backlog**. Paused work has its own collapsed section. There is no three-task limit or other small objective-count cap.
- Supports Queue, Steer, edit, move up, prioritize, pause, resume, cancel, dependencies, assignment, completed results, and failure/retry state.
- Sends real text requests through the desktop app's existing provider connection code, with distinct server-defined identities for Tay, Dawn, and KJ. Rory remains unavailable pending child-safety controls.
- Keeps KJ assigned to Ascended Forge, a division led by KJ under Tay. The Forge is not an agent.
- Preserves conversation context across browser reloads. Each model request receives up to six completed turns, including their steering, from the same agent in that conversation, plus results of explicitly selected dependencies, including results from another agent.

The first runtime conversation takes a one-time snapshot of the selected project's existing Tay history without overwriting the original history file. Tay can use up to twelve original messages from that snapshot as context. Other agents do not inherit those original Tay messages. New runtime conversations start with empty history.

Queued work continues while the browser is closed if the desktop server remains running. On server restart, runtime recovery begins when the first runtime request arrives. An interrupted active objective becomes paused and requires explicit Resume; queued objectives remain saved. Provider credentials and billable-request consent are held only in process memory, so remote objectives may need reconnection and Retry after a restart.

## Queue and steering behavior

**Queue** saves another objective without replacing active work. **Steer** records an additional instruction for the selected active objective while preserving its original request. If the old model response arrives after steering, it is discarded and the objective is run again with the steering notes. Repeated steering eventually pauses the objective for review.

Model calls use the existing blocking provider API. Steer, Pause, and Cancel therefore take effect at the next response or error checkpoint; they do not interrupt a running provider request or reverse provider charges. The UI reports a pending request until that checkpoint. Paused or cancelled outputs are discarded.

Dependencies must identify earlier objectives in the same conversation. A dependent objective cannot start until all dependencies complete successfully, even when it is prioritized. Failed, cancelled, or paused prerequisites leave it blocked. Assignment of waiting work is explicit; automated executive delegation is not implemented.

One worker claims objectives transactionally and shares the desktop app's execution lock with existing chat and Self-dev. Execution is serial across conversations. Safe parallel work is a future capability; a large backlog does not imply parallel execution. The first version returns conversation history in one response, so pagination and large-history performance work remain necessary before describing it as production-scale.

The persistent queue is available for Offline and Online chat, plan, and execute modes. In this extension, all three modes produce text responses only. Incognito and Self-dev retain their existing workflows and do not enter this queue.

## Authority and data boundaries

The adapter is for this Mac's local owner surface. The desktop server binds to loopback, and runtime requests enforce the expected host, browser token, and permitted origin. This is not account authentication, multi-user isolation, or authenticated organizational memory.

Agent identity, project/session checks, accepted settings, and attachment boundaries are validated by the server. The adapter exposes no model-selected tools or consequential action execution. Text can describe an action but cannot publish, edit source, spend, or generate a 3D asset through this runtime. These restrictions are an intentionally limited capability boundary; they do not replace the future policy, approval, and tool authorization system.

Runtime data lives at `~/Tay/runtime-state/commands.sqlite3`, with a process ownership lock beside it. The database contains prompts and responses; treat it as private local data. API keys are excluded from objective payloads and events. The extension does not copy chats, browser profiles, credentials, or the existing desktop application's private source into the repository.

Attached references must be small text files inside the selected project. Internal and credential file paths are rejected. Local operational events record lifecycle changes and successful model/provider/latency metadata. They are not yet connected to the platform-wide Operating Graph.

## Install into an existing Tay app

Requirements: the existing Python desktop app at `~/Tay/window`, Python 3.9 or later on macOS, and a supported configured model provider. The runtime uses the Python standard library and adds no package dependency. Offline calls use the existing Ollama connection and the adapter's default local model, `qwen2.5-coder:7b`.

From the repository root:

```sh
python3 integrations/tay-desktop/install.py --target "$HOME/Tay"
```

The installer checks the server entry point, refuses to overwrite locally modified extension files, copies only the versioned extension files, and records a recovery copy under `~/Tay/window/change-backups/queue-<timestamp>/`. It does not restart the server. After current legacy work finishes, restart Tay through its usual launcher, then refresh the app. Preserve any unsent draft before refreshing.

The installer is intended for the existing desktop server contract. If it reports a changed entry point or modified extension file, inspect the difference before adapting the integration. Do not overwrite the local app with a replacement scaffold.

## Verify

Run the isolated runtime tests from the repository root:

```sh
python3 -m unittest discover -s integrations/tay-desktop/tests -v
node --check integrations/tay-desktop/tay_runtime/queue.js
```

The tests cover persistence and idempotency, serial claims, dependency ordering, steering and stale outputs, checkpoint pause/cancel, restart recovery, retry behavior, project/session boundaries, identity context, provider consent, and attachment checks. They use temporary data and a stub provider; passing them does not establish real provider connectivity.

The optional browser fixture uses the installed desktop's interface assets with temporary state and a gated fake provider. It does not load private conversations or contact model providers. In one terminal:

```sh
python3 integrations/tay-desktop/tests/fixture_server.py --desktop-root "$HOME/Tay"
```

In another, with Playwright available to Node and Chrome installed:

```sh
node integrations/tay-desktop/tests/browser.cjs
```

The default fixture address is `http://127.0.0.1:18744`. The browser scenario checks more than three objectives, backlog display, steering, saved state after reload, pause, agent labels, draft preservation, request rejection, and narrow-screen layout. Screenshots are written to the system temporary directory. Stop the fixture afterward; it is a test server, not the production app.

## Recovery

First stop the desktop server after any active work finishes. Select the recovery directory printed by the installer. Restore its server copy:

```sh
backup="$HOME/Tay/window/change-backups/queue-REPLACE-WITH-TIMESTAMP"
cp "$backup/server.py" "$HOME/Tay/window/server.py"
```

If that backup contains a prior extension, also restore it:

```sh
if [ -d "$backup/tay_runtime" ]; then
  cp -R "$backup/tay_runtime/." "$HOME/Tay/window/tay_runtime/"
fi
```

Restart Tay through its usual launcher. Restoring the server before the first installation removes the hook, so unused extension files can remain without loading. Keep `~/Tay/runtime-state/` intact to preserve saved objectives and audit history; code recovery does not require deleting queue data. Do not copy an open SQLite database as a recovery snapshot; stop its owning server first or use SQLite's backup facility.
