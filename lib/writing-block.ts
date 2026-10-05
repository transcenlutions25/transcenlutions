export type WritingKind = "text" | "code" | "document";
export type WritingVersionSource = "generated" | "user" | "ai" | "restore";
export type WritingRevisionAction = "rewrite" | "shorten" | "expand" | "tone" | "grammar";

export interface WritingVersion {
  id: number;
  content: string;
  source: WritingVersionSource;
  createdAt: number;
}

export interface WritingBlockState {
  schema: 1;
  original: string;
  versions: WritingVersion[];
  archive: WritingVersion[];
  position: number;
  revision: number;
  nextVersion: number;
  hasEdits: boolean;
}

export interface WritingSelection { start: number; end: number }

export interface WritingRevisionRequest {
  action: WritingRevisionAction;
  scope: "selection" | "block";
  text: string;
  selectedText: string;
  selection: WritingSelection;
  startVersion: number;
  tone?: string;
}

export interface WritingAsset {
  id: string;
  title: string;
  kind: WritingKind;
  language?: string;
  content: string;
  updatedAt: number;
}

export const WRITING_ASSET_STORAGE_KEY = "tay:writing-assets:v1";
const HISTORY_LIMIT = 60;

export interface WritingCopyTarget {
  writeText?: (text: string) => Promise<void>;
  fallbackCopy: (text: string) => boolean;
  selectForManualCopy: () => boolean;
}

/** All paths copy only the supplied authoritative text, never surrounding UI. */
export async function copyWritingText(text: string, target: WritingCopyTarget): Promise<{ copied: boolean; manualSelection: boolean }> {
  try {
    if (target.writeText) {
      await target.writeText(text);
      return { copied: true, manualSelection: false };
    }
  } catch { /* Clipboard permission may be denied; the fallback still gets the exact text. */ }
  try {
    if (target.fallbackCopy(text)) return { copied: true, manualSelection: false };
  } catch { /* Selection and explicit failure feedback remain available. */ }
  let manualSelection = false;
  try { manualSelection = target.selectForManualCopy(); } catch { /* Never report success after a failed fallback. */ }
  return { copied: false, manualSelection };
}

export function writingBlockStorageKey(id: string): string {
  return `tay:writing-block:v1:${id}`;
}

export function createWritingBlock(content: string, now = Date.now()): WritingBlockState {
  return {
    schema: 1, original: content, versions: [{ id: 0, content, source: "generated", createdAt: now }],
    archive: [{ id: 0, content, source: "generated", createdAt: now }],
    position: 0, revision: 0, nextVersion: 1, hasEdits: false,
  };
}

export function writingBlockText(state: WritingBlockState): string {
  return state.versions[state.position].content;
}

export function editWritingBlock(
  state: WritingBlockState, content: string, source: WritingVersionSource = "user",
  now = Date.now(), groupTyping = false,
): WritingBlockState {
  if (content === writingBlockText(state)) return state;
  const versions = state.versions.slice(0, state.position + 1);
  const previous = versions[versions.length - 1];
  // A short typing burst is one undo step; generated and AI versions stay distinct.
  const coalesce = groupTyping && source === "user" && previous.source === "user" &&
    state.position === state.versions.length - 1 && versions.length > 1 &&
    state.archive[state.archive.length - 1]?.id === previous.id &&
    now >= previous.createdAt && now - previous.createdAt < 750;
  const version: WritingVersion = { id: state.nextVersion, content, source, createdAt: now };
  if (coalesce) versions[versions.length - 1] = version;
  else versions.push(version);
  const bounded = versions.slice(-HISTORY_LIMIT);
  const archive = coalesce ? state.archive.filter((item) => item.id !== previous.id) : state.archive;
  return {
    ...state, versions: bounded, archive: [...archive, version].slice(-HISTORY_LIMIT), position: bounded.length - 1,
    revision: state.revision + 1, nextVersion: state.nextVersion + 1,
    hasEdits: state.hasEdits || source !== "generated",
  };
}

/** Preserve a regenerated candidate without replacing the user's active text. */
export function recordWritingAlternative(
  state: WritingBlockState, content: string, source: "generated" | "ai" = "generated", now = Date.now(),
): WritingBlockState {
  if (state.archive.some((item) => item.content === content && item.source === source)) return state;
  const version = { id: state.nextVersion, content, source, createdAt: now };
  return { ...state, archive: [...state.archive, version].slice(-HISTORY_LIMIT), nextVersion: state.nextVersion + 1 };
}

export function undoWritingBlock(state: WritingBlockState): WritingBlockState {
  return state.position > 0 ? { ...state, position: state.position - 1, revision: state.revision + 1 } : state;
}

export function redoWritingBlock(state: WritingBlockState): WritingBlockState {
  return state.position < state.versions.length - 1 ?
    { ...state, position: state.position + 1, revision: state.revision + 1 } : state;
}

export function restoreWritingVersion(state: WritingBlockState, content: string, now = Date.now()): WritingBlockState {
  return editWritingBlock(state, content, "restore", now);
}

export function createWritingRevisionRequest(
  state: WritingBlockState, action: WritingRevisionAction, selection?: WritingSelection, tone?: string,
): WritingRevisionRequest {
  const text = writingBlockText(state);
  const start = Math.max(0, Math.min(text.length, Math.trunc(selection?.start ?? 0)));
  const end = Math.max(start, Math.min(text.length, Math.trunc(selection?.end ?? 0)));
  const range = end > start ? { start, end } : { start: 0, end: text.length };
  return {
    action, scope: end > start ? "selection" : "block", text,
    selectedText: text.slice(range.start, range.end), selection: range,
    startVersion: state.revision, ...(tone ? { tone } : {}),
  };
}

export function applyWritingRevision(
  state: WritingBlockState, request: WritingRevisionRequest, replacement: string, now = Date.now(),
): { state: WritingBlockState; applied: boolean } {
  if (request.startVersion !== state.revision || request.text !== writingBlockText(state) ||
    request.text.slice(request.selection.start, request.selection.end) !== request.selectedText) {
    return { state, applied: false };
  }
  const content = request.text.slice(0, request.selection.start) + replacement + request.text.slice(request.selection.end);
  return { state: editWritingBlock(state, content, "ai", now), applied: true };
}

export function decodeWritingBlockState(serialized: string | null): WritingBlockState | null {
  if (!serialized) return null;
  try {
    const value: unknown = JSON.parse(serialized);
    if (!value || typeof value !== "object") return null;
    const candidate = value as Partial<WritingBlockState>;
    if (!candidate.archive && Array.isArray(candidate.versions)) candidate.archive = candidate.versions;
    const sources = ["generated", "user", "ai", "restore"];
    if (candidate.schema !== 1 || typeof candidate.original !== "string" ||
      typeof candidate.hasEdits !== "boolean" || !Array.isArray(candidate.versions) ||
      candidate.versions.length < 1 || candidate.versions.length > HISTORY_LIMIT ||
      !Array.isArray(candidate.archive) || candidate.archive.length < 1 || candidate.archive.length > HISTORY_LIMIT ||
      !Number.isSafeInteger(candidate.position) || candidate.position! < 0 || candidate.position! >= candidate.versions.length ||
      !Number.isSafeInteger(candidate.revision) || candidate.revision! < 0 ||
      !Number.isSafeInteger(candidate.nextVersion) || candidate.nextVersion! < 1 ||
      [...candidate.versions, ...candidate.archive].some((version) => !version || typeof version.content !== "string" ||
        !sources.includes(version.source) || !Number.isSafeInteger(version.id) || version.id < 0 ||
        !Number.isFinite(version.createdAt) || version.createdAt < 0) ||
      [...candidate.versions, ...candidate.archive].some((version) => version.id >= candidate.nextVersion!)) {
      return null;
    }
    return candidate as WritingBlockState;
  } catch {
    return null;
  }
}

export function parseWritingBlockState(serialized: string | null, fallback: string): WritingBlockState {
  return decodeWritingBlockState(serialized) ?? createWritingBlock(fallback);
}

export function parseWritingAssets(serialized: string | null): WritingAsset[] {
  if (!serialized) return [];
  try {
    const value: unknown = JSON.parse(serialized);
    if (!Array.isArray(value)) return [];
    return value.filter((item): item is WritingAsset => Boolean(item) &&
      typeof item.id === "string" && typeof item.title === "string" && typeof item.content === "string" &&
      ["text", "code", "document"].includes(item.kind) &&
      (item.language === undefined || typeof item.language === "string") && Number.isFinite(item.updatedAt));
  } catch {
    return [];
  }
}

export function saveWritingAsset(assets: WritingAsset[], asset: WritingAsset): WritingAsset[] {
  return [asset, ...assets.filter((item) => item.id !== asset.id)];
}
