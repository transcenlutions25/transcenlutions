# Tay shared app and preserved desktop feature map

The current Mac Tay Command defines the product's visual identity: the Transcenlutions/Tay artwork, royal-glass surfaces, compact navigation, conversation-centered workspace, composer, and mode controls. The repository's shared app is the primary build and hosting entry point. The original Mac service remains available behind that shared app when the server-only desktop adapter is configured on the owner's Mac.

The curated original implementation is preserved under `integrations/tay-desktop/legacy/`. This preserves legitimate source without moving private local data into GitHub or treating two independent interfaces as the final architecture. The preserved source manifest records what was copied. The shared image is stored once under `public/assets/`.

| Existing capability | Preserved source | Boundary in the shared platform |
| --- | --- | --- |
| Royal-glass Tay interface and established artwork | `legacy/window/index.html`, `enhance.css`, `enhance.js`, `enhancements.js`; shared public image | The shared app uses the Mac visual reference; archived HTML is a recovery source, not a second deployed application. |
| Project selection and local chat history | `legacy/hub.py`, `legacy/window/server.py` | Real Mac folders and chat files require the local desktop service. Hosting does not inherit the owner's filesystem or conversations. |
| Local and selected online model requests | `legacy/window/server.py`, installed runtime bridge | The desktop service makes real configured provider requests. Keys and paid-use consent remain in memory. Provider availability and billing require the owner's account. No fallback provider is silently selected. |
| Queue and Steer | `legacy/window/tay_runtime/` and the canonical `integrations/tay-desktop/tay_runtime/` | Existing desktop runtime persists objectives and results in private SQLite state. Queue capacity extends beyond the three-item Up next preview. Steering applies after a blocking model response checkpoint. This is serial text generation, not model-controlled tool execution. |
| Tay, Dawn and KJ identity | Installed queue bridge | Agent identities are server-defined for text requests. KJ leads Ascended Forge under Tay. Rory remains unavailable in this runtime until child-safety controls exist. |
| Offline and Incognito behavior | `server.py`, `enhancements.js`, runtime bridge | Offline requires the local model. Legacy Incognito bypasses persistent queue/history. A shared hosted draft or local-storage conversation is not equivalent to the Mac service's Incognito workflow. |
| Text-file references | `server.py`, runtime bridge | Only small text files inside the selected project can be read. Credential/internal paths are rejected. Hosting cannot read Mac files without the local service. |
| Copy, reuse and conversation export | `index.html`, `enhancements.js` | Preserved legacy behavior remains available for recovery. New shared writing blocks must maintain the edited block as the source of truth and use their own persistence/version state; legacy static messages do not satisfy that requirement. |
| Microphone and dictation | `index.html`, `microphone.js`, `enhancements.js` | Browser support and explicit microphone consent are required. Speech may use the browser's online service; no offline transcription or voice identity recognition is established. |
| Read aloud | `server.py`, `hub.py` | Mac `say`/`afplay` and optional configured ElevenLabs are desktop operations. Hosting must not report Mac playback as available without the local service. |
| Self-development review, preview and undo | `selfdev.py`, `selfdev.js`, `selfdev.css`, `recovery.html` | Proposed edits are scoped to the legacy `window/` interface files and require explicit Apply. They do not edit the shared Next.js shell or install software. |
| Venture Foundry capture and stage updates | `foundry.py`, legacy interface | Existing opportunity storage is private local SQLite. Capturing or changing a stage does not create a build or validate customer demand. |
| Unity/Unreal and coding tools launch | `engines.py`, `hub.py`, original command launchers | These require installed owner-side Mac tools and valid project folders. Native Xbox deployment and autonomous engine control are not connected. |
| Embedded browser and Preview controls | `enhance.js`, `enhancements.js` | Embedding may be refused by destination sites. A browser panel does not grant account access, automatic browser control, or read access to its contents. |
| Agent runtime, operating graph, governance and revenue foundations | Existing repository modules/components | These remain repository capabilities behind the shared shell. Local queue audit events are not yet synchronized automatically into the platform operating graph. Simulated revenue/readiness remains distinct from completed external actions. |

## Launch and service boundaries

The optional `integrations/tay-desktop/legacy/launch_shared.py` runs the repository's exact production Next build at `http://127.0.0.1:18745`. It sets `TAY_DESKTOP_BRIDGE_URL` server-side to the existing Python service at `http://127.0.0.1:18743` and opens an app-style Chrome window using a separate profile. It performs no install or server restart. `--build` explicitly invokes `node node_modules/next/dist/bin/next build` with that desktop environment, producing `.next-desktop/BUILD_ID`. Hosted builds use `.next`; desktop builds use `.next-desktop` to keep their output separate.

On a hosted deployment, `TAY_DESKTOP_BRIDGE_URL` is absent. The application must present Mac-only features as unavailable/setup-required instead of simulating filesystem access, engine launches, provider calls or voice playback. Binding a service to loopback is an owner-device constraint, not account authentication or organization isolation.

The private desktop chat databases, browser profile, custom files, credentials, project-state files and runtime state stay on the Mac. Their preservation and migration require a separate explicit data workflow. Historical machine paths in the preserved source are provenance, not a copy of private project state. A source checkpoint does not prove a private-data migration or deployed synchronization.

## Verification scope

The archived sources were checked against their originals by SHA-256: all 32 source/dependency files matched. Curated source scanning found no embedded provider-key or private-key patterns. Python syntax checks, 11 JavaScript syntax checks including inline HTML scripts, and all six existing isolated legacy server tests passed without provider calls. The new shared launcher's help/configuration checks passed. Original browser tests are preserved as historical behavior checks and require their documented local environment; merely copying them does not establish current browser test success.

The shared app's build, browser scenarios, desktop adapter checks and writing-block persistence checks provide the evidence for the primary application. Real provider calls, engine integration and cloud-to-Mac connectivity require separate tests in their actual configured environments. Record those outcomes precisely rather than inferring them from a green build.
