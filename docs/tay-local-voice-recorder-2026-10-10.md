# Tay local voice recorder: review candidate

Status: implemented on an isolated branch based on reviewed PR65 (`5b5ef86`), not merged, deployed, or copied to the Mac. No real microphone, audio upload, voice clone, provider call, or paid generation was performed. The divergent Mac voice bridge is not replaced by this patch.

## Usable path after reviewed integration

1. Open the existing **Voice** panel (the header Voice control or workspace tool picker).
2. Confirm **This is my voice, and I agree to record it on this device**.
3. Press **Record my voice**. The button is the explicit capture action; opening a panel never requests microphone access.
4. Allow the browser microphone prompt. Tracks remain disabled while a short start beep plays. `MediaRecorder.start` runs only after the cue finishes and its acoustic-tail delay completes.
5. The panel announces **Recording now** and shows a static indicator and elapsed time. Press **Stop recording** to finish, or **Cancel recording** to discard.
6. Use native local audio controls to listen. **Save recording** requests a browser download; Tay does not falsely claim a completed save. **Delete recording** clears this panel's copy.

Actual microphone permission, audible cue, capture quality, playback/seek, downloads, browser history, and mobile keyboard/screen-reader behavior still need user-approved device QA. A JavaScript audio context reaching `running` cannot establish that the user's device output volume is audible.

## Spoken request boundary

The exact final transcript “Hey Tay, record and clone my voice. Start now” is recognized only inside the existing, explicitly user-started **Speak request** session. It stops dictation and focuses the recording consent control. It does not become a composer draft, request another microphone stream, upload a file, or start a clone.

A browser speech result is not a fresh trusted click. This browser slice therefore uses the explicit Record button as its permission/audio-activation path. It does not promise hands-free recording from a wake word. The parser also recognizes exact “Hey Tay, stop recording” and “Hey Tay, cancel recording” actions for a future verified listening adapter; standard browser dictation is deliberately stopped and disabled during local sample capture, so the current usable stop/cancel controls are buttons. No second background speech-recognition stream is opened to listen for commands while recording.

Quoted, prefixed, suffixed, negated, different-person, and incomplete requests do not activate the command adapter. The parser must never be called on assistant replies, stored conversations, attachments, imported text, or instructions from an external provider. Its listening context is a UI precondition, not an authentication or owner-authorization mechanism.

## Data and resource boundaries

- No network, server endpoint, localStorage, IndexedDB, sync artifact, speech transcription, biometric identification, provider SDK, or cloning API exists in the recording helper.
- One sample, with a 120-second observed-duration acceptance bound and 10 MiB of accepted chunks. Automatic stopping begins at 119 seconds to leave scheduling headroom; an observed duration overrun is discarded rather than mislabeled as 120 seconds. Browser/event-loop suspension can delay hardware track release; overrun detection and discard happen when execution resumes, so this is not an absolute real-time hardware capture guarantee. Recorder data is requested every 250 ms. A size overflow discards the whole sample instead of producing a potentially corrupted truncated file. Setup and finalization have bounded timeouts.
- Real recording MIME metadata determines the Blob type and extension. WebM remains `.webm`, Ogg `.ogg`, and audio MP4 `.m4a`. There is no pretend WAV conversion. Empty/unknown-format output fails closed.
- The sample exists as chunks followed by a local Blob URL. Closing/replacing the Voice panel, navigating to another conversation/project, reloading, pagehide, or unmount clears it. Hiding the tab/app cancels an unfinished capture.
- Stop releases media tracks before asynchronous finalization. Cancel, denial/error, disconnected tracks, timeouts, and unmount clear timers, handlers, audio cues, chunks, and tracks. Late permission grants after cancel/unmount immediately release their streams. Repeated starts cannot create parallel sessions.
- Delete/unmount revokes the Blob URL and detaches local playback. It cannot delete files the user already saved or erase browser-level microphone permission. Cancel cannot dismiss the browser's permission prompt, and tells the user to dismiss any pending prompt.
- Existing dictation and latest-reply controls are reused. They cannot start while sample capture is busy and pause a ready sample before starting their own audio. Starting sample playback also stops dictation and reply speech, covering both action orders. Ordinary dictation still appends to the existing draft; the recorder never submits the composer or invokes execution policy.
- `VoiceControls` has a project/conversation key so media and consent cannot silently carry over if an open sidecar survives navigation. This is not an authenticated account boundary. A future login/logout, user/tenant change, or account replacement must unmount the voice surface, revoke URLs, release media, and reset consent even when the project/session identifiers happen to match.
- This is browser capability detection, not a native Android/WebView permission implementation. No claim of Android microphone integration is made.

## Files and integration contract

- `lib/local-voice-recorder.ts`: reusable lifecycle controller and browser audio boundary.
- `lib/voice-recorder-command.ts`: exact command parser for active user-started listening.
- `components/local-voice-recorder.tsx`: explicit consent, capture controls, announcements, playback/export/delete.
- `components/voice-controls.tsx`: add-on within the existing voice surface, not a second voice/runtime system.
- `components/chat-shell.tsx`: project/session key on the existing VoiceControls instance only.
- `app/tay-workspace.css`: namespaced recorder styles with 44px controls; no animated waveform or motion dependency.
- `scripts/test-local-voice-recorder.cjs`: 20 deterministic helper/DOM tests with mocked media and no external requests.
- `scripts/test-mobile-chat-shell.cjs`: six additional mounted recording exit/navigation/draft regressions.
- `package.json`: `test:voice`, included in the existing `test:workspace` launch gate.

The implementation is additive in this branch, but Mac `c9502e1` has divergent existing voice/PTT work. Review and adapt the component-level integration there; do not overwrite the Mac voice bridge or its worker/runtime code. Preserve the navigation key and mutual-exclusion rules when combining with header/conversation changes.

## Cloning gate remains closed

The UI honestly states that cloning is not connected. A future step must separately establish a reviewed sample, the named provider/destination, voice ownership and provider consent, retention/deletion/training terms, permitted commercial use, exact cost/subscription if any, and explicit transmission approval. This source implementation cannot authorize that step, create credentials, purchase a plan, or silently choose an upload fallback.

## Validation

Completed in this isolated worktree using Node 24.19.0 and the checked-in dependency lock:

- Typecheck and lint/public-copy guard.
- Identity, workspace, mobile, recorder, and intelligence checks.
- 57 Apex mocked tests, 2 Apex Python tests, 17 desktop-runtime Python tests, and smoke checks.
- Security regression and dependency gate: zero affected production packages; existing seven-package build-only advisory exception remains unchanged and expires October 20, 2026.
- Production Next build.

No dependency was added. Next telemetry was disabled for lint/build because the default home-config write is read-only. Tests use deterministic browser/media fakes and are not actual browser/device verification. All candidate gates above were rerun after staging every new source file; the final tracked-source secret scan included those files and found no leaks. Independent bounded review reran all 20 recorder and 53 mounted ChatShell tests (73/73), with no remaining P1/P2 findings in that source/mock scope. No browser socket restriction was bypassed.

Rollback after reviewed integration: revert this patch's recorder files, the VoiceControls additions, its conversation key, namespaced CSS, and test script wiring together. No user data migration or remote service rollback is involved.
