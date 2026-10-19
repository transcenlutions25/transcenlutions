# Vendored Freebuff components

Upstream: <https://github.com/CodebuffAI/freebuff>
Pinned commit: `cf94e966da87d477b6b46dddc1ea87956c624642` (2026-10-19T13:41:25Z)
License: Apache License 2.0 — see [LICENSE](LICENSE) and [NOTICE](NOTICE), both preserved verbatim from upstream.

## What was reused, and what was not

| Upstream source | Local file | Status | Why |
| --- | --- | --- | --- |
| `packages/agent-runtime/src/process-str-replace.ts` | `str-replace.ts` | Adapted | The exact-match, unique-match, indentation-tolerant and whitespace-tolerant replacement matching is the piece this application genuinely needs for reviewed file edits. Adapted to run synchronously for the Next.js server, with the upstream `diff`/`logger` dependencies removed (this project computes its own preview diff). |
| `packages/llm-providers/src/openai-compatible/**` | — | Not reused | It is a vendored fork of the Vercel AI SDK provider layer. Adding the `ai` + `@ai-sdk/*` dependency chain to this application for one HTTP shape was rejected in favour of a small local adapter. |
| `sdk/**` (`@codebuff/sdk`) | — | Not reused | The SDK requires a Codebuff account and API key and calls the hosted Codebuff service. It cannot be the backend of an independent, zero-cost application. |
| `common/src/tools/params/tool/propose-str-replace.ts`, `propose-write-file.ts` | — | Design reference only | The *proposal-then-approval* shape informed this workspace's approval queue (a proposal is stored, reviewed, and only then applied). No code was copied from these files. |
| `agents/**` (base2/base3/etc.) | — | Not reused | Model prompts bound to the Codebuff model router and its model catalogue. The canonical Transcenlutions roster stays the authority for agent identity. |

## Attribution obligations

Apache-2.0 requires preserving copyright, license and notice text for reused
files. `LICENSE` and `NOTICE` are copied unmodified, and `str-replace.ts`
carries a per-file provenance header naming the upstream path and commit.
Any future reuse from this upstream must add its file path to this table and
keep these notices intact.
