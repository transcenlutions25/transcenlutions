import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const ts = require("typescript");
for (const extension of [".ts", ".tsx"]) require.extensions[extension] = (module, filename) => module._compile(ts.transpileModule(readFileSync(filename, "utf8"), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true },
}).outputText, filename);
const { mobileViewportBounds, createMobileOverlayHistory } = require("../lib/mobile-workspace.ts");
assert.deepEqual(mobileViewportBounds({ height: 443.6, offsetTop: 32.4, scale: 1 }), { height: 444, top: 32 });
assert.equal(mobileViewportBounds({ height: 400, offsetTop: 0, scale: 2 }), null, "pinch zoom never changes app layout bounds");
assert.equal(mobileViewportBounds(null), null);
assert.equal(mobileViewportBounds({ height: NaN, offsetTop: 0, scale: 1 }), null);

// Deterministic asynchronous Back simulation covers the close/reopen race without
// assuming that a browser's pending history traversal is synchronous.
function fakeBrowser() {
  const entries = [{ state: { router: "preserved" }, url: "https://example.test/chat" }];
  let cursor = 0;
  let backPending = false;
  const listeners = new Set();
  const browser = {
    location: { get href() { return entries[cursor].url; } },
    history: {
      get state() { return entries[cursor].state; },
      pushState(state, _, url) { entries.splice(cursor + 1); entries.push({ state, url }); cursor++; },
      replaceState(state, _, url) { entries[cursor] = { state, url }; },
      back() { backPending = true; },
    },
    addEventListener(_, listener) { listeners.add(listener); },
    removeEventListener(_, listener) { listeners.delete(listener); },
    flushBack() { assert.ok(backPending); backPending = false; cursor--; for (const fn of listeners) fn(); },
    userBack() { cursor--; for (const fn of listeners) fn(); },
    forward() { cursor++; for (const fn of listeners) fn(); },
    get length() { return entries.length; },
    get cursor() { return cursor; },
    get pending() { return backPending; },
  };
  return browser;
}
const browser = fakeBrowser();
let dismissals = 0;
const history = createMobileOverlayHistory(browser, () => { dismissals++; });
for (let index = 0; index < 10; index++) {
  history.update(true);
  history.update(true);
  assert.equal(browser.length, 2, "switching overlays never stacks history entries");
  assert.equal(browser.history.state.router, "preserved");
  history.update(false);
  browser.flushBack();
  assert.equal(browser.cursor, 0);
}
history.update(true);
history.update(false);
history.update(true);
browser.flushBack();
assert.equal(dismissals, 0, "a previous pending Back must not close a newly reopened overlay");
assert.equal(browser.cursor, 1);
assert.equal(browser.length, 2);
browser.userBack();
assert.equal(dismissals, 1, "Back dismisses the active overlay once");
history.update(false);
browser.forward();
assert.equal(dismissals, 1);
assert.equal(browser.history.state.__tayMobileOverlay, undefined, "Forward strips stale sentinel without reopening or looping");
history.update(true);
browser.history.pushState({ router: "next" }, "", "https://example.test/another");
history.update(false);
assert.equal(browser.pending, false, "real navigation is not reversed during overlay dismissal");
assert.equal(browser.location.href, "https://example.test/another");
history.dispose();

const { JSDOM } = require("jsdom");
const dom = new JSDOM('<!doctype html><html><body><div id="root"></div></body></html>', { url: "https://example.test/chat", pretendToBeVisual: true });
const { window } = dom;
for (const key of ["window", "document", "HTMLElement", "Element", "Node", "Event", "KeyboardEvent", "MouseEvent", "navigator", "localStorage"]) Object.defineProperty(globalThis, key, { configurable: true, value: key === "window" ? window : window[key] });
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
let width = 390;
const mediaListeners = new Set();
window.matchMedia = () => ({ get matches() { return width <= 900; }, media: "(max-width: 900px)", addEventListener(_, fn) { mediaListeners.add(fn); }, removeEventListener(_, fn) { mediaListeners.delete(fn); } });
const viewport = new window.EventTarget();
Object.assign(viewport, { height: 844, offsetTop: 0, scale: 1 });
Object.defineProperty(window, "visualViewport", { value: viewport });
let frameId = 0;
const frames = new Map();
window.requestAnimationFrame = fn => { frames.set(++frameId, fn); return frameId; };
window.cancelAnimationFrame = id => frames.delete(id);
function flushFrames() { const pending = [...frames.values()]; frames.clear(); for (const fn of pending) fn(); }
Object.defineProperty(window.HTMLElement.prototype, "inert", { configurable: true, get() { return this.hasAttribute("inert"); }, set(value) { this.toggleAttribute("inert", value); } });
window.HTMLElement.prototype.getClientRects = function () {
  if (this.closest("[hidden]")) return [];
  for (let ancestor = this.parentElement; ancestor; ancestor = ancestor.parentElement) {
    if (ancestor.tagName === "DETAILS" && !ancestor.open && !ancestor.querySelector(":scope > summary")?.contains(this)) return [];
  }
  const app = this.closest(".tay-app");
  if (app && this.closest(".tay-sidecar") && !app.classList.contains("tay-sidecar-open")) return [];
  if (width <= 900) {
    if (this.closest(".tay-rail") && !app?.classList.contains("tay-drawer-open")) return [];
    if (this.closest(".tay-command-tools, .tay-desktop-title, .tay-command-title-row > .tay-pane-controls")) return [];
  } else if (this.closest(".tay-mobile-menu")) return [];
  return [{ x: 0, y: 0, width: 100, height: 44 }];
};
const React = require("react");
const { createRoot } = require("react-dom/client");
const { WorkspaceFrame } = require("../components/workspace-frame.tsx");
const { VoiceControls } = require("../components/voice-controls.tsx");
let voiceStarts = 0;
let voiceAborts = 0;
let lastListening = false;
window.SpeechRecognition = class { start() { voiceStarts++; } abort() { voiceAborts++; } };
window.speechSynthesis = { cancel() {}, speak() {} };
const h = React.createElement;
function Harness({ persistenceKey } = {}) {
  const [sidecar, setSidecar] = React.useState(false);
  const [title, setTitle] = React.useState("First conversation");
  const [panel, setPanel] = React.useState("Conversation controls");
  return h(WorkspaceFrame, {
    persistenceKey, mobileTitle: "Tay", conversationTitle: title,
    mobileHeaderAction: h("button", { type: "button", "aria-label": "Start voice" }, "Voice"),
    mobileControlsOpen: sidecar, onMobileControlsOpen: () => setSidecar(true),
    sidecarTitle: panel, sidecarOpen: sidecar, onSidecarOpenChange: setSidecar,
    navigation: h(React.Fragment, null,
      h("button", { onClick: () => setTitle("Next conversation") }, "Choose conversation"),
      h("button", { onClick: () => setSidecar(true) }, "Open library")),
    header: h("button", null, "Desktop settings"),
    sidecar: h(React.Fragment, { key: panel },
      h("button", { onClick: () => setPanel("Voice") }, "Open voice panel"),
      h("button", { onClick: () => setPanel("Queue") }, "Open queue panel"),
      h("button", { onClick: () => { setSidecar(false); window.requestAnimationFrame(() => document.querySelector('textarea[aria-label="Message Tay"]').focus()); } }, "Apply voice transcript"),
      sidecar && panel === "Voice" ? h(VoiceControls, { reply: "", onTranscript() {}, onListening: value => { lastListening = value; } }) : null,
      h("details", { "data-more": true }, h("summary", null, "More"),
        h("details", { "data-history": true }, h("summary", null, "History"), h("button", { "data-history-action": true }, "Use version"))),
      h("details", { "data-search": true }, h("summary", null, "Search"), h("input", { "aria-label": "Panel search" })),
      h("button", { "data-last": true }, "Last panel action")),
    composer: h("textarea", { "aria-label": "Message Tay" }),
  }, h("p", null, "Conversation content"));
}
localStorage.setItem("tay.workspace.layout.v1", JSON.stringify({ railWidth: 312, sidecarWidth: 500, railCollapsed: true }));
const root = createRoot(document.getElementById("root"));
await React.act(async () => root.render(h(Harness)));
const one = selector => { const element = document.querySelector(selector); assert.ok(element, selector); return element; };
const label = value => one(`${value === "Close workspace panel" ? ".tay-sidecar " : ""}[aria-label="${value}"]:not(.tay-overlay-backdrop)`);
const textButton = value => { const button = [...document.querySelectorAll("button")].find(element => element.textContent === value); assert.ok(button, value); return button; };
async function click(element) { await React.act(async () => { element.focus(); element.click(); }); }
async function settle() { await React.act(async () => { await new Promise(resolve => setTimeout(resolve, 20)); }); await React.act(async () => flushFrames()); }
async function key(element, value, shiftKey = false) { const event = new window.KeyboardEvent("keydown", { key: value, shiftKey, bubbles: true, cancelable: true }); await React.act(async () => element.dispatchEvent(event)); return event; }
async function nestedEscapeChecks() {
  const more = one("[data-more]");
  const historyDetails = one("[data-history]");
  const search = one("[data-search]");
  more.open = true;
  // jsdom lacks native popovers. Exercise only our priority branch; actual native
  // dismissal/focus remains the browser's default behavior, not a DOM-test claim.
  const popover = document.createElement("div");
  popover.setAttribute("popover", "auto");
  popover.hidePopover = () => {};
  const nativeMatches = popover.matches;
  popover.matches = selector => selector === ":popover-open" || nativeMatches.call(popover, selector);
  const popoverButton = document.createElement("button");
  popoverButton.textContent = "Popover action";
  popover.append(popoverButton);
  more.append(popover);
  popoverButton.focus();
  assert.equal((await key(popoverButton, "Escape")).defaultPrevented, false, "native popover receives its default Escape dismissal before ancestor More");
  assert.equal(more.open, true);
  assert.ok(one(".tay-app").classList.contains("tay-sidecar-open"));
  popover.remove();
  historyDetails.open = true;
  one("[data-history-action]").focus();
  await key(document.activeElement, "Escape");
  assert.equal(historyDetails.open, false, "Escape closes only innermost History");
  assert.equal(more.open, true);
  assert.ok(document.activeElement === historyDetails.querySelector(":scope > summary"));
  assert.ok(one(".tay-app").classList.contains("tay-sidecar-open"));
  await key(document.activeElement, "Escape");
  assert.equal(more.open, false, "the next Escape closes outer More before the workspace");
  assert.ok(document.activeElement === more.querySelector(":scope > summary"));
  assert.ok(one(".tay-app").classList.contains("tay-sidecar-open"));
  search.open = true;
  label("Panel search").focus();
  await key(document.activeElement, "Escape");
  assert.equal(search.open, false, "search uses the same disclosure-first Escape behavior");
  assert.ok(document.activeElement === search.querySelector(":scope > summary"));
  assert.ok(one(".tay-app").classList.contains("tay-sidecar-open"));
  await key(document.activeElement, "Escape");
  await settle();
  assert.equal(one(".tay-app").classList.contains("tay-sidecar-open"), false);
  assert.ok(document.activeElement === label("Conversation controls"), "outer panel dismissal restores original opener");
}
const app = one(".tay-app");
assert.equal(one(".tay-rail").inert, true);
assert.equal(one(".tay-sidecar").inert, true);
assert.equal((await key(document.body, "Tab")).defaultPrevented, false, "initial closed dialogs do not trap Tab");
assert.equal(app.style.getPropertyValue("--tay-viewport-height"), "844px");
assert.equal(app.style.getPropertyValue("--tay-rail-width"), "72px", "saved collapsed preference is preserved");
assert.equal(app.style.getPropertyValue("--tay-sidecar-width"), "500px", "saved panel width is preserved");
assert.equal(label("Conversation controls").textContent, "Tay");

for (let index = 0; index < 3; index++) {
  await click(label("Open navigation"));
  assert.ok(app.classList.contains("tay-drawer-open"));
  assert.equal(one(".tay-command-pane").inert, true);
  assert.ok(document.activeElement === label("Close navigation"), "navigation receives focus");
  await click(textButton("Open library"));
  assert.equal(app.classList.contains("tay-drawer-open"), false);
  assert.ok(app.classList.contains("tay-sidecar-open"));
  assert.ok(document.activeElement === label("Close workspace panel"), "workspace close receives focus");
  const last = one("[data-last]");
  last.focus();
  assert.ok((await key(last, "Tab")).defaultPrevented);
  assert.ok(document.activeElement === label("Close workspace panel"), "workspace close receives focus");
  await key(document.activeElement, "Escape");
  await settle();
  assert.equal(one(".tay-command-pane").inert, false);
  assert.equal(one(".tay-sidecar").inert, true);
  assert.ok(document.activeElement === label("Open navigation"), "switching panels restores the original opener, never the hidden drawer");
}
await click(label("Open navigation"));
await click(textButton("Choose conversation"));
await settle();
assert.equal(one(".tay-desktop-title").textContent, "Next conversation");
assert.ok(document.activeElement === label("Open navigation"), "navigation restores reachable focus");

await click(label("Conversation controls"));
const controlsHistoryLength = window.history.length;
await click(textButton("Open voice panel"));
assert.equal(one(".tay-sidecar-header h2").textContent, "Voice");
assert.ok(document.activeElement === one(".tay-sidecar-header h2"), "switching mounted sidecar content announces and focuses its new heading");
assert.ok((await key(document.activeElement, "Tab", true)).defaultPrevented, "Shift+Tab from the programmatically focused heading stays in the dialog");
assert.ok(document.activeElement === one("[data-last]"));
await click(textButton("Open queue panel"));
assert.equal(one(".tay-sidecar-header h2").textContent, "Queue");
assert.ok(document.activeElement === one(".tay-sidecar-header h2"), "repeated content switches never leave focus on the body");
assert.equal(window.history.length, controlsHistoryLength, "content switches reuse the active overlay history entry");
await React.act(async () => window.history.back());
await settle();
assert.equal(app.classList.contains("tay-sidecar-open"), false);
assert.ok(document.activeElement === label("Conversation controls"), "Back restores the controls opener");
await React.act(async () => window.history.forward());
await settle();
assert.equal(app.classList.contains("tay-sidecar-open"), false, "Forward does not resurrect dismissed controls");

await click(label("Conversation controls"));
await nestedEscapeChecks();
await click(label("Conversation controls"));
await click(textButton("Apply voice transcript"));
await settle();
assert.equal(app.classList.contains("tay-sidecar-open"), false);
assert.ok(document.activeElement === label("Message Tay"), "deliberate composer focus scheduled before generic close restoration survives voice completion");

await click(label("Open navigation"));
await React.act(async () => { width = 1200; for (const fn of mediaListeners) fn(); });
await settle();
assert.equal(app.classList.contains("tay-drawer-open"), false);
assert.equal(one(".tay-rail").inert, false, "desktop navigation stays interactive after resizing");
assert.ok(document.activeElement === one(".tay-conversation"), "hidden mobile opener falls back to the conversation");
assert.equal(app.style.getPropertyValue("--tay-viewport-height"), "", "desktop viewport remains CSS-owned");
await click(label("Expand navigation"));
assert.equal(app.style.getPropertyValue("--tay-rail-width"), "312px", "desktop expansion restores saved rail width");
assert.equal(label("Conversation controls").tabIndex, 0, "the compact title is keyboard reachable on desktop too");
const desktopHistoryLength = window.history.length;
await click(label("Conversation controls"));
assert.equal(one(".tay-sidecar").getAttribute("role"), null, "desktop sidecar stays nonmodal");
assert.equal(one(".tay-command-pane").inert, false);
assert.equal(window.history.length, desktopHistoryLength, "desktop panels do not insert mobile Back entries");
assert.equal((await key(one("[data-last]"), "Tab")).defaultPrevented, false, "desktop sidecar never traps Tab");
await nestedEscapeChecks();
await click(label("Conversation controls"));
await click(textButton("Open voice panel"));
await click(textButton("Speak request"));
assert.equal(voiceStarts, 1);
assert.equal(lastListening, true);
const abortsBeforeMaximize = voiceAborts;
await click(label("Maximize conversation"));
await settle();
assert.equal(app.classList.contains("tay-sidecar-open"), false, "maximize conversation closes the actual sidecar");
assert.equal(app.classList.contains("tay-maximize-conversation"), false, "there is no hidden-but-mounted voice panel");
assert.equal(voiceAborts, abortsBeforeMaximize + 1, "voice unmount aborts live capture on maximize conversation");
assert.equal(lastListening, false);
assert.ok(document.activeElement === label("Conversation controls"));
await click(label("Conversation controls"));
assert.ok(app.classList.contains("tay-sidecar-open"), "workspace can reopen after maximizing conversation");
await click(label("Maximize workspace panel"));
assert.ok(app.classList.contains("tay-maximize-sidecar"));
await click(label("Restore split workspace"));
assert.equal(app.classList.contains("tay-maximize-sidecar"), false, "sidecar split restore remains usable");
await click(label("Close workspace panel"));
await settle();
await React.act(async () => { width = 390; for (const fn of mediaListeners) fn(); });
await React.act(async () => { Object.assign(viewport, { height: 420, offsetTop: 32 }); viewport.dispatchEvent(new window.Event("resize")); flushFrames(); });
assert.equal(app.style.getPropertyValue("--tay-viewport-height"), "420px");
assert.equal(app.style.getPropertyValue("--tay-viewport-offset-top"), "32px");
await React.act(async () => { Object.assign(viewport, { height: 210, offsetTop: 88, scale: 2 }); viewport.dispatchEvent(new window.Event("resize")); flushFrames(); });
assert.equal(app.style.getPropertyValue("--tay-viewport-height"), "420px", "pinch zoom leaves the last stable layout alone");
await React.act(async () => { Object.assign(viewport, { height: 844, offsetTop: 0, scale: 1 }); viewport.dispatchEvent(new window.Event("resize")); flushFrames(); });
assert.equal(app.style.getPropertyValue("--tay-viewport-height"), "844px", "keyboard dismissal restores visible height");
await React.act(async () => root.render(h(Harness, { key: "new-layout", persistenceKey: "new-layout" })));
assert.equal(one(".tay-app").style.getPropertyValue("--tay-rail-width"), "72px", "new layouts start with a collapsed rail");
localStorage.setItem("saved-expanded-layout", JSON.stringify({ railWidth: 300, sidecarWidth: 450, railCollapsed: false }));
await React.act(async () => root.render(h(Harness, { key: "saved-layout", persistenceKey: "saved-expanded-layout" })));
assert.equal(one(".tay-app").style.getPropertyValue("--tay-rail-width"), "300px", "saved expanded layouts remain unchanged");
await React.act(async () => root.unmount());
dom.window.close();
console.log("Mobile workspace checks passed: safe viewport bounds, keyboard/zoom/resize, hidden control isolation, repeated dialog switching, Tab/Escape, navigation and Back focus restoration, rapid reopen, content replacement/voice completion focus, nested disclosure Escape, desktop nonmodal panels, voice unmount on maximize, saved preferences and stale Forward history.");
