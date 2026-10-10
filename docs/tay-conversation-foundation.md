# Tay conversational foundation

Status: source implementation for review, not an installed or deployed capability claim.

## Goal and source

Tay should be useful in ordinary conversation, including encouragement, repetition after lost attention, correction, and honest uncertainty. This change extends the existing runtime; it does not create another chatbot, provider, memory database, tool executor, or UI.

Product authority comes from `AGENTS.md`, the [master canon](canon/MASTER_CANON_AND_SYSTEM_MAP.md), the [runtime directive](canon/TAY_COMMAND_BUILD_DIRECTIVE_2026-09-24.md), and the [founder authority rules](canon/FOUNDER_PRODUCT_AND_AUTHORITY_RULES_2026-10-05.md). The concrete acceptance cases capture the requested conversational behavior: support a disheartened craftsman without invented accomplishments, recover a missed point briefly, separate actual results from projections, keep Tay's AI identity, correct “my learning library” without inventing “My Learn,” resist pressure for false progress, and respect context permissions. Two additional cases require practical workplace tone and honest offline/unknown-sync handling.

These are product-authored requirements. They are not imported instructions or private memory from the assistant used to develop the app.

## Existing integration surfaces

- `integrations/tay-desktop/tay_runtime/bridge.py`: the active desktop extension's `DesktopRuntime.generate` calls the existing API callback. Provider paths remain local Ollama, Claude, OpenAI, OpenRouter (free/router), and Perplexity. The default local model remains `qwen2.5-coder:7b`; this name is configuration, not connectivity or quality evidence.
- `tay_runtime/conversation_context.py`: server-owned conversational policy and scoped context assembly. Each provider receives the same policy. Claude retains its separate system field.
- `lib/tay-core.ts` and `lib/conversation-response.ts`: small deterministic hosted replies for explicit conversation requests before business-intent routing. These are guided fallbacks, not model intelligence. The hosted caller supplies no prior conversation or verified task state, so repetition/status replies disclose that limit.
- The Intelligence Lab analyzer is a separate feature and is unchanged. Preserved legacy, Incognito, Self-dev, UI, builder and installed Mac files are unchanged. Queue changes are limited to a cumulative text-length check before saving an edit or steering note.

## Context contract

1. One source-owned system message contains the selected agent identity, conversational policy and existing thread mode. Files, sales readiness notes, prior replies and dependency results cannot add a system role or grant authority.
2. Automatic task recall is same-session and same-agent. Local requests may use those scoped records; remote requests only automatically recall online records previously sent through that same provider mode. Unlabelled legacy history is available only to local Tay, not specialists or remote providers.
3. Up to six permitted queue records are ranked by request-word overlap, then recency. This is deterministic selection, not semantic search. Status, update time, pending operation, error/blocker and request excerpts are included. A `completed` conversation record explicitly means `stored_text_reply_only`, not that a build, test, payment or deployment occurred. Up to six recent completed conversational turns are retained separately.
4. Explicitly selected dependencies can cross agent boundaries only in the same conversation after completion. Selecting a dependency for an online request explicitly includes its result there, even if it originated locally. The assembler labels it prior assistant text, not execution evidence or authorization. Selected file contents and local readiness notes remain bounded reference data. No whole-project or account scan occurs.
5. Adjacent historical roles are coalesced for provider compatibility. Context data and the current request share the final user turn, with the direct request last. The current request and steering remain last and are never silently truncated. If together they exceed 18,000 characters, new edits/steering are rejected transactionally before changing the saved objective. A pre-existing oversized objective fails before any provider call and tells the user to cancel it and queue a shorter version. Historical excerpts preserve the beginning and end, mark the omitted middle, and avoid dropping a late correction merely because the original request was long.
6. The overall message-content budget is 28,000 characters, including a 6,000-character runtime-data budget and at most 6,000 characters of history. Queue requests are excerpted at 240 characters; dependency/file text at 600; readiness at 800; individual history messages at 700. Optional omissions are counted. These are character limits, not an exact token guarantee for every model, language or tokenizer. A long selected file may only be partially available; the model must not claim it read an omitted portion.
7. Provider selection, server credentials, billable consent, attachment path restrictions, loopback protections, paused/cancelled/superseded response handling and no-tools enforcement remain in the existing bridge. No automatic fallback or new permission is added. Unknown sync status does not prevent conversation about permitted local context, but never implies synchronization or authority to act. Prompt instructions guide output; they do not independently enforce model truthfulness or injection resistance.

## Conversational behavior

The model policy asks for short natural answers that work when spoken aloud, without visual-only directions. It acknowledges effort the user actually described, uses specific progress only when supported, and does not diagnose emotion, flatter by default, pretend to be human, or promise success. It distinguishes a user report from independent evidence and separates known, inferred, planned, blocked and unverified states.

A correction should change the working interpretation. A repeat should use available history rather than invent memory. A request for encouragement should not automatically become a revenue/build workflow. The runtime still cannot execute work from model text.

The deterministic fallback intentionally handles only a small set of explicit phrases. It has no general language understanding, history retrieval or emotional awareness. Unrecognized phrases continue through the pre-existing guided router. No claim is made that these fallbacks fulfill the target of a natural model-backed Tay.

## Acceptance and verification

`integrations/tay-desktop/tests/fixtures/conversation-acceptance.json` contains ten synthetic scenarios, short histories and human-readable behavioral rubrics. The same fixtures are consumed by Python assembly tests and hosted responder tests.

Run:

- `python3 -m unittest discover -s integrations/tay-desktop/tests -v`
- `node scripts/test-tay-conversation.cjs` (also included in `npm run smoke`)
- The existing Launch gate and `npm run security`

Tests verify context contents, scope/privacy exclusions, one privileged role, dependency validation, bounded excerpts, preservation of current correction/steering, identity, routing, no-tool payloads and existing paid-provider gates. Provider calls are stubs, explicitly labelled as such. A fixture pass proves assembly/routing, not that a real model follows the rubric.

Before claiming model-backed conversational quality, run the ten fixtures through the existing installed local runtime with a confirmed local model, record the selected model/version and actual responses, and review each against its rubric. Include natural paraphrases and repeated/corrected turns. Check concise spoken usability with the user; don't infer it from a token count. No live model or paid-provider evaluation is included in this source change.

## Remaining boundaries

This is still a local-owner runtime, not authenticated cross-device or multi-user memory. The hosted UI still wraps replies in its existing action/status presentation; no rendering change is included. Persistent corrections outside the retained context, verified builder/artifact evidence, shared account memory, and full voice/text continuity remain integration work. A new model connection, Mac installation, merge, preview, production deployment or external action requires its own authorized workflow.

## Mac reconciliation required before installation

The existing Mac checkout was separately reported at `~/Tay/shared-source`, branch `feature/tay-offline-voice-20261007`, commit `c9502e1`, with unpublished bridge/queue modifications and an existing `tay_workers` runtime. This proposal was built against reviewed cloud source `5b5ef86`, not that divergent checkout. Do not install it over the Mac bridge/queue without a reviewed reconciliation. Context assembly must not confer worker owner grants or tool authority. No Mac files, worker grants or private history were read or changed by this source task.
