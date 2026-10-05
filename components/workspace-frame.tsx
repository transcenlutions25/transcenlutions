"use client";

import Image from "next/image";
import {
  useEffect,
  useId,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent,
  type PointerEvent,
  type ReactNode,
} from "react";
import { Crown, Maximize2, Menu, Minimize2, PanelLeftClose, PanelLeftOpen, PanelRightOpen, X } from "lucide-react";

export interface WorkspaceFrameProps {
  navigation: ReactNode;
  railFooter?: ReactNode;
  header?: ReactNode;
  composer: ReactNode;
  children: ReactNode;
  sidecar?: ReactNode;
  sidecarTitle?: string;
  sidecarToolbar?: ReactNode;
  sidecarOpen?: boolean;
  onSidecarOpenChange?: (open: boolean) => void;
  conversationTitle?: string;
  persistenceKey?: string;
}

interface WorkspacePreferences {
  railWidth: number;
  sidecarWidth: number;
  railCollapsed: boolean;
}

const defaultPreferences: WorkspacePreferences = {
  railWidth: 264,
  sidecarWidth: 420,
  railCollapsed: false,
};

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), Math.max(min, max));
}

/** One conversation surface, shared by the hosted app and the desktop launcher. */
export function WorkspaceFrame({
  navigation,
  railFooter,
  header,
  composer,
  children,
  sidecar,
  sidecarTitle = "Workspace",
  sidecarToolbar,
  sidecarOpen: controlledSidecarOpen,
  onSidecarOpenChange,
  conversationTitle = "Tay Command",
  persistenceKey = "tay.workspace.layout.v1",
}: WorkspaceFrameProps) {
  const [preferences, setPreferences] = useState(defaultPreferences);
  const [preferencesLoaded, setPreferencesLoaded] = useState(false);
  const [internalSidecarOpen, setInternalSidecarOpen] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [mobile, setMobile] = useState(false);
  const [maximized, setMaximized] = useState<"conversation" | "sidecar" | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const workRef = useRef<HTMLDivElement>(null);
  const commandRef = useRef<HTMLElement>(null);
  const railRef = useRef<HTMLElement>(null);
  const sidecarRef = useRef<HTMLElement>(null);
  const resizeRef = useRef<{ kind: "rail" | "sidecar"; origin: number; width: number } | null>(null);
  const id = useId();
  const railId = `${id}-navigation`;
  const conversationId = `${id}-conversation`;
  const sidecarId = `${id}-sidecar`;
  const sidecarOpen = Boolean(sidecar) && (controlledSidecarOpen ?? internalSidecarOpen);

  function changeSidecarOpen(open: boolean) {
    setInternalSidecarOpen(open);
    onSidecarOpenChange?.(open);
    if (open) setDrawerOpen(false);
    if (!open) setMaximized(null);
  }

  useEffect(() => {
    try {
      const stored = localStorage.getItem(persistenceKey);
      if (stored) {
        const saved = JSON.parse(stored) as Partial<WorkspacePreferences>;
        setPreferences({
          railWidth: typeof saved.railWidth === "number" && Number.isFinite(saved.railWidth) ? clamp(saved.railWidth, 216, 380) : defaultPreferences.railWidth,
          sidecarWidth: typeof saved.sidecarWidth === "number" && Number.isFinite(saved.sidecarWidth) ? clamp(saved.sidecarWidth, 300, 900) : defaultPreferences.sidecarWidth,
          railCollapsed: saved.railCollapsed === true,
        });
      }
    } catch {
      // A blocked or malformed preference store must not prevent the workspace from opening.
    }
    setPreferencesLoaded(true);
  }, [persistenceKey]);

  useEffect(() => {
    if (!preferencesLoaded) return;
    const timeout = window.setTimeout(() => {
      try {
        localStorage.setItem(persistenceKey, JSON.stringify(preferences));
      } catch {
        // Layout controls still work for this session when browser storage is unavailable.
      }
    }, 150);
    return () => window.clearTimeout(timeout);
  }, [preferences, preferencesLoaded, persistenceKey]);

  useEffect(() => {
    const query = window.matchMedia("(max-width: 900px)");
    const update = () => {
      setMobile(query.matches);
      if (!query.matches) setDrawerOpen(false);
    };
    update();
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, []);

  useEffect(() => {
    if (workRef.current) workRef.current.inert = mobile && drawerOpen;
    if (commandRef.current) commandRef.current.inert = mobile && (drawerOpen || sidecarOpen);
  }, [mobile, drawerOpen, sidecarOpen]);

  useEffect(() => {
    if (!mobile || (!drawerOpen && !sidecarOpen)) return;
    const element = drawerOpen ? railRef.current : sidecarRef.current;
    if (!element) return;
    const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const selector = 'button:not([disabled]), a[href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex="0"]';
    const controls = () => Array.from(element.querySelectorAll<HTMLElement>(selector)).filter((control) => control.getClientRects().length > 0);
    controls()[0]?.focus();
    function trap(event: globalThis.KeyboardEvent) {
      if (event.key !== "Tab") return;
      const available = controls();
      const first = available[0];
      const last = available[available.length - 1];
      if (!first || !last) {
        event.preventDefault();
        element?.focus();
      } else if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }
    document.addEventListener("keydown", trap);
    return () => {
      document.removeEventListener("keydown", trap);
      // React removes the background's inert state in the next effect setup.
      // Restore focus after that update so the browser can accept it.
      window.requestAnimationFrame(() => {
        if (previousFocus?.isConnected) previousFocus.focus();
      });
    };
  }, [mobile, drawerOpen, sidecarOpen]);

  function widthLimits(kind: "rail" | "sidecar") {
    return kind === "rail"
      ? { min: 216, max: Math.max(216, Math.min(380, (rootRef.current?.clientWidth ?? 1200) - (sidecarOpen ? 672 : 366))) }
      : { min: 300, max: Math.max(300, Math.min(900, (workRef.current?.clientWidth ?? 1000) - 366)) };
  }

  function resize(kind: "rail" | "sidecar", value: number) {
    const limits = widthLimits(kind);
    setPreferences((current) => ({ ...current, [kind === "rail" ? "railWidth" : "sidecarWidth"]: clamp(value, limits.min, limits.max) }));
  }

  function startResize(event: PointerEvent<HTMLDivElement>, kind: "rail" | "sidecar") {
    if (event.button !== 0) return;
    event.preventDefault();
    const actualWidth = (kind === "rail" ? railRef.current : sidecarRef.current)?.getBoundingClientRect().width;
    resizeRef.current = { kind, origin: event.clientX, width: actualWidth ?? (kind === "rail" ? preferences.railWidth : preferences.sidecarWidth) };
    event.currentTarget.setPointerCapture(event.pointerId);
    rootRef.current?.classList.add("tay-is-resizing");
  }

  function moveResize(event: PointerEvent<HTMLDivElement>) {
    const operation = resizeRef.current;
    if (!operation) return;
    const delta = event.clientX - operation.origin;
    resize(operation.kind, operation.width + (operation.kind === "rail" ? delta : -delta));
  }

  function endResize() {
    resizeRef.current = null;
    rootRef.current?.classList.remove("tay-is-resizing");
  }

  function keyboardResize(event: KeyboardEvent<HTMLDivElement>, kind: "rail" | "sidecar") {
    const width = (kind === "rail" ? railRef.current : sidecarRef.current)?.getBoundingClientRect().width ?? (kind === "rail" ? preferences.railWidth : preferences.sidecarWidth);
    const limits = widthLimits(kind);
    const step = event.shiftKey ? 48 : 16;
    let value: number;
    if (event.key === "Home") value = limits.min;
    else if (event.key === "End") value = limits.max;
    else if (event.key === "ArrowLeft") value = width + (kind === "rail" ? -step : step);
    else if (event.key === "ArrowRight") value = width + (kind === "rail" ? step : -step);
    else return;
    event.preventDefault();
    resize(kind, value);
  }

  function closeOverlays(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key !== "Escape") return;
    if (drawerOpen) setDrawerOpen(false);
    else if (maximized) setMaximized(null);
    else if (sidecarOpen) changeSidecarOpen(false);
  }

  const style = {
    "--tay-rail-width": `${preferences.railCollapsed ? 72 : preferences.railWidth}px`,
    "--tay-sidecar-width": `${preferences.sidecarWidth}px`,
  } as CSSProperties;

  return (
    <div ref={rootRef} className={`tay-app${preferences.railCollapsed ? " tay-rail-collapsed" : ""}${drawerOpen ? " tay-drawer-open" : ""}${sidecarOpen ? " tay-sidecar-open" : ""}${maximized ? ` tay-maximize-${maximized}` : ""}`} style={style} onKeyDown={closeOverlays}>
      <a className="tay-skip-link" href={`#${conversationId}`} onClick={() => setMaximized(null)}>Skip to conversation</a>
      {mobile && (drawerOpen || sidecarOpen) && <button className="tay-overlay-backdrop" aria-label={drawerOpen ? "Close navigation" : "Close workspace"} tabIndex={-1} onClick={() => drawerOpen ? setDrawerOpen(false) : changeSidecarOpen(false)} />}
      <aside ref={railRef} id={railId} className="tay-rail" aria-label="Tay navigation" role={mobile && drawerOpen ? "dialog" : undefined} aria-modal={mobile && drawerOpen ? true : undefined} tabIndex={-1}>
        <div className="tay-rail-brand-row">
          <div className="tay-brand"><strong>TRANSCENLUTIONS</strong><span>TAY COMMAND</span></div>
          <Crown className="tay-brand-compact" size={25} aria-label="Tay Command" />
          <button className="tay-icon-button tay-rail-toggle" type="button" aria-label={mobile ? "Close navigation" : preferences.railCollapsed ? "Expand navigation" : "Collapse navigation"} aria-expanded={mobile ? drawerOpen : !preferences.railCollapsed} aria-controls={railId} onClick={() => mobile ? setDrawerOpen(false) : setPreferences((current) => ({ ...current, railCollapsed: !current.railCollapsed }))}>
            {mobile ? <X size={19} /> : preferences.railCollapsed ? <PanelLeftOpen size={19} /> : <PanelLeftClose size={19} />}
          </button>
        </div>
        <div className="tay-brand-art"><Image src="/assets/tay-command-v1.png" alt="Tay Command — Transcenlutions" width={1536} height={1024} priority sizes="(max-width: 900px) 260px, 300px" /></div>
        <nav className="tay-navigation" aria-label="Workspace navigation" onClick={(event) => { if (mobile && event.target instanceof Element && event.target.closest("button, a[href]")) setDrawerOpen(false); }}>{navigation}</nav>
        {railFooter && <div className="tay-rail-footer">{railFooter}</div>}
      </aside>
      <div className="tay-resizer tay-rail-resizer" role="separator" tabIndex={0} aria-label="Resize navigation" aria-orientation="vertical" aria-controls={railId} aria-valuemin={216} aria-valuemax={widthLimits("rail").max} aria-valuenow={clamp(preferences.railWidth, 216, widthLimits("rail").max)} aria-valuetext={`${Math.round(preferences.railWidth)} pixels. Use left and right arrows to resize.`} onPointerDown={(event) => startResize(event, "rail")} onPointerMove={moveResize} onPointerUp={endResize} onPointerCancel={endResize} onLostPointerCapture={endResize} onKeyDown={(event) => keyboardResize(event, "rail")} />
      <div ref={workRef} className="tay-work-area" aria-hidden={mobile && drawerOpen ? true : undefined}>
        <section ref={commandRef} className="tay-command-pane" aria-label="Conversation" aria-hidden={mobile && sidecarOpen ? true : undefined}>
          <header className="tay-command-header">
            <div className="tay-command-title-row">
              <button className="tay-icon-button tay-mobile-menu" type="button" aria-label="Open navigation" aria-expanded={drawerOpen} aria-controls={railId} onClick={() => { setDrawerOpen(true); if (sidecarOpen) changeSidecarOpen(false); }}><Menu size={21} /></button>
              <h1>{conversationTitle}</h1>
              <div className="tay-pane-controls">
                {sidecar && <button className="tay-icon-button" type="button" aria-label={sidecarOpen ? "Close workspace panel" : "Open workspace panel"} aria-expanded={sidecarOpen} aria-controls={sidecarId} onClick={() => changeSidecarOpen(!sidecarOpen)}><PanelRightOpen size={18} /></button>}
                {sidecarOpen && !mobile && <button className="tay-icon-button" type="button" aria-label={maximized === "conversation" ? "Restore split workspace" : "Maximize conversation"} aria-pressed={maximized === "conversation"} onClick={() => setMaximized((value) => value === "conversation" ? null : "conversation")}>{maximized === "conversation" ? <Minimize2 size={17} /> : <Maximize2 size={17} />}</button>}
              </div>
            </div>
            {header && <div className="tay-command-tools">{header}</div>}
          </header>
          <div id={conversationId} className="tay-conversation" tabIndex={-1}>{children}</div>
          <div className="tay-composer-dock">{composer}</div>
        </section>
        {sidecar && <>
          <div className="tay-resizer tay-sidecar-resizer" role="separator" tabIndex={sidecarOpen ? 0 : -1} aria-label="Resize workspace panel" aria-orientation="vertical" aria-controls={`${conversationId} ${sidecarId}`} aria-valuemin={300} aria-valuemax={widthLimits("sidecar").max} aria-valuenow={clamp(preferences.sidecarWidth, 300, widthLimits("sidecar").max)} aria-valuetext={`${Math.round(preferences.sidecarWidth)} pixels. Use left and right arrows to resize.`} onPointerDown={(event) => startResize(event, "sidecar")} onPointerMove={moveResize} onPointerUp={endResize} onPointerCancel={endResize} onLostPointerCapture={endResize} onKeyDown={(event) => keyboardResize(event, "sidecar")} />
          <aside ref={sidecarRef} id={sidecarId} className="tay-sidecar" aria-label={sidecarTitle} role={mobile && sidecarOpen ? "dialog" : undefined} aria-modal={mobile && sidecarOpen ? true : undefined} tabIndex={-1}>
            <header className="tay-sidecar-header"><h2>{sidecarTitle}</h2><div className="tay-pane-controls">{!mobile && <button className="tay-icon-button" type="button" aria-label={maximized === "sidecar" ? "Restore split workspace" : "Maximize workspace panel"} aria-pressed={maximized === "sidecar"} onClick={() => setMaximized((value) => value === "sidecar" ? null : "sidecar")}>{maximized === "sidecar" ? <Minimize2 size={17} /> : <Maximize2 size={17} />}</button>}<button className="tay-icon-button" type="button" aria-label="Close workspace panel" onClick={() => changeSidecarOpen(false)}><X size={19} /></button></div></header>
            {sidecarToolbar && <div className="tay-sidecar-toolbar">{sidecarToolbar}</div>}
            <div className="tay-sidecar-content">{sidecar}</div>
          </aside>
        </>}
      </div>
    </div>
  );
}
