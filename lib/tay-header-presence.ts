import type { AgentId } from "./agent-foundation";

/** Decorative presence only. These values are not runtime/agent work states. */
export const TAY_HEADER_MOTION_STORAGE_KEY = "tay.header.motion.v1";

export const TAY_HEADER_ASSET = Object.freeze({
  src: "/assets/tay-header/TayCommand-fullbody-Kangol-gray-patch-v2.png",
  width: 1024,
  height: 1536,
  sha256: "427ae508d23e794f92bd9a011793172a5f2f76999d19fe079e7c37e8c9e4015b",
});

/** Missing preferences use motion; malformed preferences fail safely to still. */
export function readTayMotionPaused(value: string | null): boolean {
  if (value === null) return false;
  try {
    const parsed: unknown = JSON.parse(value);
    if (typeof parsed === "object" && parsed !== null && "version" in parsed
      && parsed.version === 1 && "paused" in parsed && typeof parsed.paused === "boolean") {
      return parsed.paused;
    }
  } catch { /* A damaged preference must never affect chat. */ }
  return true;
}

export function writeTayMotionPreference(paused: boolean): string {
  return JSON.stringify({ version: 1, paused });
}

export interface TayPresenceConditions {
  agentId: AgentId;
  preferencesReady: boolean;
  motionPreferenceAvailable: boolean;
  visibilityAvailable: boolean;
  reducedMotion: boolean;
  paused: boolean;
  pageVisible: boolean;
  inView: boolean;
  imageReady: boolean;
  imageFailed: boolean;
  suspended: boolean;
}

export type TayPresenceMotionState = "inactive" | "initializing" | "unavailable"
  | "reduced-motion" | "paused" | "suspended" | "not-visible" | "loading" | "playing";

export function tayPresenceMotionState(conditions: TayPresenceConditions): TayPresenceMotionState {
  if (conditions.agentId !== "tay") return "inactive";
  if (conditions.imageFailed) return "unavailable";
  if (!conditions.preferencesReady) return "initializing";
  if (!conditions.motionPreferenceAvailable || !conditions.visibilityAvailable) return "unavailable";
  if (conditions.reducedMotion) return "reduced-motion";
  if (conditions.paused) return "paused";
  if (conditions.suspended) return "suspended";
  if (!conditions.pageVisible || !conditions.inView) return "not-visible";
  if (!conditions.imageReady) return "loading";
  return "playing";
}
