import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { JSDOM, VirtualConsole } from 'jsdom';
import * as engine from '../../public/arcade/engine.mjs';

const PROGRESS_SLOT = 'transcenlutions.arcade.v1';
const html = await readFile(new URL('../../public/arcade/index.html', import.meta.url), 'utf8');
const appSource = await readFile(new URL('../../public/arcade/app.mjs', import.meta.url), 'utf8');
const moduleImport = /^import\s*\{([\s\S]*?)\}\s*from\s*['"]\.\/engine\.mjs['"];?/;
const match = appSource.match(moduleImport);
assert.ok(match, 'The UI must use the actual shared engine module.');
const bindings = match[1].split(',').map(binding => binding.trim().replace(/\s+as\s+/, ': ')).join(', ');
// jsdom does not run ES modules. Replace only the import statement with the
// same imported exports, then execute the otherwise unchanged production UI.
const executable = appSource.replace(moduleImport, `const { ${bindings} } = window.__arcadeEngine;`);

function savedStore(sessions = {}) {
  return {
    version: 1,
    settings: { sound: false, largeText: true, highContrast: false, reducedMotion: false },
    records: { gridBest: 0, runnerBest: 0, sortLevel: 1, orbitLevel: 1, completed: 0 },
    sessions, daily: {},
  };
}

function boot(t, { saved, url = 'https://arcade.example/arcade/', blockedStorage = false } = {}) {
  const errors = [], virtualConsole = new VirtualConsole();
  virtualConsole.on('jsdomError', error => errors.push(error.message));
  const dom = new JSDOM(html, { url, runScripts: 'outside-only', pretendToBeVisual: true, virtualConsole });
  const w = dom.window, d = w.document;
  w.__arcadeEngine = engine;
  w.matchMedia = () => ({ matches: false });
  w.scrollTo = () => {};
  Object.defineProperty(w.crypto, 'getRandomValues', { value: array => { array.fill(73); return array; } });
  w.HTMLDialogElement.prototype.showModal = function () { this.setAttribute('open', ''); this.querySelector('button')?.focus(); };
  w.HTMLDialogElement.prototype.close = function () { this.removeAttribute('open'); };
  let clock = 1000, frameId = 0;
  const frames = new Map();
  w.requestAnimationFrame = callback => { const id = ++frameId; frames.set(id, callback); return id; };
  w.cancelAnimationFrame = id => frames.delete(id);
  if (saved !== undefined) w.localStorage.setItem(PROGRESS_SLOT, typeof saved === 'string' ? saved : JSON.stringify(saved));
  if (blockedStorage) {
    w.Storage.prototype.getItem = () => { throw new Error('Storage access denied'); };
    w.Storage.prototype.setItem = () => { throw new Error('Storage access denied'); };
  }
  w.addEventListener('error', event => { errors.push(event.error?.stack || event.message); event.preventDefault(); });
  w.eval(executable);
  t.after(() => { w.close(); assert.deepEqual(errors, [], 'No production UI exceptions or jsdom errors.'); });
  const get = selector => { const element = d.querySelector(selector); assert.ok(element, `Missing UI element: ${selector}`); return element; };
  return {
    w, d, get,
    click: selector => get(selector).click(),
    modalAction(label) {
      const element = [...d.querySelectorAll('#modal-actions button')].find(button => button.textContent === label);
      assert.ok(element, `Missing modal action: ${label}`); element.click();
    },
    stored: () => JSON.parse(w.localStorage.getItem(PROGRESS_SLOT)),
    key(key, { code = '', target = d.activeElement } = {}) {
      const event = new w.KeyboardEvent('keydown', { key, code, bubbles: true, cancelable: true });
      target.dispatchEvent(event); return event;
    },
    frame(milliseconds = 100) {
      clock += milliseconds; const pending = [...frames.values()]; frames.clear();
      for (const callback of pending) callback(clock);
    },
    visibility(hidden) {
      Object.defineProperty(d, 'hidden', { configurable: true, value: hidden });
      d.dispatchEvent(new w.Event('visibilitychange'));
    },
    pendingFrames: () => frames.size,
  };
}

test('Home exposes all four working play journeys and returns cleanly through navigation', t => {
  const app = boot(t);
  assert.equal(app.get('#home-view').hidden, false);
  assert.equal(app.get('#game-view').hidden, true);
  assert.equal(app.d.querySelectorAll('[data-play]').length, 4);
  for (const [kind, title, board] of [
    ['grid', 'Crown Grid', '.grid-board'], ['sort', 'Prism Sort', '.tube-board'],
    ['orbit', 'Orbit Link', '.orbit-board'], ['runner', 'Lumen Run', '.run-track'],
  ]) {
    app.click(`[data-play="${kind}"]`);
    assert.equal(app.get('#game-title').textContent, title);
    assert.equal(app.get('#home-view').hidden, true);
    assert.equal(app.get('#game-view').hidden, false);
    app.get(board);
    app.click('#back-home');
    assert.equal(app.get('#home-view').hidden, false);
    assert.equal(app.pendingFrames(), 0);
  }
  assert.deepEqual(Object.keys(app.stored().sessions).sort(), ['grid', 'orbit', 'runner', 'sort']);
  assert.ok([...app.d.querySelectorAll('[data-play]')].every(button => button.textContent.includes('Continue')));
  // The persistent Home button gets one replaceable handler, not another
  // listener on every render that would multiply repeated navigation work.
  for (let i = 0; i < 4; i++) { app.click('[data-nav="grid"]'); app.click('[data-nav="home"]'); }
  assert.equal(app.get('#home-view').hidden, false);
});

test('Crown Grid selects, rotates, places, undoes, and saves through real controls', t => {
  const initial = engine.createGrid(0);
  initial.tray = [
    { id: 'angle', color: 1, cells: [[0, 0], [1, 0], [1, 1]] },
    { id: 'single-b', color: 2, cells: [[0, 0]] },
    { id: 'single-c', color: 3, cells: [[0, 0]] },
  ];
  const app = boot(t, { saved: savedStore({ grid: initial }) });
  app.click('[data-play="grid"]');
  assert.equal(app.get('#undo').disabled, true);
  app.click('[data-piece="0"]');
  app.click('#rotate');
  assert.match(app.get('#game-message').textContent, /90 degrees/);
  app.click('[data-cell="0"]');
  const placed = app.stored().sessions.grid;
  assert.deepEqual(placed.board.flatMap((cell, index) => cell ? [index] : []), [0, 1, 8]);
  assert.equal(placed.score, 30);
  assert.equal(placed.tray[0], null);
  assert.equal(app.get('#undo').disabled, false);
  app.click('#undo');
  assert.ok(app.stored().sessions.grid.board.every(cell => cell === 0));
  assert.deepEqual(app.stored().sessions.grid.tray[0], initial.tray[0]);
  app.click('[data-cell="0"]');
  app.key('ArrowRight', { target: app.get('[data-cell="0"]') });
  assert.equal(app.d.activeElement.dataset.cell, '1');
  app.click('#game-save');
  assert.equal(app.get('#home-view').hidden, false);
  assert.equal(app.stored().sessions.grid.score, 30);
  app.click('[data-play="grid"]');
  assert.equal(app.stored().sessions.grid.seed, 0);
  assert.equal(app.d.querySelectorAll('.grid-cell.filled').length, 3);
});

test('Prism Sort labels match engine symbols and its known solution works through tube clicks', t => {
  const initial = engine.createSort(1, 0);
  const app = boot(t, { saved: savedStore({ sort: initial }) });
  app.click('[data-play="sort"]');
  for (const token of engine.SORT_COLORS) {
    assert.ok(app.get('#note-extra').textContent.includes(token.label));
    assert.ok(app.get('#note-extra').textContent.includes(token.symbol));
  }
  const firstTube = app.get('[data-tube="0"]');
  assert.ok(firstTube.getAttribute('aria-label').includes(engine.SORT_COLORS[initial.tubes[0].at(-1)].label));
  app.click('[data-tube="4"]');
  assert.match(app.get('#game-message').textContent, /Choose a tube with a color/);
  for (const move of initial.solution) {
    app.click(`[data-tube="${move.from}"]`);
    app.click(`[data-tube="${move.to}"]`);
  }
  const solved = app.stored().sessions.sort;
  assert.equal(solved.solved, true);
  assert.equal(solved.moves, initial.solution.length);
  assert.equal(app.get('#modal').open, true);
  assert.match(app.get('#modal-title').textContent, /Everything in its place/);
  assert.equal(app.stored().records.sortLevel, 2);
  app.modalAction('Next level');
  assert.equal(app.stored().sessions.sort.level, 2);
  assert.equal(app.stored().sessions.sort.solved, false);
  assert.equal(app.get('#next-level').disabled, true);
});

test('Prism Sort restart keeps the exact seed-zero arrangement and Undo restores a pour', t => {
  const initial = engine.createSort(2, 0);
  const app = boot(t, { saved: savedStore({ sort: initial }) });
  app.click('[data-play="sort"]');
  const move = initial.solution[0];
  app.click(`[data-tube="${move.from}"]`); app.click(`[data-tube="${move.to}"]`);
  assert.equal(app.stored().sessions.sort.moves, 1);
  app.click('#undo');
  assert.deepEqual(app.stored().sessions.sort.tubes, initial.tubes);
  app.click(`[data-tube="${move.from}"]`); app.click(`[data-tube="${move.to}"]`);
  app.click('#restart'); app.modalAction('Restart level');
  assert.deepEqual(app.stored().sessions.sort.tubes, initial.tubes);
  assert.equal(app.stored().sessions.sort.seed, 0);
  assert.equal(app.stored().sessions.sort.moves, 0);
});

test('Orbit Link fixed tiles, rotation Undo, full connection, and next level work in the UI', t => {
  const initial = engine.createOrbit(3, 17);
  const app = boot(t, { saved: savedStore({ orbit: initial }) });
  app.click('[data-play="orbit"]');
  app.click('[data-pipe="0"]');
  assert.equal(app.stored().sessions.orbit.moves, 0);
  assert.match(app.get('#game-message').textContent, /fixed/);
  const first = initial.tiles.findIndex(tile => !tile.fixed);
  app.click(`[data-pipe="${first}"]`); app.click('#undo');
  assert.equal(app.stored().sessions.orbit.tiles[first].rotation, initial.tiles[first].rotation);
  let current = app.stored().sessions.orbit;
  for (let index = 0; index < 25 && !current.solved; index++) {
    if (current.tiles[index].fixed) continue;
    while (!current.solved && current.tiles[index].rotation !== current.solution[index]) {
      app.click(`[data-pipe="${index}"]`); current = app.stored().sessions.orbit;
    }
  }
  assert.equal(current.solved, true);
  assert.ok(app.get('[data-pipe="24"]').classList.contains('connected'));
  assert.equal(app.get('#modal').open, true);
  app.modalAction('Next level');
  assert.equal(app.stored().sessions.orbit.level, 4);
  assert.equal(app.stored().sessions.orbit.solved, false);
});

test('Lumen Run starts, responds to keys, pauses, and stays paused after backgrounding', t => {
  const app = boot(t);
  app.click('[data-play="runner"]');
  assert.equal(app.pendingFrames(), 0);
  app.click('#run-cover button');
  assert.equal(app.get('#run-cover').hidden, true);
  assert.equal(app.d.activeElement, app.get('#game-stage'));
  app.frame(16); app.frame(100);
  app.key('ArrowRight');
  assert.ok(parseFloat(app.get('#run-player').style.left) > 80);
  const pause = app.key(' ', { code: 'Space' });
  assert.equal(pause.defaultPrevented, true);
  assert.equal(app.get('#run-cover').hidden, false);
  const pausedDistance = app.stored().sessions.runner.distance;
  assert.ok(pausedDistance > 0);
  app.frame(1000);
  assert.equal(app.stored().sessions.runner.distance, pausedDistance);
  app.key(' ', { code: 'Space' }); app.frame(16); app.frame(100);
  app.visibility(true);
  const backgroundDistance = app.stored().sessions.runner.distance;
  assert.ok(backgroundDistance > pausedDistance);
  assert.equal(app.pendingFrames(), 0);
  app.visibility(false); app.frame(1000);
  assert.equal(app.pendingFrames(), 0);
  assert.equal(app.get('#run-cover').hidden, false);
  app.click('#run-cover button'); app.frame(16); app.frame(100);
  app.w.dispatchEvent(new app.w.Event('pagehide'));
  assert.equal(app.pendingFrames(), 0);
  assert.equal(app.get('#run-cover').hidden, false);
  app.click('#back-home');
  assert.equal(app.get('#home-view').hidden, false);
});

test('Runner Space on a focused button preserves native activation without double toggling', t => {
  const app = boot(t);
  app.click('[data-play="runner"]');
  const start = app.get('#run-cover button'); start.focus();
  const space = app.key(' ', { code: 'Space', target: start });
  assert.equal(space.defaultPrevented, false);
  // jsdom does not synthesize native keyboard button clicks; explicitly invoke
  // the click that a real browser dispatches after this unhandled Space.
  start.click();
  assert.equal(app.get('#run-cover').hidden, true);
  assert.equal(app.pendingFrames(), 1);
  app.click('#run-pause');
  assert.equal(app.pendingFrames(), 0);
  assert.equal(app.get('#run-cover').hidden, false);
});

test('Settings persist, pause an active runner, and restore in a fresh document', t => {
  const app = boot(t);
  app.click('[data-play="runner"]'); app.click('#run-cover button');
  app.click('#settings-open');
  assert.equal(app.pendingFrames(), 0);
  const contrast = app.get('[data-setting="highContrast"]');
  contrast.checked = true; contrast.dispatchEvent(new app.w.Event('change', { bubbles: true }));
  const motion = app.get('[data-setting="reducedMotion"]');
  motion.checked = true; motion.dispatchEvent(new app.w.Event('change', { bubbles: true }));
  assert.ok(app.d.body.classList.contains('high-contrast'));
  assert.ok(app.d.body.classList.contains('reduce-motion'));
  const restored = boot(t, { saved: app.stored() });
  assert.ok(restored.d.body.classList.contains('high-contrast'));
  assert.ok(restored.d.body.classList.contains('reduce-motion'));
  restored.click('[data-play="runner"]');
  assert.equal(restored.pendingFrames(), 0);
  assert.equal(restored.get('#run-cover').hidden, false);
});

test('Full uint32 seeds/RNG restore correctly and corrupt state is rejected without stopping play', t => {
  const grid = engine.createGrid(0xffffffff); grid.rng = 0xffffffff;
  const runner = { ...engine.createRunner(0xffffffff), rng: 0xffffffff, distance: 12, time: 1, energy: 1, score: 37 };
  const app = boot(t, { saved: savedStore({ grid, runner }) });
  assert.match(app.get('[data-play="grid"]').textContent, /Continue/);
  assert.match(app.get('[data-play="runner"]').textContent, /Continue/);
  app.click('[data-play="grid"]');
  assert.equal(app.stored().sessions.grid.rng, 0xffffffff);
  app.click('#back-home'); app.click('[data-play="runner"]');
  assert.equal(app.stored().sessions.runner.score, 37);
  assert.equal(app.stored().sessions.runner.rng, 0xffffffff);

  const badGrid = engine.createGrid(4); badGrid.tray[0].cells = [[0, 0], [0, 0]];
  const badSort = engine.createSort(1, 1); badSort.solution = [{ from: 99, to: 0 }];
  const badOrbit = engine.createOrbit(1, 1); badOrbit.tiles[0].fixed = false;
  const badRunner = engine.createRunner(1); delete badRunner.energy;
  const corrupt = boot(t, { saved: savedStore({ grid: badGrid, sort: badSort, orbit: badOrbit, runner: badRunner }) });
  assert.ok([...corrupt.d.querySelectorAll('[data-play]')].every(button => button.textContent.includes('Play game')));
  corrupt.click('[data-play="runner"]'); corrupt.click('#run-cover button'); corrupt.frame(16); corrupt.frame(100); corrupt.click('#run-pause');
  assert.ok(Number.isFinite(corrupt.stored().sessions.runner.score));
  const malformed = boot(t, { saved: '{"version":1,"sessions":' });
  malformed.click('[data-play="sort"]');
  assert.equal(malformed.d.querySelectorAll('[data-tube]').length, 6);
});

test('Blocked storage leaves play usable and reports the failed save truthfully', t => {
  const app = boot(t, { blockedStorage: true });
  app.click('[data-play="grid"]');
  assert.match(app.get('#toast').textContent, /could not save progress/);
  app.click('[data-cell="0"]');
  assert.ok(app.d.querySelectorAll('.grid-cell.filled').length > 0);
  assert.ok(Number(app.get('.stat-value').textContent.replace(/,/g, '')) > 0);
});

test('Both puzzles cap at level 100, offer a fresh challenge, and preserve completion across restores', t => {
  let sort = engine.createSort(100, 73);
  for (const move of sort.solution) sort = engine.applySort(sort, move);
  const orbit = engine.createOrbit(100, 73);
  orbit.tiles = orbit.tiles.map(tile => ({ ...tile, rotation: 0 }));
  Object.assign(orbit, engine.orbitConnections(orbit));
  for (const [kind, solved] of [['sort', sort], ['orbit', orbit]]) {
    const saved = savedStore({ [kind]: solved });
    saved.records[kind + 'Level'] = 100;
    saved.records.completed = 99;
    const app = boot(t, { saved });
    app.click(`[data-play="${kind}"]`);
    assert.equal(app.stored().records[kind + 'Level'], 100);
    assert.equal(app.stored().records[kind + 'Complete'], 1);
    assert.equal(app.stored().records.completed, 100);
    assert.match(app.get('#game-mode').textContent, /LEVEL 100 · TOP LEVEL/);
    assert.match(app.get('#modal-body').textContent, /highest level/);
    assert.equal(app.get('#next-level').textContent, 'New challenge');
    app.modalAction('Enjoy the board'); app.click('#back-home');
    app.click(`[data-play="${kind}"]`);
    assert.equal(app.stored().records.completed, 100, 'Restoring a completed board must not count it twice.');
    app.modalAction('New challenge');
    const fresh = app.stored().sessions[kind];
    assert.equal(fresh.level, 100);
    assert.equal(fresh.solved, false);
    assert.notEqual(fresh.seed, solved.seed, 'A repeated RNG seed must still produce a fresh challenge.');
    assert.equal(app.get('#next-level').disabled, true);
    const reopened = boot(t, { saved: app.stored() });
    reopened.click(`[data-play="${kind}"]`);
    assert.equal(reopened.stored().records[kind + 'Level'], 100);
    assert.equal(reopened.stored().records[kind + 'Complete'], 1);
    assert.equal(reopened.stored().records.completed, 100);
    // Migrate the original UI's 101 marker without losing a recorded finish.
    const legacy = savedStore({ [kind]: solved });
    legacy.records[kind + 'Level'] = 101; legacy.records.completed = 100;
    const migrated = boot(t, { saved: legacy });
    migrated.click(`[data-play="${kind}"]`);
    assert.equal(migrated.stored().records[kind + 'Level'], 100);
    assert.equal(migrated.stored().records[kind + 'Complete'], 1);
    assert.equal(migrated.stored().records.completed, 100);
  }
});

test('Android progress export offers selectable JSON and honest clipboard fallback', async t => {
  const app = boot(t, { url: 'https://appassets.androidplatform.net/assets/arcade/index.html' });
  app.click('[data-play="grid"]'); app.click('[data-cell="0"]'); app.click('#back-home');
  app.click('#progress-open'); app.modalAction('Export progress');
  const field = app.get('#progress-export');
  assert.equal(field.readOnly, true);
  assert.equal(JSON.parse(field.value).sessions.grid.kind, 'grid');
  app.modalAction('Select progress');
  assert.equal(field.selectionStart, 0);
  assert.equal(field.selectionEnd, field.value.length);
  app.modalAction('Copy progress'); await Promise.resolve();
  assert.match(app.get('#toast').textContent, /Use your device’s Copy command/);
  let copied = '';
  Object.defineProperty(app.w.navigator, 'clipboard', { value: { writeText: async text => { copied = text; } } });
  app.modalAction('Copy progress'); await new Promise(resolve => setImmediate(resolve));
  assert.equal(copied, field.value);
  assert.match(app.get('#toast').textContent, /Progress copied/);
});
