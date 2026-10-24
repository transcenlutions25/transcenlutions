/**
 * Adapted from Freebuff (Apache-2.0):
 *   upstream: https://github.com/CodebuffAI/freebuff
 *   file:     packages/agent-runtime/src/process-str-replace.ts
 *   commit:   cf94e966da87d477b6b46dddc1ea87956c624642
 *   license:  see ./LICENSE and ./NOTICE in this directory
 *
 * Changes from upstream: the replacement matcher is split out and runs
 * synchronously, the `diff` and logger dependencies are removed (this project
 * builds its own preview diff), and the result is typed for this workspace.
 */

export interface Replacement {
  oldString: string;
  newString: string;
  allowMultiple?: boolean;
}

export interface ReplacementOutcome {
  /** Full file content after all replacements, normalized to `\n`. */
  content: string;
  /** Any replacement that could not be applied, in plain language. */
  messages: string[];
  applied: number;
}

function normalizeLineEndings(value: string): string {
  return value.replace(/\r\n/g, "\n");
}

type MatchResult = { success: true; oldStr: string } | { success: false; error: string };

/**
 * Finds the text a replacement should target.
 *
 * Upstream behaviour kept intact: an exact single match wins; more than one
 * match is an error unless `allowMultiple` is set; then indentation-tolerant
 * and finally whitespace-insensitive matching are attempted.
 */
export function tryMatchOldStr(params: {
  initialContent: string;
  oldStr: string;
  newStr: string;
  allowMultiple: boolean;
}): MatchResult {
  const { initialContent, oldStr, newStr, allowMultiple } = params;
  const count = initialContent.split(oldStr).length - 1;
  if (count === 1) return { success: true, oldStr };
  if (!allowMultiple && count > 1) {
    return {
      success: false,
      error: `Found ${count} occurrences of the target text. Use a longer, more specific target or allow multiple replacements.`,
    };
  }
  if (allowMultiple && count > 1) return { success: true, oldStr };

  const indentationMatch = tryWithExtraIndentation({ oldFileContent: initialContent, searchContent: oldStr, replaceContent: newStr });
  if (indentationMatch) return { success: true, oldStr: indentationMatch };

  const noWhitespaceSearch = oldStr.replace(/\s+/g, "");
  const noWhitespaceOld = initialContent.replace(/\s+/g, "");
  const noWhitespaceIndex = noWhitespaceSearch ? noWhitespaceOld.indexOf(noWhitespaceSearch) : -1;
  if (noWhitespaceIndex >= 0) {
    let realIndex = 0;
    let seen = 0;
    while (seen < noWhitespaceIndex && realIndex < initialContent.length) {
      if (/\S/.test(initialContent[realIndex]!)) seen++;
      realIndex++;
    }
    let searchLength = 0;
    let seenSearch = 0;
    while (seenSearch < noWhitespaceSearch.length && realIndex + searchLength < initialContent.length) {
      if (/\S/.test(initialContent[realIndex + searchLength]!)) seenSearch++;
      searchLength++;
    }
    const actualContent = initialContent.slice(realIndex, realIndex + searchLength);
    if (actualContent && initialContent.includes(actualContent)) return { success: true, oldStr: actualContent };
  }

  return {
    success: false,
    error: "The target text was not found in this file. Use text that matches the current file content exactly.",
  };
}

/** Re-indents the replacement when the model supplied a dedented block. */
function tryWithExtraIndentation(params: {
  oldFileContent: string;
  searchContent: string;
  replaceContent: string;
}): string | null {
  const { oldFileContent, searchContent, replaceContent } = params;
  const indentation = leadingIndentation(replaceContent);
  if (indentation.length === 0) return null;
  const regex = new RegExp(indentation + escapeRegExp(normalizeLineEndings(searchContent).split("\n").join(`\n${indentation}`)), "g");
  const matches = normalizeLineEndings(oldFileContent).match(regex);
  if (matches && matches.length === 1) return matches[0]!;
  return null;
}

function leadingIndentation(value: string): string {
  const match = value.match(/^[ \t]+/);
  return match ? match[0] : "";
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Applies replacements to file content with upstream matching semantics.
 * A file that does not change is reported as a message instead of a silent write.
 */
export function applyReplacements(content: string, replacements: Replacement[]): ReplacementOutcome {
  const lineEnding = content.includes("\r\n") ? "\r\n" : "\n";
  const messages: string[] = [];
  let current = normalizeLineEndings(content);
  let applied = 0;

  for (const replacement of replacements) {
    const oldStr = normalizeLineEndings(replacement.oldString ?? "");
    const newStr = normalizeLineEndings(replacement.newString ?? "");
    if (!oldStr) {
      messages.push("An empty target was supplied and was skipped.");
      continue;
    }
    const match = tryMatchOldStr({
      initialContent: current,
      oldStr,
      newStr,
      allowMultiple: replacement.allowMultiple === true,
    });
    if (!match.success) {
      messages.push(match.error);
      continue;
    }
    current = current.split(match.oldStr).join(newStr);
    applied++;
  }

  if (applied > 0) current = current.replaceAll("\n", lineEnding);
  return { content: current, messages, applied };
}
