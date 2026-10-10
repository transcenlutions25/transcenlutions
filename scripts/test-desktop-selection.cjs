/* Mounted tests of the actual useDesktopRuntime hook with deterministic fetch and
 * poll timers. Only synthetic fixtures are used. No desktop bridge, socket,
 * credentials, account data, or real network requests are accessed.
 */
const assert = require('node:assert/strict');
const { test, beforeEach, afterEach, after } = require('node:test');
const fs = require('node:fs');
const ts = require('typescript');
const { JSDOM } = require('jsdom');

const dom = new JSDOM('<!doctype html><html><body><div id="root"></div></body></html>', { url: 'https://desktop-selection-test.invalid/' });
for (const key of ['window', 'document', 'HTMLElement', 'Node', 'Event', 'MouseEvent', 'localStorage']) {
  Object.defineProperty(globalThis, key, { configurable: true, value: key === 'window' ? dom.window : dom.window[key] });
}
Object.defineProperty(globalThis, 'navigator', { configurable: true, value: dom.window.navigator });
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
const React = require('react');
const { act } = React;
const { createRoot } = require('react-dom/client');
const originalTs = require.extensions['.ts'];
require.extensions['.ts'] = (module, filename) => {
  const compiled = ts.transpileModule(fs.readFileSync(filename, 'utf8'), { fileName: filename,
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS, esModuleInterop: true },
  }).outputText;
  module._compile(compiled, filename);
};
const { useDesktopRuntime } = require('../lib/use-desktop-runtime.ts');
const originalFetch = globalThis.fetch;
const originalSetTimeout = globalThis.setTimeout;
const originalClearTimeout = globalThis.clearTimeout;
const timers = new Map();
let timerSequence = 0;
globalThis.setTimeout = (callback, delay, ...args) => {
  if (delay !== 2000) return originalSetTimeout(callback, delay, ...args);
  const id = { poll: ++timerSequence };
  timers.set(id, () => callback(...args));
  return id;
};
globalThis.clearTimeout = id => { if (!timers.delete(id)) originalClearTimeout(id); };
const forbiddenNetwork = [];
const rejectNetwork = label => { forbiddenNetwork.push(label); throw Error(`Real network is forbidden: ${label}`); };
dom.window.XMLHttpRequest = class { constructor() { rejectNetwork('XMLHttpRequest'); } };
dom.window.WebSocket = class { constructor() { rejectNetwork('WebSocket'); } };
const PROJECT = '/fixture/project';
const OTHER_PROJECT = '/fixture/other-project';
const SESSION = 'a'.repeat(32);
const OTHER_SESSION = 'b'.repeat(32);
const THIRD_SESSION = 'c'.repeat(32);
const STORAGE_KEY = 'tay:desktop-selection:v1';
let requests;
let runtime;
let root;
const host = document.getElementById('root');
const fixture = (session = SESSION, label = 'Initial fixture') => ({
  session_id: session, sessions: [{ id: SESSION, created: 1 }, { id: OTHER_SESSION, created: 2 }],
  items: [{ id: `fixture-${label}`, updated: 1, status: 'queued', pending_operation: null,
    payload: { message: label, agent_id: 'tay', thread_mode: 'chat', steering: [] } }],
  messages: [{ id: `message-${label}`, role: 'user', content: label, agent_id: 'tay' }], agents: [],
});
function Harness({ enabled = true }) {
  runtime = useDesktopRuntime(enabled);
  return React.createElement('div', null,
    React.createElement('button', { id: 'current-session', onClick: () => runtime.switchSession(runtime.state?.session_id || SESSION) }, 'Current session'),
    React.createElement('button', { id: 'current-project', onClick: () => runtime.switchProject(runtime.project) }, 'Current project'),
    React.createElement('output', null, runtime.state?.messages[0]?.content || 'Loading'));
}
const mount = async (enabled = true) => { root = createRoot(host); await act(async () => root.render(React.createElement(Harness, { enabled }))); };
const latest = () => requests.at(-1);
const answer = async (request, value, ok = true) => {
  assert.ok(request && !request.settled, 'Expected one outstanding fixture request');
  request.settled = true;
  await act(async () => { request.resolve({ ok, json: async () => value }); });
};
const fail = async (request, message) => {
  assert.ok(request && !request.settled);
  request.settled = true;
  await act(async () => request.reject(Error(message)));
};
const click = async (id, times = 1) => { await act(async () => {
  for (let index = 0; index < times; index++) document.getElementById(id).dispatchEvent(new MouseEvent('click', { bubbles: true }));
}); };
const poll = async () => {
  assert.equal(timers.size, 1, 'Exactly one active selection should keep polling');
  const [[id, callback]] = timers;
  timers.delete(id);
  await act(async () => { callback(); });
  assert.equal(latest().path, 'runtime/state');
  return latest();
};
const load = async () => {
  await mount();
  assert.equal(latest().path, 'state');
  assert.deepEqual(latest().body, {});
  await answer(latest(), { projects: [PROJECT, OTHER_PROJECT], project: PROJECT });
  assert.deepEqual(latest().body, { project: PROJECT });
  await answer(latest(), fixture());
  assert.deepEqual(latest().body, { project: PROJECT, session_id: SESSION });
  await answer(latest(), fixture());
  assert.equal(runtime.state.session_id, SESSION);
  assert.equal(timers.size, 1);
};
const selected = () => JSON.parse(localStorage.getItem(STORAGE_KEY));

beforeEach(() => {
  localStorage.clear(); timers.clear(); forbiddenNetwork.length = 0; requests = []; runtime = null;
  const fixtureFetch = (url, options) => {
    const match = /^\/api\/desktop\/(state|runtime\/(?:state|enqueue|command|new))$/.exec(String(url));
    if (!match) return rejectNetwork(String(url));
    assert.equal(options.method, 'POST');
    const body = JSON.parse(options.body);
    if (match[1] !== 'state') assert.ok([PROJECT, OTHER_PROJECT].includes(body.project), 'Synthetic project scope only');
    return new Promise((resolve, reject) => requests.push({ path: match[1], body, resolve, reject, settled: false }));
  };
  globalThis.fetch = fixtureFetch; dom.window.fetch = fixtureFetch;
});
afterEach(async () => {
  if (root) { await act(async () => root.unmount()); root = null; }
  assert.equal(timers.size, 0, 'Unmount disposes the current poll timer');
  assert.deepEqual(forbiddenNetwork, [], 'No real network access');
  host.replaceChildren();
});
after(() => {
  if (originalTs) require.extensions['.ts'] = originalTs; else delete require.extensions['.ts'];
  globalThis.fetch = originalFetch; globalThis.setTimeout = originalSetTimeout; globalThis.clearTimeout = originalClearTimeout;
  dom.window.close();
});

test('disabled hook performs no requests; initial load saves the selected conversation and keeps polling', async () => {
  await mount(false);
  assert.equal(requests.length, 0);
  await act(async () => root.unmount()); root = null;
  await load();
  assert.deepEqual(runtime.projects, [PROJECT, OTHER_PROJECT]);
  assert.deepEqual(selected(), { project: PROJECT, session: SESSION });
  const refreshed = fixture(SESSION, 'Fresh poll');
  await answer(await poll(), refreshed);
  assert.equal(runtime.state, refreshed);
  assert.equal(host.querySelector('output').textContent, 'Fresh poll');
});

for (const control of ['current-session', 'current-project']) {
  test(`repeated ${control} clicks preserve state and the existing poll`, async () => {
    await load();
    const before = runtime.state;
    const count = requests.length;
    const timer = [...timers.keys()][0];
    await click(control, 3);
    assert.equal(runtime.state, before);
    assert.equal(runtime.busy, false);
    assert.equal(requests.length, count, 'No unnecessary reload');
    assert.equal([...timers.keys()][0], timer, 'No polling restart for a no-op');
    const refreshed = fixture(SESSION, 'Updated after reselection');
    await answer(await poll(), refreshed);
    assert.equal(runtime.state, refreshed);
  });

  test(`${control} reselection during an in-flight poll does not discard its result`, async () => {
    await load();
    const inFlight = await poll();
    await click(control, 2);
    const refreshed = fixture(SESSION, 'In-flight poll accepted');
    await answer(inFlight, refreshed);
    assert.equal(runtime.state, refreshed);
    assert.equal(timers.size, 1);
  });

  test(`${control} reselection preserves serialized pending mutations and busy state`, async () => {
    await load();
    let first;
    let second;
    await act(async () => {
      first = runtime.enqueue('Synthetic request', 'tay', 'chat', '', 'fixture-request');
      second = runtime.command('fixture-objective', 'pause');
    });
    const mutation = latest();
    assert.equal(mutation.path, 'runtime/enqueue');
    assert.equal(runtime.busy, true);
    const before = runtime.state;
    await click(control, 3);
    assert.equal(runtime.state, before);
    assert.equal(runtime.busy, true);
    assert.equal(requests.filter(request => request.path === 'runtime/command').length, 0, 'Second mutation remains serialized');
    await answer(await poll(), fixture(SESSION, 'Stale poll during mutation'));
    assert.equal(runtime.state, before, 'Polling never overwrites an in-progress mutation');
    const firstResult = fixture(SESSION, 'First mutation complete');
    await answer(mutation, firstResult);
    assert.equal(await first, firstResult);
    assert.equal(runtime.state, firstResult);
    assert.equal(runtime.busy, true, 'Second mutation is still pending');
    assert.equal(latest().path, 'runtime/command');
    await click(control);
    const secondResult = fixture(SESSION, 'Second mutation complete');
    await answer(latest(), secondResult);
    assert.equal(await second, secondResult);
    assert.equal(runtime.state, secondResult);
    assert.equal(runtime.busy, false);
    const refreshed = fixture(SESSION, 'Poll after serialized mutations');
    await answer(await poll(), refreshed);
    assert.equal(runtime.state, refreshed);
  });
}

test('real session switch clears old state, rejects premature mutations and ignores stale poll success', async () => {
  await load();
  const stale = await poll();
  await act(async () => runtime.switchSession(OTHER_SESSION));
  const next = latest();
  assert.deepEqual(next.body, { project: PROJECT, session_id: OTHER_SESSION });
  assert.equal(runtime.state, null);
  await assert.rejects(runtime.enqueue('Wait for new conversation', 'tay', 'chat', '', 'fixture-loading'), /Wait for the selected conversation to load/);
  assert.equal(latest(), next, 'Loading selection cannot enqueue against the previous session');
  await answer(stale, fixture(SESSION, 'Obsolete session poll'));
  assert.equal(runtime.state, null);
  const updated = fixture(OTHER_SESSION, 'Selected other session');
  await answer(next, updated);
  assert.equal(runtime.state, updated);
  assert.deepEqual(selected(), { project: PROJECT, session: OTHER_SESSION });
  await answer(await poll(), fixture(OTHER_SESSION, 'Other session poll'));
  assert.equal(runtime.state.messages[0].content, 'Other session poll');
});

test('real project switch ignores stale errors and repeated new selection while loading keeps polling viable', async () => {
  await load();
  const stale = await poll();
  await act(async () => runtime.switchProject(OTHER_PROJECT));
  const next = latest();
  assert.deepEqual(next.body, { project: OTHER_PROJECT });
  assert.equal(runtime.state, null);
  await click('current-project', 3);
  await fail(stale, 'Old project unavailable');
  assert.equal(runtime.error, '');
  await answer(next, fixture(THIRD_SESSION, 'Other project loaded'));
  assert.deepEqual(latest().body, { project: OTHER_PROJECT, session_id: THIRD_SESSION });
  const updated = fixture(THIRD_SESSION, 'Other project current');
  await answer(latest(), updated);
  assert.equal(runtime.state, updated);
  assert.deepEqual(selected(), { project: OTHER_PROJECT, session: THIRD_SESSION });
  await answer(await poll(), fixture(THIRD_SESSION, 'Other project poll'));
  assert.equal(runtime.state.messages[0].content, 'Other project poll');
});

test('no-op selection preserves mutation errors and the next poll can recover', async () => {
  await load();
  let operation;
  await act(async () => { operation = runtime.command('fixture-objective', 'pause').catch(error => error); });
  await click('current-session');
  await answer(latest(), { error: 'Synthetic command denied' }, false);
  assert.equal((await operation).message, 'Synthetic command denied');
  assert.equal(runtime.error, 'Synthetic command denied');
  assert.equal(runtime.busy, false);
  await click('current-project');
  assert.equal(runtime.error, 'Synthetic command denied');
  await answer(await poll(), fixture(SESSION, 'Recovered after error'));
  assert.equal(runtime.error, '');
  assert.equal(runtime.state.messages[0].content, 'Recovered after error');
});

test('restored session reselection during initial loading retains the in-flight selection', async () => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ project: OTHER_PROJECT, session: OTHER_SESSION }));
  await mount();
  await answer(latest(), { projects: [PROJECT, OTHER_PROJECT], project: PROJECT });
  const restored = latest();
  assert.deepEqual(restored.body, { project: OTHER_PROJECT, session_id: OTHER_SESSION });
  await act(async () => { runtime.switchSession(OTHER_SESSION); runtime.switchProject(OTHER_PROJECT); });
  assert.equal(latest(), restored);
  const updated = fixture(OTHER_SESSION, 'Restored saved conversation');
  await answer(restored, updated);
  assert.equal(runtime.state, updated);
  assert.equal(timers.size, 1);
});

test('current selections cannot discard a pending new-conversation result or clear its busy state', async () => {
  await load();
  let creation;
  await act(async () => { creation = runtime.newSession(); });
  const mutation = latest();
  assert.equal(mutation.path, 'runtime/new');
  await click('current-session');
  await click('current-project');
  assert.equal(runtime.busy, true);
  assert.equal(runtime.state.session_id, SESSION);
  const created = fixture(THIRD_SESSION, 'Created conversation');
  await answer(mutation, created);
  assert.equal(await creation, created);
  assert.equal(runtime.state, created);
  assert.equal(runtime.busy, false);
  assert.deepEqual(latest().body, { project: PROJECT, session_id: THIRD_SESSION });
  await click('current-session', 2);
  await answer(latest(), created);
  assert.equal(runtime.state, created);
  assert.deepEqual(selected(), { project: PROJECT, session: THIRD_SESSION });
  await answer(await poll(), fixture(THIRD_SESSION, 'New conversation poll'));
  assert.equal(runtime.state.messages[0].content, 'New conversation poll');
});

for (const outcome of ['success', 'failure']) test(`real selection ignores a stale mutation ${outcome} and resumes polling once it settles`, async () => {
  await load();
  let mutationResult;
  await act(async () => { mutationResult = runtime.command('fixture-objective', 'pause').catch(error => error); });
  const mutation = latest();
  await act(async () => runtime.switchSession(OTHER_SESSION));
  const next = latest();
  await answer(next, fixture(OTHER_SESSION, 'Poll while old mutation is pending'));
  assert.equal(runtime.state, null, 'Pending mutation prevents early poll application');
  if (outcome === 'success') await answer(mutation, fixture(SESSION, 'Obsolete mutation result'));
  else await fail(mutation, 'Obsolete mutation error');
  await mutationResult;
  assert.equal(runtime.state, null, 'Old mutation cannot restore the prior session');
  assert.equal(runtime.error, '', 'Old mutation cannot report an error against the new session');
  const updated = fixture(OTHER_SESSION, 'Selection after old mutation settled');
  await answer(await poll(), updated);
  assert.equal(runtime.state, updated);
  assert.equal(runtime.busy, false);
  assert.deepEqual(selected(), { project: PROJECT, session: OTHER_SESSION });
});
