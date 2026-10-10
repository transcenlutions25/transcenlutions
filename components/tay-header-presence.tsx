"use client";

import Image from "next/image";
import { useEffect, useId, useRef, useState } from "react";
import type { AgentId } from "../lib/agent-foundation";
import {
  readTayMotionPaused,
  TAY_HEADER_ASSET,
  TAY_HEADER_MOTION_STORAGE_KEY,
  tayPresenceMotionState,
  writeTayMotionPreference,
} from "../lib/tay-header-presence";
import styles from "./tay-header-presence.module.css";

export interface TayHeaderPresenceProps {
  agentId: AgentId;
  /** Compact is a 48px-tall header companion. Roomy is opt-in, for a separate view. */
  size?: "compact" | "roomy";
  tone?: "dark" | "light";
  /** The host can suspend decoration while a dialog or another task obscures it. */
  suspended?: boolean;
  /** Optional existing conversation-controls action; pause remains a sibling button. */
  onOpenControls?: () => void;
  controlsExpanded?: boolean;
  controlsId?: string;
}

/** One approved standing pose. Not a walk cycle, live face, or agent status signal. */
export function TayHeaderPresence({
  agentId,
  size = "compact",
  tone = "dark",
  suspended = false,
  onOpenControls,
  controlsExpanded,
  controlsId,
}: TayHeaderPresenceProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const motionPreferenceEdited = useRef(false);
  const descriptionId = useId();
  const [preferencesReady, setPreferencesReady] = useState(false);
  const [paused, setPaused] = useState(true);
  const [reducedMotion, setReducedMotion] = useState(true);
  const [motionPreferenceAvailable, setMotionPreferenceAvailable] = useState(false);
  const [visibilityAvailable, setVisibilityAvailable] = useState(false);
  const [pageVisible, setPageVisible] = useState(false);
  const [inView, setInView] = useState(false);
  const [imageReady, setImageReady] = useState(false);
  const [imageFailed, setImageFailed] = useState(false);

  useEffect(() => {
    try {
      setPaused(readTayMotionPaused(window.localStorage.getItem(TAY_HEADER_MOTION_STORAGE_KEY)));
    } catch {
      // Stay still by default if storage is denied; Resume still works in memory.
      setPaused(true);
    }
    setPreferencesReady(true);

    const visibilityChanged = () => setPageVisible(document.visibilityState === "visible");
    visibilityChanged();
    document.addEventListener("visibilitychange", visibilityChanged);

    let media: MediaQueryList | null = null;
    try {
      if (typeof window.matchMedia === "function") media = window.matchMedia("(prefers-reduced-motion: reduce)");
    } catch { /* Treat unavailable preference detection as static art. */ }
    const modernListeners = typeof media?.addEventListener === "function" && typeof media?.removeEventListener === "function";
    const legacyListeners = typeof media?.addListener === "function" && typeof media?.removeListener === "function";
    const mediaSupported = modernListeners || legacyListeners;
    const motionChanged = () => setReducedMotion(mediaSupported ? (media?.matches ?? true) : true);
    setMotionPreferenceAvailable(mediaSupported);
    motionChanged();
    if (modernListeners) media?.addEventListener("change", motionChanged);
    else if (legacyListeners) media?.addListener(motionChanged);

    return () => {
      document.removeEventListener("visibilitychange", visibilityChanged);
      if (modernListeners) media?.removeEventListener("change", motionChanged);
      else if (legacyListeners) media?.removeListener(motionChanged);
    };
  }, []);

  useEffect(() => {
    setInView(false);
    const element = rootRef.current;
    if (agentId !== "tay" || !element) return;
    if (typeof window.IntersectionObserver !== "function") {
      // No visibility detection means static art, never an offscreen busy loop.
      setVisibilityAvailable(false);
      return;
    }
    setVisibilityAvailable(true);
    let connected = true;
    const observer = new window.IntersectionObserver((entries) => {
      if (!connected) return;
      const entry = entries.find((candidate) => candidate.target === element);
      if (entry) setInView(entry.isIntersecting && entry.intersectionRatio >= 0.25);
    }, { threshold: [0, 0.25] });
    observer.observe(element);
    return () => {
      connected = false;
      observer.disconnect();
    };
  }, [agentId]);

  useEffect(() => {
    if (!motionPreferenceEdited.current) return;
    try {
      window.localStorage.setItem(TAY_HEADER_MOTION_STORAGE_KEY, writeTayMotionPreference(paused));
    } catch { /* Keep the user's choice in memory without affecting other features. */ }
  }, [paused]);

  const motionState = tayPresenceMotionState({
    agentId, preferencesReady, motionPreferenceAvailable, visibilityAvailable,
    reducedMotion, paused, pageVisible, inView, imageReady, imageFailed, suspended,
  });
  const unavailable = motionState === "unavailable";
  const reduced = motionState === "reduced-motion";
  const controlsDisabled = !preferencesReady || unavailable || reduced;
  const motionLabel = !preferencesReady ? "Tay animation off while preferences load"
    : reduced ? "Tay animation off: reduced motion is enabled"
    : unavailable ? "Tay animation off: unavailable"
    : paused ? "Resume Tay animation" : "Pause Tay animation";
  const description = reduced ? "Your device’s reduced-motion setting keeps Tay still."
    : unavailable ? "Tay stays still when the image or motion and visibility support is unavailable."
    : "An occasional gentle standing-pose animation. Pausing changes only this decoration.";

  function togglePaused() {
    if (controlsDisabled) return;
    motionPreferenceEdited.current = true;
    setPaused((current) => !current);
  }

  if (agentId !== "tay") return null;

  const identity = <>
    <span className={styles.art} aria-hidden="true">
      {!imageFailed && <Image
        className={styles.image}
        src={TAY_HEADER_ASSET.src}
        width={TAY_HEADER_ASSET.width}
        height={TAY_HEADER_ASSET.height}
        alt=""
        sizes={size === "roomy" ? "4rem" : "1.875rem"}
        draggable={false}
        onLoad={() => setImageReady(true)}
        onError={() => { setImageReady(false); setImageFailed(true); }}
      />}
    </span>
    <span className={styles.name}>Tay</span>
  </>;

  return <div ref={rootRef} className={styles.root} data-tay-presence="true"
    data-size={size} data-tone={tone} data-motion={motionState}>
    {onOpenControls ? <button className={styles.identityButton} type="button"
      onClick={onOpenControls} aria-label="Conversation controls for Tay"
      aria-expanded={controlsExpanded} aria-controls={controlsId}>{identity}</button>
      : <span className={styles.identity}>{identity}</span>}
    <button className={styles.motionButton} type="button" onClick={togglePaused}
      disabled={controlsDisabled} aria-label={motionLabel} title={motionLabel}
      aria-describedby={descriptionId}>
      {controlsDisabled ? "Off" : paused ? "Resume" : "Pause"}
    </button>
    <span id={descriptionId} className={styles.visuallyHidden}>{description}</span>
  </div>;
}
