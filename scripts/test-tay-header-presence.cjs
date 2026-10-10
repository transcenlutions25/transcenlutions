/* Mounted component tests. These do not claim visual, screen-reader, or device QA.
 * The real component and pure helpers run with only Image/CSS/browser boundaries
 * stubbed. No dependency installation, external service, or network is used. */
const assert = require('node:assert/strict');
const { test, beforeEach, afterEach, after } = require('node:test');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const Module = require('node:module');
const ts = require('typescript');
const { JSDOM } = require('jsdom');

const dom = new JSDOM('<!doctype html><html><body><div id="root"></div></body></html>', {
  url: 'https://tay-presence-test.invalid/', pretendToBeVisual: true,
});
for (const key of ['window', 'document', 'HTMLElement', 'Element', 'Node', 'Event', 'MouseEvent']) {
  Object.defineProperty(globalThis, key, { configurable: true, value: key === 'window' ? dom.window : dom.window[key] });
}
Object.defineProperty(globalThis, 'navigator', { configurable: true, value: dom.window.navigator });
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
const React = require('react');
const { act } = React;
const { createRoot } = require('react-dom/client');
const { renderToString } = require('react-dom/server');
const originalLoad = Module._load;
const originalExtensions = { '.ts': require.extensions['.ts'], '.tsx': require.extensions['.tsx'] };
for (const extension of ['.ts', '.tsx']) require.extensions[extension] = (module, filename) => {
  module._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), { fileName: filename, compilerOptions: {
    target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS,
    jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true,
  } }).outputText, filename);
};
Module._load = function (request, parent, isMain) {
  if (request === 'next/image') return { __esModule: true, default: ({ unoptimized, ...props }) => React.createElement('img', props) };
  if (request.endsWith('tay-header-presence.module.css')) return { __esModule: true, default: new Proxy({}, { get: (_, name) => name }) };
  return originalLoad.call(this, request, parent, isMain);
};
const { TayHeaderPresence } = require('../components/tay-header-presence.tsx');
const { TAY_HEADER_ASSET, TAY_HEADER_MOTION_STORAGE_KEY, readTayMotionPaused,
  writeTayMotionPreference, tayPresenceMotionState } = require('../lib/tay-header-presence.ts');

const host = document.getElementById('root');
let root;
let currentProps;
let reduced;
let observers;
let mediaListeners;
let visible;
let unexpectedNetwork;
const realStorage = dom.window.localStorage;
const media = {
  get matches() { return reduced; },
  addEventListener: (_, fn) => mediaListeners.add(fn),
  removeEventListener: (_, fn) => mediaListeners.delete(fn),
};
const presence = () => host.querySelector('[data-tay-presence]');
const motionButton = () => host.querySelector('.motionButton');
const state = () => presence()?.getAttribute('data-motion');
const mount = async (props = {}, strict = false) => {
  currentProps = { agentId: 'tay', ...props };
  root = createRoot(host);
  const element = React.createElement(TayHeaderPresence, currentProps);
  await act(async () => root.render(strict ? React.createElement(React.StrictMode, null, element) : element));
};
const rerender = async (props = {}) => {
  currentProps = { ...currentProps, ...props };
  await act(async () => root.render(React.createElement(TayHeaderPresence, currentProps)));
};
const click = async (element = motionButton()) => {
  await act(async () => element.dispatchEvent(new MouseEvent('click', { bubbles: true })));
};
const intersect = async (ratio = 1) => {
  await act(async () => observers.filter(observer => !observer.disconnected).forEach(observer => {
    observer.callback([{ target: observer.target, isIntersecting: ratio > 0, intersectionRatio: ratio }]);
  }));
};
const imageLoaded = async () => {
  await act(async () => host.querySelector('img').dispatchEvent(new Event('load')));
};
const ready = async () => { await intersect(); await imageLoaded(); };

beforeEach(() => {
  reduced = false; visible = true; observers = []; mediaListeners = new Set(); unexpectedNetwork = [];
  realStorage.clear();
  Object.defineProperty(dom.window, 'localStorage', { configurable: true, value: realStorage });
  Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => visible ? 'visible' : 'hidden' });
  dom.window.matchMedia = () => media;
  dom.window.IntersectionObserver = class {
    constructor(callback, options) { this.callback = callback; this.options = options; this.disconnected = false; observers.push(this); }
    observe(target) { this.target = target; }
    disconnect() { this.disconnected = true; }
  };
  globalThis.fetch = dom.window.fetch = (...args) => { unexpectedNetwork.push(args); throw new Error('No network permitted'); };
});
afterEach(async () => {
  if (root) { await act(async () => root.unmount()); root = null; }
  host.replaceChildren();
  assert.equal(mediaListeners.size, 0, 'all media listeners are removed');
  assert.ok(observers.every(observer => observer.disconnected), 'all observers are disconnected');
  assert.deepEqual(unexpectedNetwork, []);
});
after(() => {
  Module._load = originalLoad;
  for (const [extension, original] of Object.entries(originalExtensions)) {
    if (original) require.extensions[extension] = original; else delete require.extensions[extension];
  }
  dom.window.close();
});

test('preference schema is versioned; corrupt or unknown preferences stay still', () => {
  assert.equal(readTayMotionPaused(null), false);
  for (const value of ['', 'false', 'null', '[]', '{', '{"version":2,"paused":false}', '{"version":1,"paused":"false"}']) {
    assert.equal(readTayMotionPaused(value), true);
  }
  for (const paused of [true, false]) assert.equal(readTayMotionPaused(writeTayMotionPreference(paused)), paused);
});

test('every safety gate prevents decorative movement', () => {
  const conditions = { agentId: 'tay', preferencesReady: true, motionPreferenceAvailable: true,
    visibilityAvailable: true, reducedMotion: false, paused: false, pageVisible: true,
    inView: true, imageReady: true, imageFailed: false, suspended: false };
  assert.equal(tayPresenceMotionState(conditions), 'playing');
  for (const override of [{ agentId: 'dawn' }, { preferencesReady: false }, { motionPreferenceAvailable: false },
    { visibilityAvailable: false }, { reducedMotion: true }, { paused: true }, { pageVisible: false },
    { inView: false }, { imageReady: false }, { imageFailed: true }, { suspended: true }]) {
    assert.notEqual(tayPresenceMotionState({ ...conditions, ...override }), 'playing');
  }
});

test('server render is static with readable Tay and no dependency on browser globals', () => {
  const html = renderToString(React.createElement(TayHeaderPresence, { agentId: 'tay' }));
  assert.match(html, /data-motion="initializing"/);
  assert.match(html, />Tay<\/span>/);
  assert.match(html, /alt=""/);
  assert.match(html, /disabled=""/);
  assert.equal(renderToString(React.createElement(TayHeaderPresence, { agentId: 'dawn' })), '');
});

test('only Tay renders; known-safe visible, loaded state starts motion', async () => {
  await mount({ agentId: 'dawn' });
  assert.equal(presence(), null);
  assert.equal(observers.length, 0);
  await rerender({ agentId: 'tay' });
  assert.equal(state(), 'not-visible');
  await intersect();
  assert.equal(state(), 'loading');
  await imageLoaded();
  assert.equal(state(), 'playing');
  assert.equal(host.querySelector('.name').textContent, 'Tay');
  assert.equal(host.querySelector('img').getAttribute('src'), TAY_HEADER_ASSET.src);
  assert.equal(motionButton().getAttribute('aria-label'), 'Pause Tay animation');
  for (const agentId of ['kj', 'rory', 'dawn']) { await rerender({ agentId }); assert.equal(presence(), null); }
});

test('pause and resume are separate accessible actions and persist across remount', async () => {
  await mount(); await ready();
  await click();
  assert.equal(state(), 'paused');
  assert.equal(motionButton().textContent, 'Resume');
  assert.equal(motionButton().getAttribute('aria-label'), 'Resume Tay animation');
  assert.equal(readTayMotionPaused(realStorage.getItem(TAY_HEADER_MOTION_STORAGE_KEY)), true);
  await act(async () => root.unmount()); root = null;
  await mount(); await ready();
  assert.equal(state(), 'paused');
  await click();
  assert.equal(state(), 'playing');
  assert.equal(readTayMotionPaused(realStorage.getItem(TAY_HEADER_MOTION_STORAGE_KEY)), false);
});

test('pause survives changing to another agent and back', async () => {
  await mount(); await ready(); await click();
  await rerender({ agentId: 'dawn' });
  assert.equal(presence(), null);
  await rerender({ agentId: 'tay' }); await ready();
  assert.equal(state(), 'paused');
});

test('same-batch repeated clicks toggle from the latest value without a stale closure', async () => {
  await mount(); await ready();
  await act(async () => {
    motionButton().dispatchEvent(new MouseEvent('click', { bubbles: true }));
    motionButton().dispatchEvent(new MouseEvent('click', { bubbles: true }));
  });
  assert.equal(state(), 'playing');
  await act(async () => {
    for (let i = 0; i < 3; i++) motionButton().dispatchEvent(new MouseEvent('click', { bubbles: true }));
  });
  assert.equal(state(), 'paused');
  assert.equal(readTayMotionPaused(realStorage.getItem(TAY_HEADER_MOTION_STORAGE_KEY)), true);
});

test('device reduced motion starts off and changing it live stops an active animation', async () => {
  reduced = true;
  await mount(); await ready();
  assert.equal(state(), 'reduced-motion');
  assert.equal(motionButton().disabled, true);
  assert.match(motionButton().getAttribute('aria-label'), /reduced motion/);
  await click(); assert.equal(state(), 'reduced-motion');
  await act(async () => { reduced = false; mediaListeners.forEach(fn => fn()); });
  assert.equal(state(), 'playing');
  await act(async () => { reduced = true; mediaListeners.forEach(fn => fn()); });
  assert.equal(state(), 'reduced-motion');
});

test('removing reduced motion never overrides a saved pause', async () => {
  realStorage.setItem(TAY_HEADER_MOTION_STORAGE_KEY, writeTayMotionPreference(true));
  reduced = true; await mount(); await ready();
  await act(async () => { reduced = false; mediaListeners.forEach(fn => fn()); });
  assert.equal(state(), 'paused');
});

test('offscreen, hidden document, and host suspension independently stop movement', async () => {
  await mount(); await ready();
  await intersect(0); assert.equal(state(), 'not-visible');
  await intersect(0.1); assert.equal(state(), 'not-visible');
  await intersect(0.25); assert.equal(state(), 'playing');
  await act(async () => { visible = false; document.dispatchEvent(new Event('visibilitychange')); });
  assert.equal(state(), 'not-visible');
  await act(async () => { visible = true; document.dispatchEvent(new Event('visibilitychange')); });
  assert.equal(state(), 'playing');
  await rerender({ suspended: true }); assert.equal(state(), 'suspended');
  await rerender({ suspended: false }); assert.equal(state(), 'playing');
});

test('unavailable storage starts still and can be resumed and paused in memory', async () => {
  Object.defineProperty(dom.window, 'localStorage', { configurable: true,
    get() { throw new Error('Storage denied'); } });
  await mount(); await ready();
  assert.equal(state(), 'paused');
  await click(); assert.equal(state(), 'playing');
  await click(); assert.equal(state(), 'paused');
  await rerender({ agentId: 'dawn' }); await rerender({ agentId: 'tay' }); await ready();
  assert.equal(state(), 'paused');
});

test('failed preference write does not reverse the in-memory user choice', async () => {
  Object.defineProperty(dom.window, 'localStorage', { configurable: true, value: {
    getItem: () => null, setItem() { throw new Error('Quota exceeded'); },
  } });
  await mount(); await ready();
  await click(); assert.equal(state(), 'paused');
  await click(); assert.equal(state(), 'playing');
});

test('image failure retains the title and disables only decorative movement', async () => {
  let opened = 0;
  await mount({ onOpenControls: () => opened++ }); await ready();
  await act(async () => host.querySelector('img').dispatchEvent(new Event('error')));
  assert.equal(state(), 'unavailable');
  assert.equal(host.querySelector('img'), null);
  assert.equal(host.querySelector('.name').textContent, 'Tay');
  assert.equal(motionButton().disabled, true);
  await click(host.querySelector('.identityButton')); assert.equal(opened, 1);
});

test('missing visibility or motion-preference support fails safely to still', async () => {
  delete dom.window.IntersectionObserver;
  delete dom.window.matchMedia;
  await mount(); await imageLoaded();
  assert.equal(state(), 'unavailable');
  assert.equal(motionButton().disabled, true);
  assert.equal(host.querySelector('.name').textContent, 'Tay');
});

test('legacy media listeners apply live reduced motion and clean up', async () => {
  dom.window.matchMedia = () => ({
    get matches() { return reduced; },
    addListener: fn => mediaListeners.add(fn), removeListener: fn => mediaListeners.delete(fn),
  });
  await mount(); await ready();
  assert.equal(state(), 'playing');
  await act(async () => { reduced = true; mediaListeners.forEach(fn => fn()); });
  assert.equal(state(), 'reduced-motion');
});

test('partial media support without paired listeners stays static instead of throwing', async () => {
  dom.window.matchMedia = () => ({ matches: false, addEventListener() { throw new Error('Must not subscribe without paired removal'); } });
  await mount(); await ready();
  assert.equal(state(), 'unavailable');
  assert.equal(motionButton().disabled, true);
});

test('throwing motion-preference detection leaves the readable component usable', async () => {
  dom.window.matchMedia = () => { throw new Error('Preference access denied'); };
  await mount(); await ready();
  assert.equal(state(), 'unavailable');
  assert.equal(host.querySelector('.name').textContent, 'Tay');
});

test('optional conversation controls and pause are sibling buttons with separate behavior', async () => {
  let opened = 0;
  await mount({ onOpenControls: () => opened++, controlsExpanded: false, controlsId: 'existing-dialog' });
  await ready();
  const identity = host.querySelector('.identityButton');
  assert.equal(identity.getAttribute('aria-label'), 'Conversation controls for Tay');
  assert.equal(identity.getAttribute('aria-controls'), 'existing-dialog');
  assert.equal(identity.getAttribute('aria-expanded'), 'false');
  assert.equal(host.querySelector('button button'), null);
  assert.equal(host.querySelector('img').closest('[aria-hidden]').getAttribute('aria-hidden'), 'true');
  await click(); assert.equal(opened, 0); assert.equal(state(), 'paused');
  await click(identity); assert.equal(opened, 1); assert.equal(state(), 'paused');
  await rerender({ controlsExpanded: true });
  assert.equal(identity.getAttribute('aria-expanded'), 'true');
});

test('Strict Mode and repeated toggles leave one live observer and no duplicate listeners', async () => {
  await mount({}, true); await ready();
  assert.equal(observers.filter(observer => !observer.disconnected).length, 1);
  assert.equal(mediaListeners.size, 1);
  for (let i = 0; i < 12; i++) await click();
  assert.equal(state(), 'playing');
  assert.equal(observers.filter(observer => !observer.disconnected).length, 1);
  assert.equal(mediaListeners.size, 1);
  const lastObserver = observers.at(-1);
  await act(async () => root.unmount()); root = null;
  await act(async () => lastObserver.callback([{ target: lastObserver.target, isIntersecting: true, intersectionRatio: 1 }]));
  assert.equal(host.textContent, '');
});

test('compact is default; roomier art is an explicit variant and identity stays stable', async () => {
  await mount(); assert.equal(presence().dataset.size, 'compact');
  await rerender({ size: 'roomy', tone: 'light' });
  assert.equal(presence().dataset.size, 'roomy'); assert.equal(presence().dataset.tone, 'light');
  assert.equal(host.querySelector('.name').textContent, 'Tay');
});

test('packaged original matches the approved hash and platform-neutral manifest', () => {
  const manifest = require('../public/assets/tay-header/manifest.json');
  const bytes = fs.readFileSync(path.join(__dirname, '..', 'public', TAY_HEADER_ASSET.src));
  assert.equal(crypto.createHash('sha256').update(bytes).digest('hex'), TAY_HEADER_ASSET.sha256);
  assert.equal(bytes.length, manifest.asset.bytes);
  assert.equal(manifest.asset.sha256, TAY_HEADER_ASSET.sha256);
  assert.equal(manifest.motion.kind, 'whole-cutout-transform');
  assert.equal(manifest.motion.reducedMotion, 'static');
});

test('styles keep motion on the cutout, contained, pausable, and reduced-motion safe', () => {
  const css = fs.readFileSync(path.join(__dirname, '../components/tay-header-presence.module.css'), 'utf8');
  const component = fs.readFileSync(path.join(__dirname, '../components/tay-header-presence.tsx'), 'utf8');
  assert.match(css, /animation-play-state:\s*paused/);
  assert.match(css, /data-motion="playing"[\s\S]*?animation-play-state:\s*running/);
  assert.match(css, /prefers-reduced-motion:\s*reduce[\s\S]*?animation:\s*none\s*!important/);
  assert.match(css, /\.root \.art\s*\{[^}]*overflow:\s*hidden/);
  assert.match(css, /min-height:\s*44px/);
  assert.match(css, /\.root \.name\s*\{[^}]*white-space:\s*nowrap/);
  assert.doesNotMatch(css, /position:\s*fixed|@import|https?:\/\//);
  assert.doesNotMatch(component, /setInterval\(|setTimeout\(|requestAnimationFrame\(|fetch\(/);
});
