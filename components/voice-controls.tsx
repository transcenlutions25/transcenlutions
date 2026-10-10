"use client";

import { useEffect, useRef, useState } from "react";
import { LocalVoiceRecorder } from "./local-voice-recorder";
import { parseVoiceRecorderCommand, type VoiceRecorderCommand } from "../lib/voice-recorder-command";
import { classifyVoiceTranscript, preserveVoiceVocalizations } from "../lib/voice-transcript-intent";

type RecognitionResult = ArrayLike<{ transcript: string }> & { isFinal?: boolean };

interface Recognition {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onresult: ((event: { resultIndex?: number; results: ArrayLike<RecognitionResult> }) => void) | null;
  onerror: ((event: { error: string }) => void) | null;
  onend: (() => void) | null;
  start(): void;
  abort(): void;
}
type VoiceWindow = Window & {
  SpeechRecognition?: new () => Recognition;
  webkitSpeechRecognition?: new () => Recognition;
};

export function VoiceControls({ onTranscript, onListening, reply, transcriptContext,
  keepAllTranscripts: controlledKeepAllTranscripts, onKeepAllTranscriptsChange }: {
  onTranscript: (text: string) => void;
  onListening: (listening: boolean) => void;
  reply: string;
  transcriptContext?: readonly string[];
  keepAllTranscripts?: boolean;
  onKeepAllTranscriptsChange?: (enabled: boolean) => void;
}) {
  const [supported, setSupported] = useState(false);
  const [canSpeak, setCanSpeak] = useState(false);
  const [listening, setListening] = useState(false);
  const [status, setStatus] = useState("");
  const [recordingBusy, setRecordingBusy] = useState(false);
  const [recordingCommand, setRecordingCommand] = useState<VoiceRecorderCommand>();
  const [localKeepAllTranscripts, setLocalKeepAllTranscripts] = useState(false);
  const keepAllTranscripts = controlledKeepAllTranscripts ?? localKeepAllTranscripts;
  const recordingBusyRef = useRef(false);
  const commandSequence = useRef(0);
  const samplePlayback = useRef<HTMLAudioElement | null>(null);
  const recognition = useRef<Recognition | null>(null);
  const callbacks = useRef({ onTranscript, onListening });
  callbacks.current = { onTranscript, onListening };
  const transcriptPolicy = useRef({ recentText: transcriptContext, keepAll: keepAllTranscripts });
  transcriptPolicy.current = { recentText: transcriptContext, keepAll: keepAllTranscripts };

  useEffect(() => {
    const browser = window as VoiceWindow;
    setSupported(Boolean(browser.SpeechRecognition || browser.webkitSpeechRecognition));
    setCanSpeak("speechSynthesis" in window);
    return () => {
      const current = recognition.current;
      recognition.current = null;
      if (current) {
        current.onresult = null;
        current.onend = null;
        current.onerror = null;
        current.abort();
      }
      window.speechSynthesis?.cancel();
      callbacks.current.onListening(false);
    };
  }, []);

  function stop() {
    const current = recognition.current;
    recognition.current = null;
    if (current) {
      current.onresult = null;
      current.onend = null;
      current.onerror = null;
      current.abort();
    }
    setListening(false);
    callbacks.current.onListening(false);
  }

  function start() {
    const browser = window as VoiceWindow;
    const Constructor = browser.SpeechRecognition || browser.webkitSpeechRecognition;
    if (!Constructor || recordingBusyRef.current || recognition.current) return;
    samplePlayback.current?.pause();
    window.speechSynthesis?.cancel();
    const current = new Constructor();
    recognition.current = current;
    current.lang = "en-US";
    current.continuous = false;
    current.interimResults = false;
    const processedFinalResults = new Set<number>();
    let preserveSessionSounds = false;
    current.onresult = (event) => {
      if (recognition.current !== current) return;
      // A cue in one final segment protects sounds in the same batch and later
      // segments of this session. Keep only a boolean, not another transcript
      // history. More than seven segments conservatively disables filtering.
      const batchText: string[] = [];
      for (let index = event.resultIndex ?? 0; index < event.results.length && batchText.length < 8; index++) {
        const result = event.results[index];
        if (result?.isFinal !== false && typeof result?.[0]?.transcript === "string") batchText.push(result[0].transcript);
      }
      preserveSessionSounds ||= preserveVoiceVocalizations({ recentText: batchText });
      for (let index = event.resultIndex ?? 0; index < event.results.length; index++) {
        if (recognition.current !== current) return;
        const result = event.results[index];
        // interimResults is false; older adapters omit isFinal. An explicit
        // interim result is never filtered, committed, or treated as a command.
        if (!result || result.isFinal === false || processedFinalResults.has(index)) continue;
        const text = result[0]?.transcript;
        if (typeof text !== "string") continue;
        processedFinalResults.add(index);
        const decision = classifyVoiceTranscript(text, { ...transcriptPolicy.current,
          keepAll: transcriptPolicy.current.keepAll || preserveSessionSounds });
        // Quietly ignore this result, without stopping/restarting capture or
        // changing timing. A later final result can still contain real words.
        if (decision.kind === "ignore") continue;
        const action = parseVoiceRecorderCommand(decision.text, { userStartedListening: true, listening: recognition.current === current });
        if (action) {
          stop();
          setStatus("Voice command received. Review the recording controls below.");
          setRecordingCommand({ action, sequence: ++commandSequence.current });
          return;
        }
        callbacks.current.onTranscript(decision.text);
      }
    };
    current.onerror = (event) => {
      if (recognition.current !== current) return;
      setStatus(event.error === "not-allowed" ? "Microphone permission was denied. You can still type." : "Voice capture stopped. Try again or type your request.");
      stop();
    };
    current.onend = () => { if (recognition.current === current) stop(); };
    try {
      current.start();
      setListening(true);
      callbacks.current.onListening(true);
      setStatus("Listening for one request. Voice uses the same approval controls as typing.");
    } catch {
      stop();
      setStatus("Microphone could not start. You can still type.");
    }
  }

  return <div className="voice-controls">
    <button type="button" className="agent-switch" disabled={!supported || recordingBusy} aria-pressed={listening}
      onClick={() => { if (listening) { stop(); setStatus("Microphone stopped."); } else start(); }}>
      {listening ? "Stop microphone" : "Speak request"}
    </button>
    <button type="button" className="agent-switch" disabled={!canSpeak || !reply || recordingBusy} onClick={() => {
      if (recordingBusyRef.current) return;
      samplePlayback.current?.pause();
      stop();
      window.speechSynthesis.cancel();
      window.speechSynthesis.speak(new SpeechSynthesisUtterance(reply));
    }}>Read latest reply</button>
    <button type="button" className="agent-switch" disabled={!canSpeak} onClick={() => window.speechSynthesis.cancel()}>Stop reading</button>
    <span role="status">{!supported ? "Speech-to-text is unavailable in this browser. Typing is available." : status}</span>
    <LocalVoiceRecorder disabled={listening} command={recordingCommand} playbackRef={samplePlayback}
      onBeforeRecord={() => { stop(); window.speechSynthesis?.cancel(); }}
      onPlaybackStart={() => { stop(); window.speechSynthesis?.cancel(); }}
      onBusyChange={busy => { recordingBusyRef.current = busy; setRecordingBusy(busy); }} />
    <label className="tay-check"><input type="checkbox" checked={keepAllTranscripts} onChange={event => {
      setLocalKeepAllTranscripts(event.target.checked); onKeepAllTranscriptsChange?.(event.target.checked);
    }} /> Keep filler and sound transcriptions</label>
    <p>For dictation: only recognized filler-only text and sound labels are skipped. Turn this on for exact transcription or speech hesitations. In this workspace it lasts until you change conversations or reload. Your browser controls pauses and may miss or misread sounds.</p>
  </div>;
}
