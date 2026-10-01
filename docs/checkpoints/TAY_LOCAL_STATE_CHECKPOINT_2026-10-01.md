# Tay local state checkpoint — 2026-10-01

This is a documentation-only recovery checkpoint created from GitHub `main` at:

`914305066231c9dae3b2772e32eec93b993c0564` — `Canonize Tay Command Feed and Workspace Library`.

## What was verified

The Mac implementation is a separate, non-Git checkout under `$HOME/Tay/window`. It is a Python HTTP server with the existing Tay HTML/CSS/JavaScript interface. GitHub `main` is the Next.js/React Tay command room. The two implementations were intentionally preserved as separate systems; no reset or overwrite was used to force them to match.

The guarded desktop installer from this repository was applied to the existing Mac app. It added the existing `tay_runtime` queue adapter and one server hook while preserving the existing UI, navigation, chat, microphone, self-development, Venture Foundry, and engine controls. The installer recovery copy is local-only at:

`$HOME/Tay/window/change-backups/queue-20261001-165705`

The local runtime database is also private Mac state and was not copied into this repository.

## Mac verification

- 6/6 existing Python server behavior tests passed.
- Existing JavaScript syntax and microphone tests passed.
- A live browser smoke after installation rendered the existing Tay page with `Queue` and `Steer` controls and no page errors.
- The installed queue source hashes match the versioned source in this repository:

```text
tay_runtime/bridge.py      bb53373ca9ed201fbea777cf19d5e2f8f7fa5eb67de7470bb09f5f0234830ed2
tay_runtime/queue_store.py 074edb642c7251db99c78896f3834c4baaf5e0135ce56248c373c38457d2e1a4
tay_runtime/queue.js        b00c0922cdd1df9885313a570eba37257cc964a669850f6f7bc64783d41408a7
tay_runtime/queue.css       c93ff71fbe6a21423f455851681c202561bd181951e9b2121676af07515abedc
```

## Repository verification

From a clean clone of this `main` commit:

- 13/13 desktop runtime and queue unit tests passed.
- Queue browser fixture passed: six objectives, three-item preview/backlog, steering, persistence, pause, scoped agents, authorization/origin rejection, draft preservation, and responsive layout.
- TypeScript typecheck, ESLint, public-copy guard, Tay smoke/regression suites, and platform identity contract checks passed.
- Production `next build` passed.
- Built-server checks returned HTTP 200 for `/`, `/privacy`, `/terms`, `/refund`, and `/support`.

The bundled validation environment does not provide an `npx` launcher, so the platform identity TypeScript contract was run with the repository's installed TypeScript compiler directly; it passed.

## Preserved local work

The separate local checkout at `$HOME/Documents/Transcenlutions` remains dirty and was not pushed. It contains a Somebody Else cleaning/dispatch overlay plus additional Nocobase, PWA, Supabase, and mobile work. Its local base ref is stale relative to this checkpoint. That work requires a deliberate reconciliation decision and remains preserved in the original checkout and in the local recovery snapshot; it is not represented as current Tay `main` code.

The local recovery snapshot contains the pre-install Mac source, post-install server/runtime source, a SQLite backup of local queue state, the clean GitHub `main` clone, and the canonical dirty checkout copy. It contains no credentials, browser profiles, or private chat exports.

## Remaining work

The Mac and web implementations remain separate. No real provider objective was executed during this checkpoint. Netlify authentication/deployment and any custom domain remain separate operational work; the private-alpha/test safeguards in `netlify.toml` remain unchanged on GitHub `main`.

This checkpoint does not modify `main`, force-push, delete local work, or claim that the two trees are identical.
