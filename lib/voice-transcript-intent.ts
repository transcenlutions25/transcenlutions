/** A conservative text-only gate for final, user-started browser dictation.
 * It cannot hear audio, distinguish a sung command from speech, identify a
 * speaker, or control a recognizer's pause/end-pointing behavior. Never use this
 * as authorization or on typed input, stored history, or recording samples.
 */
export interface VoiceTranscriptContext {
  /** Known current-conversation text, never instructions or command input.
   * Undefined means context is unavailable, so nonempty text is preserved.
   */
  recentText?: readonly string[];
  /** An explicit, in-memory accessibility / exact-transcription override. */
  keepAll?: boolean;
}

export type VoiceTranscriptDecision =
  | { kind: "keep"; text: string }
  | { kind: "ignore"; reason: "empty" | "incidental-only" };

// These cues only turn filtering OFF. A broad match is safer than losing an
// intentional vocalization. This is not music, distress, or disability detection.
const PRESERVE_CONTEXT = /\b(?:sing|sings|singing|sung|song|songs|music|musical|hum|hums|humming|hummed|melody|tune|lyrics?|karaoke|beatbox|vocal(?:s|ize|ization)?|help|hurt|hurting|pain|afraid|scared|unsafe|danger|distress|emergency|breathe?|breathing|chok(?:e|ing)|panic|panicking|suicid(?:e|al)|self[ -]?harm|dying|stutter(?:ing)?|stammer(?:ing)?|aphasia|speech|hesitat(?:e|ion|ions|ing)|pause|pauses|slow(?:ly)?|thinking|verbatim|transcrib(?:e|ing)|transcription)\b|\b(?:kill myself|want to die|more time|let me finish|don['’]?t interrupt|keep (?:every|all))\b/i;

export function preserveVoiceVocalizations(context: VoiceTranscriptContext): boolean {
  if (context.keepAll || context.recentText === undefined) return true;
  // Fail open instead of silently clipping away an exception. The UI supplies
  // at most six recent messages and its draft; nothing is fetched or retained.
  if (context.recentText.length > 7) return true;
  // A recognizer's sound label cannot establish its own intentional-music
  // exception. Actual words around it still can. Original output is untouched.
  return context.recentText.some(text => text.length > 4_000 || PRESERVE_CONTEXT.test(text.toLowerCase().replace(SOUND_NOTATION, " ")));
}

// Only bracketed notations are sounds: bare "singing" or "grunts" can be a
// meaningful answer/topic. Unknown notations (crying, gasping, inaudible, etc.)
// pass through. Do not add lyrics, acknowledgments, or semantic phrase filters.
const SOUND_NOTATION = /\[(?:humming|hums?|singing|music|grunting|grunts?|throat[ -]clearing|clears? throat|clearing throat)\]|\((?:humming|hums?|singing|music|grunting|grunts?|throat[ -]clearing|clears? throat|clearing throat)\)|\*(?:humming|hums?|singing|music|grunting|grunts?|throat[ -]clearing|clears? throat|clearing throat)\*/g;
const FILLER = /^(?:u+h+|u+m+|e+r+m+|h+m{2,})$/;

export function classifyVoiceTranscript(text: string, context: VoiceTranscriptContext = {}): VoiceTranscriptDecision {
  const candidate = text.trim();
  if (!candidate) return { kind: "ignore", reason: "empty" };
  const keep = { kind: "keep" as const, text };
  if (preserveVoiceVocalizations(context)) return keep;
  // Bound work and preserve questioning/uncertain content. Punctuation and
  // Unicode are never stripped from accepted text or fed to command parsing.
  if (candidate.length > 512 || /[?？]/.test(candidate)) return keep;
  const lower = candidate.toLowerCase();
  // These can be an answer ("uh-uh" / "hmm hmm") or a dictated acronym.
  if (/^(?:u+h+[\s,.-]+u+h+|h+m+[\s,.-]+h+m+)[.!…]*$/.test(lower)
    || /^[A-Z]{2,}[.!]?$/u.test(candidate)) return keep;
  const withoutSounds = lower.replace(SOUND_NOTATION, " ");
  const hasSound = lower !== withoutSounds;
  const tokens = withoutSounds.split(/[\s.,;:!…]+/).filter(Boolean);
  if ((hasSound || tokens.length > 0) && tokens.every(token => FILLER.test(token))) {
    return { kind: "ignore", reason: "incidental-only" };
  }
  return keep;
}
