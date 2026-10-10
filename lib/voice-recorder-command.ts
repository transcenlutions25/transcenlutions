export type VoiceRecorderAction = "review-start" | "stop" | "cancel";
export interface VoiceRecorderCommand { action: VoiceRecorderAction; sequence: number }
/** Only the result of a current, explicitly user-started listening session is eligible.
 * Never call this on chat history, assistant replies, attachments, or quoted text.
 * A start command opens review; only the Record button can request capture.
 */
export function parseVoiceRecorderCommand(text: string, context: { userStartedListening: boolean; listening: boolean }): VoiceRecorderAction | null {
  if (!context.userStartedListening || !context.listening || text.length > 100) return null;
  const normalized = text.trim().replace(/[.!?,]+$/g, "").replace(/[.!?,]/g, " ").replace(/\s+/g, " ").toLowerCase();
  if (normalized === "hey tay record and clone my voice start now") return "review-start";
  if (normalized === "hey tay stop recording") return "stop";
  if (normalized === "hey tay cancel recording") return "cancel";
  return null;
}
