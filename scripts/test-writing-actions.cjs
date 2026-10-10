/* Mounted DOM tests with synthetic rectangles, not visual/top-layer rendering,
 * native select, mobile keyboard, or screen-reader QA. No server or network. */
const assert = require('node:assert/strict');
const { test, beforeEach, afterEach, after } = require('node:test');
const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');
const ts = require('typescript');
const { JSDOM } = require('jsdom');
const dom = new JSDOM('<!doctype html><div id="root"></div><button id="outside">Outside</button>', { url: 'https://writing.test/', pretendToBeVisual: true });
for (const key of ['window', 'document', 'HTMLElement', 'HTMLSelectElement', 'Element', 'Node', 'Event', 'MouseEvent', 'KeyboardEvent', 'CustomEvent', 'CompositionEvent', 'localStorage']) {
  Object.defineProperty(globalThis, key, { configurable: true, value: key === 'window' ? dom.window : dom.window[key] });
}
Object.defineProperty(globalThis, 'navigator', { configurable: true, value: dom.window.navigator });
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
globalThis.fetch = dom.window.fetch = () => { throw new Error('Network is forbidden'); };
dom.window.HTMLElement.prototype.scrollIntoView = () => {};
let frames = [];
globalThis.requestAnimationFrame = dom.window.requestAnimationFrame = callback => { frames.push(callback); return frames.length; };
const originalLoad = Module._load;
const oldExtensions = { '.ts': require.extensions['.ts'], '.tsx': require.extensions['.tsx'] };
for (const extension of ['.ts', '.tsx']) require.extensions[extension] = (module, filename) => module._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
  compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true },
}).outputText, filename);
Module._load = function(request, parent, isMain) {
  if (request.startsWith('@/')) request = path.join(__dirname, '..', request.slice(2));
  return originalLoad.call(this, request, parent, isMain);
};
const React = require('react');
const { act } = React;
const { createRoot } = require('react-dom/client');
const { WritingBlock, WritingPersistenceContext, getLiveWritingSnapshots } = require('../components/writing-block.tsx');
const storageOwners = [];
function newDocumentStorage(preserve = false) {
  const saved = preserve ? Object.entries(window.localStorage) : [];
  const owner = new JSDOM('', { url: 'https://writing.test/' }); storageOwners.push(owner);
  const storage = owner.window.localStorage;
  Object.defineProperty(window, 'localStorage', { configurable: true, value: storage });
  Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: storage });
  for (const [key, value] of saved) storage.setItem(key, value);
}
const writing = require('../lib/writing-block.ts');
const host = document.getElementById('root');
let root, parentEscapes, revisions, copied, downloads;
let heldLocks, holdLocks;
let anchor = { top: 622, bottom: 666, left: 890, right: 954, width: 64, height: 44 };
const rect = dom.window.HTMLElement.prototype.getBoundingClientRect;
dom.window.HTMLElement.prototype.getBoundingClientRect = function() { return this.getAttribute('aria-haspopup') === 'dialog' ? anchor : rect.call(this); };
Object.defineProperty(dom.window.HTMLElement.prototype, 'scrollHeight', { configurable: true, get() { return this.classList.contains('writing-block__action-surface') ? 750 : 0; } });
const q = (selector, within = document) => { const result = within.querySelector(selector); assert.ok(result, selector); return result; };
const menu = () => q('.writing-block__action-surface');
const trigger = (title = 'Test draft') => q(`button[aria-label="More actions for ${title}"]`);
const button = label => { const found = [...menu().querySelectorAll('button')].find(item => item.textContent.trim() === label); assert.ok(found, label); return found; };
const click = async element => act(async () => { element.focus(); element.click(); });
const key = async (element, key, shiftKey = false) => { const event = new KeyboardEvent('keydown', { key, shiftKey, bubbles: true, cancelable: true }); await act(async () => element.dispatchEvent(event)); return event; };
const flush = async () => act(async () => { const pending = frames; frames = []; pending.forEach(fn => fn()); });
const change = async (element, value) => act(async () => {
  const prototype = element instanceof HTMLSelectElement ? dom.window.HTMLSelectElement.prototype : dom.window.HTMLTextAreaElement.prototype;
  Object.getOwnPropertyDescriptor(prototype, 'value').set.call(element, value);
  element.dispatchEvent(new Event(element instanceof HTMLSelectElement ? 'change' : 'input', { bubbles: true }));
});
const mount = async (props = {}) => act(async () => root.render(React.createElement('div', { className: 'tay-app', onKeyDown: event => { if (event.key === 'Escape') parentEscapes++; } },
  React.createElement('div', { style: { overflow: 'auto', height: 91 }, 'data-scroller': true },
    React.createElement(WritingBlock, { id: 'fixture', title: 'Test draft', content: 'Original prose', onRequestRevision: async request => { revisions.push(request); return 'Revised prose'; }, ...props })),
  React.createElement(WritingBlock, { id: 'second', title: 'Second draft', content: 'Second prose' }))));
beforeEach(() => {
  newDocumentStorage();
  heldLocks = []; holdLocks = false;
  const tails = new Map();
  Object.defineProperty(navigator, 'locks', { configurable: true, value: { request(name, options, callback) {
    const next = (tails.get(name) || Promise.resolve()).then(() => new Promise((resolve, reject) => {
      const run = () => { if (options.signal.aborted) reject(new Error('Aborted')); else resolve(callback({ name, mode: 'exclusive' })); };
      options.signal.addEventListener('abort', () => reject(new Error('Aborted')), { once: true });
      if (holdLocks) heldLocks.push(run); else run();
    }));
    tails.set(name, next.catch(() => {})); return next;
  } } });
  document.getElementById('nl-badge-frame')?.remove();
  localStorage.clear(); root = createRoot(host); parentEscapes = 0; revisions = []; copied = []; downloads = []; frames = [];
  Object.defineProperty(dom.window, 'innerWidth', { configurable: true, value: 1180 });
  Object.defineProperty(dom.window, 'innerHeight', { configurable: true, value: 757 });
  Object.defineProperty(dom.window, 'visualViewport', { configurable: true, value: null });
  Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText: async value => copied.push(value) } });
  URL.createObjectURL = blob => { downloads.push(blob); return 'blob:writing-fixture'; };
  URL.revokeObjectURL = () => {};
  dom.window.HTMLAnchorElement.prototype.click = () => {};
  delete HTMLElement.prototype.showPopover; delete HTMLElement.prototype.hidePopover;
  anchor = { top: 622, bottom: 666, left: 890, right: 954, width: 64, height: 44 };
});
afterEach(async () => { await act(async () => root.unmount()); assert.equal(document.querySelector('.writing-block__action-surface'), null); });
after(() => { Module._load = originalLoad; for (const [key, value] of Object.entries(oldExtensions)) { if (value) require.extensions[key] = value; else delete require.extensions[key]; } storageOwners.forEach(owner => owner.window.close()); dom.window.close(); });

test('fallback escapes the scroller, flips above a low anchor, and updates keyboard viewport bounds', async () => {
  await mount(); await click(trigger());
  assert.equal(menu().parentElement, document.body, 'fallback cannot be clipped by conversation ancestors');
  assert.equal(menu().getAttribute('role'), 'dialog');
  assert.equal(trigger().getAttribute('aria-expanded'), 'true');
  assert.equal(menu().style.maxHeight, '480px');
  assert.equal(menu().style.top, '136px');
  assert.equal(document.activeElement, button('Rewrite block'));
  const viewport = new dom.window.EventTarget();
  Object.assign(viewport, { width: 320, height: 230, offsetLeft: 0, offsetTop: 40, scale: 1 });
  Object.defineProperty(window, 'visualViewport', { configurable: true, value: viewport });
  anchor = { top: 180, bottom: 224, right: 310, left: 266, width: 44, height: 44 };
  await act(async () => window.dispatchEvent(new Event('resize')));
  const panel = menu();
  assert.ok(parseFloat(panel.style.left) >= 12);
  assert.ok(parseFloat(panel.style.left) + parseFloat(panel.style.width) <= 308);
  assert.ok(parseFloat(panel.style.top) >= 52);
  assert.ok(parseFloat(panel.style.top) + parseFloat(panel.style.maxHeight) <= 258);
  assert.ok(parseFloat(panel.style.maxHeight) >= 88, 'short viewport still provides a scrollable action window');
});


test('short-viewport placement reserves the verified host badge without changing it', async () => {
  const badge = document.createElement('iframe'); badge.id = 'nl-badge-frame'; document.body.append(badge);
  Object.defineProperty(window, 'innerHeight', { configurable: true, value: 230 });
  Object.defineProperty(window, 'innerWidth', { configurable: true, value: 320 });
  anchor = { top: 80, bottom: 124, left: 250, right: 294, width: 44, height: 44 };
  await mount(); await click(trigger());
  assert.ok(parseFloat(menu().style.top) + parseFloat(menu().style.maxHeight) <= 230 - 72 - 12);
  assert.equal(badge.style.cssText, ''); assert.equal(badge.parentElement, document.body);
  badge.remove();
});

test('native-support branch uses the top layer and falls back if opening is rejected', async () => {
  let shows = 0, hides = 0;
  HTMLElement.prototype.showPopover = function() { shows++; this.dataset.testTopLayer = 'true'; };
  HTMLElement.prototype.hidePopover = function() { hides++; };
  await mount(); await click(trigger());
  assert.equal(shows, 1);
  assert.ok(q('[data-scroller]').contains(menu()), 'native surface retains original ancestry and styling');
  assert.equal(menu().getAttribute('popover'), 'manual');
  // jsdom has no real top layer/focus default action; dispatch to the intended control.
  await key(button('Rewrite block'), 'Escape');
  assert.equal(hides, 1); assert.equal(document.activeElement, trigger());
  HTMLElement.prototype.showPopover = () => { throw new Error('Popover unavailable'); };
  await click(trigger());
  assert.equal(menu().parentElement, document.body);
  assert.equal(menu().hasAttribute('popover'), false);
});

test('Escape dismisses nested history before More without closing the parent; outside focus/pointer dismiss', async () => {
  await mount(); await click(trigger());
  const history = q('details', menu());
  await click(q('summary', history));
  assert.equal(history.open, true);
  const restore = button('Restore original generated version');
  restore.focus();
  await key(restore, 'Escape');
  assert.equal(history.open, false); assert.equal(document.activeElement, q('summary', history));
  assert.equal(trigger().getAttribute('aria-expanded'), 'true');
  await key(document.activeElement, 'Escape');
  assert.equal(trigger().getAttribute('aria-expanded'), 'false');
  assert.equal(document.activeElement, trigger()); assert.equal(parentEscapes, 0);
  await click(trigger());
  await act(async () => document.getElementById('outside').focus());
  assert.equal(trigger().getAttribute('aria-expanded'), 'false');
  assert.equal(document.activeElement.id, 'outside');
  await click(trigger());
  await act(async () => document.getElementById('outside').dispatchEvent(new Event('pointerdown', { bubbles: true })));
  assert.equal(trigger().getAttribute('aria-expanded'), 'false');
});

test('Tab boundaries return to logical inline controls and only one block menu is open', async () => {
  await mount(); await click(trigger());
  await key(document.activeElement, 'Tab', true);
  assert.equal(document.activeElement, trigger()); assert.equal(trigger().getAttribute('aria-expanded'), 'false');
  await click(trigger());
  const summary = q('summary', menu()); summary.focus();
  await key(summary, 'Tab');
  assert.equal(document.activeElement, q('textarea[aria-label="Editable Test draft"]'));
  assert.equal(trigger().getAttribute('aria-expanded'), 'false');
  await click(trigger()); await click(trigger('Second draft'));
  assert.equal(document.querySelectorAll('.writing-block__action-surface').length, 1);
  assert.equal(trigger().getAttribute('aria-expanded'), 'false');
  assert.equal(trigger('Second draft').getAttribute('aria-expanded'), 'true');
});

test('revision, undo/redo, history restore, copy, asset save and export keep the current prose', async () => {
  await mount(); const editor = q('textarea[aria-label="Editable Test draft"]');
  await change(editor, 'Edited prose');
  await click(q('button[aria-label="Copy Test draft"]'));
  assert.deepEqual(copied, ['Edited prose']);
  await click(trigger()); await click(button('Rewrite block')); await flush();
  assert.equal(revisions.length, 1); assert.equal(editor.value, 'Revised prose'); assert.equal(document.activeElement, editor);
  assert.equal(trigger().getAttribute('aria-expanded'), 'false');
  await click(trigger()); await click(button('Undo')); assert.equal(editor.value, 'Edited prose');
  await click(trigger()); await click(button('Redo')); assert.equal(editor.value, 'Revised prose');
  await click(trigger()); await click(button('Save to Assets'));
  assert.match(localStorage.getItem('tay:writing-assets:v1') || [...Object.values(localStorage)].join(''), /Revised prose/);
  await click(trigger()); await click(button('Export')); assert.equal(downloads.length, 1);
  await click(trigger()); await click(q('summary', menu())); await click(button('Restore original generated version'));
  assert.equal(editor.value, 'Original prose'); assert.equal(document.activeElement, editor);
  assert.equal(trigger().getAttribute('aria-expanded'), 'false');
});


test('fallback stays inside its active modal and outside the nested scrolling content', async () => {
  await act(async () => root.render(React.createElement('aside', { role: 'dialog', 'aria-modal': true, 'data-modal': true },
    React.createElement('div', { 'data-scroller': true, style: { overflow: 'auto' } },
      React.createElement(WritingBlock, { id: 'modal', title: 'Test draft', content: 'Modal prose' })))));
  await click(trigger());
  assert.equal(menu().parentElement, q('[data-modal]'));
  assert.equal(q('[data-scroller]').contains(menu()), false);
  assert.equal(document.activeElement, button('Rewrite block'));
  await key(document.activeElement, 'Escape');
  assert.equal(document.activeElement, trigger());
});


const mountPersistence = async context => act(async () => root.render(React.createElement(WritingPersistenceContext.Provider, { value: context },
  React.createElement(WritingBlock, { id: 'fixture', title: 'Test draft', content: 'Original prose' }))));
const blockKey = writing.writingBlockStorageKey('fixture');
const assetKey = writing.WRITING_ASSET_STORAGE_KEY;
const blockStatus = () => q('.writing-block__status').textContent;

test('hydration is read-only; edits persist only after the lock and reload restores them', async () => {
  await mount();
  assert.equal(localStorage.getItem(blockKey), null, 'viewing generated prose never writes a record');
  assert.equal(localStorage.getItem(assetKey), null, 'viewing prose never writes the asset list');
  const editor = q('textarea[aria-label="Editable Test draft"]');
  holdLocks = true;
  await change(editor, 'Pending guarded prose');
  assert.equal(localStorage.getItem(blockKey), null);
  assert.match(blockStatus(), /Saving on this device/);
  assert.doesNotMatch(blockStatus(), /Saved on this device|saved on this device/);
  holdLocks = false;
  await act(async () => { heldLocks.splice(0).forEach(run => run()); });
  assert.equal(writing.writingBlockText(writing.decodeWritingBlockState(localStorage.getItem(blockKey))), 'Pending guarded prose');
  await act(async () => root.unmount()); root = createRoot(host);
  await mount();
  assert.equal(q('textarea[aria-label="Editable Test draft"]').value, 'Pending guarded prose');
});

test('writing conflict preserves external bytes and local edits, and pauses the containing workspace', async () => {
  let paused = false, blocked = 0;
  await mountPersistence({ isPaused: () => paused, onBlocked: () => { paused = true; blocked++; } });
  const external = JSON.stringify(writing.createWritingBlock('Other tab winning version', 1));
  localStorage.setItem(blockKey, external);
  await change(q('textarea'), 'This tab unsaved version');
  assert.equal(localStorage.getItem(blockKey), external);
  assert.equal(q('textarea').value, 'This tab unsaved version');
  assert.equal(paused, true); assert.equal(blocked, 1);
  assert.match(blockStatus(), /Not saved|Saving paused/);
  assert.doesNotMatch(blockStatus(), /Saved on this device/);
  await click(trigger()); await click(button('Save to Assets'));
  assert.equal(localStorage.getItem(assetKey), null, 'workspace pause also prevents asset writes');
  await act(async () => root.unmount()); root = createRoot(host);
  newDocumentStorage(true); // A real reload creates a new Storage/document identity, unlike panel reopening.
  await mount();
  assert.equal(q('textarea[aria-label="Editable Test draft"]').value, 'Other tab winning version');
});

test('asset conflict preserves the complete external list and never reports a save', async () => {
  let paused = false;
  await mountPersistence({ isPaused: () => paused, onBlocked: () => { paused = true; } });
  const external = JSON.stringify([{ id: 'other-tab', title: 'Protected asset', kind: 'text', content: 'Other tab content', updatedAt: 5 }]);
  localStorage.setItem(assetKey, external);
  await click(trigger()); await click(button('Save to Assets'));
  assert.equal(localStorage.getItem(assetKey), external);
  assert.equal(paused, true); assert.equal(q('textarea').value, 'Original prose');
  assert.match(blockStatus(), /not saved/i); assert.doesNotMatch(blockStatus(), /Saved to Assets/);
  await change(q('textarea'), 'Local after conflict');
  assert.equal(q('textarea').value, 'Local after conflict');
  assert.equal(localStorage.getItem(blockKey), null);
});

test('a workspace pause that arrives during a queued write prevents block and asset persistence', async () => {
  let paused = false;
  await mountPersistence({ isPaused: () => paused, onBlocked: () => { paused = true; } });
  holdLocks = true;
  await change(q('textarea'), 'Held local edit');
  await click(trigger()); await click(button('Save to Assets'));
  assert.match(blockStatus(), /Saving to Assets/); assert.doesNotMatch(blockStatus(), /Saved/);
  paused = true; holdLocks = false;
  await act(async () => { heldLocks.splice(0).forEach(run => run()); });
  assert.equal(localStorage.getItem(blockKey), null); assert.equal(localStorage.getItem(assetKey), null);
  assert.equal(q('textarea').value, 'Held local edit'); assert.doesNotMatch(blockStatus(), /Saved/);
});

test('sequential same-document asset saves preserve both blocks without a false cross-tab conflict', async () => {
  await mount();
  await click(trigger()); await click(button('Save to Assets'));
  await click(trigger('Second draft')); await click(button('Save to Assets'));
  let assets = JSON.parse(localStorage.getItem(assetKey));
  assert.equal(assets.length, 2);
  assert.equal(assets.find(asset => asset.id === 'fixture').content, 'Original prose');
  assert.equal(assets.find(asset => asset.id === 'second').content, 'Second prose');
  await change(q('textarea[aria-label="Editable Test draft"]'), 'Updated first asset');
  await click(trigger()); await click(button('Save to Assets'));
  assets = JSON.parse(localStorage.getItem(assetKey));
  assert.equal(assets.length, 2);
  assert.equal(assets.find(asset => asset.id === 'fixture').content, 'Updated first asset');
  assert.doesNotMatch(host.textContent, /Saving paused|not saved|Another tab/);
});

test('unreadable saved writing and assets survive hydration and later save attempts', async () => {
  localStorage.setItem(blockKey, '{bad-writing'); localStorage.setItem(assetKey, '[{"id":"invalid"}]');
  await mount();
  await change(q('textarea[aria-label="Editable Test draft"]'), 'Recoverable local text');
  await click(trigger()); await click(button('Save to Assets'));
  assert.equal(localStorage.getItem(blockKey), '{bad-writing');
  assert.equal(localStorage.getItem(assetKey), '[{"id":"invalid"}]');
  assert.equal(q('textarea[aria-label="Editable Test draft"]').value, 'Recoverable local text');
});


const sharedKey = writing.writingBlockStorageKey('shared-views');
const twinEditor = title => q(`textarea[aria-label="Editable ${title}"]`);
const mountTwins = async ({ library = true, chat = true, revise, context } = {}) => act(async () => root.render(
  React.createElement(WritingPersistenceContext.Provider, { value: context || { isPaused: () => false, onBlocked() {} } },
    chat && React.createElement(WritingBlock, { key: 'chat', id: 'shared-views', title: 'Chat view', content: 'Original shared prose', onRequestRevision: revise }),
    library && React.createElement(WritingBlock, { key: 'library', id: 'shared-views', title: 'Library view', content: 'Original shared prose' }))));

test('conversation and library views share edits, history and one guard through close/reopen', async () => {
  await mountTwins();
  await change(twinEditor('Chat view'), 'Chat authored draft');
  assert.equal(twinEditor('Library view').value, 'Chat authored draft');
  await change(twinEditor('Library view'), 'Library authored draft');
  assert.equal(twinEditor('Chat view').value, 'Library authored draft');
  await click(trigger('Chat view')); await click(button('Undo'));
  assert.equal(twinEditor('Chat view').value, 'Chat authored draft');
  assert.equal(twinEditor('Library view').value, 'Chat authored draft');
  await click(trigger('Library view')); await click(button('Redo'));
  assert.equal(twinEditor('Chat view').value, 'Library authored draft');
  await mountTwins({ library: false });
  await change(twinEditor('Chat view'), 'Chat after library closed');
  await mountTwins();
  assert.equal(twinEditor('Library view').value, 'Chat after library closed');
  assert.doesNotMatch(host.textContent, /Saving paused|Another tab|Not saved/);
  const saved = writing.decodeWritingBlockState(localStorage.getItem(sharedKey));
  assert.equal(writing.writingBlockText(saved), 'Chat after library closed');
  assert.ok(saved.archive.some(version => version.content === 'Library authored draft'));
});

test('same-batch edits from distinct views create separate undo/history versions', async () => {
  await mountTwins();
  await act(async () => {
    const set = Object.getOwnPropertyDescriptor(dom.window.HTMLTextAreaElement.prototype, 'value').set;
    set.call(twinEditor('Chat view'), 'Chat batch draft'); twinEditor('Chat view').dispatchEvent(new Event('input', { bubbles: true }));
    set.call(twinEditor('Library view'), 'Library batch draft'); twinEditor('Library view').dispatchEvent(new Event('input', { bubbles: true }));
  });
  const snapshot = getLiveWritingSnapshots()[sharedKey];
  assert.ok(snapshot.archive.some(version => version.content === 'Chat batch draft'));
  assert.ok(snapshot.archive.some(version => version.content === 'Library batch draft'));
  await click(trigger('Library view')); await click(button('Undo'));
  assert.equal(twinEditor('Chat view').value, 'Chat batch draft');
  assert.equal(twinEditor('Library view').value, 'Chat batch draft');
});

test('a sibling edit makes an outstanding revision an alternative instead of replacing current text', async () => {
  let complete;
  const revise = () => new Promise(resolve => { complete = resolve; });
  await mountTwins({ revise });
  await click(trigger('Chat view')); await click(button('Rewrite block'));
  await change(twinEditor('Library view'), 'Library newer than request');
  await act(async () => complete('Stale revision candidate'));
  assert.equal(twinEditor('Chat view').value, 'Library newer than request');
  assert.equal(twinEditor('Library view').value, 'Library newer than request');
  assert.ok(getLiveWritingSnapshots()[sharedKey].archive.some(version => version.content === 'Stale revision candidate'));
});


test('composition keeps its local buffer while a sibling edit joins the shared history', async () => {
  await mountTwins();
  const chat = twinEditor('Chat view');
  await act(async () => chat.dispatchEvent(new CompositionEvent('compositionstart', { bubbles: true, data: '' })));
  await change(chat, 'Composing draft');
  await change(twinEditor('Library view'), 'Sibling during composition');
  assert.equal(chat.value, 'Composing draft');
  await act(async () => {
    Object.getOwnPropertyDescriptor(dom.window.HTMLTextAreaElement.prototype, 'value').set.call(chat, 'Completed composition');
    chat.dispatchEvent(new CompositionEvent('compositionend', { bubbles: true, data: 'Completed composition' }));
  });
  assert.equal(chat.value, 'Completed composition');
  assert.equal(twinEditor('Library view').value, 'Completed composition');
  const history = getLiveWritingSnapshots()[sharedKey].archive;
  assert.ok(history.some(version => version.content === 'Sibling during composition'));
  assert.ok(history.some(version => version.content === 'Completed composition'));
});

test('paused Library-only edits survive panel unmount, reopen and recovery export without rebasing', async () => {
  let paused = false;
  const context = { isPaused: () => paused, onBlocked: () => { paused = true; } };
  await mountTwins({ chat: false, context });
  const external = JSON.stringify(writing.createWritingBlock('Protected other-tab draft', 1));
  localStorage.setItem(sharedKey, external);
  await change(twinEditor('Library view'), 'Unsaved recoverable library prose');
  assert.equal(paused, true); assert.equal(localStorage.getItem(sharedKey), external);
  await mountTwins({ chat: false, library: false, context });
  assert.equal(writing.writingBlockText(getLiveWritingSnapshots()[sharedKey]), 'Unsaved recoverable library prose');
  assert.match(JSON.stringify(getLiveWritingSnapshots()), /Unsaved recoverable library prose/);
  await mountTwins({ chat: false, context });
  assert.equal(twinEditor('Library view').value, 'Unsaved recoverable library prose');
  await change(twinEditor('Library view'), 'More local recovery text');
  assert.equal(localStorage.getItem(sharedKey), external);
  assert.equal(writing.writingBlockText(getLiveWritingSnapshots()[sharedKey]), 'More local recovery text');
  assert.ok(getLiveWritingSnapshots()[sharedKey].archive.some(version => version.content === 'Unsaved recoverable library prose'));
});

test('surface CSS remains fixed, bounded and scrollable for both native and portal paths', () => {
  const css = fs.readFileSync(path.join(__dirname, '../app/writing-actions.css'), 'utf8');
  const postcss = require('postcss'); const sheet = postcss.parse(css);
  const rule = sheet.nodes.find(node => node.selector === '.writing-block__action-surface.writing-block__menu-content');
  const value = name => rule.nodes.find(node => node.prop === name)?.value;
  assert.equal(value('position'), 'fixed'); assert.equal(value('inset'), 'auto');
  assert.equal(value('overflow'), 'auto'); assert.equal(value('overscroll-behavior'), 'contain');
  assert.equal(value('max-height'), 'calc(100dvh - 24px)'); assert.equal(value('max-width'), 'calc(100vw - 24px)');
});
