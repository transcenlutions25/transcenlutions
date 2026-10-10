/* Mounted React/jsdom integration contracts, using the mobile ChatShell harness
 * approach. Real ChatShell, WorkspaceFrame, Intelligence Lab and local analysis
 * run together; only service boundaries are stubbed. Synthetic fixtures only.
 * No real microphone, network, customer data, account or desktop runtime is used.
 * CSS checks evaluate source contracts, not browser layout or pixel QA.
 */
const assert = require('node:assert/strict');
const { test, beforeEach, afterEach, after } = require('node:test');
const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');
const ts = require('typescript');
const postcss = require('postcss');
const { JSDOM } = require('jsdom');

const repo = path.resolve(__dirname, '..');
const dom = new JSDOM('<!doctype html><html><body><div id="root"></div></body></html>', {
  url: 'https://tay-intelligence-test.invalid/', pretendToBeVisual: true,
});
for (const key of ['window', 'document', 'HTMLElement', 'Element', 'Node', 'Event', 'MouseEvent', 'KeyboardEvent', 'localStorage']) {
  Object.defineProperty(globalThis, key, { configurable: true, value: key === 'window' ? dom.window : dom.window[key] });
}
Object.defineProperty(globalThis, 'navigator', { configurable: true, value: dom.window.navigator });
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
const unexpectedCalls = [];
const rejectExternal = (...args) => { unexpectedCalls.push(String(args[0])); throw new Error(`External calls are forbidden in Intelligence Lab tests: ${args[0]}`); };
globalThis.fetch = rejectExternal;
dom.window.fetch = rejectExternal;
dom.window.XMLHttpRequest = class { constructor() { rejectExternal('XMLHttpRequest'); } };
dom.window.WebSocket = class { constructor() { rejectExternal('WebSocket'); } };
Object.defineProperty(navigator, 'sendBeacon', { configurable: true, value: rejectExternal });
Object.defineProperty(navigator, 'mediaDevices', { configurable: true, value: { getUserMedia: rejectExternal } });
const mediaQueries = [];
dom.window.matchMedia = media => {
  const listeners = new Set();
  const query = { media, get matches() { return /max-width:\s*900px/.test(media) && dom.window.innerWidth <= 900; },
    addEventListener: (_, fn) => listeners.add(fn), removeEventListener: (_, fn) => listeners.delete(fn),
    addListener: fn => listeners.add(fn), removeListener: fn => listeners.delete(fn), dispatch: () => listeners.forEach(fn => fn(query)) };
  mediaQueries.push(query);
  return query;
};
Object.defineProperty(dom.window.HTMLTextAreaElement.prototype, 'scrollHeight', { configurable: true, get: () => 44 });
// Restore notices should not leave six-second timers running after each case.
const realSetTimeout = dom.window.setTimeout.bind(dom.window);
const realClearTimeout = dom.window.clearTimeout.bind(dom.window);
const restoreTimers = new Set();
let nextRestoreTimer = 100000;
dom.window.setTimeout = (fn, delay, ...args) => {
  if (delay === 6000) { const id = nextRestoreTimer++; restoreTimers.add(id); return id; }
  return realSetTimeout(fn, delay, ...args);
};
dom.window.clearTimeout = id => { if (!restoreTimers.delete(id)) realClearTimeout(id); };

const React = require('react');
const { act } = React;
const { createRoot } = require('react-dom/client');
const originalLoad = Module._load;
const originalExtensions = { '.ts': require.extensions['.ts'], '.tsx': require.extensions['.tsx'] };
for (const extension of ['.ts', '.tsx']) require.extensions[extension] = (module, filename) => {
  const code = ts.transpileModule(fs.readFileSync(filename, 'utf8'), { fileName: filename, compilerOptions: {
    target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS,
    jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true,
  } }).outputText;
  module._compile(code, filename);
};
let desktop;
let desktopCalls;
Module._load = function (request, parent, isMain) {
  if (request === 'next/image') return { __esModule: true, default: ({ priority, ...props }) => React.createElement('img', props) };
  if (request === '../lib/use-desktop-runtime') return { useDesktopRuntime: () => desktop, callDesktop: rejectExternal };
  if (request.endsWith('agent-policy-client')) return { requestAgentActionPolicy: rejectExternal };
  if (request.endsWith('operating-graph-client')) return {
    ...originalLoad.call(this, request, parent, isMain), recordOperatingGraphEvent: rejectExternal,
  };
  if (request.startsWith('@/')) request = path.join(repo, request.slice(2));
  return originalLoad.call(this, request, parent, isMain);
};
const { ChatShell } = require('../components/chat-shell.tsx');
const { workspaceStorageKey } = require('../lib/workspace-state.ts');
const { createConversationIntelligenceDraft } = require('../lib/conversation-intelligence.ts');
const props = {
  deploymentReadiness: require('../lib/deployment-readiness.ts').createDeploymentReadinessState({}),
  launchReadiness: require('../lib/launch-readiness.ts').createLaunchReadinessState({}),
  revenueSetup: require('../lib/revenue-setup.ts').createRevenueSetupState({}),
};
let root;
let storageDocument;
let mountedProps;
let storageWrites;
const host = document.getElementById('root');
const q = (selector, within = host) => { const found = within.querySelector(selector); assert.ok(found, `Missing ${selector}`); return found; };
const button = (label, within = host) => {
  const found = [...within.querySelectorAll('button')].filter(item => item.textContent.trim() === label);
  assert.equal(found.length, 1, `Expected one button '${label}'`);
  return found[0];
};
const click = async element => { await act(async () => { element.dispatchEvent(new MouseEvent('click', { bubbles: true })); }); };
const change = async (element, value) => { await act(async () => {
  const prototype = element.tagName === 'TEXTAREA' ? dom.window.HTMLTextAreaElement.prototype : element.tagName === 'SELECT' ? dom.window.HTMLSelectElement.prototype : dom.window.HTMLInputElement.prototype;
  Object.getOwnPropertyDescriptor(prototype, 'value').set.call(element, value);
  element.dispatchEvent(new Event(element.tagName === 'SELECT' ? 'change' : 'input', { bubbles: true }));
}); };
const dialog = () => {
  const panel = q('.tay-sidecar');
  assert.notEqual(panel.getAttribute('aria-hidden'), 'true', 'workspace panel is open');
  return panel;
};
const lab = () => q('.tay-intelligence-panel', dialog());
const field = (label, within = lab()) => {
  const found = [...within.querySelectorAll('label')].filter(item => item.textContent.trim().startsWith(label));
  assert.equal(found.length, 1, `Expected one field label '${label}'`);
  return q('textarea, select, input', found[0]);
};
const chooseMode = async label => click(button(label, q('[aria-label="Intelligence lab mode"]', lab())));
const activeMode = () => q('[aria-label="Intelligence lab mode"] [aria-pressed="true"]', lab()).textContent;
const score = () => lab().querySelector('article[aria-live="polite"]');
const closePanel = async () => { if (host.querySelector('.tay-app.tay-sidecar-open')) await click(q('[aria-label="Close workspace panel"]', dialog())); };
const chooseTool = async name => change(q('select[aria-label="Workspace tool"]', dialog()), name);
const openLab = async () => {
  if (!host.querySelector('.tay-app.tay-sidecar-open')) await click(q('[aria-label="Message options and tools"]'));
  await chooseTool('intelligence');
  assert.equal(dialog().getAttribute('aria-label'), 'Intelligence Lab');
  return lab();
};
const navigation = async () => { await closePanel(); await click(q('[aria-label="Open navigation"]')); return q('nav[aria-label="Workspace navigation"]'); };
const navGroup = async name => {
  const nav = await navigation();
  const group = [...nav.querySelectorAll('details')].find(item => item.querySelector('summary')?.textContent.trim() === name);
  assert.ok(group, `Missing navigation group ${name}`);
  if (!group.open) await click(q('summary', group));
  return group;
};
const viewport = async width => { await act(async () => {
  Object.defineProperty(dom.window, 'innerWidth', { configurable: true, value: width });
  Object.defineProperty(dom.window, 'innerHeight', { configurable: true, value: 844 });
  mediaQueries.forEach(query => query.dispatch()); dom.window.dispatchEvent(new Event('resize'));
}); };
const mount = async (extra = {}) => { mountedProps = { ...props, ...extra }; root = createRoot(host); await act(async () => root.render(React.createElement(ChatShell, mountedProps))); };
const rerender = async () => { await act(async () => root.render(React.createElement(ChatShell, mountedProps))); };
const unmount = async () => { if (root) { await act(async () => root.unmount()); root = null; } };
const currentWebConversation = () => {
  const saved = JSON.parse(localStorage.getItem(workspaceStorageKey));
  return saved.conversations.find(item => item.id === saved.activeThreadId);
};
const savedConversation = (id, projectId, title) => ({
  id, title, projectId, updated: 1,
  messages: [{ id: `${id}-intro`, role: 'user', text: title, agentId: 'tay', contextAgentId: 'tay' }],
  queue: [], agentId: 'tay', mode: 'chat', input: '', response: null, responseAgentId: 'tay',
  result: null, executionStatus: 'idle', logEntries: [], memoryEntries: [], feedbackEntries: [],
});
const seedWorkspace = () => localStorage.setItem(workspaceStorageKey, JSON.stringify({ version: 1, activeThreadId: 'first-conversation',
  conversations: [savedConversation('first-conversation', 'transcenlutions', 'Original fixture conversation')],
  projects: [{ id: 'transcenlutions', name: 'Transcenlutions', repository: 'transcenlutions25/transcenlutions', branch: 'main' }],
  pinned: [], momentum: [], momentumEnabled: false,
}));
const desktopState = (sessionId = 'session-a') => ({ session_id: sessionId, sessions: [{ id: 'session-a', created: 100 }, { id: 'session-b', created: 200 }], items: [], messages: [], agents: [] });
const assertNotPersisted = (...values) => {
  const stored = JSON.stringify({ current: Object.fromEntries(Object.keys(localStorage).map(key => [key, localStorage.getItem(key)])), writes: storageWrites });
  for (const value of values) assert.equal(stored.includes(value), false, `Lab fixture must not be automatically persisted: ${value}`);
  assert.deepEqual(unexpectedCalls, [], 'Lab never transmits customer text or calls an external service');
};
async function exportWorkspace() {
  await chooseTool('settings');
  const create = URL.createObjectURL, revoke = URL.revokeObjectURL;
  const anchorClick = dom.window.HTMLAnchorElement.prototype.click;
  const blobs = [], downloads = [];
  URL.createObjectURL = blob => { blobs.push(blob); return 'blob:fixture-intelligence-export'; };
  URL.revokeObjectURL = () => {};
  dom.window.HTMLAnchorElement.prototype.click = function () { downloads.push(this.download); };
  try {
    await click(button('Export workspace', dialog()));
    assert.deepEqual(downloads, ['tay-workspace-export.json']);
    assert.equal(blobs.length, 1);
    assert.equal(blobs[0].type, 'application/json');
    return JSON.parse(await blobs[0].text());
  } finally {
    URL.createObjectURL = create; URL.revokeObjectURL = revoke;
    dom.window.HTMLAnchorElement.prototype.click = anchorClick;
  }
}

function serializedLocks() {
  const tails = new Map();
  return { request(name, options, callback) {
    const next = (tails.get(name) || Promise.resolve()).then(() => (typeof options === 'function' ? options : callback)({ name, mode: 'exclusive' }));
    tails.set(name, next.catch(() => {})); return next;
  } };
}
beforeEach(async () => {
  storageDocument?.window.close();
  storageDocument = new JSDOM('', { url: 'https://tay-intelligence-test.invalid/' });
  storageWrites = [];
  const nativeSetItem = storageDocument.window.Storage.prototype.setItem;
  storageDocument.window.Storage.prototype.setItem = function (key, value) {
    storageWrites.push([String(key), String(value)]);
    return nativeSetItem.call(this, key, value);
  };
  Object.defineProperty(dom.window, 'localStorage', { configurable: true, value: storageDocument.window.localStorage });
  Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: storageDocument.window.localStorage });
  Object.defineProperty(navigator, 'locks', { configurable: true, value: serializedLocks() });
  unexpectedCalls.length = 0; restoreTimers.clear(); desktopCalls = [];
  delete dom.window.SpeechRecognition; delete dom.window.webkitSpeechRecognition; delete dom.window.speechSynthesis;
  desktop = { state: null, busy: false, error: '', projects: ['/fixture/project-a', '/fixture/project-b'], project: '/fixture/project-a',
    enqueue: rejectExternal, command: rejectExternal,
    newSession: async () => { desktopCalls.push({ kind: 'newSession' }); desktop.state = desktopState('session-b'); },
    switchSession: id => { desktopCalls.push({ kind: 'switchSession', id }); desktop.state = null; },
    switchProject: project => { desktopCalls.push({ kind: 'switchProject', project }); desktop.project = project; desktop.state = null; },
  };
  await viewport(393);
});
afterEach(async () => {
  await unmount(); host.replaceChildren(); storageDocument?.window.close();
  assert.deepEqual(unexpectedCalls, [], 'No real network, runtime, policy, graph or microphone calls');
});
after(() => {
  Module._load = originalLoad;
  for (const [extension, original] of Object.entries(originalExtensions)) {
    if (original) require.extensions[extension] = original; else delete require.extensions[extension];
  }
  dom.window.close();
});

for (const width of [393, 1280]) test(`Intelligence Lab opens through header controls, plus, navigation and tool picker at ${width}px without duplicate header`, async () => {
  await viewport(width); await mount();
  const assertCompactHeader = () => {
    assert.equal(host.querySelectorAll('.tay-command-header').length, 1);
    assert.equal(q('.tay-command-header').querySelectorAll('.tay-header-controls, .tay-mode-switch, select, input').length, 0,
      'conversation controls stay in the side panel, not resurrected in the header');
    assert.equal(host.querySelectorAll('.tay-command-header [aria-label="Conversation controls"]').length, 1);
    assert.equal(host.querySelectorAll('textarea[aria-label="Message Tay"]').length, 1);
  };
  assertCompactHeader();
  for (const entry of ['Conversation controls', 'Message options and tools']) {
    await closePanel(); await click(q(`[aria-label="${entry}"]`));
    assert.equal(host.querySelectorAll('.tay-header-controls').length, 1);
    await click(button('Intelligence Lab', dialog()));
    assert.equal(dialog().getAttribute('aria-label'), 'Intelligence Lab'); lab(); assertCompactHeader();
  }
  const nav = await navigation();
  const entry = [...nav.querySelectorAll('button')].filter(item => item.textContent.trim().replace(/›$/, '') === 'Intelligence Lab');
  assert.equal(entry.length, 1, 'one Lab entry in existing navigation');
  await click(entry[0]); lab(); assertCompactHeader();
  await chooseTool('memory');
  assert.equal(host.querySelectorAll('.tay-intelligence-panel').length, 0);
  const picker = q('select[aria-label="Workspace tool"]', dialog());
  assert.equal([...picker.options].filter(option => option.value === 'intelligence' && option.textContent === 'Intelligence Lab').length, 1);
  await chooseTool('intelligence'); lab(); assertCompactHeader();
});

test('mounted analysis, lessons, integration and practice scoring work with reset-on-edit and scenario change', async () => {
  await mount(); await openLab();
  assert.equal(field('Conversation or customer message').value, '');
  assert.match(lab().textContent, /No interaction text yet/);
  await click(button('Load example interaction', lab()));
  assert.match(field('Conversation or customer message').value, /charged twice/);
  const text = 'Synthetic client: I was charged twice, $42. Please verify billing today. Contact fixture@example.test.';
  await change(field('Conversation or customer message'), text);
  assert.match(lab().textContent, /billing · high urgency/);
  assert.match(lab().textContent, /email: fixture@example\.test/);
  assert.match(lab().textContent, /money: \$42/);
  await chooseMode('Learn');
  assert.equal(activeMode(), 'Learn'); assert.equal(q('.tay-intelligence-lessons', lab()).children.length, 4);
  await chooseMode('Integrate');
  assert.match(lab().textContent, /Integration contract/);
  assert.match(lab().textContent, /does not claim a connected external AI service/);
  assert.match(lab().textContent, /not synced to an account or another device/);
  await chooseMode('Practice');
  assert.equal(button('Score practice', lab()).disabled, true);
  assert.equal(field('Practice scenario').value, 'save-cancellation');
  await change(field('Practice scenario'), 'resolve-billing');
  assert.match(lab().textContent, /Resolve a billing concern/);
  await change(field('Your response'), 'I understand your concern about the duplicate charge. I will verify the transaction details and explain how we can resolve it.');
  await click(button('Score practice', lab()));
  assert.match(score().textContent, /100\/100 · Ready/);
  await change(field('Your response'), 'probably ignore it');
  assert.equal(score(), null, 'editing invalidates prior score');
  await click(button('Score practice', lab()));
  assert.match(score().textContent, /0\/100 · Keep practicing/);
  await change(field('Practice scenario'), 'qualify-buyer');
  assert.equal(field('Your response').value, ''); assert.equal(score(), null);
  assert.equal(button('Score practice', lab()).disabled, true);
  await chooseMode('Analyze'); assert.equal(field('Conversation or customer message').value, text);
  assertNotPersisted(text, 'probably ignore it');
});

test('tool switches, panel close/reopen and mode switches retain the entire conversation Lab draft', async () => {
  await mount(); await openLab();
  const text = 'Synthetic retained Lab interaction alpha.';
  const response = 'Thank you. Your team fit and cost questions matter; the next step is to check your exact workflow together.';
  await change(field('Conversation or customer message'), text);
  await chooseMode('Practice'); await change(field('Practice scenario'), 'qualify-buyer');
  await change(field('Your response'), response); await click(button('Score practice', lab()));
  const expectedScore = score().textContent;
  await chooseTool('memory'); assert.equal(host.querySelector('.tay-intelligence-panel'), null);
  await chooseTool('intelligence');
  assert.equal(activeMode(), 'Practice'); assert.equal(field('Practice scenario').value, 'qualify-buyer');
  assert.equal(field('Your response').value, response); assert.equal(score().textContent, expectedScore);
  await closePanel(); await openLab();
  assert.equal(activeMode(), 'Practice'); assert.equal(field('Your response').value, response);
  assert.equal(score().textContent, expectedScore);
  await chooseMode('Analyze'); assert.equal(field('Conversation or customer message').value, text);
  await chooseMode('Learn'); await chooseTool('queue'); await openLab(); assert.equal(activeMode(), 'Learn');
  await chooseMode('Practice'); assert.equal(score().textContent, expectedScore);
  assertNotPersisted(text, response);
});

test('new web conversations isolate drafts and Recent restores prior text, mode and scored practice', async () => {
  seedWorkspace(); await mount(); await openLab();
  const originalId = currentWebConversation().id;
  const originalText = 'Synthetic conversation A Lab draft.';
  const response = 'I understand the frustration. I can help you review the available option and the next concrete step without delay.';
  await change(field('Conversation or customer message'), originalText);
  await chooseMode('Practice'); await change(field('Your response'), response); await click(button('Score practice', lab()));
  const originalScore = score().textContent;
  const nav = await navigation(); await click(button('＋ New conversation', nav));
  const nextId = currentWebConversation().id; assert.notEqual(nextId, originalId);
  await openLab(); assert.equal(activeMode(), 'Analyze'); assert.equal(field('Conversation or customer message').value, '');
  const nextText = 'Synthetic conversation B independent Lab draft.';
  await change(field('Conversation or customer message'), nextText); await chooseMode('Integrate');
  const recent = await navGroup('Recent');
  const previous = [...recent.querySelectorAll('button')].filter(item => item.getAttribute('aria-current') !== 'true');
  assert.equal(previous.length, 1); await click(previous[0]);
  assert.equal(currentWebConversation().id, originalId);
  await openLab(); assert.equal(activeMode(), 'Practice'); assert.equal(field('Your response').value, response);
  assert.equal(score().textContent, originalScore);
  await chooseMode('Analyze'); assert.equal(field('Conversation or customer message').value, originalText);
  const again = await navGroup('Recent');
  await click([...again.querySelectorAll('button')].find(item => item.getAttribute('aria-current') !== 'true'));
  await openLab(); assert.equal(activeMode(), 'Integrate'); await chooseMode('Analyze');
  assert.equal(field('Conversation or customer message').value, nextText);
  assertNotPersisted(originalText, nextText, response);
});

test('web project changes and restored conversations keep independent project/thread draft scopes', async () => {
  const projectA = { id: 'project-a', name: 'Fixture A', repository: 'fixture/project-a', branch: 'main' };
  const projectB = { id: 'project-b', name: 'Fixture B', repository: 'fixture/project-b', branch: 'main' };
  localStorage.setItem(workspaceStorageKey, JSON.stringify({ version: 1, activeThreadId: 'thread-a',
    conversations: [savedConversation('thread-a', projectA.id, 'Original fixture conversation')],
    projects: [projectA, projectB], pinned: [], momentum: [], momentumEnabled: false,
  }));
  await mount(); await openLab(); await change(field('Conversation or customer message'), 'Synthetic project A private Lab draft.');
  const projects = await navGroup('Projects'); await click(button('Fixture B', projects));
  assert.equal(currentWebConversation().projectId, 'project-b');
  const threadB = currentWebConversation().id;
  await openLab(); assert.equal(field('Conversation or customer message').value, '');
  await change(field('Conversation or customer message'), 'Synthetic project B private Lab draft.');
  const recent = await navGroup('Recent'); await click(button('Original fixture conversation', recent));
  await openLab(); assert.equal(field('Conversation or customer message').value, 'Synthetic project A private Lab draft.');
  const exported = await exportWorkspace();
  assert.equal(exported.intelligenceDrafts[JSON.stringify(['web', projectA.id, 'thread-a'])].text, 'Synthetic project A private Lab draft.');
  assert.equal(exported.intelligenceDrafts[JSON.stringify(['web', projectB.id, threadB])].text, 'Synthetic project B private Lab draft.');
  assertNotPersisted('Synthetic project A private Lab draft.', 'Synthetic project B private Lab draft.');
});

test('desktop session and project scopes isolate drafts, including same session identifier in different projects', async () => {
  desktop.state = desktopState(); await mount({ desktopEnabled: true }); await openLab();
  const textA = 'Synthetic desktop project A session A text.';
  await change(field('Conversation or customer message'), textA);
  await chooseMode('Practice'); await change(field('Practice scenario'), 'resolve-billing');
  const response = 'I understand your concern. We will verify the duplicate charge and explain the next step to resolve the issue.';
  await change(field('Your response'), response); await click(button('Score practice', lab()));
  desktop.state = desktopState('session-b'); await rerender();
  assert.equal(document.activeElement, q('.tay-sidecar-header h2'), 'same-titled Lab announces its changed conversation by focusing its heading');
  assert.equal(activeMode(), 'Analyze'); assert.equal(field('Conversation or customer message').value, '');
  await change(field('Conversation or customer message'), 'Synthetic desktop project A session B text.');
  desktop.project = '/fixture/project-b'; desktop.state = desktopState(); await rerender();
  assert.equal(field('Conversation or customer message').value, '');
  await change(field('Conversation or customer message'), 'Synthetic desktop project B session A text.');
  desktop.project = '/fixture/project-a'; desktop.state = desktopState(); await rerender();
  assert.equal(activeMode(), 'Practice'); assert.equal(field('Practice scenario').value, 'resolve-billing');
  assert.equal(field('Your response').value, response); assert.match(score().textContent, /100\/100 · Ready/);
  await chooseMode('Analyze'); assert.equal(field('Conversation or customer message').value, textA);
  const exported = await exportWorkspace();
  assert.deepEqual(Object.keys(exported.intelligenceDrafts).sort(), [
    JSON.stringify(['desktop', '/fixture/project-a', 'session-a']), JSON.stringify(['desktop', '/fixture/project-a', 'session-b']),
    JSON.stringify(['desktop', '/fixture/project-b', 'session-a']),
  ].sort());
  assert.equal(exported.intelligenceDrafts[JSON.stringify(['desktop', '/fixture/project-a', 'session-a'])].practiceResponse, response);
  assertNotPersisted(textA, response, 'Synthetic desktop project A session B text.', 'Synthetic desktop project B session A text.');
});

test('desktop navigation loading has no editable Lab scope and returns to the correct retained draft', async () => {
  desktop.state = desktopState(); await mount({ desktopEnabled: true }); await openLab();
  const text = 'Synthetic desktop loading-safe draft.';
  await change(field('Conversation or customer message'), text);
  const recent = await navGroup('Recent');
  await click([...recent.querySelectorAll('button')].find(item => item.getAttribute('aria-current') !== 'true'));
  assert.deepEqual(desktopCalls, [{ kind: 'switchSession', id: 'session-b' }]);
  await rerender();
  await click(q('[aria-label="Message options and tools"]')); await chooseTool('intelligence');
  assert.equal(dialog().querySelector('.tay-intelligence-panel'), null);
  assert.match(dialog().textContent, /Wait for this conversation to load/);
  assert.equal(dialog().querySelectorAll('textarea, input, [aria-label="Intelligence lab mode"]').length, 0);
  assert.equal(dialog().textContent.includes(text), false);
  await chooseTool('memory'); await chooseTool('intelligence');
  assert.equal(dialog().querySelector('.tay-intelligence-panel'), null, 'tool switching cannot create an unscoped draft');
  desktop.state = desktopState('session-b'); await rerender();
  assert.equal(document.activeElement, q('.tay-sidecar-header h2'), 'loading-to-session transition focuses the unchanged Lab heading');
  assert.equal(field('Conversation or customer message').value, '');
  desktop.state = desktopState(); await rerender();
  assert.equal(field('Conversation or customer message').value, text);
  assert.equal(document.activeElement, q('.tay-sidecar-header h2'), 'restored session content is announced');
  field('Conversation or customer message').focus();
  desktop.state = null; await rerender();
  assert.equal(document.activeElement, q('.tay-sidecar-header h2'), 'focus leaves the removed customer field for loading status');
  assert.equal(dialog().querySelector('.tay-intelligence-panel'), null);
  assertNotPersisted(text);
});

test('desktop Lab remains uneditable when either project or session identifier is unavailable', async () => {
  desktop.state = desktopState(); await mount({ desktopEnabled: true }); await openLab();
  const text = 'Synthetic complete desktop scope draft.';
  await change(field('Conversation or customer message'), text);
  for (const unavailable of [
    { project: '', state: desktopState() },
    { project: '/fixture/project-a', state: desktopState('') },
  ]) {
    desktop.project = unavailable.project; desktop.state = unavailable.state; await rerender();
    assert.ok(!dialog().querySelector('.tay-intelligence-panel'), 'both desktop scope identifiers are required');
    assert.match(dialog().textContent, /Wait for this conversation to load/);
    assert.equal(dialog().querySelectorAll('textarea, input, [aria-label="Intelligence lab mode"]').length, 0);
    assert.equal(document.activeElement, q('.tay-sidecar-header h2'));
    await chooseTool('memory'); await chooseTool('intelligence');
    assert.ok(!dialog().querySelector('.tay-intelligence-panel'), 'reopening cannot create a draft under an empty scope');
    const exported = await exportWorkspace();
    assert.deepEqual(Object.keys(exported.intelligenceDrafts), [JSON.stringify(['desktop', '/fixture/project-a', 'session-a'])]);
    await chooseTool('intelligence');
    desktop.project = '/fixture/project-a'; desktop.state = desktopState(); await rerender();
    assert.equal(field('Conversation or customer message').value, text, 'returning to complete scope restores its untouched draft');
  }
  assertNotPersisted(text);
});

test('desktop new conversation starts fresh and restoring the old session recovers its Lab draft', async () => {
  desktop.state = desktopState(); await mount({ desktopEnabled: true }); await openLab();
  await change(field('Conversation or customer message'), 'Synthetic desktop original session draft.');
  await chooseMode('Learn');
  const nav = await navigation(); await click(button('＋ New conversation', nav)); await rerender();
  assert.deepEqual(desktopCalls, [{ kind: 'newSession' }]);
  await openLab(); assert.equal(activeMode(), 'Analyze'); assert.equal(field('Conversation or customer message').value, '');
  desktop.state = desktopState(); await rerender();
  assert.equal(activeMode(), 'Learn'); await chooseMode('Analyze');
  assert.equal(field('Conversation or customer message').value, 'Synthetic desktop original session draft.');
});

test('workspace export contains every live Lab draft when browser saves are paused and preserves the external record', async () => {
  seedWorkspace(); await mount(); await openLab();
  const firstId = currentWebConversation().id;
  const text = 'Synthetic live export customer text.';
  const response = 'Synthetic live export practice response.';
  await change(field('Conversation or customer message'), text); await chooseMode('Practice');
  await change(field('Practice scenario'), 'qualify-buyer'); await change(field('Your response'), response);
  await click(button('Score practice', lab()));
  const nav = await navigation(); await click(button('＋ New conversation', nav)); await openLab();
  const secondId = currentWebConversation().id;
  const secondText = 'Synthetic second live export customer text.';
  await change(field('Conversation or customer message'), secondText);
  const incoming = JSON.parse(localStorage.getItem(workspaceStorageKey));
  incoming.conversations[0].input = 'External fixture composer draft';
  const canonical = JSON.stringify(incoming);
  await act(async () => {
    localStorage.setItem(workspaceStorageKey, canonical);
    dom.window.dispatchEvent(new dom.window.StorageEvent('storage', { key: workspaceStorageKey, storageArea: localStorage }));
  });
  assert.match(q('.tay-notice').textContent, /Saves are paused/);
  await chooseMode('Integrate');
  const exported = await exportWorkspace();
  assert.equal(exported.originalRecord, canonical);
  assert.equal(localStorage.getItem(workspaceStorageKey), canonical);
  assert.deepEqual(exported.intelligenceDrafts[JSON.stringify(['web', 'transcenlutions', firstId])], {
    mode: 'practice', text, scenarioId: 'qualify-buyer', practiceResponse: response, submitted: true,
  });
  assert.deepEqual(exported.intelligenceDrafts[JSON.stringify(['web', 'transcenlutions', secondId])], {
    ...createConversationIntelligenceDraft(), text: secondText, mode: 'integrate',
  });
  assert.equal(Object.keys(exported.intelligenceDrafts).length, 2);
  assertNotPersisted(text, response, secondText);
});

for (const desktopEnabled of [false, true]) test(`fresh ${desktopEnabled ? 'desktop' : 'web'} workspace mount clears transient Lab data while ordinary workspace storage remains`, async () => {
  seedWorkspace();
  if (desktopEnabled) desktop.state = desktopState();
  await mount({ desktopEnabled }); await openLab();
  const text = `Synthetic fresh-mount ${desktopEnabled ? 'desktop' : 'web'} customer text.`;
  const response = 'Synthetic transient practice response for fresh mount.';
  await change(field('Conversation or customer message'), text); await chooseMode('Practice');
  await change(field('Practice scenario'), 'resolve-billing'); await change(field('Your response'), response);
  await click(button('Score practice', lab()));
  const storedBefore = localStorage.getItem(workspaceStorageKey); assert.ok(storedBefore);
  await unmount(); await mount({ desktopEnabled }); await openLab();
  assert.ok(localStorage.getItem(workspaceStorageKey), 'remount is not simulated by clearing browser storage');
  assert.equal(activeMode(), 'Analyze'); assert.equal(field('Conversation or customer message').value, '');
  await chooseMode('Practice'); assert.equal(field('Practice scenario').value, 'save-cancellation');
  assert.equal(field('Your response').value, ''); assert.equal(score(), null);
  const exported = await exportWorkspace();
  assert.equal(JSON.stringify(exported.intelligenceDrafts).includes(text), false);
  assert.equal(JSON.stringify(exported.intelligenceDrafts).includes(response), false);
  assertNotPersisted(text, response);
});

test('Lab stylesheet contract stays one column in narrow panels on wide screens; two columns require a wide named container (not pixel QA)', () => {
  const css = postcss.parse(fs.readFileSync(path.join(repo, 'app/tay-workspace.css'), 'utf8'));
  const rules = [];
  css.walkRules(rule => rules.push(rule));
  const hasSelector = (rule, selector) => rule.selector.split(',').map(item => item.trim()).includes(selector);
  const container = rules.find(rule => hasSelector(rule, '.tay-intelligence-panel') && rule.nodes.some(node => node.prop === 'container'));
  assert.ok(container, 'Lab declares its own inline-size container');
  assert.equal(container.nodes.find(node => node.prop === 'container').value, 'tay-intelligence / inline-size');
  for (const selector of ['.tay-intelligence-grid', '.tay-intelligence-lessons']) {
    const columns = rules.filter(rule => hasSelector(rule, selector)).flatMap(rule => rule.nodes
      .filter(node => node.type === 'decl' && node.prop === 'grid-template-columns').map(node => ({ rule, value: node.value })));
    const base = columns.filter(item => item.rule.parent.type === 'root');
    assert.ok(base.length); assert.match(base.at(-1).value, /^(?:1fr|minmax\(0, 1fr\))$/);
    const wide = columns.filter(item => /repeat\(2,/.test(item.value));
    assert.ok(wide.length, 'wide panels can use two columns');
    for (const { rule } of wide) {
      assert.equal(rule.parent.name, 'container', 'two-column rules must not use viewport media queries');
      assert.match(rule.parent.params, /^tay-intelligence\s+\(min-width:\s*34rem\)$/);
    }
    // Source-derived expected declaration. jsdom does not resolve container layout.
    const sourceColumns = (panelWidth, viewportWidth) => {
      let current;
      for (const item of columns) {
        const parent = item.rule.parent;
        if (parent.type === 'root') current = item.value;
        else if (parent.name === 'container') {
          const match = parent.params.match(/^tay-intelligence\s+\(min-width:\s*([\d.]+)(px|rem)\)$/);
          assert.ok(match, 'supported explicit named-container width condition');
          if (panelWidth >= Number(match[1]) * (match[2] === 'rem' ? 16 : 1)) current = item.value;
        } else assert.fail(`Unexpected ${parent.name} override at viewport ${viewportWidth}`);
      }
      return current;
    };
    for (const viewportWidth of [393, 900, 1280, 1920]) for (const panelWidth of [300, 320, 360, 420, 543]) {
      assert.match(sourceColumns(panelWidth, viewportWidth), /^(?:1fr|minmax\(0, 1fr\))$/, `${selector}: ${panelWidth}px panel / ${viewportWidth}px viewport`);
    }
    for (const panelWidth of [544, 600, 900]) assert.equal(sourceColumns(panelWidth, 1920), 'repeat(2, minmax(0, 1fr))');
  }
});
