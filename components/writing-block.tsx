"use client";

import { useEffect, useId, useRef, useState } from "react";
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

const sourceLabels = { generated: "Generated", user: "Your edit", ai: "Tay revision", restore: "Restored version" };

export function WritingBlock(props: WritingBlockProps) {
  return <WritingBlockEditor key={props.id} {...props} />;
}

function WritingBlockEditor({ id, title, content, kind = "text", language, onRequestRevision, onSaveAsset, onContentChange }: WritingBlockProps) {
  const uid = useId();
  const editor = useRef<HTMLTextAreaElement>(null);
  const mounted = useRef(false);
  const initialContent = useRef(content);
  const [state, setState] = useState<WritingBlockState>(() => createWritingBlock(content));
  const stateRef = useRef(state);
  const onChangeRef = useRef(onContentChange);
  onChangeRef.current = onContentChange;
  const [loaded, setLoaded] = useState(false);
  const [status, setStatus] = useState("");
  const [storageProblem, setStorageProblem] = useState("");
  const [copyFailed, setCopyFailed] = useState(false);
  const [copySequence, setCopySequence] = useState(0);
  const [busy, setBusy] = useState(false);
  const [tone, setTone] = useState("professional");
  const [selection, setSelection] = useState<WritingSelection>({ start: 0, end: 0 });
  const [incoming, setIncoming] = useState<string | null>(null);
  const text = writingBlockText(state);

  function commit(next: WritingBlockState) {
    stateRef.current = next;
    setState(next);
    onChangeRef.current?.(writingBlockText(next));
    try {
      window.localStorage.setItem(writingBlockStorageKey(id), JSON.stringify(next));
      setStorageProblem("");
      return true;
    } catch {
      setStorageProblem("Your edits are kept in this tab. This browser could not save them; export a copy before closing.");
      return false;
    }
  }

  useEffect(() => {
    mounted.current = true;
    let restored = createWritingBlock(initialContent.current);
    try {
      const saved = window.localStorage.getItem(writingBlockStorageKey(id));
      const decoded = decodeWritingBlockState(saved);
      if (decoded) restored = decoded;
      if (saved && !decoded) {
        setStorageProblem("The saved writing version could not be read. The original is shown; the unreadable saved record is preserved until you edit or save.");
      } else {
        window.localStorage.setItem(writingBlockStorageKey(id), JSON.stringify(restored));
      }
    } catch {
      setStorageProblem("Browser storage is unavailable. Export your edits before closing this tab.");
    }
    stateRef.current = restored;
    setState(restored);
    onChangeRef.current?.(writingBlockText(restored));
    setLoaded(true);
    return () => { mounted.current = false; };
  }, [id]);

  useEffect(() => {
    if (!loaded) return;
    const current = stateRef.current;
    if (content === writingBlockText(current) || content === initialContent.current) return;
    if (current.hasEdits) {
      const next = recordWritingAlternative(current, content);
      stateRef.current = next;
      setState(next);
      onChangeRef.current?.(writingBlockText(next));
      try { window.localStorage.setItem(writingBlockStorageKey(id), JSON.stringify(next)); }
      catch { setStorageProblem("Browser storage is unavailable. Export your edits before closing this tab."); }
      setIncoming(content);
      setStatus("A new generated version is available in Version history. Your edited version is preserved.");
    } else {
      const next = editWritingBlock(current, content, "generated");
      stateRef.current = next;
      setState(next);
      onChangeRef.current?.(writingBlockText(next));
      try { window.localStorage.setItem(writingBlockStorageKey(id), JSON.stringify(next)); }
      catch { setStorageProblem("Browser storage is unavailable. Export your edits before closing this tab."); }
    }
  }, [content, id, loaded]);

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
    setStatus("Version restored and saved. Undo can recover the version you were editing.");
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
        setStatus("Your text changed while Tay was working. Your edits are preserved; Tay’s candidate is saved in Version history.");
        return;
      }
      commit(result.state);
      const nextSelection = { start: request.selection.start, end: request.selection.start + replacement.length };
      setSelection(nextSelection);
      requestAnimationFrame(() => { editor.current?.focus(); editor.current?.setSelectionRange(nextSelection.start, nextSelection.end); });
      setStatus(request.scope === "selection" ? "Selected text revised. Everything outside your selection is preserved." : "Revision saved. Your previous version is in Version history.");
    } catch {
      if (mounted.current) setStatus("Tay could not revise this block. Your text is preserved. Try again or edit directly.");
    } finally { if (mounted.current) setBusy(false); }
  }

  async function saveAsset() {
    const asset: WritingAsset = { id, title, kind, ...(language ? { language } : {}), content: writingBlockText(stateRef.current), updatedAt: Date.now() };
    try {
      if (onSaveAsset) await onSaveAsset(asset);
      else {
        const assets = parseWritingAssets(window.localStorage.getItem(WRITING_ASSET_STORAGE_KEY));
        window.localStorage.setItem(WRITING_ASSET_STORAGE_KEY, JSON.stringify(saveWritingAsset(assets, asset)));
      }
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
        <details className="writing-block__menu">
          <summary aria-label={`More actions for ${title}`}>More</summary>
          <div className="writing-block__menu-content">
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
            <button type="button" disabled={!loaded} onClick={() => { setStatus(commit(stateRef.current) ? "Saved on this device" : "Save failed. Export a copy to preserve your edits."); }}>Save</button>
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
          </div>
        </details>
      </div>
    </div>
    <textarea ref={editor} className="writing-block__editor" aria-label={`Editable ${title}`} aria-describedby={`${uid}-status`}
      value={text} readOnly={!loaded} spellCheck={kind !== "code"} rows={Math.max(4, Math.min(18, text.split("\n").length + 1))}
      style={{ width: "100%", minWidth: 0, resize: "vertical", whiteSpace: "pre-wrap", overflowWrap: "anywhere", fontSize: "1rem", boxSizing: "border-box" }}
      onChange={(event) => {
        const saved = commit(editWritingBlock(stateRef.current, event.target.value, "user", Date.now(), true));
        setStatus(saved ? "Edited version saved on this device." : "Edited version is kept in this tab. Export a copy before closing.");
        setCopyFailed(false);
      }}
      onSelect={(event) => setSelection({ start: event.currentTarget.selectionStart, end: event.currentTarget.selectionEnd })}
      onKeyDown={(event) => {
        if (!(event.ctrlKey || event.metaKey) || event.altKey) return;
        if (event.key.toLowerCase() === "z") { event.preventDefault(); if (event.shiftKey) redo(); else undo(); }
        else if (event.key.toLowerCase() === "y") { event.preventDefault(); redo(); }
      }} />
    <p id={`${uid}-status`} className="writing-block__status" role="status" aria-live="polite" aria-atomic="true">
      <span key={copySequence}>{status || (loaded ? storageProblem ? "Edit directly." : "Edit directly. Your latest version is saved on this device." : "Loading your saved version…")}</span>
      {storageProblem && <> {storageProblem}</>}
    </p>
  </section>;
}
