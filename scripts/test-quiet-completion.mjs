import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
const require = createRequire(import.meta.url);
const ts = require('typescript');
require.extensions['.ts'] = require.extensions['.tsx'] = (module, filename) => module._compile(ts.transpileModule(readFileSync(filename,'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true },
}).outputText, filename);
const { JSDOM } = require('jsdom');
const dom = new JSDOM('<div id="root"></div>', { url: 'http://localhost' });
globalThis.window = dom.window; globalThis.document = dom.window.document;
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
const React = require('react');
const { createRoot } = require('react-dom/client');
const { TaskCompletionNotices } = require('../components/task-completion-notices.tsx');
let id = 0; const timers = new Map();
window.setTimeout = (fn, delay) => { timers.set(++id, { fn, delay }); return id; };
window.clearTimeout = (id) => timers.delete(id);
const root = createRoot(document.getElementById('root'));
const past = { id: 'past', title: 'Past task', summary: 'Recorded history' };
const fresh = { id: 'fresh', title: 'Fresh task', summary: 'Actual saved result', nextStep: 'Read the artifact' };
function render(completed, ready = true, key = 'session') {
  React.act(() => root.render(React.createElement(TaskCompletionNotices, { key, completed, ready })));
}
function cards() { return document.querySelectorAll('.tay-completion-card').length; }
function click() { React.act(() => document.querySelector('.tay-completion-toggle').click()); }
function fire(delay) {
  const hit = [...timers].find(([, timer]) => timer.delay === delay);
  assert.ok(hit, `expected ${delay}ms timer`); timers.delete(hit[0]); React.act(() => hit[1].fn());
}
try {
  render([], false); render([past], true); assert.equal(cards(), 0, 'delayed first snapshot seeds history');
  render([past, fresh]); assert.equal(cards(), 1);
  render([past, fresh, fresh]); assert.equal(cards(), 1, 'polls are deduplicated');
  click(); assert.match(document.body.textContent, /Actual saved result/);
  assert.ok(![...timers.values()].some(t => t.delay === 8000), 'expanded results never auto-dismiss');
  click(); fire(8000); assert.ok(document.querySelector('.tay-completion-card--leaving'));
  fire(240); assert.equal(cards(), 0);
  render([past, fresh], true, 'reloaded-session'); assert.equal(cards(), 0, 'history does not replay on remount');
  console.log('Quiet completion DOM checks passed: delayed history, deduplication, real detail, expanded retention, dissolve, remount.');
} finally { React.act(() => root.unmount()); dom.window.close(); }
