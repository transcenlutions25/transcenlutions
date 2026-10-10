"use client";

import { useEffect, useRef, useState } from "react";
import { LocalVoiceRecorder } from "./local-voice-recorder";
import { parseVoiceRecorderCommand, type VoiceRecorderCommand } from "../lib/voice-recorder-command";

interface Recognition {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onresult: ((event: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null;
  onerror: ((event: { error: string }) => void) | null;
  onend: (() => void) | null;
  start(): void;
  abort(): void;
}
type VoiceWindow = Window & {
  SpeechRecognition?: new () => Recognition;
  webkitSpeechRecognition?: new () => Recognition;
};

export function VoiceControls({ onTranscript, onListening, reply }: {
  onTranscript: (text: string) => void;
  onListening: (listening: boolean) => void;
  reply: string;
}) {
  const [supported, setSupported] = useState(false);
  const [canSpeak, setCanSpeak] = useState(false);
  const [listening, setListening] = useState(false);
  const [status, setStatus] = useState("");
  const [recordingBusy, setRecordingBusy] = useState(false);
  const [recordingCommand, setRecordingCommand] = useState<VoiceRecorderCommand>();
  const recordingBusyRef = useRef(false);
  const commandSequence = useRef(0);
  const samplePlayback = useRef<HTMLAudioElement | null>(null);
  const recognition = useRef<Recognition | null>(null);
  const callbacks = useRef({ onTranscript, onListening });
  callbacks.current = { onTranscript, onListening };

  useEffect(() => {
    const browser = window as VoiceWindow;
    setSupported(Boolean(browser.SpeechRecognition || browser.webkitSpeechRecognition));
    setCanSpeak("speechSynthesis" in window);
    return () => {
      if (recognition.current) {
        recognition.current.onresult = null;
        recognition.current.onend = null;
        recognition.current.onerror = null;
        recognition.current.abort();
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
    current.onresult = (event) => {
      const text = event.results[0]?.[0]?.transcript.trim();
      if (!text || recognition.current !== current) return;
      const action = parseVoiceRecorderCommand(text, { userStartedListening: true, listening: recognition.current === current });
      if (action) {
        stop();
        setStatus("Voice command received. Review the recording controls below.");
        setRecordingCommand({ action, sequence: ++commandSequence.current });
      } else callbacks.current.onTranscript(text);
    };
    current.onerror = (event) => {
      setStatus(event.error === "not-allowed" ? "Microphone permission was denied. You can still type." : "Voice capture stopped. Try again or type your request.");
      stop();
    };
    current.onend = () => stop();
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
  </div>;
}
