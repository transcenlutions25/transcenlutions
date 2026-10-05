# Preserved Mac Tay source

This folder preserves the production source that was running in `~/Tay` when the Mac interface became the reference for the shared Tay application. The original Mac files were copied without rewriting their behavior. The main application remains the repository's shared Next.js entry point; this folder is a recovery reference and the existing local service implementation.

The source is deliberately separate from private data. It includes the Python server, hub and model-choice dependency, royal-glass interface, microphone/settings behavior, self-development review workflow, Venture Foundry source, engine launch source, tests, and installed queue extension. It excludes browser profiles, chat/project history, credentials, private configuration, SQLite databases, logs, user custom files, generated media, and runtime state.

`SOURCE_MANIFEST.md` records the hashes of the preserved originals. Paths and platform assumptions inside those original files are preserved for accurate recovery. The legacy command files and `choose_mode.py` contain the original Mac paths; they are not portable launch instructions for a new checkout. The old browser tests also contain the original project path and expect the existing server on port `18743`.

## Shared Mac launch

The optional launcher opens the **same application** that the repository builds and deploys:

```sh
python3 integrations/tay-desktop/legacy/launch_shared.py
```

It defaults to this checkout, starts the production Next server on `127.0.0.1:18745`, and gives the server-only desktop adapter `TAY_DESKTOP_BRIDGE_URL=http://127.0.0.1:18743`. The existing Python server on port `18743` continues running. The launcher does not install dependencies, import private histories, restart the desktop server, or replace the Mac application's files. It refuses an occupied port rather than attaching to an unknown process.

The checkout must already have its locked dependencies and a successful desktop production build at `.next-desktop/BUILD_ID`. The repository uses `.next-desktop` when `TAY_DESKTOP_BRIDGE_URL` is configured and `.next` for the hosted build, so testing one cannot overwrite the other's build.

To explicitly build and launch the shared Mac app:

```sh
python3 integrations/tay-desktop/legacy/launch_shared.py --build
```

`--build` runs the locked checkout's Next build using its Node executable directly (`node node_modules/next/dist/bin/next build`), with the server-only bridge environment set. This is the repository's ordinary `next build` command and requires no global npm installation. Use `--checkout /path/to/transcenlutions` or `TAY_REPOSITORY_ROOT` to select another checkout. `--no-open` starts the loopback app without a Chrome window. The separate Chrome profile and startup log live under `~/Library/Application Support/Transcenlutions/Tay Shared/`.

The bridge URL must be HTTP on IPv4 loopback with an explicit port. `localhost` is normalized to `127.0.0.1` to match the existing Python listener and permitted origin; IPv6 endpoints are rejected. Loopback limits network exposure; it does not establish a multi-user login or tenant boundary. The shared server's desktop adapter also validates permitted requests. In hosting, the bridge remains unconfigured and Mac-only operations are unavailable.

## Legacy recovery

Keep the running installation and its private state intact. Recover these sources into a separate working folder first, then compare any newer local changes before restoring files into a live installation. Do not start another legacy server on port `18743` while the current server is running.

The canonical image is stored once at `public/assets/tay-command-v1.png`. This preservation folder does not duplicate the image or depend on an external symlink. To restore a standalone legacy installation, copy that image into its `window/assets/tay-command-v1.png` path. The legacy hub additionally expects a blank `empty.env` and installed Aider at its documented local path; private provider configuration must be supplied by its owner and is not included here.

Self-development in the preserved service is scoped to its legacy `window/` interface files. It does not modify the shared Next.js application. See [the desktop feature map](../../../docs/tay-desktop-feature-map.md) for the current capability boundaries.
