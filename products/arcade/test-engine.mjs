import test from "node:test";
import assert from "node:assert/strict";
import {
  seeded, createGrid, rotatePiece, canPlaceGrid, applyGrid, gridHasMove,
  createSort, applySort, isSortSolved, createOrbit, pipeMask, applyOrbit, orbitConnections,
  createRunner, stepRunner, moveRunner, RUNNER_MAX_DT, RUNNER_INVULNERABILITY,
} from "../../public/arcade/engine.mjs";

function freezeDeep(value) {
  if (value && typeof value === "object" && !Object.isFrozen(value)) {
    Object.freeze(value);
    Object.values(value).forEach(freezeDeep);
  }
  return value;
}
const single = id => ({ id, color: 1, cells: [[0, 0]] });
const gridWithSingles = () => ({ ...createGrid(17), tray: [single("a"), single("b"), single("c")] });
const sortState = tubes => ({ ...createSort(1, 1), tubes, moves: 0, solved: false });

test("seeded randomness is reproducible, bounded, and distinguishes seeds", () => {
  const a = seeded("Transcenlutions"), b = seeded("Transcenlutions"), c = seeded("Arcade");
  const sequence = Array.from({ length: 100 }, () => a());
  assert.deepEqual(sequence, Array.from({ length: 100 }, () => b()));
  assert.notDeepEqual(sequence, Array.from({ length: 100 }, () => c()));
  assert.ok(sequence.every(value => value >= 0 && value < 1));
  assert.deepEqual(createGrid(1), createGrid(1));
});

test("Crown Grid rotation preserves cells through four turns and supports negative turns", () => {
  const original = freezeDeep({ id: "angle", color: 2, cells: [[0, 0], [1, 0], [1, 1]] });
  let piece = original;
  for (let i = 0; i < 4; i++) piece = rotatePiece(piece);
  assert.deepEqual(piece, original);
  assert.deepEqual(rotatePiece(original).cells, [[0, 0], [0, 1], [1, 0]]);
  const state = { ...gridWithSingles(), tray: [original, null, null] };
  assert.equal(canPlaceGrid(state, 0, 0, 0, -1), true);
  assert.equal(canPlaceGrid(state, 0, 0, 0, 0.5), false);
});

test("Crown Grid clears intersecting row and column simultaneously, counting their shared cell once", () => {
  const state = gridWithSingles();
  for (let i = 1; i < 8; i++) { state.board[i] = 3; state.board[i * 8] = 4; }
  freezeDeep(state);
  const next = applyGrid(state, { type: "place", piece: 0, row: 0, col: 0 });
  assert.deepEqual(next.lastEvent.rows, [0]);
  assert.deepEqual(next.lastEvent.cols, [0]);
  assert.equal(next.lastEvent.cleared.length, 15);
  assert.equal(new Set(next.lastEvent.cleared).size, 15);
  assert.ok(next.board.every(cell => cell === 0));
  assert.equal(next.lines, 2);
  assert.equal(next.combo, 1);
  assert.equal(next.score, 210);
  assert.equal(state.board[1], 3);
  assert.equal(state.tray[0].id, "a");
});

test("Crown Grid combos reward consecutive clears and reset on a non-clearing move", () => {
  const state = gridWithSingles();
  state.combo = 1;
  for (let i = 1; i < 8; i++) state.board[i] = 2;
  const clear = applyGrid(state, { type: "place", piece: 0, row: 0, col: 0 });
  assert.equal(clear.combo, 2);
  assert.equal(clear.lastEvent.points, 135);
  const next = applyGrid(clear, { type: "place", piece: 1, row: 3, col: 3 });
  assert.equal(next.combo, 0);
  assert.equal(next.score, 145);
});

test("Crown Grid rejects overlap/bounds and refills only after all three pieces are used", () => {
  const initial = freezeDeep(gridWithSingles());
  let state = applyGrid(initial, { type: "place", piece: 0, row: 0, col: 0 });
  assert.equal(state.tray[0], null);
  assert.equal(state.lastEvent.refilled, false);
  for (const action of [
    { type: "place", piece: 0, row: 1, col: 1 },
    { type: "place", piece: 1, row: 0, col: 0 },
    { type: "place", piece: 1, row: -1, col: 0 },
    { type: "place", piece: 1, row: 8, col: 0 },
  ]) {
    const rejected = applyGrid(state, action);
    assert.equal(rejected.lastEvent.type, "invalid");
    assert.deepEqual(rejected.board, state.board);
    assert.equal(rejected.score, state.score);
  }
  state = applyGrid(state, { type: "place", piece: 1, row: 1, col: 1 });
  state = applyGrid(state, { type: "place", piece: 2, row: 2, col: 2 });
  assert.equal(state.lastEvent.refilled, true);
  assert.equal(state.tray.filter(Boolean).length, 3);
  assert.equal(state.turn, 3);
  assert.equal(initial.board[0], 0);
});

test("Crown Grid move detection includes rotations and recognizes a full board", () => {
  const state = gridWithSingles();
  state.board.fill(1);
  assert.equal(gridHasMove(state), false);
  state.board[0] = 0; state.board[8] = 0;
  state.tray = [{ id: "domino", color: 2, cells: [[0, 0], [0, 1]] }, null, null];
  assert.equal(canPlaceGrid(state, 0, 0, 0, 0), false);
  assert.equal(canPlaceGrid(state, 0, 0, 0, 1), true);
  assert.equal(gridHasMove(state), true);
});

test("Prism Sort pours only a matching top run and respects remaining capacity", () => {
  const state = freezeDeep(sortState([[0, 0, 1, 1], [1], [], [], [], []]));
  const next = applySort(state, { from: 0, to: 1 });
  assert.deepEqual(next.tubes[0], [0, 0]);
  assert.deepEqual(next.tubes[1], [1, 1, 1]);
  assert.equal(next.lastEvent.count, 2);
  assert.equal(next.moves, 1);
  assert.deepEqual(state.tubes[0], [0, 0, 1, 1]);
  const limited = applySort(sortState([[2, 2, 2], [2, 2, 2], [], [], [], []]), { from: 0, to: 1 });
  assert.equal(limited.lastEvent.count, 1);
  assert.deepEqual(limited.tubes.slice(0, 2), [[2, 2], [2, 2, 2, 2]]);
});

test("Prism Sort rejects same-tube, empty-source, mismatched, full, and malformed moves", () => {
  const state = freezeDeep(sortState([[0], [1], [], [0, 0, 0, 0], [], []]));
  for (const action of [{ from: 0, to: 0 }, { from: 2, to: 0 }, { from: 0, to: 1 },
    { from: 0, to: 3 }, { from: -1, to: 0 }, { from: 0.5, to: 1 }, null]) {
    const next = applySort(state, action);
    assert.equal(next.lastEvent.type, "invalid");
    assert.deepEqual(next.tubes, state.tubes);
    assert.equal(next.moves, 0);
  }
  assert.equal(isSortSolved(sortState([[0, 0], [0, 0], [], [], [], []])), false);
  assert.equal(isSortSolved(sortState([[0, 0, 0, 0], [1, 1, 1, 1], [], [], [], []])), true);
});

test("Prism Sort generated levels conserve every symbol and replay a legal solution across 120 seeds", () => {
  for (let seed = 0; seed < 120; seed++) {
    const level = 1 + seed % 10;
    const initial = createSort(level, seed);
    assert.deepEqual(initial, createSort(level, seed));
    assert.equal(initial.tubes.length, 6);
    assert.equal(initial.solved, false, `initially solved: ${seed}`);
    assert.ok(initial.solution.length > 0);
    for (let color = 0; color < 4; color++) assert.equal(initial.tubes.flat().filter(x => x === color).length, 4);
    assert.deepEqual(initial.tubes.map(tube => tube.length), [4, 4, 4, 4, 0, 0]);
    assert.ok(initial.tubes.some(tube => new Set(tube).size > 1), `unmixed level: ${seed}`);
    let current = freezeDeep(initial);
    for (const move of initial.solution) {
      current = applySort(current, move);
      assert.notEqual(current.lastEvent.type, "invalid", `illegal recorded solution: ${seed}`);
    }
    assert.equal(current.solved, true, `unsolved replay: ${seed}`);
    assert.equal(current.moves, initial.solution.length);
  }
});

test("Orbit Link requires reciprocal connectors and does not wrap around row boundaries", () => {
  const state = {
    size: 2, source: 0, goal: 3,
    tiles: [
      { base: 2, rotation: 0 }, { base: 12, rotation: 0 },
      { base: 0, rotation: 0, blocked: true }, { base: 1, rotation: 0 },
    ],
  };
  assert.deepEqual(orbitConnections(state), { solved: true, connected: [0, 1, 3] });
  assert.equal(orbitConnections({ ...state, tiles: state.tiles.map((tile, i) => i === 3 ? { base: 2, rotation: 0 } : tile) }).solved, false);
  assert.equal(pipeMask({ base: 1, rotation: 1 }), 2);
  assert.equal(pipeMask({ base: 8, rotation: 1 }), 1);
  const noWrap = { size: 2, source: 1, goal: 2, tiles: [
    { base: 0 }, { base: 2, rotation: 0 }, { base: 8, rotation: 0 }, { base: 0 },
  ] };
  assert.deepEqual(orbitConnections(noWrap), { solved: false, connected: [1] });
});

test("Orbit Link generated networks are unsolved initially and constructively solvable across 100 seeds", () => {
  for (let seed = 0; seed < 100; seed++) {
    const initial = createOrbit(1 + seed % 12, seed);
    assert.deepEqual(initial, createOrbit(1 + seed % 12, seed));
    assert.equal(initial.solved, false, `initial solution: ${seed}`);
    assert.equal(initial.tiles.length, 25);
    assert.equal(initial.tiles[initial.source].fixed, true);
    assert.equal(initial.tiles[initial.goal].fixed, true);
    const rejected = applyOrbit(freezeDeep(initial), { index: initial.source });
    assert.equal(rejected.lastEvent.type, "invalid");
    assert.equal(rejected.moves, 0);
    let current = initial;
    for (let index = 0; index < current.tiles.length; index++) {
      if (current.tiles[index].fixed) continue;
      while (current.tiles[index].rotation !== current.solution[index]) current = applyOrbit(current, { index });
    }
    assert.equal(current.solved, true, `unreachable goal: ${seed}`);
    assert.equal(current.connected.length, current.tiles.filter(tile => !tile.blocked).length);
    assert.equal(initial.moves, 0);
  }
});

test("Lumen Run handles lane boundaries, zero time, invalid time, and capped resume gaps", () => {
  const initial = freezeDeep(createRunner(77));
  const left = moveRunner(initial, -1);
  assert.equal(left.lane, 0);
  assert.equal(moveRunner(left, -1).lastEvent.type, "invalid");
  assert.equal(moveRunner(initial, 2).lastEvent.type, "invalid");
  assert.equal(initial.lane, 1);
  assert.strictEqual(stepRunner(initial, 0), initial);
  assert.equal(stepRunner(initial, NaN).lastEvent.type, "invalid");
  assert.equal(stepRunner(initial, -1).lastEvent.type, "invalid");
  assert.ok(Math.abs(stepRunner(initial, 100).time - RUNNER_MAX_DT) < 1e-8);
});

test("Lumen Run resolves obstacle crossings once, applies invulnerability, and ends at zero lives", () => {
  const initial = freezeDeep({ ...createRunner(2), entities: [{ id: 1, row: 1, lane: 1, type: "obstacle", z: 0.01 }] });
  const hit = stepRunner(initial, 0.02);
  assert.equal(hit.lives, 2);
  assert.equal(hit.lastEvent.collisions, 1);
  assert.ok(hit.invulnerable > 1.3 && hit.invulnerable <= RUNNER_INVULNERABILITY);
  assert.equal(hit.entities.length, 0);
  assert.equal(initial.lives, 3);
  const shielded = stepRunner({ ...hit, entities: [{ id: 2, row: 2, lane: 1, type: "obstacle", z: 0.01 }] }, 0.02);
  assert.equal(shielded.lives, 2);
  assert.equal(shielded.lastEvent.collisions, 0);
  const final = stepRunner({ ...createRunner(9), lives: 1, entities: [{ id: 3, row: 3, lane: 1, type: "obstacle", z: 0.01 }] }, 0.02);
  assert.equal(final.lives, 0);
  assert.equal(final.over, true);
  assert.strictEqual(stepRunner(final, 0.2), final);
});

test("Lumen Run energy adds 25 points only in the player's lane", () => {
  const initial = freezeDeep({ ...createRunner(3), entities: [
    { id: 1, row: 1, lane: 1, type: "energy", z: 0.01 },
    { id: 2, row: 2, lane: 0, type: "energy", z: 0.01 },
  ] });
  const next = stepRunner(initial, 0.02);
  assert.equal(next.energy, 1);
  assert.equal(next.score, 25);
  assert.equal(next.lastEvent.collected, 1);
  assert.equal(stepRunner(next, 0.02).energy, 1);
});

test("Lumen Run seeds produce reproducible rows with an open lane and safe energy placement", () => {
  const play = seed => {
    let state = createRunner(seed);
    const rows = new Map();
    // Keep an artificial shield for a long generator exercise, not a gameplay claim.
    state.invulnerable = 200;
    for (let frame = 0; frame < 1200; frame++) {
      state = stepRunner(state, 0.1);
      for (const entity of state.entities) {
        const row = rows.get(entity.row) ?? new Map();
        row.set(entity.id, entity); rows.set(entity.row, row);
      }
    }
    return { state, rows };
  };
  const a = play(91), b = play(91);
  assert.deepEqual(a.state, b.state);
  assert.ok(a.rows.size > 50);
  assert.ok(a.state.speed > 8 && a.state.speed <= 20);
  for (const row of a.rows.values()) {
    const entities = [...row.values()];
    const obstacles = entities.filter(entity => entity.type === "obstacle");
    assert.ok(obstacles.length >= 1 && obstacles.length <= 2);
    assert.equal(new Set(obstacles.map(entity => entity.lane)).size, obstacles.length);
    for (const energy of entities.filter(entity => entity.type === "energy")) {
      assert.ok(!obstacles.some(obstacle => obstacle.lane === energy.lane));
    }
  }
});
