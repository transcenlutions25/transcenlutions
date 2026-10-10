/* Mounted React/jsdom regression tests. DOM and mocked dimensions are not visual,
 * device keyboard, browser Back integration, pinch-zoom, or screen-reader QA.
 * Only service boundaries are stubbed; ChatShell, WorkspaceFrame, voice, action,
 * queue, runtime intent, persistence and writing components are the real modules.
 * No network requests, account data, credentials, or real desktop calls are used.
 */
const assert = require('node:assert/strict');
const { test, beforeEach, afterEach, after } = require('node:test');
const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');
const ts = require('typescript');
const { JSDOM } = require('jsdom');

const repo = path.resolve(__dirname, '..');
const dom = new JSDOM('<!doctype html><html><body><div id="root"></div></body></html>', {
  url: 'https://tay-test.invalid/', pretendToBeVisual: true,
});
for (const key of ['window', 'document', 'HTMLElement', 'Element', 'Node', 'Event', 'MouseEvent', 'KeyboardEvent', 'localStorage']) {
  Object.defineProperty(globalThis, key, { configurable: true, value: key === 'window' ? dom.window : dom.window[key] });
}
Object.defineProperty(globalThis, 'navigator', { configurable: true, value: dom.window.navigator });
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
const unexpectedNetwork = [];
const rejectNetwork = (...args) => { unexpectedNetwork.push(String(args[0])); throw new Error('Real network is forbidden in ChatShell tests'); };
globalThis.fetch = rejectNetwork;
dom.window.fetch = rejectNetwork;
dom.window.XMLHttpRequest = class { constructor() { rejectNetwork('XMLHttpRequest'); } };
dom.window.WebSocket = class { constructor() { rejectNetwork('WebSocket'); } };
const mediaQueries = [];
dom.window.matchMedia = (media) => {
  const listeners = new Set();
  const query = { media, get matches() { return /max-width:\s*900px/.test(media) && dom.window.innerWidth <= 900; },
    addEventListener: (_, fn) => listeners.add(fn), removeEventListener: (_, fn) => listeners.delete(fn),
    addListener: fn => listeners.add(fn), removeListener: fn => listeners.delete(fn), dispatch: () => listeners.forEach(fn => fn(query)) };
  mediaQueries.push(query);
  return query;
};
let mockScrollHeight = 44;
Object.defineProperty(dom.window.HTMLTextAreaElement.prototype, 'scrollHeight', { configurable: true, get: () => mockScrollHeight });
// Keep the six-second restore timer deterministic, without changing rAF/history timers.
const realSetTimeout = dom.window.setTimeout.bind(dom.window);
const realClearTimeout = dom.window.clearTimeout.bind(dom.window);
const restoreTimers = new Map();
let nextRestoreTimer = 100000;
dom.window.setTimeout = (fn, delay, ...args) => {
  if (delay === 6000) { const id = nextRestoreTimer++; restoreTimers.set(id, () => fn(...args)); return id; }
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
let graphEvents;
let policyCalls;
let policyResult;
let pendingDesktop;
let runtimeChannels;
Module._load = function (request, parent, isMain) {
  if (request === 'next/image') return { __esModule: true, default: ({ priority, ...props }) => React.createElement('img', props) };
  if (request === '../lib/use-desktop-runtime') return {
    useDesktopRuntime: () => desktop,
    callDesktop: (...args) => rejectNetwork(`unexpected callDesktop ${args[0]}`),
  };
  if (request.endsWith('agent-runtime')) {
    const actual = originalLoad.call(this, request, parent, isMain);
    return { ...actual, setRuntimeChannel: (runtime, channel) => { runtimeChannels.push(channel); return actual.setRuntimeChannel(runtime, channel); } };
  }
  if (request.endsWith('agent-policy-client')) return { requestAgentActionPolicy: async (...args) => { policyCalls.push(args); return policyResult; } };
  if (request.endsWith('operating-graph-client')) return {
    ...originalLoad.call(this, request, parent, isMain),
    recordOperatingGraphEvent: async event => { graphEvents.push(event); },
  };
  if (request.startsWith('@/')) request = path.join(repo, request.slice(2));
  return originalLoad.call(this, request, parent, isMain);
};
const { ChatShell } = require('../components/chat-shell.tsx');
const { createTayResponse } = require('../lib/tay-core.ts');
const { workspaceStorageKey } = require('../lib/workspace-state.ts');
const props = {
  deploymentReadiness: require('../lib/deployment-readiness.ts').createDeploymentReadinessState({}),
  launchReadiness: require('../lib/launch-readiness.ts').createLaunchReadinessState({}),
  revenueSetup: require('../lib/revenue-setup.ts').createRevenueSetupState({}),
};
let root;
let storageDocument;
const host = document.getElementById('root');
const q = (selector, within = host) => { const found = within.querySelector(selector); assert.ok(found, `Missing ${selector}`); return found; };
const buttons = (label, within = host) => [...within.querySelectorAll('button')].filter(button => button.textContent.trim() === label);
const button = (label, within = host) => { const found = buttons(label, within); assert.equal(found.length, 1, `Expected one button '${label}'`); return found[0]; };
const click = async element => { await act(async () => { element.dispatchEvent(new MouseEvent('click', { bubbles: true })); }); };
const change = async (element, value) => { await act(async () => {
  const prototype = element.tagName === 'TEXTAREA' ? dom.window.HTMLTextAreaElement.prototype : element.tagName === 'SELECT' ? dom.window.HTMLSelectElement.prototype : dom.window.HTMLInputElement.prototype;
  Object.getOwnPropertyDescriptor(prototype, 'value').set.call(element, value);
  element.dispatchEvent(new Event(element.tagName === 'SELECT' ? 'change' : 'input', { bubbles: true }));
}); };
const field = () => q('textarea[aria-label="Message Tay"]');
const send = () => q('.tay-send-button');
const form = () => q('form.tay-command-composer');
const dialog = () => { const panel = q('.tay-sidecar'); assert.notEqual(panel.getAttribute('aria-hidden'), 'true', 'workspace sidecar is open'); return panel; };
const state = () => { const saved = JSON.parse(localStorage.getItem(workspaceStorageKey)); return saved.conversations.find(item => item.id === saved.activeThreadId); };
const submit = async (count = 1) => { await act(async () => { for (let i = 0; i < count; i++) form().dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })); }); };
const key = async options => { await act(async () => { field().dispatchEvent(new KeyboardEvent('keydown', { bubbles: true, cancelable: true, key: 'Enter', ...options })); }); };
const controls = async () => { await click(q('[aria-label="Message options and tools"]')); return dialog(); };
const closeControls = async () => { await click(q('[aria-label="Close workspace panel"]', dialog())); };
const viewport = async (width, height = 844) => { await act(async () => {
  Object.defineProperty(dom.window, 'innerWidth', { configurable: true, value: width });
  Object.defineProperty(dom.window, 'innerHeight', { configurable: true, value: height });
  mediaQueries.forEach(query => query.dispatch());
  dom.window.dispatchEvent(new Event('resize'));
}); };
const mount = async (extra = {}) => { root = createRoot(host); await act(async () => root.render(React.createElement(ChatShell, { ...props, ...extra }))); };
const savedConversation = (overrides = {}) => ({
  id: 'fixture-conversation', title: 'Fixture conversation', projectId: 'transcenlutions', updated: 1,
  messages: [{ id: 'fixture-intro', role: 'tay', text: 'A restored fixture message', agentId: 'tay', contextAgentId: 'tay' }],
  queue: [], agentId: 'tay', mode: 'chat', input: 'Unsaved fixture draft', response: null, responseAgentId: 'tay',
  result: null, executionStatus: 'idle', logEntries: [], memoryEntries: [], feedbackEntries: [], ...overrides,
});
const save = conversation => localStorage.setItem(workspaceStorageKey, JSON.stringify({ version: 1,
  activeThreadId: conversation.id, conversations: [conversation], projects: [], pinned: [], momentum: [], momentumEnabled: false,
}));
const desktopState = (items = []) => ({ session_id: 'fixture-desktop-session', sessions: [], items, messages: [], agents: [] });
const desktopItem = (status = 'active') => ({ id: 'fixture-objective', updated: 1, status,
  payload: { message: 'Existing objective', agent_id: 'tay', thread_mode: 'chat', steering: [] }, pending_operation: null,
});

function serializedLocks() {
  const tails = new Map();
  return { request(name, options, callback) {
    const run = typeof options === 'function' ? options : callback;
    const next = (tails.get(name) || Promise.resolve()).then(() => run({ name, mode: 'exclusive' }));
    tails.set(name, next.catch(() => {}));
    return next;
  } };
}

function freshStorageContext(copySaved = false) {
  const saved = copySaved ? Object.entries(localStorage) : [];
  storageDocument?.window.close();
  storageDocument = new JSDOM('', { url: 'https://tay-test.invalid/' });
  const isolatedStorage = storageDocument.window.localStorage;
  for (const [key, value] of saved) isolatedStorage.setItem(key, value);
  Object.defineProperty(dom.window, 'localStorage', { configurable: true, value: isolatedStorage });
  Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: isolatedStorage });
}

beforeEach(async () => {
  // Each case is a fresh browser-storage context. Conflict drafts deliberately
  // survive component unmounts in one document; clearing storage is not a reload.
  freshStorageContext();
  Object.defineProperty(navigator, 'locks', { configurable: true, value: serializedLocks() });
  localStorage.clear(); unexpectedNetwork.length = 0; restoreTimers.clear(); mockScrollHeight = 44;
  desktopCalls = []; graphEvents = []; policyCalls = []; pendingDesktop = []; runtimeChannels = [];
  delete dom.window.SpeechRecognition; delete dom.window.webkitSpeechRecognition; delete dom.window.speechSynthesis;
  policyResult = { allowed: false, reason: 'Test authority denial; no execution' };
  const operation = kind => (...args) => { desktopCalls.push({ kind, args }); return new Promise((resolve, reject) => pendingDesktop.push({ resolve, reject })); };
  desktop = { state: null, busy: false, error: '', projects: ['/fixture/project'], project: '/fixture/project',
    enqueue: operation('enqueue'), command: operation('command'), newSession: operation('newSession'),
    switchSession: operation('switchSession'), switchProject: operation('switchProject'),
  };
  await viewport(393);
});
afterEach(async () => {
  if (root) { await act(async () => root.unmount()); root = null; }
  host.replaceChildren();
  storageDocument?.window.close();
  assert.deepEqual(unexpectedNetwork, [], 'All external calls must remain stubbed');
});
after(() => {
  Module._load = originalLoad;
  for (const [extension, original] of Object.entries(originalExtensions)) {
    if (original) require.extensions[extension] = original; else delete require.extensions[extension];
  }
  dom.window.close();
});

test('mobile header, plus, and voice open the genuine controls in WorkspaceFrame', async () => {
  await mount();
  assert.equal(q('.tay-mobile-agent-name').textContent, 'Tay');
  assert.equal(q('[aria-label="Conversation controls"]').getAttribute('aria-expanded'), 'false');
  await click(q('[aria-label="Conversation controls"]'));
  assert.equal(dialog().getAttribute('aria-label'), 'Conversation controls');
  assert.equal(q('[aria-label="Conversation controls"]').getAttribute('aria-expanded'), 'true');
  for (const selector of ['select[aria-label="Active agent"]', '[aria-label="Conversation mode"]', 'input[aria-label="Search conversation"]', '[aria-label="Send behavior"]', '[aria-label="Pin this conversation"]']) q(selector, dialog());
  for (const label of ['Preview', 'Browser', 'Agent & activity', 'Queue · 0 waiting', 'Tools & starting points', 'Voice controls']) button(label, dialog());
  await closeControls();
  await controls();
  assert.equal(dialog().getAttribute('aria-label'), 'Conversation controls');
  await closeControls();
  await click(q('[aria-label="Open voice controls"]'));
  assert.equal(dialog().getAttribute('aria-label'), 'Voice controls');
  assert.match(dialog().textContent, /Voice capture unavailable in this browser\. Typing is available\./);
  assert.equal(button('Speak request', dialog()).disabled, true);
  assert.equal(button('Read latest reply', dialog()).disabled, true);
});

test('drawer controls change actual agent, mode and pin state without discarding the composer draft', async () => {
  await mount();
  const draft = 'Keep this draft\nwith two lines';
  await change(field(), draft);
  await controls();
  await change(q('select[aria-label="Active agent"]', dialog()), 'dawn');
  await click(button('Plan', dialog()));
  await click(q('[aria-label="Pin this conversation"]', dialog()));
  assert.equal(state().agentId, 'dawn');
  assert.equal(state().mode, 'plan');
  assert.equal(q('[aria-label="Pin this conversation"]', dialog()).getAttribute('aria-pressed'), 'true');
  assert.equal(state().input, draft);
  await closeControls();
  assert.equal(field().value, draft);
  assert.equal(q('.tay-mobile-agent-name').textContent, 'Dawn');
  await controls();
  assert.equal(q('select[aria-label="Active agent"]', dialog()).value, 'dawn');
  assert.equal(button('Plan', dialog()).getAttribute('aria-pressed'), 'true');
});

test('textarea grows and shrinks using bounded measurements across mobile and desktop widths', async () => {
  await mount();
  for (const width of [320, 360, 393, 430, 900]) {
    mockScrollHeight = 44; await viewport(width);
    assert.equal(field().style.height, '44px', `${width}px compact baseline`);
    mockScrollHeight = 500; await change(field(), `Long draft at ${width}`);
    assert.equal(field().style.height, '120px', `${width}px compact height cap`);
    mockScrollHeight = 44; await change(field(), '');
    assert.equal(field().style.height, '44px', `${width}px clears back to one line`);
  }
  mockScrollHeight = 500; await viewport(393, 320);
  assert.equal(field().style.height, '80px', 'compact cap scales to a short mocked viewport');
  await viewport(1280, 900);
  assert.equal(field().style.height, '160px', 'desktop height cap');
  mockScrollHeight = 1; await change(field(), 'Desktop draft');
  assert.equal(field().style.height, '44px', 'desktop minimum');
});

test('idle Send proposes one move, pending actionable work honestly changes Send to Queue', async () => {
  await mount();
  assert.equal(send().getAttribute('aria-label'), 'Send');
  assert.equal(send().disabled, true);
  await change(field(), 'Build a fixture feature');
  assert.equal(send().disabled, false);
  await submit();
  assert.equal(state().messages.filter(message => message.role === 'user').length, 1);
  assert.equal(state().queue.length, 0);
  assert.equal(send().getAttribute('aria-label'), 'Queue');
  assert.match(q('.tay-mobile-send-reason').textContent, /proposed move needs review/);
  const proposal = q('[aria-label="Current proposed move"]');
  assert.ok(proposal.contains(q('.action-card')));
  assert.ok(proposal.contains(button('Dismiss proposed move')));
  await change(field(), 'A separate next objective');
  await submit();
  assert.equal(state().queue.length, 1);
  assert.equal(state().queue[0].text, 'A separate next objective');
  assert.equal(state().messages.filter(message => message.role === 'user').length, 1, 'queued work does not replace the proposal');
  assert.equal(policyCalls.length, 0, 'composing does not authorize execution');
});

for (const text of ['help', 'Delete all records']) test(`blocked/no-action response keeps Send: ${text}`, async () => {
  await mount();
  await change(field(), text); await submit();
  assert.equal(state().response.action.type, 'none');
  if (text.startsWith('Delete')) assert.equal(state().response.action.permissionStatus, 'blocked');
  assert.equal(send().getAttribute('aria-label'), 'Send');
  assert.equal(state().queue.length, 0);
  await change(field(), 'Build the next fixture'); await submit();
  assert.equal(state().queue.length, 0);
  assert.equal(state().messages.filter(message => message.role === 'user').length, 2);
});

test('explicit Queue routes to the persisted queue and controls expose the real queued objective', async () => {
  await mount(); await change(field(), 'Explicit fixture queue'); await controls();
  await click(button('Queue', q('[aria-label="Send behavior"]', dialog())));
  await closeControls();
  assert.equal(send().getAttribute('aria-label'), 'Queue');
  await submit();
  assert.equal(state().queue[0].text, 'Explicit fixture queue');
  assert.equal(state().response, null);
  await controls(); await click(button('Queue · 1 waiting', dialog()));
  assert.equal(dialog().getAttribute('aria-label'), 'Command queue');
  assert.match(q('.tay-queue-card', dialog()).textContent, /Explicit fixture queue/);
  await click(button('Start', dialog()));
  assert.equal(state().queue.length, 0);
  assert.equal(state().response.userText, 'Explicit fixture queue');
});

test('explicit Steer revises the proposed request rather than creating a queued objective', async () => {
  await mount(); await change(field(), 'Build a fixture feature'); await submit();
  await change(field(), 'Keep the scope small'); await controls();
  await click(button('Steer', q('[aria-label="Send behavior"]', dialog()))); await closeControls();
  assert.equal(send().getAttribute('aria-label'), 'Steer');
  await submit();
  assert.equal(state().response.userText, 'Build a fixture feature\nOwner steering: Keep the scope small');
  assert.equal(state().queue.length, 0);
  assert.equal(state().messages.filter(message => message.role === 'user').length, 2);
  assert.equal(field().value, '');
  assert.equal(send().getAttribute('aria-label'), 'Queue', 'new actionable proposal returns normal Send intent to Queue');
});

test('Enter honors IME and Shift; Alt+Enter queues; Ctrl+Enter cannot steer an absent proposal', async () => {
  await mount(); await change(field(), 'Keyboard fixture draft');
  await key({ shiftKey: true }); await key({ isComposing: true });
  assert.equal(state().response, null); assert.equal(field().value, 'Keyboard fixture draft');
  await key({ ctrlKey: true });
  assert.equal(state().response, null); assert.match(q('.tay-notice').textContent, /no unresolved proposal/);
  assert.equal(field().value, 'Keyboard fixture draft');
  await key({ altKey: true });
  assert.equal(state().queue[0].text, 'Keyboard fixture draft'); assert.equal(field().value, '');
});

for (const intent of ['send', 'queue', 'steer']) test(`same-batch duplicate ${intent} submissions have only one effect`, async () => {
  await mount();
  if (intent === 'steer') { await change(field(), 'Build a fixture feature'); await submit(); }
  await change(field(), `Duplicate ${intent} fixture`);
  if (intent !== 'send') { await controls(); await click(button(intent[0].toUpperCase() + intent.slice(1), q('[aria-label="Send behavior"]', dialog()))); await closeControls(); }
  const usersBefore = state().messages.filter(message => message.role === 'user').length;
  await submit(2);
  if (intent === 'queue') assert.equal(state().queue.length, 1);
  else assert.equal(state().messages.filter(message => message.role === 'user').length, usersBefore + 1);
});

test('restored draft survives notice dismissal and restore notice expires after its timer', async () => {
  save(savedConversation()); await mount();
  assert.equal(field().value, 'Unsaved fixture draft');
  assert.match(q('.tay-notice').textContent, /Conversation restored from this browser/);
  assert.equal(restoreTimers.size, 1);
  await click(q('[aria-label="Dismiss notice"]'));
  assert.equal(host.querySelector('.tay-notice'), null);
  assert.equal(field().value, 'Unsaved fixture draft');
  assert.equal(restoreTimers.size, 0, 'dismiss clears the restore timer');
  await act(async () => root.unmount()); root = null;
  await mount();
  assert.equal(restoreTimers.size, 1);
  await act(async () => { for (const fn of restoreTimers.values()) fn(); restoreTimers.clear(); });
  assert.equal(host.querySelector('.tay-notice'), null);
  assert.equal(field().value, 'Unsaved fixture draft');
});

test('interrupted-action restore notice persists until dismissed, and never replays work', async () => {
  save(savedConversation({ executionStatus: 'running', response: createTayResponse('Build a fixture feature') }));
  await mount();
  assert.match(q('.tay-notice').textContent, /previous action was interrupted/);
  assert.equal(restoreTimers.size, 0, 'important recovery notice does not auto-expire');
  assert.equal(policyCalls.length, 0); assert.equal(desktopCalls.length, 0);
  assert.equal(state().executionStatus, 'failed');
});

test('dismissal removes the proposed card and its button together; queued backlog stays explicit', async () => {
  await mount(); await change(field(), 'Build a fixture feature'); await submit();
  await change(field(), 'Preserve this draft while dismissing');
  await click(button('Dismiss proposed move'));
  assert.equal(host.querySelector('[aria-label="Current proposed move"]'), null);
  assert.equal(host.querySelector('.action-card'), null);
  assert.equal(field().value, 'Preserve this draft while dismissing');
  assert.equal(send().getAttribute('aria-label'), 'Send');
  assert.match(q('.tay-notice').textContent, /Nothing was executed/);
  assert.equal(policyCalls.length, 0);
});

test('desktop unloaded state keeps draft read-only and voice availability honest', async () => {
  await mount({ desktopEnabled: true });
  assert.equal(field().readOnly, true);
  assert.equal(send().disabled, true);
  await click(q('[aria-label="Open voice controls"]'));
  assert.match(dialog().textContent, /Voice will be available when this conversation is connected/);
  assert.equal(dialog().querySelector('.voice-controls'), null);
});

for (const active of [false, true]) test(`desktop ${active ? 'active Queue' : 'idle Send'} uses one enqueue and preserves a new draft during acceptance`, async () => {
  desktop.state = desktopState(active ? [desktopItem()] : []);
  await mount({ desktopEnabled: true });
  await change(field(), 'Desktop fixture request');
  assert.equal(send().getAttribute('aria-label'), active ? 'Queue' : 'Send');
  await submit(2);
  assert.equal(desktopCalls.length, 1); assert.equal(desktopCalls[0].kind, 'enqueue');
  assert.equal(desktopCalls[0].args[0], 'Desktop fixture request');
  assert.equal(desktopCalls[0].args[4].startsWith('request-'), true, 'request carries retry identifier');
  await change(field(), 'Newer draft during acceptance');
  await act(async () => pendingDesktop.shift().resolve());
  assert.equal(field().value, 'Newer draft during acceptance');
  assert.match(q('.tay-notice').textContent, /Objective saved in the Mac queue/);
});

test('desktop Steer calls the active objective once and does not enqueue', async () => {
  desktop.state = desktopState([desktopItem()]); await mount({ desktopEnabled: true });
  await change(field(), 'Desktop steering fixture'); await controls();
  await click(button('Steer', q('[aria-label="Send behavior"]', dialog()))); await closeControls();
  await submit(2);
  assert.deepEqual(desktopCalls, [{ kind: 'command', args: ['fixture-objective', 'steer', { text: 'Desktop steering fixture' }] }]);
  await act(async () => pendingDesktop.shift().resolve());
  assert.equal(field().value, '');
  assert.match(q('.tay-notice').textContent, /Steering saved/);
});

test('blocked actionable proposal preserves Send, including agent-governed refusal', async () => {
  await mount(); await controls();
  await change(q('select[aria-label="Active agent"]', dialog()), 'rory'); await closeControls();
  await change(field(), 'Build a fixture feature'); await submit();
  assert.equal(state().response.action.type, 'create_task');
  assert.equal(state().response.action.permissionStatus, 'blocked');
  assert.equal(send().getAttribute('aria-label'), 'Send');
  assert.equal(policyCalls.length, 0);
});

test('desktop acceptance settles the submit lock without leaving the next draft disabled', async () => {
  desktop.state = desktopState(); await mount({ desktopEnabled: true });
  await change(field(), 'First desktop objective'); await submit();
  // Model the bridge hook rendering busy=true, then busy=false just before its
  // returned Promise reaches the shell's acceptance/finally handlers.
  desktop.busy = true;
  await act(async () => root.render(React.createElement(ChatShell, { ...props, desktopEnabled: true })));
  assert.equal(send().disabled, true);
  await change(field(), 'Second desktop objective');
  desktop.busy = false;
  await act(async () => root.render(React.createElement(ChatShell, { ...props, desktopEnabled: true })));
  await submit();
  assert.equal(desktopCalls.length, 1, 'ref guard still blocks a new call until acceptance settles');
  await act(async () => pendingDesktop.shift().resolve());
  assert.equal(send().disabled, false, 'ref cleanup must not leave stale disabled UI');
  assert.equal(field().value, 'Second desktop objective');
  await submit();
  assert.equal(desktopCalls.length, 2, 'the next draft can submit after acceptance');
  assert.equal(desktopCalls[1].args[0], 'Second desktop objective');
  await act(async () => pendingDesktop.shift().resolve());
});

test('desktop failure retains its draft and retry identifier; error remains an alert', async () => {
  desktop.state = desktopState(); await mount({ desktopEnabled: true });
  await change(field(), 'Retry fixture request'); await submit();
  const firstRequestId = desktopCalls[0].args[4];
  await act(async () => {
    desktop.error = 'Fixture connection interrupted';
    pendingDesktop.shift().reject(new Error(desktop.error));
    root.render(React.createElement(ChatShell, { ...props, desktopEnabled: true }));
  });
  assert.equal(field().value, 'Retry fixture request');
  assert.equal(send().disabled, false);
  assert.equal(q('.tay-notice').getAttribute('role'), 'alert');
  assert.equal(q('.tay-notice').querySelector('[aria-label="Dismiss notice"]'), null);
  await submit();
  assert.equal(desktopCalls.length, 2);
  assert.equal(desktopCalls[1].args[4], firstRequestId, 'same request retry keeps its idempotency key');
  await act(async () => pendingDesktop.shift().resolve());
});

test('unreadable saved work stays preserved and exposes a persistent storage alert', async () => {
  const original = '{invalid fixture JSON';
  localStorage.setItem(workspaceStorageKey, original); await mount();
  assert.equal(q('.tay-notice').getAttribute('role'), 'alert');
  assert.match(q('.tay-notice').textContent, /original record was preserved/);
  assert.equal(q('.tay-notice').querySelector('[aria-label="Dismiss notice"]'), null);
  await change(field(), 'Current tab fixture draft');
  assert.equal(localStorage.getItem(workspaceStorageKey), original);
  assert.equal(field().value, 'Current tab fixture draft');
});

// Static author-rule cascade checks. This evaluates declared display/size rules
// in source order and selector specificity, not rendered layout or CSS pixels.
const postcss = require('postcss');
const selectorParser = require('postcss-selector-parser');
const layoutSource = fs.readFileSync(path.join(repo, 'app/layout.tsx'), 'utf8');
const cssFiles = [...layoutSource.matchAll(/import\s+["']([^"']+\.css)["']/g)].map(match => path.resolve(repo, 'app', match[1]));
const parsedCss = cssFiles.map(file => postcss.parse(fs.readFileSync(file, 'utf8'), { from: file }));
function specificity(selector) {
  const count = nodes => nodes.reduce((sum, node) => {
    if (node.type === 'id') sum[0]++;
    else if (node.type === 'class' || node.type === 'attribute') sum[1]++;
    else if (node.type === 'tag') sum[2]++;
    else if (node.type === 'pseudo') {
      if (node.value.startsWith('::')) sum[2]++;
      else if (node.value === ':where') { /* zero specificity */ }
      else if ([':is', ':not', ':has'].includes(node.value)) {
        const alternatives = node.nodes.map(alternative => count(alternative.nodes));
        const highest = alternatives.sort(compare).at(-1) || [0, 0, 0];
        highest.forEach((value, index) => { sum[index] += value; });
      } else sum[1]++;
    }
    return sum;
  }, [0, 0, 0]);
  return count(selectorParser().astSync(selector).nodes[0].nodes);
}
function compare(a, b) { for (let index = 0; index < a.length; index++) if (a[index] !== b[index]) return a[index] - b[index]; return 0; }
function applicable(rule, width) {
  for (let parent = rule.parent; parent; parent = parent.parent) {
    if (parent.type === 'atrule' && /keyframes$/.test(parent.name)) return false;
    if (parent.type !== 'atrule' || parent.name !== 'media') continue;
    const conditions = parent.params.split(',');
    if (!conditions.some(condition => {
      if (/print|prefers-|forced-colors|hover|pointer|orientation/.test(condition)) return false;
      const minimum = /min-width:\s*([\d.]+)px/.exec(condition);
      const maximum = /max-width:\s*([\d.]+)px/.exec(condition);
      return (!minimum || width >= Number(minimum[1])) && (!maximum || width <= Number(maximum[1]));
    })) return false;
  }
  return true;
}
function declaration(element, property, width, pseudo = '') {
  let winner = null;
  for (const sheet of parsedCss) sheet.walkRules(rule => {
    if (!applicable(rule, width)) return;
    for (const selector of rule.selectors) {
      if (pseudo && !selector.endsWith(pseudo)) continue;
      const subject = pseudo ? selector.slice(0, -pseudo.length) : selector;
      if (subject.includes('::') || !element.matches(subject)) continue;
      for (const item of rule.nodes) {
        if (item.type !== 'decl' || item.prop !== property) continue;
        const score = [item.important ? 1 : 0, ...specificity(selector)];
        if (!winner || compare(score, winner.score) >= 0) winner = { value: item.value, score };
      }
    }
  });
  return winner?.value;
}

test('static CSS cascade keeps one compact chat at all widths and assigns desktop work to the explicit third track', async () => {
  assert.equal(cssFiles.at(-2), path.join(repo, 'app/mobile-chat.css'), 'shared compact refinements follow the base sheets');
  assert.equal(cssFiles.at(-1), path.join(repo, 'app/writing-actions.css'), 'top-layer writing actions follow compact refinements');
  await mount();
  assert.equal(host.querySelectorAll('.tay-send-button').length, 1);
  for (const selector of ['.tay-command-tools', '.tay-composer-bottom', '.tay-voice-drawer', '.tay-composer-hint']) {
    assert.equal(host.querySelector(selector), null, `${selector} is removed rather than duplicated behind CSS`);
  }
  assert.equal(host.querySelector('[aria-label="Active agent"]'), null, 'advanced controls mount only in their sidecar');
  for (const width of [320, 360, 393, 430, 900, 901, 1180, 1440]) {
    const mobile = width <= 900;
    assert.equal(declaration(q('.tay-mobile-title'), 'display', width), 'flex', `${width}: compact title`);
    assert.equal(declaration(send(), 'display', width), 'flex');
    assert.equal(declaration(send(), 'min-height', width), '44px');
    assert.equal(declaration(field(), 'font-size', width), '16px');
    assert.equal(declaration(field(), 'max-height', width), mobile ? 'min(120px, 25dvh)' : 'min(160px, 25dvh)');
    assert.equal(declaration(q('.tay-queue-strip'), 'display', width), 'none', `${width}: idle queue chrome hidden`);
    if (mobile) assert.match(declaration(q('.tay-composer-dock'), 'padding', width), /safe-area-inset-bottom/);
    const app = q('.tay-app');
    for (const collapsed of [false, true]) for (const sidecar of [false, true]) {
      app.classList.toggle('tay-rail-collapsed', collapsed);
      app.classList.toggle('tay-sidecar-open', sidecar);
      assert.equal(declaration(q('.tay-work-area'), 'grid-column', width), mobile ? '1' : '3', `${width}: collapsed=${collapsed}, sidecar=${sidecar}`);
      if (!mobile) {
        assert.equal(declaration(q('.tay-rail'), 'grid-column', width), '1');
        assert.equal(declaration(q('.tay-rail-resizer'), 'grid-column', width), '2');
      }
    }
    app.classList.remove('tay-rail-collapsed', 'tay-sidecar-open');
  }
  await controls();
  assert.equal(host.querySelectorAll('[aria-label="Active agent"]').length, 1);
  assert.equal(host.querySelectorAll('[aria-label="Conversation mode"]').length, 1);
  assert.equal(host.querySelectorAll('[aria-label="Send behavior"]').length, 1);
  for (const width of [320, 360, 393, 430, 900]) {
    for (const element of [q('select[aria-label="Active agent"]', dialog()), q('select[aria-label="Workspace tool"]', dialog()), button('Voice controls', dialog())]) {
      assert.equal(declaration(element, 'min-height', width), '44px', `${width}: sidecar controls have declared touch minimum`);
    }
    assert.equal(declaration(q('select[aria-label="Active agent"]', dialog()), 'font-size', width), '16px');
  }
});

function fakeSpeech() {
  const sessions = [];
  const speech = { cancelCount: 0, speakCount: 0, cancel() { this.cancelCount++; }, speak() { this.speakCount++; } };
  dom.window.speechSynthesis = speech;
  dom.window.SpeechRecognition = class {
    constructor() { this.startCount = 0; this.abortCount = 0; sessions.push(this); }
    start() { this.startCount++; }
    abort() {
      this.abortCount++;
      this.callbacksAtAbort = { onresult: this.onresult, onend: this.onend, onerror: this.onerror };
      this.onend?.();
    }
  };
  return { sessions, speech };
}
async function browserBackInJsdom() {
  await act(async () => {
    await new Promise((resolve, reject) => {
      const timeout = realSetTimeout(() => reject(new Error('jsdom history did not emit popstate')), 1000);
      dom.window.addEventListener('popstate', () => { realClearTimeout(timeout); resolve(); }, { once: true });
      dom.window.history.back();
    });
  });
}
function assertSpeechStopped(fixture) {
  assert.equal(fixture.sessions.length, 1, 'only the visible control started a recognition session');
  assert.equal(fixture.sessions[0].startCount, 1);
  assert.equal(fixture.sessions[0].abortCount, 1, 'closing the voice surface aborts recognition');
  assert.deepEqual(fixture.sessions[0].callbacksAtAbort, { onresult: null, onend: null, onerror: null }, 'cleanup detaches callbacks before abort');
  assert.equal(runtimeChannels.at(-1), 'chat', 'runtime no longer claims voice listening');
  assert.ok(fixture.speech.cancelCount >= 2, 'start and unmount both cancel speech playback');
}

for (const exit of ['close X', 'Back', 'switch content']) test(`active voice stops on mobile ${exit}`, async () => {
  const fixture = fakeSpeech(); await mount();
  await change(field(), 'Draft before voice');
  await click(q('[aria-label="Open voice controls"]'));
  await click(button('Speak request', dialog()));
  assert.equal(button('Stop microphone', dialog()).getAttribute('aria-pressed'), 'true');
  assert.equal(runtimeChannels.at(-1), 'voice');
  if (exit === 'close X') await closeControls();
  else if (exit === 'Back') await browserBackInJsdom();
  else await change(q('[aria-label="Workspace tool"]', dialog()), 'controls');
  assertSpeechStopped(fixture);
  assert.equal(q('.tay-sidecar').querySelector('.voice-controls'), null, 'hidden or replaced voice UI is unmounted');
  assert.equal(field().value, 'Draft before voice');
  assert.equal(desktopCalls.length, 0); assert.equal(policyCalls.length, 0);
});

for (const exit of ['close X', 'maximize conversation', 'switch content']) test(`active desktop header voice stops on ${exit}`, async () => {
  const fixture = fakeSpeech(); await viewport(1280); await mount();
  assert.equal(host.querySelector('.voice-controls'), null, 'closed voice has no mounted capture controls');
  await change(field(), 'Desktop draft before voice');
  await click(q('[aria-label="Open voice controls"]'));
  assert.equal(host.querySelectorAll('.voice-controls').length, 1, 'only one visible voice instance exists');
  await click(button('Speak request', dialog()));
  assert.equal(runtimeChannels.at(-1), 'voice');
  if (exit === 'close X') await closeControls();
  else if (exit === 'maximize conversation') await click(q('[aria-label="Maximize conversation"]'));
  else await change(q('[aria-label="Workspace tool"]', dialog()), 'controls');
  assertSpeechStopped(fixture);
  assert.equal(host.querySelector('.voice-controls'), null);
  assert.equal(field().value, 'Desktop draft before voice');
});

test('accepted voice transcript appends to the draft and keeps composer focus after overlay restoration', async () => {
  const fixture = fakeSpeech(); await mount();
  await change(field(), 'Existing fixture draft\nSecond draft line');
  // jsdom does not lay out elements. Only mark the composer as a visible focus
  // target for the frame's restoration policy; this is not a layout assertion.
  Object.defineProperty(field(), 'getClientRects', { configurable: true, value: () => [{ width: 200, height: 44 }] });
  const opener = q('[aria-label="Open voice controls"]');
  opener.focus();
  await click(opener); await click(button('Speak request', dialog()));
  await act(async () => fixture.sessions[0].onresult({ results: [[{ transcript: 'Recognized fixture' }]] }));
  await act(async () => { await new Promise(resolve => dom.window.requestAnimationFrame(() => dom.window.requestAnimationFrame(resolve))); });
  assert.equal(field().value, 'Existing fixture draft\nSecond draft line\nRecognized fixture');
  assert.equal(state().input, field().value, 'appended transcript is also preserved in workspace state');
  assert.equal(q('.tay-sidecar').querySelector('.voice-controls'), null);
  assertSpeechStopped(fixture);
  assert.equal(document.activeElement, field(), 'overlay restoration cannot override the deliberate composer focus');
  assert.equal(desktopCalls.length, 0); assert.equal(policyCalls.length, 0, 'dictation does not submit or execute');
});

test('Steer left selected after dismissal is disabled with a visible explanation and recoverable draft', async () => {
  await mount(); await change(field(), 'Build a fixture feature'); await submit();
  await change(field(), 'Preserve steering draft'); await controls();
  await click(button('Steer', q('[aria-label="Send behavior"]', dialog()))); await closeControls();
  await click(button('Dismiss proposed move'));
  assert.equal(send().getAttribute('aria-label'), 'Steer');
  assert.equal(send().disabled, true);
  assert.equal(field().value, 'Preserve steering draft');
  assert.match(q('.tay-mobile-send-reason').textContent, /no unresolved proposal to steer.*Choose Send or Queue/i);
  for (const width of [320, 360, 393, 430, 900]) assert.equal(declaration(q('.tay-mobile-send-reason'), 'display', width), 'block');
  await controls();
  const options = q('[aria-label="Send behavior"]', dialog());
  assert.equal(button('Steer', options).disabled, true);
  await click(button('Send', options)); await closeControls();
  assert.equal(send().getAttribute('aria-label'), 'Send');
  assert.equal(send().disabled, false);
  assert.equal(field().value, 'Preserve steering draft');
});

for (const pending of [false, true]) test(`quick starting-point command preserves unrelated draft and reveals its ${pending ? 'queued result' : 'proposal'}`, async () => {
  await mount();
  if (pending) { await change(field(), 'Build an existing fixture'); await submit(); }
  const draft = 'Unrelated work in progress\nKeep this draft';
  await change(field(), draft); await controls();
  await click(button('Tools & starting points', dialog()));
  const quick = 'I am stuck and need a simple action plan.';
  await click(button(quick, dialog()));
  assert.equal(field().value, draft);
  assert.equal(state().input, draft);
  assert.equal(q('.tay-sidecar').getAttribute('aria-hidden'), 'true', 'successful command reveals conversation');
  if (pending) assert.equal(state().queue.at(-1).text, quick);
  else assert.equal(state().response.userText, quick);
  assert.equal(policyCalls.length, 0);
});

test('Queue Start preserves unrelated draft, removes only the started objective, and reveals proposal', async () => {
  const objective = { id: 'queue-fixture', text: 'Build a queued fixture', agentId: 'tay', mode: 'chat', paused: false };
  save(savedConversation({ queue: [objective] })); await mount();
  await change(field(), 'Unrelated draft before Queue Start');
  await controls(); await click(button('Queue · 1 waiting', dialog()));
  await click(button('Start', dialog()));
  assert.equal(field().value, 'Unrelated draft before Queue Start');
  assert.equal(state().input, field().value);
  assert.equal(state().queue.length, 0);
  assert.equal(state().response.userText, objective.text);
  assert.equal(q('.tay-sidecar').getAttribute('aria-hidden'), 'true');
  assert.ok(q('[aria-label="Current proposed move"]'));
  assert.equal(policyCalls.length, 0);
});

test('blocked Queue Start leaves queue/draft intact and puts feedback inside the open panel', async () => {
  const objective = { id: 'queue-fixture', text: 'Build the queued fixture', agentId: 'tay', mode: 'chat', paused: false };
  save(savedConversation({ queue: [objective], response: createTayResponse('Build the current fixture') })); await mount();
  await change(field(), 'Unrelated retained draft');
  await controls(); await click(button('Queue · 1 waiting', dialog()));
  await click(button('Start', dialog()));
  assert.equal(dialog().getAttribute('aria-label'), 'Command queue');
  assert.match(q('.tay-notice', dialog()).textContent, /Finish or dismiss the current proposed move/);
  assert.equal(host.querySelectorAll('.tay-notice').length, 1, 'feedback is not duplicated behind the panel');
  assert.equal(state().queue.length, 1);
  assert.equal(state().response.userText, 'Build the current fixture');
  assert.equal(field().value, 'Unrelated retained draft');
});

async function setConversationSearch(text) {
  await controls(); await change(q('[aria-label="Search conversation"]', dialog()), text); await closeControls();
}
function searchMessages() {
  return [
    { id: 'search-one', role: 'user', text: 'Alpha search fixture', contextAgentId: 'tay' },
    { id: 'search-two', role: 'tay', text: 'Beta response fixture', contextAgentId: 'tay', agentId: 'tay' },
  ];
}

test('active search shows its count, explicit empty state and Clear search without changing draft', async () => {
  save(savedConversation({ messages: searchMessages() })); await mount();
  await change(field(), 'Draft while searching');
  await setConversationSearch('ALPHA');
  assert.match(q('.tay-search-status').textContent, /1 messages match “ALPHA”/);
  assert.equal(host.querySelectorAll('.tay-message').length, 1);
  assert.equal(host.querySelector('.tay-no-results'), null);
  await setConversationSearch('NoSuchFixture');
  assert.match(q('.tay-search-status').textContent, /0 messages match/);
  assert.match(q('.tay-no-results').textContent, /No messages match this search/);
  assert.equal(host.querySelectorAll('.tay-message').length, 0);
  await click(button('Clear search'));
  assert.equal(host.querySelector('.tay-search-status'), null);
  assert.equal(host.querySelector('.tay-no-results'), null);
  assert.equal(host.querySelectorAll('.tay-message').length, 2);
  assert.equal(field().value, 'Draft while searching');
});

test('new and restored web conversations reset stale search filters', async () => {
  const current = savedConversation({ messages: searchMessages() });
  const target = savedConversation({ id: 'restore-target', title: 'Restore target fixture', input: 'Target restored draft',
    messages: [{ id: 'target-message', role: 'user', text: 'Target saved conversation', contextAgentId: 'tay' }] });
  localStorage.setItem(workspaceStorageKey, JSON.stringify({ version: 1, activeThreadId: current.id,
    conversations: [current, target], projects: [], pinned: [], momentum: [], momentumEnabled: false }));
  await mount(); await setConversationSearch('NoSuchFixture');
  await click(q('[aria-label="Open navigation"]')); await click(q('.tay-new-conversation'));
  assert.equal(host.querySelector('.tay-search-status'), null);
  assert.equal(host.querySelector('.tay-no-results'), null);
  assert.notEqual(state().id, current.id);
  assert.equal(host.querySelectorAll('.tay-message').length, 1);
  await setConversationSearch('NoSuchFixture');
  await click(q('[aria-label="Open navigation"]'));
  await click(button('Restore target fixture', q('.tay-navigation')));
  assert.equal(state().id, 'restore-target');
  assert.equal(host.querySelector('.tay-search-status'), null);
  assert.equal(host.querySelector('.tay-no-results'), null);
  assert.equal(q('.tay-message--user p').textContent, 'Target saved conversation');
  assert.equal(field().value, 'Target restored draft');
});

test('desktop session switch resets stale search while keeping the new session messages visible', async () => {
  desktop.state = { ...desktopState(), messages: [{ id: 'first-search', role: 'user', content: 'First desktop fixture', agent_id: 'tay' }] };
  await mount({ desktopEnabled: true }); await setConversationSearch('NoSuchFixture');
  assert.ok(q('.tay-no-results'));
  desktop.state = { ...desktopState(), session_id: 'second-fixture-session', messages: [{ id: 'second-search', role: 'user', content: 'Second desktop fixture', agent_id: 'tay' }] };
  await act(async () => root.render(React.createElement(ChatShell, { ...props, desktopEnabled: true })));
  assert.equal(host.querySelector('.tay-search-status'), null);
  assert.equal(host.querySelector('.tay-no-results'), null);
  assert.equal(q('.tay-message--user p').textContent, 'Second desktop fixture');
});

for (const detection of ['storage event', 'next guarded write']) test(`cross-tab conflict detected by ${detection} preserves canonical bytes and current draft`, async () => {
  await mount(); await change(field(), 'This tab current draft');
  const incoming = JSON.parse(localStorage.getItem(workspaceStorageKey));
  incoming.conversations[0].input = 'Other tab canonical draft';
  incoming.conversations[0].title = 'Other tab newer record';
  const canonical = JSON.stringify(incoming);
  await act(async () => {
    localStorage.setItem(workspaceStorageKey, canonical);
    if (detection === 'storage event') dom.window.dispatchEvent(new dom.window.StorageEvent('storage', {
      key: workspaceStorageKey, newValue: canonical, storageArea: localStorage, url: 'https://tay-test.invalid/other-tab',
    }));
  });
  await change(field(), 'This tab unsaved draft after conflict');
  assert.equal(localStorage.getItem(workspaceStorageKey), canonical, 'the other tab snapshot must not be overwritten');
  assert.equal(field().value, 'This tab unsaved draft after conflict');
  assert.equal(q('.tay-notice').getAttribute('role'), 'alert');
  assert.match(q('.tay-notice').textContent, /changed in another tab.*Saves are paused/);
  await click(button('Export options', q('.tay-notice')));
  assert.equal(dialog().getAttribute('aria-label'), 'Settings');
  assert.match(q('.tay-notice', dialog()).textContent, /changed in another tab/);
  assert.equal(button('Export workspace', dialog()).disabled, false);
  await change(field(), 'Still editable without canonical overwrite');
  assert.equal(localStorage.getItem(workspaceStorageKey), canonical);
  assert.equal(field().value, 'Still editable without canonical overwrite');
});

test('missing Web Locks fails closed with export options and preserves readable existing record', async () => {
  delete navigator.locks;
  save(savedConversation());
  const original = localStorage.getItem(workspaceStorageKey);
  await mount();
  assert.equal(field().value, 'Unsaved fixture draft');
  assert.match(q('.tay-notice').textContent, /cannot safely coordinate workspace saving/);
  assert.equal(q('.tay-notice').getAttribute('role'), 'alert');
  assert.ok(button('Export options', q('.tay-notice')));
  await change(field(), 'Edited only in this tab');
  assert.equal(localStorage.getItem(workspaceStorageKey), original);
  assert.equal(field().value, 'Edited only in this tab');
});

test('hydration preserves saved bytes, conversation order and timestamp until the first actual edit', async () => {
  const earlier = savedConversation({ id: 'earlier-fixture', title: 'Earlier fixture', updated: 91, input: 'Earlier draft' });
  const active = savedConversation({ id: 'active-fixture', title: 'Hydrated fixture objective', updated: 17,
    input: 'Previously saved active draft', messages: [{ id: 'hydrated-user', role: 'user', text: 'Hydrated fixture objective', contextAgentId: 'tay' }] });
  const record = { version: 1, activeThreadId: active.id, conversations: [earlier, active], projects: [], pinned: [], momentum: [], momentumEnabled: false };
  const original = JSON.stringify(record, null, 2);
  localStorage.setItem(workspaceStorageKey, original);
  const storagePrototype = Object.getPrototypeOf(localStorage);
  const setItemDescriptor = Object.getOwnPropertyDescriptor(storagePrototype, 'setItem');
  const writes = [];
  Object.defineProperty(storagePrototype, 'setItem', { ...setItemDescriptor, value(key, value) {
    if (key === workspaceStorageKey) writes.push(value);
    return setItemDescriptor.value.call(this, key, value);
  } });
  try {
    await mount();
    assert.equal(field().value, active.input);
    assert.equal(localStorage.getItem(workspaceStorageKey), original, 'merely opening a saved conversation must leave its exact bytes untouched');
    assert.equal(writes.length, 0, 'hydration is not a workspace write');
    await controls(); await closeControls();
    await click(q('[aria-label="Dismiss notice"]'));
    assert.equal(localStorage.getItem(workspaceStorageKey), original, 'opening controls or dismissing restore information does not dirty the workspace');
    assert.equal(writes.length, 0);
    const before = JSON.parse(localStorage.getItem(workspaceStorageKey));
    assert.deepEqual(before.conversations.map(item => item.id), [earlier.id, active.id]);
    assert.equal(before.conversations[1].updated, 17);
    await change(field(), 'First actual active draft edit');
    assert.ok(writes.length > 0, 'a real edit persists through the storage guard');
    const edited = JSON.parse(localStorage.getItem(workspaceStorageKey));
    const savedActive = edited.conversations.find(item => item.id === active.id);
    assert.equal(savedActive.input, 'First actual active draft edit');
    assert.ok(savedActive.updated > 17);
    assert.deepEqual(edited.conversations.find(item => item.id === earlier.id), earlier, 'editing the current conversation does not rewrite another conversation');
  } finally {
    Object.defineProperty(storagePrototype, 'setItem', setItemDescriptor);
  }
});

test('composer placeholder has explicit opaque, readable source colors at every supported width', async () => {
  await mount();
  function luminance(hex) {
    assert.match(hex || '', /^#[\da-f]{3}(?:[\da-f]{3})?$/i, 'contrast contract uses explicit solid hex colors');
    const normalized = hex.length === 4 ? hex.slice(1).split('').map(value => value + value).join('') : hex.slice(1);
    const linear = [0, 2, 4].map(offset => parseInt(normalized.slice(offset, offset + 2), 16) / 255)
      .map(value => value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4);
    return linear[0] * 0.2126 + linear[1] * 0.7152 + linear[2] * 0.0722;
  }
  for (const width of [320, 360, 393, 430, 900, 901, 1180, 1440]) {
    const foreground = declaration(field(), 'color', width, '::placeholder');
    const background = declaration(field(), 'background', width);
    assert.ok(foreground, `${width}: explicit placeholder color avoids platform-default low contrast`);
    assert.equal(declaration(field(), 'opacity', width, '::placeholder'), '1', `${width}: placeholder does not inherit UA opacity`);
    const values = [luminance(foreground), luminance(background)].sort((a, b) => a - b);
    const ratio = (values[1] + 0.05) / (values[0] + 0.05);
    assert.ok(ratio >= 4.5, `${width}: declared placeholder contrast ${ratio.toFixed(2)} must be at least 4.5:1`);
  }
});

test('conflict export includes the in-tab draft and the preserved external workspace record', async () => {
  await mount(); await change(field(), 'Local export fixture');
  const incoming = JSON.parse(localStorage.getItem(workspaceStorageKey));
  incoming.conversations[0].input = 'Remote export fixture';
  const canonical = JSON.stringify(incoming);
  await act(async () => {
    localStorage.setItem(workspaceStorageKey, canonical);
    dom.window.dispatchEvent(new dom.window.StorageEvent('storage', { key: workspaceStorageKey, storageArea: localStorage }));
  });
  await change(field(), 'Unsaved local export draft');
  await change(q('.writing-block__editor'), 'Unsaved prose for workspace export');
  const create = URL.createObjectURL;
  const revoke = URL.revokeObjectURL;
  const anchorClick = dom.window.HTMLAnchorElement.prototype.click;
  const captured = [];
  const downloads = [];
  URL.createObjectURL = blob => { captured.push(blob); return 'blob:fixture-export'; };
  URL.revokeObjectURL = () => {};
  dom.window.HTMLAnchorElement.prototype.click = function () { downloads.push(this.download); };
  try {
    await click(button('Export options', q('.tay-notice')));
    await click(button('Export workspace', dialog()));
    assert.equal(captured.length, 1);
    assert.deepEqual(downloads, ['tay-workspace-export.json']);
    const exported = JSON.parse(await captured[0].text());
    assert.equal(exported.conversations[0].input, 'Unsaved local export draft');
    assert.equal(exported.originalRecord, canonical);
    const writing = require('../lib/writing-block.ts');
    assert.ok(Object.values(exported.liveWriting).some(record => writing.writingBlockText(record) === 'Unsaved prose for workspace export'));
    assert.equal(localStorage.getItem(workspaceStorageKey), canonical);
  } finally {
    URL.createObjectURL = create; URL.revokeObjectURL = revoke;
    dom.window.HTMLAnchorElement.prototype.click = anchorClick;
  }
});

test('workspace conflict pauses writing-key saves and reload restores the newer external prose', async () => {
  const writing = require('../lib/writing-block.ts');
  await mount(); await change(field(), 'Workspace draft fixture');
  await change(q('.writing-block__editor'), 'Local prose before conflict');
  const writingKey = Object.keys(localStorage).find(key => key.startsWith('tay:writing-block:'));
  assert.ok(writingKey);
  const incoming = JSON.parse(localStorage.getItem(workspaceStorageKey));
  incoming.conversations[0].messages[0].text = 'Newer external prose';
  const canonical = JSON.stringify(incoming);
  const foreignWriting = JSON.stringify(writing.createWritingBlock('Newer external prose'));
  await act(async () => {
    localStorage.setItem(workspaceStorageKey, canonical);
    localStorage.setItem(writingKey, foreignWriting);
    dom.window.dispatchEvent(new dom.window.StorageEvent('storage', { key: workspaceStorageKey, storageArea: localStorage }));
  });
  await change(q('.writing-block__editor'), 'Local prose kept only in this tab');
  assert.equal(q('.writing-block__editor').value, 'Local prose kept only in this tab');
  assert.equal(localStorage.getItem(writingKey), foreignWriting);
  assert.equal(localStorage.getItem(workspaceStorageKey), canonical);
  assert.match(q('.writing-block__status').textContent, /not saved|saving paused/i);
  assert.doesNotMatch(q('.writing-block__status').textContent, /Saved on this device/);
  await act(async () => root.unmount()); root = null;
  freshStorageContext(true); // A real document reload discards only the in-memory recovery copies.
  await mount();
  assert.equal(q('.writing-block__editor').value, 'Newer external prose');
  assert.equal(localStorage.getItem(writingKey), foreignWriting);
  assert.equal(localStorage.getItem(workspaceStorageKey), canonical);
});

test('editing the same block in Library and conversation shares current prose without a false tab conflict', async () => {
  await mount();
  const originalEditor = q('.writing-block__editor');
  await change(originalEditor, 'Prose saved from conversation');
  await click(q('[aria-label="More actions for Tay writing"]'));
  await click(button('Save to Assets', document));
  await controls(); await change(q('[aria-label="Workspace tool"]', dialog()), 'assets');
  const assetEditor = q('.writing-block__editor', dialog());
  assert.notEqual(assetEditor, originalEditor);
  assert.equal(assetEditor.closest('[data-writing-block-id]').dataset.writingBlockId,
    originalEditor.closest('[data-writing-block-id]').dataset.writingBlockId);
  await change(assetEditor, 'Edited via library');
  assert.equal(originalEditor.value, 'Edited via library');
  await closeControls();
  await change(originalEditor, 'Edited original again');
  assert.doesNotMatch(host.textContent, /Saves are paused|Another tab changed/);
  await controls(); await change(q('[aria-label="Workspace tool"]', dialog()), 'assets');
  assert.equal(q('.writing-block__editor', dialog()).value, 'Edited original again');
  const writing = require('../lib/writing-block.ts');
  const writingKey = writing.writingBlockStorageKey(originalEditor.closest('[data-writing-block-id]').dataset.writingBlockId);
  const record = writing.decodeWritingBlockState(localStorage.getItem(writingKey));
  assert.equal(writing.writingBlockText(record), 'Edited original again');
  assert.equal(state().messages[0].text, 'Edited original again');
});
