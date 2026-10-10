/** Small honest replies for the existing hosted guided responder.
 * No model, emotion inference, history retrieval, execution or durable memory.
 * Natural model-backed conversation is assembled by the desktop runtime.
 */
export function guidedConversationReply(input: string): string | null {
  const normalized = input.trim().toLowerCase().replace(/[’‘]/g, "'");
  // This is a narrow fallback, not an intent model. An explicit work request
  // keeps its existing route even when its example/button/copy contains a cue.
  if (/^(?:(?:please|can you|could you|will you|would you|i need you to|i want you to)\s+)*(?:create|build|draft|write|record|log|save|design|implement|fix|review|test|generate|plan|prepare|add|update|make|analyze)\b/.test(normalized)) return null;
  const text = normalized.replace(/"[^"]*"|“[^”]*”|`[^`]*`/g, "");
  if (/^(?:(?:no|actually)[,.!]?\s+)?(?:i said|i meant|you misheard|that's not what i said)\b/.test(normalized)
      && /\bmy learning library\b/.test(normalized)) {
    return "Your learning library. I understand the correction; I won't treat that phrase as a product named My Learn.";
  }
  if (/\b(?:pretend|just say|tell me|say)\b.{0,60}\b(?:finished|done|complete|made progress)\b/.test(text)
      && /\b(?:even if|even though|whether or not|without evidence|pretend)\b/.test(text)) {
    return "I can help you find a real next step, but I can't honestly call unfinished work done. What has actually been checked?";
  }
  if (/\b(?:sync|synced|synchronized|same context|same memory)\b/.test(text)
      && /\b(?:offline|phone|device|devices|laptop|computer)\b/.test(text)) {
    return "Tay's identity stays the same. I can work with the context supplied here, but this guided reply can't verify that your devices have synced.";
  }
  if (/\b(?:who are you|are you (?:a human|human|an ai|ai)|what's your name|what is your name)\b/.test(text)) {
    return "Tay is Transcenlutions' AI assistant. This hosted chat currently gives limited, guided replies; a working model connection hasn't been established by this response.";
  }
  if (/\b(?:can you|do you|did you)\b.{0,40}\b(?:read|see|access|remember|search)\b.{0,40}\b(?:other chats|all my|private files|learning library|other accounts)\b/.test(text)) {
    return "This guided reply doesn't retrieve other chats, files, or accounts. Share the specific context you want to discuss, without passwords or other secrets.";
  }
  if (/\b(?:lost my attention|lost attention|lost track|wasn't listening|missed that|say that again|repeat that|repeat what you said)\b/.test(text)) {
    return "Of course. This guided responder doesn't receive earlier replies, so I can't reliably repeat that yet. Which point should we pick up?";
  }
  if (/\b(?:what(?:'s| is) (?:actually |really )?(?:done|finished|working)|what (?:have we|has been) (?:actually |really )?(?:done|finished|completed)|how much (?:is done|progress)|is (?:it|this) (?:actually |really )?(?:done|finished|working))\b/.test(text)) {
    return "I don't have a verified work result in this guided reply. A plan or a saved response alone doesn't show that a build, test, or delivery finished.";
  }
  if (/\b(?:cheer me up|encourage me|i need (?:some )?encouragement|lift my spirits|uplift (?:me|my mood|a craftsman's mood))\b/.test(text)
      || /\b(?:i'm|i am|i feel|feeling) (?:really |a little |so )?(?:disheartened|discouraged)\b/.test(text)) {
    return "One solid piece at a time. Let's choose a small part we can actually check. What needs attention first?";
  }
  return null;
}
