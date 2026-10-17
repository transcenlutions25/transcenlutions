/**
 * Transcenlutions Arcade — original, dependency-free game rules.
 * All reducers return new state; input state is never mutated.
 * Coordinates use zero-based rows/columns and clockwise quarter-turns.
 * UI, persistence, audio, timers, and account services stay outside this module.
 */

const UINT32 = 0x100000000;

function normalizeSeed(seed) {
  if (typeof seed === "number" && Number.isFinite(seed)) return seed >>> 0;
  const text = String(seed ?? 1);
  let hash = 2166136261;
  for (let i = 0; i < text.length; i++) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function nextRandom(previous) {
  const state = (previous + 0x6d2b79f5) >>> 0;
  let value = state;
  value = Math.imul(value ^ (value >>> 15), value | 1);
  value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
  return { state, value: ((value ^ (value >>> 14)) >>> 0) / UINT32 };
}

/** @returns {() => number} A repeatable generator; never uses Math.random. */
export function seeded(seed = 1) {
  let state = normalizeSeed(seed);
  return () => {
    const next = nextRandom(state);
    state = next.state;
    return next.value;
  };
}

function shuffled(values, random) {
  const result = [...values];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

function invalid(state, reason) {
  return { ...state, lastEvent: { type: "invalid", reason } };
}

function normalizeLevel(level) {
  return Number.isFinite(level) ? Math.max(1, Math.min(100, Math.floor(level))) : 1;
}

// ---------------------------------------------------------------------------
// Crown Grid: place a three-piece tray, clear complete rows and columns together.
// ---------------------------------------------------------------------------

export const GRID_SIZE = 8;

/** @typedef {{id:string, cells:number[][], color:number}} GridPiece */
const GRID_SHAPES = [
  [[0, 0]],
  [[0, 0], [0, 1]],
  [[0, 0], [0, 1], [0, 2]],
  [[0, 0], [1, 0], [1, 1]],
  [[0, 0], [0, 1], [1, 0], [1, 1]],
  [[0, 0], [0, 1], [0, 2], [1, 1]],
  [[0, 0], [1, 0], [2, 0], [2, 1]],
  [[0, 0], [0, 1], [1, 1], [1, 2]],
  [[0, 0], [0, 1], [0, 2], [0, 3]],
  [[0, 0], [1, 0], [1, 1], [2, 1]],
  [[0, 0], [0, 1], [1, 1], [2, 1], [2, 2]],
  [[0, 0], [1, 0], [2, 0], [2, 1], [2, 2]],
  [[0, 1], [1, 0], [1, 1], [1, 2], [2, 1]],
];

function normalizedCells(cells) {
  const minRow = Math.min(...cells.map(([row]) => row));
  const minCol = Math.min(...cells.map(([, col]) => col));
  return cells
    .map(([row, col]) => [row - minRow, col - minCol])
    .sort((a, b) => a[0] - b[0] || a[1] - b[1]);
}

/** @param {GridPiece} piece @returns {GridPiece} */
export function rotatePiece(piece) {
  return { ...piece, cells: normalizedCells(piece.cells.map(([row, col]) => [col, -row])) };
}

function pieceAtRotation(piece, rotation = 0) {
  if (!Number.isInteger(rotation)) return null;
  let result = piece;
  const turns = ((rotation % 4) + 4) % 4;
  for (let i = 0; i < turns; i++) result = rotatePiece(result);
  return result;
}

function makeTray(previousRng, turn) {
  let rng = previousRng;
  const random = () => {
    const next = nextRandom(rng);
    rng = next.state;
    return next.value;
  };
  const tray = Array.from({ length: 3 }, (_, index) => {
    const shape = GRID_SHAPES[Math.floor(random() * GRID_SHAPES.length)];
    const color = 1 + Math.floor(random() * 6);
    const turns = Math.floor(random() * 4);
    return pieceAtRotation({
      id: `grid-${turn}-${index}-${rng.toString(36)}`,
      cells: shape.map(cell => [...cell]),
      color,
    }, turns);
  });
  return { tray, rng };
}

export function createGrid(seed = 1) {
  const value = normalizeSeed(seed);
  const { tray, rng } = makeTray(value, 0);
  return {
    kind: "grid", version: 1, seed: value, rng, size: GRID_SIZE,
    board: Array(GRID_SIZE * GRID_SIZE).fill(0), tray,
    score: 0, lines: 0, combo: 0, turn: 0, over: false, lastEvent: null,
  };
}

export function canPlaceGrid(state, trayIndex, row, col, rotation = 0) {
  if (!Number.isInteger(trayIndex) || trayIndex < 0 || trayIndex >= state.tray.length ||
      !Number.isInteger(row) || !Number.isInteger(col)) return false;
  const original = state.tray[trayIndex];
  if (!original) return false;
  const piece = pieceAtRotation(original, rotation);
  if (!piece) return false;
  return piece.cells.every(([dr, dc]) => {
    const r = row + dr, c = col + dc;
    return r >= 0 && r < state.size && c >= 0 && c < state.size && state.board[r * state.size + c] === 0;
  });
}

/** Rotation is included in the search, so the game never ends prematurely. */
export function gridHasMove(state) {
  for (let piece = 0; piece < state.tray.length; piece++) {
    if (!state.tray[piece]) continue;
    const seen = new Set();
    for (let rotation = 0; rotation < 4; rotation++) {
      const cells = pieceAtRotation(state.tray[piece], rotation).cells;
      const key = JSON.stringify(cells);
      if (seen.has(key)) continue;
      seen.add(key);
      for (let row = 0; row < state.size; row++) {
        for (let col = 0; col < state.size; col++) {
          if (canPlaceGrid(state, piece, row, col, rotation)) return true;
        }
      }
    }
  }
  return false;
}

/** action: {type:'place', piece:trayIndex, row, col, rotation?:quarterTurns}. */
export function applyGrid(state, action) {
  if (!action || action.type !== "place") return invalid(state, "Choose a piece and a grid square.");
  if (state.over) return invalid(state, "This grid has ended. Start a new grid.");
  const { piece: index, row, col, rotation = 0 } = action;
  if (!canPlaceGrid(state, index, row, col, rotation)) return invalid(state, "That piece does not fit there.");
  const piece = pieceAtRotation(state.tray[index], rotation);
  const board = [...state.board];
  const cells = piece.cells.map(([dr, dc]) => (row + dr) * state.size + col + dc);
  for (const cell of cells) board[cell] = piece.color;

  // Evaluate every line against the same board before clearing any of them.
  const rows = [], cols = [];
  for (let r = 0; r < state.size; r++) {
    if (Array.from({ length: state.size }, (_, c) => board[r * state.size + c]).every(Boolean)) rows.push(r);
  }
  for (let c = 0; c < state.size; c++) {
    if (Array.from({ length: state.size }, (_, r) => board[r * state.size + c]).every(Boolean)) cols.push(c);
  }
  const clearedSet = new Set();
  for (const r of rows) for (let c = 0; c < state.size; c++) clearedSet.add(r * state.size + c);
  for (const c of cols) for (let r = 0; r < state.size; r++) clearedSet.add(r * state.size + c);
  const cleared = [...clearedSet].sort((a, b) => a - b);
  for (const cell of cleared) board[cell] = 0;

  const lineCount = rows.length + cols.length;
  const combo = lineCount > 0 ? state.combo + 1 : 0;
  const points = cells.length * 10 + lineCount * 100 + Math.max(0, combo - 1) * lineCount * 25;
  let tray = state.tray.map((item, i) => i === index ? null : item);
  let rng = state.rng;
  const refilled = tray.every(item => item === null);
  if (refilled) ({ tray, rng } = makeTray(rng, state.turn + 1));
  const next = {
    ...state, board, tray, rng, score: state.score + points, lines: state.lines + lineCount,
    combo, turn: state.turn + 1, over: false,
    lastEvent: { type: "place", points, cells, cleared, rows, cols, lineCount, refilled },
  };
  next.over = !gridHasMove(next);
  return next;
}

// ---------------------------------------------------------------------------
// Prism Sort: four named symbols, six tubes, maximal top-run pours.
// ---------------------------------------------------------------------------

export const SORT_COLORS = Object.freeze([
  Object.freeze({ id: 0, label: "Blue circle", symbol: "●" }),
  Object.freeze({ id: 1, label: "Purple diamond", symbol: "◆" }),
  Object.freeze({ id: 2, label: "Gold star", symbol: "★" }),
  Object.freeze({ id: 3, label: "Mint triangle", symbol: "▲" }),
]);

function topRun(tube) {
  if (!tube.length) return 0;
  const color = tube[tube.length - 1];
  let count = 0;
  for (let i = tube.length - 1; i >= 0 && tube[i] === color; i--) count++;
  return count;
}

function pourTubes(tubes, capacity, from, to) {
  if (!Number.isInteger(from) || !Number.isInteger(to) || from === to ||
      from < 0 || to < 0 || from >= tubes.length || to >= tubes.length) return null;
  const source = tubes[from], destination = tubes[to];
  if (!source.length || destination.length >= capacity) return null;
  const color = source[source.length - 1];
  if (destination.length && destination[destination.length - 1] !== color) return null;
  const count = Math.min(topRun(source), capacity - destination.length);
  if (count <= 0) return null;
  const result = tubes.map(tube => [...tube]);
  result[from] = result[from].slice(0, -count);
  result[to].push(...Array(count).fill(color));
  return { tubes: result, count, color };
}

export function isSortSolved(state) {
  return state.tubes.every(tube => tube.length === 0 ||
    (tube.length === state.capacity && tube.every(color => color === tube[0])));
}

function tubesKey(tubes) { return tubes.map(tube => tube.join("")).join("|"); }

/**
 * Reverse-scramble a solved board. Each chosen reverse move is checked by
 * executing its ordinary maximal forward pour. The recorded inverse sequence
 * is therefore a constructive solution, not a guess or a solvability claim.
 * `solution` is valid for the initial board only; it is not a dynamic hint.
 */
function scrambleSort(random, targetSteps) {
  const capacity = 4;
  let tubes = [0, 1, 2, 3].map(color => Array(capacity).fill(color)).concat([[], []]);
  const reverseMoves = [];
  const seen = new Set([tubesKey(tubes)]);
  let best = null;

  for (let step = 0; step < targetSteps; step++) {
    const candidates = [];
    for (let from = 0; from < tubes.length; from++) {
      const source = tubes[from];
      if (!source.length) continue;
      const color = source[source.length - 1];
      const run = topRun(source);
      for (let to = 0; to < tubes.length; to++) {
        if (from === to) continue;
        const destination = tubes[to];
        const maximum = Math.min(run, capacity - destination.length);
        for (let count = 1; count <= maximum; count++) {
          const remaining = source.slice(0, -count);
          // The inverse must land on an empty tube or its own symbol.
          if (remaining.length && remaining[remaining.length - 1] !== color) continue;
          const candidate = tubes.map(tube => [...tube]);
          candidate[from] = remaining;
          candidate[to].push(...Array(count).fill(color));
          const key = tubesKey(candidate);
          if (seen.has(key) || isSortSolved({ tubes: candidate, capacity })) continue;
          const inverse = pourTubes(candidate, capacity, to, from);
          if (!inverse || tubesKey(inverse.tubes) !== tubesKey(tubes)) continue;
          const mixed = destination.length > 0 && destination[destination.length - 1] !== color;
          candidates.push({ tubes: candidate, key, from: to, to: from, weight: mixed ? 4 : 1 });
        }
      }
    }
    if (!candidates.length) break;
    const weight = candidates.reduce((sum, candidate) => sum + candidate.weight, 0);
    let choice = random() * weight;
    let selected = candidates[candidates.length - 1];
    for (const candidate of candidates) {
      choice -= candidate.weight;
      if (choice < 0) { selected = candidate; break; }
    }
    tubes = selected.tubes;
    seen.add(selected.key);
    reverseMoves.push({ from: selected.from, to: selected.to });
    if (tubes.filter(tube => tube.length === 0).length === 2 &&
        tubes.every(tube => tube.length === 0 || tube.length === capacity)) {
      best = { tubes, reverseMoves: [...reverseMoves] };
    }
  }
  return best;
}

export function createSort(level = 1, seed = 1) {
  level = normalizeLevel(level);
  const value = normalizeSeed(seed);
  const random = seeded(value ^ Math.imul(level, 0x45d9f3b));
  const capacity = 4, targetSteps = Math.min(80, 14 + level * 6);
  const desiredDepth = Math.min(14, 7 + Math.floor(level / 2));
  let result = null;
  // A bounded search chooses a reverse scramble that returns the two spare
  // tubes to empty. Every candidate still carries its explicit legal solution.
  for (let attempt = 0; attempt < 48; attempt++) {
    const candidate = scrambleSort(random, targetSteps);
    if (candidate && (!result || candidate.reverseMoves.length > result.reverseMoves.length)) result = candidate;
    if (result && result.reverseMoves.length >= desiredDepth) break;
  }
  if (!result) {
    // Constructive fallback: rotate equal-sized top groups through one spare.
    // This always ends in four full mixed tubes and two empty tubes.
    const colors = shuffled([0, 1, 2, 3], random);
    const tubes = colors.map(color => Array(capacity).fill(color)).concat([[], []]);
    const reverseMoves = [], count = 1 + Math.floor(random() * 3);
    for (const [from, to] of [[0, 4], [1, 0], [2, 1], [3, 2], [4, 3]]) {
      tubes[to].push(...tubes[from].splice(tubes[from].length - count, count));
      reverseMoves.push({ from: to, to: from });
    }
    result = { tubes, reverseMoves };
  }
  // Put the two empty working tubes last, remapping every recorded solution.
  const order = result.tubes.map((tube, index) => ({ index, empty: tube.length === 0 }))
    .sort((a, b) => Number(a.empty) - Number(b.empty)).map(item => item.index);
  const destination = new Map(order.map((oldIndex, newIndex) => [oldIndex, newIndex]));
  const tubes = order.map(index => [...result.tubes[index]]);
  const solution = [...result.reverseMoves].reverse().map(move => ({
    from: destination.get(move.from), to: destination.get(move.to),
  }));

  return {
    kind: "sort", version: 1, seed: value, level, capacity, tubes,
    colors: SORT_COLORS.map(color => ({ ...color })), moves: 0,
    solved: isSortSolved({ tubes, capacity }),
    solution, lastEvent: null,
  };
}

/** Tubes are bottom → top. A move pours the maximal matching top run. */
export function applySort(state, action) {
  const result = action && pourTubes(state.tubes, state.capacity, action.from, action.to);
  if (!result) return invalid(state, "Pour onto the same symbol or into an empty tube with space.");
  const next = {
    ...state, tubes: result.tubes, moves: state.moves + 1,
    lastEvent: { type: "pour", from: action.from, to: action.to, count: result.count, color: result.color },
  };
  next.solved = isSortSolved(next);
  return next;
}

// ---------------------------------------------------------------------------
// Orbit Link: rotate a network until a reciprocal path joins source and goal.
// ---------------------------------------------------------------------------

export const PIPE = Object.freeze({ N: 1, E: 2, S: 4, W: 8 });
const DIRECTIONS = [
  { dr: -1, dc: 0, bit: 1, opposite: 4 },
  { dr: 0, dc: 1, bit: 2, opposite: 8 },
  { dr: 1, dc: 0, bit: 4, opposite: 1 },
  { dr: 0, dc: -1, bit: 8, opposite: 2 },
];

/** Current connector mask, with N=1, E=2, S=4, W=8. */
export function pipeMask(tile) {
  if (!tile || tile.blocked) return 0;
  let mask = tile.base & 15;
  const rotation = ((tile.rotation % 4) + 4) % 4;
  for (let i = 0; i < rotation; i++) mask = ((mask << 1) & 15) | ((mask >>> 3) & 1);
  return mask;
}

function neighbors(index, size) {
  const row = Math.floor(index / size), col = index % size;
  return DIRECTIONS.flatMap(direction => {
    const r = row + direction.dr, c = col + direction.dc;
    return r < 0 || r >= size || c < 0 || c >= size ? [] : [{ ...direction, index: r * size + c }];
  });
}

function allUnblockedReachable(blocked, size) {
  const visited = new Set([0]), queue = [0];
  for (let cursor = 0; cursor < queue.length; cursor++) {
    for (const neighbor of neighbors(queue[cursor], size)) {
      if (!blocked.has(neighbor.index) && !visited.has(neighbor.index)) {
        visited.add(neighbor.index); queue.push(neighbor.index);
      }
    }
  }
  return visited.size === size * size - blocked.size;
}

export function orbitConnections(state) {
  if (!state.tiles[state.source] || state.tiles[state.source].blocked) return { solved: false, connected: [] };
  const connected = [state.source], visited = new Set(connected);
  for (let cursor = 0; cursor < connected.length; cursor++) {
    const index = connected[cursor], mask = pipeMask(state.tiles[index]);
    for (const neighbor of neighbors(index, state.size)) {
      if (!visited.has(neighbor.index) && (mask & neighbor.bit) &&
          (pipeMask(state.tiles[neighbor.index]) & neighbor.opposite)) {
        visited.add(neighbor.index); connected.push(neighbor.index);
      }
    }
  }
  return { solved: visited.has(state.goal), connected: connected.sort((a, b) => a - b) };
}

export function createOrbit(level = 1, seed = 1) {
  level = normalizeLevel(level);
  const value = normalizeSeed(seed), size = 5, source = 0, goal = 24;
  const random = seeded(value ^ Math.imul(level, 0x27d4eb2d));
  const blocked = new Set();
  const desiredBlocks = Math.min(4, Math.floor((level - 1) / 2));
  for (const index of shuffled(Array.from({ length: 23 }, (_, i) => i + 1), random)) {
    if (blocked.size >= desiredBlocks) break;
    blocked.add(index);
    if (!allUnblockedReachable(blocked, size)) blocked.delete(index);
  }

  const masks = Array(size * size).fill(0), parent = Array(size * size).fill(-1);
  const visited = new Set([source]), stack = [source];
  while (stack.length) {
    const index = stack[stack.length - 1];
    const options = neighbors(index, size).filter(neighbor => !visited.has(neighbor.index) && !blocked.has(neighbor.index));
    if (!options.length) { stack.pop(); continue; }
    const next = options[Math.floor(random() * options.length)];
    masks[index] |= next.bit;
    masks[next.index] |= next.opposite;
    parent[next.index] = index;
    visited.add(next.index); stack.push(next.index);
  }

  const tiles = masks.map((base, index) => ({
    base, rotation: index === source || index === goal || blocked.has(index) ? 0 : Math.floor(random() * 4),
    fixed: index === source || index === goal || blocked.has(index), blocked: blocked.has(index),
  }));
  const state = {
    kind: "orbit", version: 1, seed: value, level, size, source, goal,
    tiles, moves: 0, solution: Array(size * size).fill(0), lastEvent: null,
  };

  // Rare accidental solutions are reset to the known tree, then one path tile
  // is rotated to break its only route. Every returned board starts unsolved.
  if (orbitConnections(state).solved) {
    for (const tile of tiles) tile.rotation = 0;
    let index = parent[goal];
    while (index !== source && index !== -1) {
      let broken = false;
      for (let rotation = 1; rotation <= 3; rotation++) {
        tiles[index].rotation = rotation;
        if (!orbitConnections(state).solved) { broken = true; break; }
      }
      if (broken) break;
      tiles[index].rotation = 0;
      index = parent[index];
    }
  }
  return { ...state, ...orbitConnections(state) };
}

export function applyOrbit(state, action) {
  const index = action?.index;
  if (!Number.isInteger(index) || index < 0 || index >= state.tiles.length) return invalid(state, "Choose a pipe tile.");
  if (state.tiles[index].fixed || state.tiles[index].blocked) return invalid(state, "Source, goal, and blocked tiles stay fixed.");
  const tiles = state.tiles.map((tile, i) => i === index ? { ...tile, rotation: (tile.rotation + 1) % 4 } : tile);
  const next = { ...state, tiles, moves: state.moves + 1, lastEvent: { type: "rotate", index } };
  return { ...next, ...orbitConnections(next) };
}

// ---------------------------------------------------------------------------
// Lumen Run: a bounded, deterministic three-lane simulation.
// ---------------------------------------------------------------------------

export const RUNNER_SPAWN_Z = 48;
export const RUNNER_MAX_DT = 0.25;
export const RUNNER_INVULNERABILITY = 1.4;

export function createRunner(seed = 1) {
  const value = normalizeSeed(seed);
  return {
    kind: "runner", version: 1, seed: value, rng: value, lane: 1,
    entities: [], nextEntityId: 1, nextRowId: 1, distance: 0, score: 0, energy: 0,
    lives: 3, time: 0, speed: 8, spawnIn: 0.5, invulnerable: 0, over: false, lastEvent: null,
  };
}

export function moveRunner(state, direction) {
  if (state.over) return invalid(state, "This run has ended. Start a new run.");
  if (direction !== -1 && direction !== 1) return invalid(state, "Move one lane left or right.");
  const lane = state.lane + direction;
  if (lane < 0 || lane > 2) return invalid(state, "You are already in the outside lane.");
  return { ...state, lane, lastEvent: { type: "move", lane } };
}

function spawnRunnerRow(state) {
  const random = () => {
    const next = nextRandom(state.rng);
    state.rng = next.state;
    return next.value;
  };
  const lanes = shuffled([0, 1, 2], random);
  const count = random() < Math.min(0.72, 0.25 + state.time / 180) ? 2 : 1;
  const row = state.nextRowId++;
  for (const lane of lanes.slice(0, count)) {
    state.entities.push({ id: state.nextEntityId++, row, type: "obstacle", lane, z: RUNNER_SPAWN_Z });
  }
  if (random() < 0.85) {
    const safe = lanes.slice(count);
    const lane = safe[Math.floor(random() * safe.length)];
    state.entities.push({ id: state.nextEntityId++, row, type: "energy", lane, z: RUNNER_SPAWN_Z });
  }
  state.spawnIn += Math.max(0.85, 1.8 - state.distance / 2200);
}

/**
 * dt is in seconds. Values above 0.25 are capped, avoiding a collision jump
 * after backgrounding. Call only while running; UI owns pause and animation.
 * z is distance ahead of the player. A crossing of zero resolves once.
 */
export function stepRunner(state, dtSeconds) {
  if (state.over) return state;
  if (!Number.isFinite(dtSeconds) || dtSeconds < 0) return invalid(state, "Use a finite, nonnegative frame duration.");
  if (dtSeconds === 0) return state;
  const next = { ...state, entities: state.entities.map(entity => ({ ...entity })) };
  let remaining = Math.min(dtSeconds, RUNNER_MAX_DT), collisions = 0, collected = 0;
  while (remaining > 1e-10 && !next.over) {
    const dt = Math.min(remaining, 1 / 60);
    remaining -= dt;
    next.time += dt;
    next.speed = Math.min(20, 8 + next.distance / 160);
    const travel = next.speed * dt;
    next.distance += travel;
    next.invulnerable = Math.max(0, next.invulnerable - dt);
    next.spawnIn -= dt;
    if (next.spawnIn <= 0) spawnRunnerRow(next);
    const active = [];
    for (const entity of next.entities) {
      entity.z -= travel;
      if (entity.z > 0) { active.push(entity); continue; }
      if (entity.lane !== next.lane || next.over) continue;
      if (entity.type === "energy") {
        next.energy++; collected++;
      } else if (entity.type === "obstacle" && next.invulnerable <= 0) {
        next.lives = Math.max(0, next.lives - 1);
        next.invulnerable = RUNNER_INVULNERABILITY;
        collisions++;
        if (next.lives === 0) next.over = true;
      }
    }
    next.entities = active;
  }
  next.score = Math.floor(next.distance) + next.energy * 25;
  next.lastEvent = { type: "step", collected, collisions, points: next.score - state.score };
  return next;
}
