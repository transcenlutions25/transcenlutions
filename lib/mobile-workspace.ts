/** Visual viewport coordinates are useful for keyboards, but must never follow pinch zoom. */
export function mobileViewportBounds(viewport: Pick<VisualViewport, "height" | "offsetTop" | "scale"> | null) {
  if (!viewport || Math.abs(viewport.scale - 1) > 0.01 || !Number.isFinite(viewport.height) || viewport.height <= 0) return null;
  return {
    height: Math.round(viewport.height),
    top: Math.max(0, Math.round(Number.isFinite(viewport.offsetTop) ? viewport.offsetTop : 0)),
  };
}

const overlayHistoryKey = "__tayMobileOverlay";
let historyOwner = 0;

/** One temporary Back entry for an entire overlay session, including panel switches. */
export function createMobileOverlayHistory(browser: Pick<Window, "history" | "location" | "addEventListener" | "removeEventListener">, dismiss: () => void) {
  const owner = `tay-${Date.now()}-${++historyOwner}`;
  let sequence = 0;
  let entry: string | null = null;
  let entryUrl = "";
  let wanted = false;
  let returning = false;
  let disposed = false;
  const marker = () => browser.history.state?.[overlayHistoryKey];
  const isOwnMarker = () => typeof marker() === "string" && marker().startsWith(`${owner}:`);
  const withoutMarker = () => {
    const state = { ...browser.history.state };
    delete state[overlayHistoryKey];
    return state;
  };
  function openEntry() {
    if (disposed || returning || entry || !wanted) return;
    entry = `${owner}:${++sequence}`;
    entryUrl = browser.location.href;
    try {
      browser.history.pushState({ ...browser.history.state, [overlayHistoryKey]: entry }, "", entryUrl);
    } catch {
      // Restricted history must not make a panel unusable.
      entry = null;
    }
  }
  function pop() {
    if (returning) {
      // A quick close/reopen may happen before history.back() emits popstate.
      returning = false;
      entry = null;
      if (wanted) openEntry();
      return;
    }
    if (entry) {
      entry = null;
      wanted = false;
      dismiss();
    }
    // Forward can revisit an old sentinel, but must never reopen an old panel.
    if (isOwnMarker()) browser.history.replaceState(withoutMarker(), "", browser.location.href);
  }
  browser.addEventListener("popstate", pop);
  return {
    update(open: boolean) {
      wanted = open;
      if (open) {
        openEntry();
      } else if (entry && !returning) {
        if (marker() === entry && browser.location.href === entryUrl) {
          returning = true;
          browser.history.back();
        } else {
          // A real route change owns history now; do not navigate it backwards.
          entry = null;
        }
      }
    },
    dispose() {
      disposed = true;
      browser.removeEventListener("popstate", pop);
      if (isOwnMarker()) browser.history.replaceState(withoutMarker(), "", browser.location.href);
    },
  };
}
