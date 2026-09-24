"use client";

import { useEffect, useRef, useState } from "react";

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
    if (!Constructor) return;
    window.speechSynthesis?.cancel();
    const current = new Constructor();
    recognition.current = current;
    current.lang = "en-US";
    current.continuous = false;
    current.interimResults = false;
    current.onresult = (event) => {
      const text = event.results[0]?.[0]?.transcript.trim();
      if (text) callbacks.current.onTranscript(text);
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
    <button type="button" className="agent-switch" disabled={!supported} aria-pressed={listening}
      onClick={() => { if (listening) { stop(); setStatus("Microphone stopped."); } else start(); }}>
      {listening ? "Stop microphone" : "Speak request"}
    </button>
    <button type="button" className="agent-switch" disabled={!canSpeak || !reply} onClick={() => {
      stop();
      window.speechSynthesis.cancel();
      window.speechSynthesis.speak(new SpeechSynthesisUtterance(reply));
    }}>Read latest reply</button>
    <button type="button" className="agent-switch" disabled={!canSpeak} onClick={() => window.speechSynthesis.cancel()}>Stop reading</button>
    <span role="status">{!supported ? "Voice capture unavailable in this browser. Typing is available." : status}</span>
  </div>;
}
