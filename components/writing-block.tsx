"use client";

import { createContext, useCallback, useContext, useEffect, useId, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { createBrowserRecordStorageGuard, type WorkspaceStorageGuard, type WorkspaceStorageBlockReason } from "@/lib/workspace-storage-guard";
import {
  applyWritingRevision, copyWritingText, createWritingBlock, createWritingRevisionRequest, decodeWritingBlockState, editWritingBlock,
  parseWritingAssets, recordWritingAlternative, redoWritingBlock, restoreWritingVersion,
  saveWritingAsset, undoWritingBlock, WRITING_ASSET_STORAGE_KEY, writingBlockStorageKey, writingBlockText,
  type WritingAsset, type WritingBlockState, type WritingKind, type WritingRevisionAction,
  type WritingRevisionRequest, type WritingSelection,
} from "@/lib/writing-block";

export interface WritingBlockProps {
  /** Stable conversation/project + message + block identity; never use a list index. */
  id: string;
  title: string;
  content: string;
  kind?: WritingKind;
  language?: string;
  onRequestRevision?: (request: WritingRevisionRequest) => Promise<string>;
  onSaveAsset?: (asset: WritingAsset) => Promise<void> | void;
  onContentChange?: (content: string) => void;
}

export const WritingPersistenceContext = createContext<{ isPaused: () => boolean; onBlocked: () => void }>({
  isPaused: () => false,
  onBlocked: () => {},
});

interface AssetStorageClient {
  canWrite: () => boolean;
  onBlocked: (reason: WorkspaceStorageBlockReason) => void;
}
interface SharedAssetStorage {
  guard: WorkspaceStorageGuard;
  assets: WritingAsset[];
  clients: Set<AssetStorageClient>;
}
// Blocks in one document share this list's exact baseline. Coordinating our own
// writes is safe; a different tab's bytes still block rather than being merged.
const assetStorageByDocument = new WeakMap<Storage, SharedAssetStorage>();

function attachAssetStorage(storage: Storage, client: AssetStorageClient): SharedAssetStorage {
  const existing = assetStorageByDocument.get(storage);
  if (existing) {
    existing.clients.add(client);
    existing.guard.observeStorage({ key: WRITING_ASSET_STORAGE_KEY, storageArea: storage });
    const status = existing.guard.getStatus();
    if (status.state === "blocked") client.onBlocked(status.reason);
    return existing;
  }
  const initialRaw = storage.getItem(WRITING_ASSET_STORAGE_KEY);
  const clients = new Set([client]);
  const shared: SharedAssetStorage = {
    assets: parseWritingAssets(initialRaw), clients,
    guard: createBrowserRecordStorageGuard({ storage, key: WRITING_ASSET_STORAGE_KEY, initialRaw, locks: navigator.locks,
      canWrite: () => Array.from(clients).every(member => member.canWrite()),
      onBlocked: reason => clients.forEach(member => member.onBlocked(reason)),
      isReadable: value => Array.isArray(value) && parseWritingAssets(JSON.stringify(value)).length === value.length }),
  };
  assetStorageByDocument.set(storage, shared);
  return shared;
}

interface BlockStorageClient extends AssetStorageClient {
  onState: (state: WritingBlockState, sourceEditor: string | null) => void;
  onPersistence: (status: string) => void;
}
interface SharedBlockStorage {
  guard: WorkspaceStorageGuard;
  current: WritingBlockState;
  canHydrate: boolean;
  saveSequence: number;
  dirty: boolean;
  lastEditor: string | null;
  clients: Set<BlockStorageClient>;
}
const blockStorageByDocument = new WeakMap<Storage, Map<string, SharedBlockStorage>>();

/** Recovery export includes live/retained local versions alongside disk records. */
export function getLiveWritingSnapshots(): Record<string, WritingBlockState> {
  try {
    const records = blockStorageByDocument.get(window.localStorage);
    return Object.fromEntries(Array.from(records ?? [], ([key, record]) => [key, record.current]));
  } catch { return {}; }
}

function attachBlockStorage(storage: Storage, id: string, content: string, client: BlockStorageClient): SharedBlockStorage {
  let records = blockStorageByDocument.get(storage);
  if (!records) { records = new Map(); blockStorageByDocument.set(storage, records); }
  const key = writingBlockStorageKey(id);
  const existing = records.get(key);
  if (existing) {
    existing.clients.add(client);
    existing.guard.observeStorage({ key, storageArea: storage });
    const status = existing.guard.getStatus();
    if (status.state === "blocked") client.onBlocked(status.reason);
    else if (status.state === "disposed") client.onBlocked("conflict");
    return existing;
  }
  // A conversation and its Library copy are views of one local writing record.
  // Hydrate once; subsequent views share local edits and full version history.
  const initialRaw = storage.getItem(key);
  const decoded = decodeWritingBlockState(initialRaw);
  const clients = new Set([client]);
  const shared: SharedBlockStorage = {
    current: decoded ?? createWritingBlock(content), canHydrate: initialRaw === null || decoded !== null,
    clients, saveSequence: 0, dirty: false, lastEditor: null,
    guard: createBrowserRecordStorageGuard({ storage, key, initialRaw, locks: navigator.locks,
      canWrite: () => Array.from(clients).every(member => member.canWrite()),
      onBlocked: reason => clients.forEach(member => member.onBlocked(reason)),
      isReadable: value => decodeWritingBlockState(JSON.stringify(value)) !== null }),
  };
  records.set(key, shared);
  return shared;
}

const sourceLabels = { generated: "Generated", user: "Your edit", ai: "Tay revision", restore: "Restored version" };

/** Native top-layer positioning escapes the conversation scroller. The portal
 * fallback uses the same bounded surface and keyboard behavior on older browsers. */
function WritingActions({ title, children, editor }: { title: string; children: ReactNode; editor: React.RefObject<HTMLTextAreaElement> }) {
  const uid = useId();
  const trigger = useRef<HTMLButtonElement>(null);
  const surface = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [native, setNative] = useState(false);

  function close(restoreFocus = false) {
    setOpen(false);
    if (restoreFocus) trigger.current?.focus({ preventScroll: true });
  }

  useLayoutEffect(() => {
    if (!open) return;
    const panel = surface.current;
    const button = trigger.current;
    if (!panel || !button) return;
    if (native) {
      try { panel.showPopover(); }
      catch { setNative(false); return; }
    }
    const place = () => {
      const viewport = window.visualViewport;
      const useViewport = viewport && Math.abs(viewport.scale - 1) < 0.01;
      const width = useViewport ? viewport.width : window.innerWidth;
      const viewportHeight = useViewport ? viewport.height : window.innerHeight;
      const badgeReserve = document.querySelector("iframe#nl-badge-frame") ? 72 : 0;
      const height = Math.max(1, viewportHeight - badgeReserve);
      const left = useViewport ? viewport.offsetLeft : 0;
      const top = useViewport ? viewport.offsetTop : 0;
      const margin = 12;
      const rect = button.getBoundingClientRect();
      const panelWidth = Math.max(1, Math.min(290, width - margin * 2));
      const bottomSpace = Math.max(0, top + height - margin - rect.bottom - 6);
      const topSpace = Math.max(0, rect.top - top - margin - 6);
      const below = bottomSpace >= Math.min(320, height - margin * 2) || bottomSpace >= topSpace;
      const available = Math.max(topSpace, bottomSpace) < 88 ? height - margin * 2 : below ? bottomSpace : topSpace;
      const maxHeight = Math.max(1, Math.min(480, height - margin * 2, available));
      panel.style.width = `${panelWidth}px`;
      panel.style.maxHeight = `${maxHeight}px`;
      const panelHeight = Math.min(panel.scrollHeight || maxHeight, maxHeight);
      panel.style.left = `${Math.max(left + margin, Math.min(rect.right - panelWidth, left + width - panelWidth - margin))}px`;
      panel.style.top = `${Math.max(top + margin, Math.min(below ? rect.bottom + 6 : rect.top - 6 - panelHeight, top + height - panelHeight - margin))}px`;
      panel.style.visibility = "visible";
    };
    const outside = (event: Event) => {
      if (event.target instanceof Node && !panel.contains(event.target) && !button.contains(event.target)) setOpen(false);
    };
    const scroll = (event: Event) => {
      // Internal scrolling leaves the anchor alone; ancestor scrolling and
      // viewport changes recalculate placement without clipping the action list.
      if (event.target instanceof Node && panel.contains(event.target)) return;
      place();
    };
    const anotherMenu = () => setOpen(false);
    document.dispatchEvent(new Event("tay:writing-actions-open"));
    document.addEventListener("tay:writing-actions-open", anotherMenu);
    document.addEventListener("pointerdown", outside, true);
    document.addEventListener("focusin", outside);
    document.addEventListener("scroll", scroll, true);
    window.addEventListener("resize", place);
    window.visualViewport?.addEventListener("resize", place);
    window.visualViewport?.addEventListener("scroll", place);
    const observer = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(place);
    observer?.observe(panel);
    place();
    (panel.querySelector<HTMLElement>("button:not(:disabled), select, summary") ?? panel).focus({ preventScroll: true });
    return () => {
      observer?.disconnect();
      document.removeEventListener("tay:writing-actions-open", anotherMenu);
      document.removeEventListener("pointerdown", outside, true);
      document.removeEventListener("focusin", outside);
      document.removeEventListener("scroll", scroll, true);
      window.removeEventListener("resize", place);
      window.visualViewport?.removeEventListener("resize", place);
      window.visualViewport?.removeEventListener("scroll", place);
      if (native) { try { panel.hidePopover(); } catch { /* Already removed or dismissed. */ } }
    };
  }, [open, native]);

  const panel = open ? <div ref={surface} id={`${uid}-actions`} className="writing-block__menu-content writing-block__action-surface"
    popover={native ? "manual" : undefined} role="dialog" aria-label={`More actions for ${title}`} tabIndex={-1}
    style={{ visibility: "hidden" }}
    onClick={(event) => {
      if (event.target instanceof Element && event.target.closest("button")) close(Boolean(surface.current?.contains(document.activeElement)));
    }}
    onKeyDown={(event) => {
      if (event.nativeEvent.isComposing || event.defaultPrevented) return;
      if (event.key === "Escape") {
        event.stopPropagation();
        // A native select owns Escape while its picker is active.
        if (event.target instanceof Element && event.target.tagName === "SELECT") return;
        event.preventDefault();
        const details = event.target instanceof Element ? event.target.closest<HTMLDetailsElement>("details[open]") : null;
        if (details && surface.current?.contains(details)) {
          details.open = false;
          details.querySelector<HTMLElement>(":scope > summary")?.focus({ preventScroll: true });
        } else close(true);
      } else if (event.key === "Tab") {
        // The fallback lives outside the sidecar DOM. Keep its internal Tab order
        // ahead of the sidecar trap, then continue at the inline editor/opener.
        event.stopPropagation();
        const controls = Array.from(surface.current?.querySelectorAll<HTMLElement>("button:not(:disabled), select, summary") ?? [])
          .filter((element) => !element.closest("details:not([open])") || element.matches("details:not([open]) > summary"));
        if (event.shiftKey && document.activeElement === controls[0]) {
          event.preventDefault(); close(true);
        } else if (!event.shiftKey && document.activeElement === controls[controls.length - 1]) {
          event.preventDefault(); close(); editor.current?.focus({ preventScroll: true });
        }
      }
    }}>{children}</div> : null;

  return <div className="writing-block__menu">
    <button ref={trigger} type="button" aria-label={`More actions for ${title}`} aria-haspopup="dialog" aria-expanded={open}
      aria-controls={open ? `${uid}-actions` : undefined} onClick={() => {
        if (open) close(true);
        else { setNative(typeof HTMLElement.prototype.showPopover === "function"); setOpen(true); }
      }}>More</button>
    {native ? panel : open ? createPortal(panel, trigger.current?.closest<HTMLElement>('[role="dialog"][aria-modal="true"]') ?? document.body) : null}
  </div>;
}

export function WritingBlock(props: WritingBlockProps) {
  return <WritingBlockEditor key={props.id} {...props} />;
}

function WritingBlockEditor({ id, title, content, kind = "text", language, onRequestRevision, onSaveAsset, onContentChange }: WritingBlockProps) {
  const uid = useId();
  const editor = useRef<HTMLTextAreaElement>(null);
  const composing = useRef(false);
  const mounted = useRef(false);
  const initialContent = useRef(content);
  const [state, setState] = useState<WritingBlockState>(() => createWritingBlock(content));
  const stateRef = useRef(state);
  const onChangeRef = useRef(onContentChange);
  onChangeRef.current = onContentChange;
  const [loaded, setLoaded] = useState(false);
  const [status, setStatus] = useState("");
  const [storageProblem, setStorageProblem] = useState("");
  const [storageStatus, setStorageStatus] = useState("");
  const persistence = useContext(WritingPersistenceContext);
  const persistenceRef = useRef(persistence);
  persistenceRef.current = persistence;
  const blockStoreRef = useRef<SharedBlockStorage | null>(null);
  const assetsStoreRef = useRef<SharedAssetStorage | null>(null);
  const [copyFailed, setCopyFailed] = useState(false);
  const [copySequence, setCopySequence] = useState(0);
  const [busy, setBusy] = useState(false);
  const [tone, setTone] = useState("professional");
  const [selection, setSelection] = useState<WritingSelection>({ start: 0, end: 0 });
  const [incoming, setIncoming] = useState<string | null>(null);
  const text = writingBlockText(state);

  const persistenceBlocked = useCallback((reason: WorkspaceStorageBlockReason) => {
    if (!mounted.current) return;
    setStorageStatus("");
    setStatus("Saving paused. Your current writing is kept in this tab.");
    setStorageProblem(reason === "conflict"
      ? "Another tab changed saved data or workspace saving is paused. Export this writing before reloading; no saved version was overwritten."
      : reason === "unreadable"
        ? "Saved writing could not be read and has been preserved. Export this writing before reloading."
        : "This browser could not safely save your writing. Export a copy before closing or reloading.");
    persistenceRef.current.onBlocked();
  }, []);

  const persist = useCallback(async function persist(next: WritingBlockState) {
    const shared = blockStoreRef.current;
    if (!shared) { persistenceBlocked("storage-unavailable"); return false; }
    const sequence = ++shared.saveSequence;
    shared.clients.forEach(client => client.onPersistence("Saving on this device…"));
    const result = await shared.guard.queueWrite(JSON.stringify(next));
    const saved = result === "saved" || result === "unchanged";
    if (sequence === shared.saveSequence) {
      if (saved) shared.dirty = false;
      shared.clients.forEach(client => client.onPersistence(saved ? "Saved on this device." : "Not saved. Export a copy before closing or reloading."));
    }
    return saved;
  }, [persistenceBlocked]);

  const commit = useCallback(function commit(next: WritingBlockState, sourceEditor: string | null = null) {
    const shared = blockStoreRef.current;
    if (shared) {
      shared.current = next;
      shared.dirty = true;
      shared.lastEditor = sourceEditor;
      // Update refs synchronously before any other view can edit, undo or apply
      // an asynchronous revision. This is same-document state, never a rebase.
      shared.clients.forEach(client => client.onState(next, sourceEditor));
    } else {
      stateRef.current = next;
      setState(next);
      onChangeRef.current?.(writingBlockText(next));
    }
    return persist(next);
  }, [persist]);

  useEffect(() => {
    mounted.current = true;
    let restored = createWritingBlock(initialContent.current);
    let canHydrate = false;
    let storage: Storage | null = null;
    const client: BlockStorageClient = {
      canWrite: () => !persistenceRef.current.isPaused(), onBlocked: persistenceBlocked,
      onState: (next, sourceEditor) => {
        if (!mounted.current) return;
        stateRef.current = next;
        // Do not replace an IME's in-progress DOM buffer from a sibling view.
        // Composition end commits that buffer against the newest shared history.
        if (!composing.current || sourceEditor === uid) setState(next);
        onChangeRef.current?.(writingBlockText(next));
      },
      onPersistence: value => { if (mounted.current) setStorageStatus(value); },
    };
    try {
      storage = window.localStorage;
      const shared = attachBlockStorage(storage, id, initialContent.current, client);
      blockStoreRef.current = shared;
      restored = shared.current;
      canHydrate = shared.canHydrate;
      assetsStoreRef.current = attachAssetStorage(storage, client);
    } catch { persistenceBlocked("storage-unavailable"); }
    stateRef.current = restored;
    setState(restored);
    if (canHydrate) onChangeRef.current?.(writingBlockText(restored));
    setLoaded(true);
    const observe = (event: StorageEvent) => {
      blockStoreRef.current?.guard.observeStorage(event);
      assetsStoreRef.current?.guard.observeStorage(event);
    };
    window.addEventListener("storage", observe);
    return () => {
      mounted.current = false;
      const sharedBlock = blockStoreRef.current;
      sharedBlock?.clients.delete(client);
      if (sharedBlock && sharedBlock.clients.size === 0) {
        const retainForRecovery = sharedBlock.dirty || sharedBlock.guard.getStatus().state !== "ready";
        sharedBlock.guard.dispose();
        if (!retainForRecovery) {
          const records = storage ? blockStorageByDocument.get(storage) : null;
          records?.delete(writingBlockStorageKey(id));
          if (storage && records?.size === 0) blockStorageByDocument.delete(storage);
        }
      }
      blockStoreRef.current = null;
      const sharedAssets = assetsStoreRef.current;
      sharedAssets?.clients.delete(client);
      if (sharedAssets && sharedAssets.clients.size === 0) {
        sharedAssets.guard.dispose();
        if (storage) assetStorageByDocument.delete(storage);
      }
      assetsStoreRef.current = null;
      window.removeEventListener("storage", observe);
    };
  }, [id, uid, persistenceBlocked]);

  useEffect(() => {
    if (!loaded) return;
    const current = stateRef.current;
    if (content === writingBlockText(current) || content === initialContent.current) return;
    if (current.hasEdits) {
      const next = recordWritingAlternative(current, content);
      void commit(next);
      setIncoming(content);
      setStatus("A new generated version is available in Version history. Your edited version is preserved.");
    } else {
      const next = editWritingBlock(current, content, "generated");
      void commit(next);
    }
  }, [content, id, loaded, commit]);

  function focusEditor() {
    editor.current?.focus();
    editor.current?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }

  function fallbackCopy(value: string): boolean {
    const target = document.createElement("textarea");
    target.value = value;
    target.setAttribute("readonly", "");
    target.style.cssText = "position:fixed;top:0;left:-9999px;opacity:0;font-size:16px";
    document.body.appendChild(target);
    const previous = document.activeElement as HTMLElement | null;
    let copied = false;
    try {
      target.focus(); target.select(); target.setSelectionRange(0, value.length);
      copied = document.execCommand("copy");
    } catch { copied = false; }
    finally { target.remove(); previous?.focus(); }
    return copied;
  }

  async function copy() {
    const value = writingBlockText(stateRef.current);
    const result = await copyWritingText(value, {
      ...(navigator.clipboard?.writeText ? { writeText: (text: string) => navigator.clipboard.writeText(text) } : {}),
      fallbackCopy,
      selectForManualCopy: () => {
        focusEditor(); editor.current?.select();
        setSelection({ start: 0, end: writingBlockText(stateRef.current).length });
        return Boolean(editor.current);
      },
    });
    if (!mounted.current) return;
    setCopyFailed(!result.copied);
    setCopySequence((value) => value + 1);
    if (result.copied) setStatus("Copied");
    else setStatus(result.manualSelection ?
      "Copy failed. Your text is selected. Use your browser’s Copy command or press Command+C / Control+C." :
      "Copy failed. Select your writing and use your browser’s Copy command, or choose Export from More.");
  }

  function undo() {
    const next = undoWritingBlock(stateRef.current);
    if (next === stateRef.current) { setStatus("No earlier undo step. The original is available in Version history."); return; }
    commit(next);
    setSelection({ start: 0, end: 0 });
    setStatus("Previous version restored. Redo is available.");
  }

  function redo() {
    const next = redoWritingBlock(stateRef.current);
    if (next === stateRef.current) { setStatus("No later undo step."); return; }
    commit(next);
    setSelection({ start: 0, end: 0 });
    setStatus("Next version restored.");
  }

  function restore(value: string) {
    commit(restoreWritingVersion(stateRef.current, value));
    setSelection({ start: 0, end: 0 });
    setStatus("Version restored in this tab. Undo can recover the version you were editing.");
    focusEditor();
  }

  async function revise(action: WritingRevisionAction) {
    if (!onRequestRevision) {
      setStatus("Tay revisions are not connected for this block yet. You can edit directly; your text has not changed.");
      return;
    }
    const request = createWritingRevisionRequest(stateRef.current, action, selection, action === "tone" ? tone : undefined);
    setBusy(true);
    setStatus(request.scope === "selection" ? "Tay is revising only your selected text…" : "Tay is revising this block…");
    try {
      const replacement = await onRequestRevision(request);
      if (!mounted.current) return;
      if (typeof replacement !== "string") throw new Error("Invalid revision");
      const result = applyWritingRevision(stateRef.current, request, replacement);
      if (!result.applied) {
        const candidate = request.text.slice(0, request.selection.start) + replacement + request.text.slice(request.selection.end);
        commit(recordWritingAlternative(stateRef.current, candidate, "ai"));
        setStatus("Your text changed while Tay was working. Your edits are preserved; Tay’s candidate is available in Version history.");
        return;
      }
      commit(result.state);
      const nextSelection = { start: request.selection.start, end: request.selection.start + replacement.length };
      setSelection(nextSelection);
      requestAnimationFrame(() => { editor.current?.focus(); editor.current?.setSelectionRange(nextSelection.start, nextSelection.end); });
      setStatus(request.scope === "selection" ? "Selected text revised. Everything outside your selection is preserved." : "Revision applied. Your previous version is in Version history.");
    } catch {
      if (mounted.current) setStatus("Tay could not revise this block. Your text is preserved. Try again or edit directly.");
    } finally { if (mounted.current) setBusy(false); }
  }

  async function saveAsset() {
    const asset: WritingAsset = { id, title, kind, ...(language ? { language } : {}), content: writingBlockText(stateRef.current), updatedAt: Date.now() };
    try {
      if (persistenceRef.current.isPaused()) { persistenceBlocked("conflict"); return; }
      setStatus("Saving to Assets…");
      if (onSaveAsset) await onSaveAsset(asset);
      else {
        const sharedAssets = assetsStoreRef.current;
        if (!sharedAssets) { persistenceBlocked("storage-unavailable"); return; }
        sharedAssets.assets = saveWritingAsset(sharedAssets.assets, asset);
        const result = await sharedAssets.guard.queueWrite(JSON.stringify(sharedAssets.assets));
        if (result !== "saved" && result !== "unchanged") {
          if (mounted.current) setStatus("Asset was not saved. Your writing is kept in this tab; export a copy before reloading.");
          return;
        }
      }
      if (!mounted.current) return;
      window.dispatchEvent(new CustomEvent("tay:writing-asset-saved", { detail: { id } }));
      setStatus(onSaveAsset ? "Saved to Assets" : "Saved to Assets on this device");
    } catch { setStatus("Could not save this asset. Your text is preserved; export a copy or try again."); }
  }

  function exportText() {
    const extensions: Record<string, string> = { javascript: "js", typescript: "ts", python: "py", html: "html", css: "css", json: "json", sql: "sql", bash: "sh", markdown: "md" };
    const extension = kind === "code" && language ? extensions[language.toLowerCase()] ?? "txt" : "txt";
    const filename = (title.replace(/[^\p{L}\p{N}._-]+/gu, "-").replace(/^-|-$/g, "") || "tay-writing") + `.${extension}`;
    try {
      const url = URL.createObjectURL(new Blob([writingBlockText(stateRef.current)], { type: "text/plain;charset=utf-8" }));
      const anchor = document.createElement("a");
      anchor.href = url; anchor.download = filename;
      document.body.appendChild(anchor); anchor.click(); anchor.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
      setStatus("Export prepared. Check your browser’s downloads.");
    } catch { setStatus("Export could not start. Use Copy to preserve your text."); }
  }

  return <section className="writing-block" aria-labelledby={`${uid}-title`} data-writing-block-id={id} data-writing-kind={kind}>
    <div className="writing-block__header">
      <div><strong id={`${uid}-title`}>{title}</strong><span className="writing-block__kind">{kind === "code" ? language || "Code" : kind === "document" ? "Document" : "Writing"}</span></div>
      <div className="writing-block__actions">
        <button type="button" onClick={focusEditor} disabled={!loaded} aria-label={`Edit ${title}`}>Edit</button>
        <button type="button" onClick={() => void copy()} disabled={!loaded} aria-label={`Copy ${title}`} data-writing-copy>{copyFailed ? "Retry copy" : "Copy"}</button>
        <WritingActions title={title} editor={editor}>
            <p className="writing-block__selection">{selection.end > selection.start ? `${selection.end - selection.start} characters selected. Revisions affect this selection only.` : "Select text to revise part of this block."}</p>
            <button type="button" disabled={busy || !loaded} onClick={() => void revise("rewrite")}>Rewrite{selection.end > selection.start ? " selection" : " block"}</button>
            <button type="button" disabled={busy || !loaded} onClick={() => void revise("shorten")}>Shorten</button>
            <button type="button" disabled={busy || !loaded} onClick={() => void revise("expand")}>Expand</button>
            <label htmlFor={`${uid}-tone`}>Tone</label>
            <select id={`${uid}-tone`} value={tone} onChange={(event) => setTone(event.target.value)}><option value="professional">Professional</option><option value="friendly">Friendly</option><option value="direct">Direct</option></select>
            <button type="button" disabled={busy || !loaded} onClick={() => void revise("tone")}>Change tone</button>
            <button type="button" disabled={busy || !loaded} onClick={() => void revise("grammar")}>Fix grammar</button>
            <button type="button" disabled={!loaded || state.position === 0} onClick={undo}>Undo</button>
            <button type="button" disabled={!loaded || state.position === state.versions.length - 1} onClick={redo}>Redo</button>
            <button type="button" disabled={!loaded} onClick={() => { setStatus("Saving writing…"); void commit(stateRef.current).then((saved) => { if (mounted.current) setStatus(saved ? "Saved on this device" : "Save paused. Export a copy to preserve your edits."); }); }}>Save</button>
            <button type="button" disabled={!loaded} onClick={() => void saveAsset()}>Save to Assets</button>
            <button type="button" disabled={!loaded} onClick={exportText}>Export</button>
            <details className="writing-block__history">
              <summary>Version history</summary>
              <button type="button" onClick={() => restore(state.original)}>Restore original generated version</button>
              {incoming !== null && <button type="button" onClick={() => { restore(incoming); setIncoming(null); }}>Use latest generated version</button>}
              <ol>{state.archive.map((version) => <li key={version.id}>
                <button type="button" disabled={version.id === state.versions[state.position].id} onClick={() => restore(version.content)}>
                  {sourceLabels[version.source]} {version.id + 1}{version.id === state.versions[state.position].id ? " · Current" : ""}
                </button>
              </li>)}</ol>
            </details>
        </WritingActions>
      </div>
    </div>
    <textarea ref={editor} className="writing-block__editor" aria-label={`Editable ${title}`} aria-describedby={`${uid}-status`}
      value={composing.current && editor.current ? editor.current.value : text} readOnly={!loaded} spellCheck={kind !== "code"} rows={Math.max(4, Math.min(18, text.split("\n").length + 1))}
      style={{ width: "100%", minWidth: 0, resize: "vertical", whiteSpace: "pre-wrap", overflowWrap: "anywhere", fontSize: "1rem", boxSizing: "border-box" }}
      onChange={(event) => {
        void commit(editWritingBlock(stateRef.current, event.target.value, "user", Date.now(), blockStoreRef.current?.lastEditor === uid), uid);
        setStatus("Edited version is kept in this tab.");
        setCopyFailed(false);
      }}
      onCompositionStart={() => { composing.current = true; }}
      onCompositionEnd={(event) => {
        composing.current = false;
        const value = event.currentTarget.value;
        if (value !== writingBlockText(stateRef.current)) void commit(editWritingBlock(stateRef.current, value, "user"), uid);
        else setState(stateRef.current);
      }}
      onSelect={(event) => setSelection({ start: event.currentTarget.selectionStart, end: event.currentTarget.selectionEnd })}
      onKeyDown={(event) => {
        if (!(event.ctrlKey || event.metaKey) || event.altKey) return;
        if (event.key.toLowerCase() === "z") { event.preventDefault(); if (event.shiftKey) redo(); else undo(); }
        else if (event.key.toLowerCase() === "y") { event.preventDefault(); redo(); }
      }} />
    <p id={`${uid}-status`} className="writing-block__status" role="status" aria-live="polite" aria-atomic="true">
      <span key={copySequence}>{status || (loaded ? "Edit directly. Copy or export to keep a separate copy." : "Loading your saved version…")}</span>
      {storageStatus && <> {storageStatus}</>}
      {storageProblem && <> {storageProblem}</>}
    </p>
  </section>;
}
