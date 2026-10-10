"use client";

import { useEffect, useId, useRef, useState, type MutableRefObject } from "react";
import { browserRecorderEnvironment, EMPTY_RECORDING, LocalVoiceRecorderController,
  localRecordingSupport, recordingIsBusy, type RecordingSnapshot } from "../lib/local-voice-recorder";
import type { VoiceRecorderCommand } from "../lib/voice-recorder-command";

export function LocalVoiceRecorder({ disabled = false, command, onBeforeRecord, onBusyChange, playbackRef, onPlaybackStart }: {
  disabled?: boolean;
  command?: VoiceRecorderCommand;
  onBeforeRecord?: () => void;
  onBusyChange?: (busy: boolean) => void;
  playbackRef?: MutableRefObject<HTMLAudioElement | null>;
  onPlaybackStart?: () => void;
}) {
  const headingId = useId();
  const privacyId = useId();
  const [snapshot, setSnapshot] = useState<RecordingSnapshot>(EMPTY_RECORDING);
  const [supportError, setSupportError] = useState<string | null>("Checking audio recording support…");
  const [consent, setConsent] = useState(false);
  const [commandNotice, setCommandNotice] = useState("");
  const [saveNotice, setSaveNotice] = useState("");
  const controller = useRef<LocalVoiceRecorderController | null>(null);
  const consentInput = useRef<HTMLInputElement | null>(null);
  const restoreConsentFocus = useRef(false);
  const localAudio = useRef<HTMLAudioElement | null>(null);
  const audio = playbackRef ?? localAudio;
  const callbacks = useRef({ onBeforeRecord, onBusyChange, onPlaybackStart });
  callbacks.current = { onBeforeRecord, onBusyChange, onPlaybackStart };
  const busy = recordingIsBusy(snapshot.phase);

  useEffect(() => {
    setSupportError(localRecordingSupport());
    const current = new LocalVoiceRecorderController(browserRecorderEnvironment(), next => {
      setSnapshot(next);
      callbacks.current.onBusyChange?.(recordingIsBusy(next.phase));
    });
    controller.current = current;
    const hide = () => {
      if (document.visibilityState === "hidden" && recordingIsBusy(current.getSnapshot().phase)) {
        current.cancel("Recording was cancelled when this page was hidden. No sample was kept.");
        setConsent(false);
      }
    };
    const leave = () => {
      current.cancel("Recording cleared when you left this page.");
      setConsent(false); setSaveNotice(""); setCommandNotice("");
    };
    document.addEventListener("visibilitychange", hide);
    window.addEventListener("pagehide", leave);
    return () => {
      document.removeEventListener("visibilitychange", hide);
      window.removeEventListener("pagehide", leave);
      current.dispose();
      controller.current = null;
      callbacks.current.onBusyChange?.(false);
    };
  }, []);

  useEffect(() => {
    if (!command) return;
    if (command.action === "review-start") {
      setCommandNotice("Your voice request is ready for review. Confirm this is your voice, then tap Record. Cloning needs a separate provider review and approval.");
      consentInput.current?.focus();
    } else if (command.action === "stop") controller.current?.stop();
    else controller.current?.cancel();
  }, [command]);

  useEffect(() => {
    const player = audio.current;
    if (!player) return;
    return () => { player.pause(); player.removeAttribute("src"); player.load(); };
  }, [snapshot.recording?.url, audio]);

  useEffect(() => {
    if (restoreConsentFocus.current && !busy && !snapshot.recording) {
      restoreConsentFocus.current = false;
      consentInput.current?.focus();
    }
  }, [busy, snapshot.recording]);

  function cancelRecording() {
    restoreConsentFocus.current = true;
    controller.current?.cancel();
    setConsent(false);
  }
  function discard() {
    restoreConsentFocus.current = true;
    controller.current?.cancel("Recording deleted from this panel. Any file you already saved remains on your device.");
    setSaveNotice("");
    setConsent(false);
  }
  const seconds = Math.floor(snapshot.elapsedMs / 1000);
  return <section className="tay-local-voice-recorder" aria-labelledby={headingId} aria-describedby={privacyId}>
    <h3 id={headingId}>Record your voice</h3>
    <p id={privacyId}>Record only your own voice. Your sample stays in this panel. Save copies it to your device. Delete, closing the panel, or reloading clears the panel&apos;s copy. Nothing is uploaded, transcribed, synced, or cloned.</p>
    <p>Up to 2 minutes or 10 MB. Recording starts after the beep. Leaving this page or hiding the app cancels an unfinished sample.</p>
    {commandNotice && <p role="status">{commandNotice}</p>}
    <label className="tay-check"><input ref={consentInput} type="checkbox" checked={consent} disabled={busy || Boolean(snapshot.recording)}
      onChange={event => setConsent(event.target.checked)} />This is my voice, and I agree to record it on this device.</label>
    <div className="tay-local-recording-actions">
      <button type="button" className="agent-switch" disabled={Boolean(supportError) || disabled || !consent || busy || Boolean(snapshot.recording)}
        onClick={() => { setSaveNotice(""); setCommandNotice(""); callbacks.current.onBeforeRecord?.(); void controller.current?.start(); }}>Record my voice</button>
      <button type="button" className="agent-switch" disabled={snapshot.phase !== "recording"} onClick={() => controller.current?.stop()}>Stop recording</button>
      {busy && <button type="button" className="agent-switch" onClick={cancelRecording}>Cancel recording</button>}
    </div>
    <p role={snapshot.phase === "error" ? "alert" : "status"}>{supportError || snapshot.message}</p>
    {busy && <p className="tay-local-recording-indicator"><span aria-hidden="true">● </span>{snapshot.phase === "recording" ? "Recording" : snapshot.phase === "stopping" ? "Finishing" : "Preparing"}
      <span aria-label="Elapsed recording time" role="timer" aria-live="off"> {Math.floor(seconds / 60)}:{String(seconds % 60).padStart(2, "0")} / 2:00</span></p>}
    {snapshot.recording && <div className="tay-local-recording-preview">
      <audio key={snapshot.recording.url} ref={audio} controls preload="metadata" src={snapshot.recording.url} aria-label="Play your local voice recording" onPlay={() => callbacks.current.onPlaybackStart?.()} />
      <p>{snapshot.recording.mimeType} · {Math.ceil(snapshot.recording.bytes / 1024)} KB</p>
      <div className="tay-local-recording-actions">
        <a className="agent-switch" href={snapshot.recording.url} download={snapshot.recording.filename}
          onClick={() => setSaveNotice("Save requested. Check your browser downloads or save dialog; Tay cannot confirm the file was saved.")}>Save recording</a>
        <button type="button" className="agent-switch" onClick={discard}>Delete recording</button>
      </div>
      {saveNotice && <p role="status">{saveNotice}</p>}
    </div>}
    <p>Voice cloning is not connected. A reviewed sample, a named provider, its retention terms, and any cost need your approval before upload.</p>
  </section>;
}
