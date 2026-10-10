"use strict";

/* Synthetic storage and Web Lock scheduling only. These do not claim a real
 * multi-process browser, durability, storage-event delivery or device test. */
const assert = require("node:assert/strict");
const { execFileSync } = require("node:child_process");
const { mkdtempSync, rmSync } = require("node:fs");
const { tmpdir } = require("node:os");
const { join, resolve } = require("node:path");
const { after, test } = require("node:test");

const root = resolve(__dirname, "..");
const temp = mkdtempSync(join(tmpdir(), "tay-workspace-storage-"));
let createWorkspaceStorageGuard, createBrowserRecordStorageGuard;
try {
  execFileSync(process.execPath, [require.resolve("typescript/bin/tsc"),
    join(root, "lib/workspace-storage-guard.ts"), "--target", "ES2022", "--module", "commonjs",
    "--moduleResolution", "node", "--strict", "--skipLibCheck", "--outDir", temp,
  ], { cwd: root, stdio: "inherit" });
  ({ createWorkspaceStorageGuard, createBrowserRecordStorageGuard } = require(join(temp, "workspace-storage-guard.js")));
} catch (error) {
  rmSync(temp, { recursive: true, force: true });
  throw error;
}
after(() => rmSync(temp, { recursive: true, force: true }));

const key = "tay:workspace:v1";
const record = (draft = "", extra = {}) => JSON.stringify({
  version: 1, activeThreadId: "conversation", conversations: [{ id: "conversation", input: draft }], ...extra,
});

function memoryStorage(initialRaw = null) {
  const values = new Map(initialRaw === null ? [] : [[key, initialRaw]]);
  const writes = [];
  return {
    writes,
    readError: null,
    writeError: null,
    getItem(name) { if (this.readError) throw this.readError; return values.get(name) ?? null; },
    setItem(name, value) {
      if (this.writeError) throw this.writeError;
      values.set(name, value); writes.push({ key: name, value });
    },
    externalWrite(value) { if (value === null) values.delete(key); else values.set(key, value); },
    raw: () => values.get(key) ?? null,
  };
}

// An explicitly controlled, exclusive lock queue. Tests can hold the lock to
// model another cooperating tab and exercise writes already waiting on it.
function lockManager() {
  const queues = new Map();
  const held = new Set();
  const requests = [];
  function run(name) {
    if (held.has(name)) return;
    const queue = queues.get(name) || [];
    const entry = queue.shift();
    if (!entry) return;
    if (entry.aborted) { run(name); return; }
    held.add(name);
    entry.started = true;
    entry.signal?.removeEventListener("abort", entry.abort);
    Promise.resolve().then(() => entry.callback({ name, mode: "exclusive" }))
      .then(entry.resolve, entry.reject).finally(() => { held.delete(name); run(name); });
  }
  return {
    requests,
    request(name, options, callback) {
      assert.equal(options.mode, "exclusive");
      requests.push(name);
      return new Promise((resolvePromise, reject) => {
        const entry = { callback, resolve: resolvePromise, reject, signal: options.signal, started: false, aborted: false };
        entry.abort = () => {
          if (entry.started || entry.aborted) return;
          entry.aborted = true;
          reject(Object.assign(new Error("Aborted lock wait"), { name: "AbortError" }));
        };
        if (options.signal?.aborted) { entry.abort(); return; }
        options.signal?.addEventListener("abort", entry.abort, { once: true });
        const queue = queues.get(name) || [];
        queue.push(entry); queues.set(name, queue); run(name);
      });
    },
    hold(name = `tay:workspace-storage:${key}`) {
      assert.equal(held.has(name), false);
      held.add(name);
      return () => { held.delete(name); run(name); };
    },
  };
}

function fixture(initialRaw = record("original"), extras = {}) {
  const storage = memoryStorage(initialRaw);
  const locks = lockManager();
  const reasons = [];
  const guard = createWorkspaceStorageGuard({ storage, key, initialRaw, locks, onBlocked: reason => reasons.push(reason), ...extras });
  return { storage, locks, reasons, guard };
}

test("successive saves advance the exact baseline and unchanged saves do not rewrite", async () => {
  const { storage, guard, locks } = fixture();
  const first = record("first");
  const second = record("second");
  assert.equal(await guard.queueWrite(first), "saved");
  assert.equal(await guard.queueWrite(second), "saved");
  assert.equal(await guard.queueWrite(second), "unchanged");
  assert.deepEqual(storage.writes.map(write => write.value), [first, second]);
  assert.ok(locks.requests.every(name => name === `tay:workspace-storage:${key}`));
  assert.deepEqual(guard.getStatus(), { state: "ready" });
});

test("two writers sharing a baseline cannot overwrite the winning tab, even without storage events", async () => {
  const { storage, locks, guard: first } = fixture();
  const reasons = [];
  const second = createWorkspaceStorageGuard({ storage, key, initialRaw: storage.raw(), locks, onBlocked: reason => reasons.push(reason) });
  const winner = record("first tab", { queueEvidence: ["first-tab-item"] });
  const loser = record("second tab");
  assert.deepEqual(await Promise.all([first.queueWrite(winner), second.queueWrite(loser)]), ["saved", "blocked"]);
  assert.equal(storage.raw(), winner);
  assert.equal(storage.writes.length, 1);
  assert.deepEqual(reasons, ["conflict"]);
  assert.equal(await second.queueWrite(record("later second-tab edit")), "blocked");
  assert.equal(storage.raw(), winner);
});

test("queued edits recheck under the lock after external changes and preserve current draft objects", async () => {
  const { storage, locks, guard, reasons } = fixture();
  const release = locks.hold();
  const liveState = { draft: "unsaved current text", queue: [{ id: "my-queued-item" }] };
  const before = JSON.stringify(liveState);
  const pending = guard.queueWrite(record(liveState.draft, { queue: liveState.queue }));
  const later = guard.queueWrite(record("newer text"));
  const external = record("other tab history", { queue: [{ id: "other-tab-item" }] });
  storage.externalWrite(external);
  release();
  assert.deepEqual(await Promise.all([pending, later]), ["blocked", "blocked"]);
  assert.equal(storage.raw(), external);
  assert.equal(storage.writes.length, 0);
  assert.equal(JSON.stringify(liveState), before);
  assert.deepEqual(reasons, ["conflict"]);
});

test("a burst coalesces pending snapshots instead of an unbounded lock queue", async () => {
  const { storage, locks, guard } = fixture();
  const release = locks.hold();
  const results = [];
  for (let index = 0; index < 100; index++) results.push(guard.queueWrite(record(`edit ${index}`)));
  assert.equal(locks.requests.length, 1);
  release();
  assert.ok((await Promise.all(results)).every(result => result === "saved"));
  assert.equal(storage.raw(), record("edit 99"));
  assert.equal(storage.writes.length, 2, "one in-flight snapshot plus the newest pending snapshot");
});

test("a saved tab may continue, while a new external record blocks the next queued save", async () => {
  const { storage, locks, guard } = fixture();
  assert.equal(await guard.queueWrite(record("saved once")), "saved");
  const release = locks.hold();
  const pending = guard.queueWrite(record("queued after first save"));
  storage.externalWrite(record("external after first save"));
  release();
  assert.equal(await pending, "blocked");
  assert.equal(storage.raw(), record("external after first save"));
});

test("missing initial records are writable, but competing first writes conflict", async () => {
  const { storage, locks, guard: first } = fixture(null);
  const second = createWorkspaceStorageGuard({ storage, key, initialRaw: null, locks });
  assert.deepEqual(await Promise.all([first.queueWrite(record("first")), second.queueWrite(record("second"))]), ["saved", "blocked"]);
  assert.equal(storage.raw(), record("first"));
});

test("external deletion and clear events never recreate a stale workspace", async () => {
  for (const observe of [false, true]) {
    const { storage, guard, reasons } = fixture();
    storage.externalWrite(null);
    if (observe) guard.observeStorage({ key: null, storageArea: storage });
    assert.equal(await guard.queueWrite(record("stale")), "blocked");
    assert.equal(storage.raw(), null);
    assert.equal(storage.writes.length, 0);
    assert.deepEqual(reasons, ["conflict"]);
  }
});

test("a storage event stops awaiting and future writes without replacing local state", async () => {
  const { storage, locks, guard, reasons } = fixture();
  const release = locks.hold();
  const pending = guard.queueWrite(record("unsaved draft"));
  storage.externalWrite(record("other tab"));
  guard.observeStorage({ key, storageArea: storage });
  assert.equal(await pending, "blocked");
  release();
  assert.equal(await guard.queueWrite(record("still in current tab")), "blocked");
  assert.equal(storage.raw(), record("other tab"));
  assert.deepEqual(reasons, ["conflict"]);
  assert.equal(storage.writes.length, 0);
});

test("delayed storage events compare current bytes and unrelated storage areas/keys are ignored", async () => {
  const { storage, guard } = fixture();
  const latest = record("latest own save");
  await guard.queueWrite(latest);
  guard.observeStorage({ key, storageArea: storage, newValue: record("outdated event") });
  assert.deepEqual(guard.getStatus(), { state: "ready" });
  storage.externalWrite(record("external"));
  guard.observeStorage({ key: "unrelated", storageArea: storage });
  guard.observeStorage({ key, storageArea: memoryStorage() });
  assert.deepEqual(guard.getStatus(), { state: "ready" });
  guard.observeStorage({ key, storageArea: storage });
  assert.deepEqual(guard.getStatus(), { state: "blocked", reason: "conflict" });
});

test("malformed and unsupported original records block independently of caller checks", async () => {
  for (const malformed of ["", "{bad json", "null", "[]", "{}", '{"version":2,"conversations":[]}', '{"version":1,"conversations":null}']) {
    const { storage, guard, reasons, locks } = fixture(malformed, { isReadable: () => true });
    assert.deepEqual(guard.getStatus(), { state: "blocked", reason: "unreadable" });
    assert.equal(await guard.queueWrite(record("replacement")), "blocked");
    assert.equal(storage.raw(), malformed);
    assert.equal(storage.writes.length, 0);
    assert.equal(locks.requests.length, 0);
    assert.deepEqual(reasons, ["unreadable"]);
  }
});

test("domain validation can stop partial hydration without deleting the original record", async () => {
  for (const isReadable of [() => false, () => { throw new Error("invalid nested conversation"); }]) {
    const initial = record("partially readable");
    const { storage, guard } = fixture(initial, { isReadable });
    assert.equal(await guard.queueWrite(record("replacement")), "blocked");
    assert.equal(storage.raw(), initial);
    assert.equal(storage.writes.length, 0);
  }
  const { storage, guard } = fixture();
  guard.stop("unreadable");
  assert.equal(await guard.queueWrite(record("partial salvage")), "blocked");
  assert.equal(storage.raw(), record("original"));
});

test("malformed outgoing records never replace a valid saved workspace", async () => {
  const { storage, guard, reasons } = fixture();
  assert.equal(await guard.queueWrite("{bad json"), "blocked");
  assert.equal(storage.raw(), record("original"));
  assert.equal(await guard.queueWrite(record("later valid")), "blocked");
  assert.deepEqual(reasons, ["invalid-write"]);
});

test("a newly malformed underlying record is preserved as a conflict", async () => {
  const { storage, guard, reasons } = fixture();
  storage.externalWrite("{new malformed record");
  assert.equal(await guard.queueWrite(record("current valid")), "blocked");
  assert.equal(storage.raw(), "{new malformed record");
  assert.deepEqual(reasons, ["conflict"]);
});

test("blocked reads and quota writes stop later attempts and preserve the original", async () => {
  for (const failure of ["readError", "writeError"]) {
    const { storage, guard, reasons } = fixture();
    storage[failure] = Object.assign(new Error("synthetic storage failure"), { name: failure === "writeError" ? "QuotaExceededError" : "SecurityError" });
    assert.equal(await guard.queueWrite(record("unsaved draft")), "blocked");
    storage[failure] = null;
    assert.equal(await guard.queueWrite(record("later draft")), "blocked");
    assert.equal(storage.raw(), record("original"));
    assert.equal(storage.writes.length, 0);
    assert.deepEqual(reasons, ["storage-unavailable"]);
  }
});

test("storage-event read errors stop writes without touching the saved record", async () => {
  const { storage, guard } = fixture();
  storage.readError = new Error("blocked read");
  guard.observeStorage({ key, storageArea: storage });
  storage.readError = null;
  assert.equal(await guard.queueWrite(record("current tab")), "blocked");
  assert.equal(storage.raw(), record("original"));
});

test("no Web Locks and rejected lock requests fail closed rather than use a racy fallback", async () => {
  for (const locks of [undefined, null, { request: () => Promise.reject(new Error("denied")) }, { request() { throw new Error("denied synchronously"); } }]) {
    const { storage, guard, reasons } = fixture(record("original"), { locks });
    assert.equal(await guard.queueWrite(record("must stay local")), "blocked");
    assert.equal(storage.raw(), record("original"));
    assert.equal(storage.writes.length, 0);
    assert.deepEqual(reasons, ["lock-unavailable"]);
  }
});

test("lock acquisition has a bounded timeout that aborts queued writes", async () => {
  const { storage, locks, guard, reasons } = fixture(record("original"), { lockWaitMs: 50 });
  const release = locks.hold();
  assert.equal(await guard.queueWrite(record("queued")), "blocked");
  release();
  assert.deepEqual(reasons, ["lock-unavailable"]);
  assert.equal(storage.raw(), record("original"));
  assert.equal(storage.writes.length, 0);
});

test("dispose cancels waiting and pending writes and never notifies an unmounted view", async () => {
  const { storage, locks, guard, reasons } = fixture();
  const release = locks.hold();
  const pending = guard.queueWrite(record("pending"));
  guard.queueWrite(record("latest pending"));
  guard.dispose();
  assert.equal(await pending, "disposed");
  release();
  assert.equal(await guard.queueWrite(record("after unmount")), "disposed");
  guard.observeStorage({ key, storageArea: storage });
  guard.stop("unreadable");
  assert.deepEqual(guard.getStatus(), { state: "disposed" });
  assert.equal(storage.raw(), record("original"));
  assert.equal(storage.writes.length, 0);
  assert.deepEqual(reasons, []);
});

test("notification exceptions and status mutation cannot resume a stopped guard", async () => {
  const { storage, guard } = fixture(record("original"), { onBlocked: () => { throw new Error("view detached"); } });
  storage.externalWrite(record("external"));
  assert.equal(await guard.queueWrite(record("local")), "blocked");
  const publicStatus = guard.getStatus();
  publicStatus.state = "ready";
  assert.equal(await guard.queueWrite(record("still local")), "blocked");
  assert.equal(storage.raw(), record("external"));
});

for (const fixture of [{ key: "tay:writing-block:fixture", record: { versions: ["local writing"] } }, { key: "tay:writing-assets:v1", record: [{ id: "asset", content: "local asset" }] }]) {
  test(`generic record guard protects ${fixture.key} and respects a paused workspace`, async () => {
    const storage = memoryStorage();
    const locks = lockManager();
    let allowed = true;
    const guard = createBrowserRecordStorageGuard({ storage, key: fixture.key, initialRaw: null, locks,
      canWrite: () => allowed, isReadable: value => Array.isArray(fixture.record) ? Array.isArray(value) : Boolean(value && Array.isArray(value.versions)) });
    assert.equal(await guard.queueWrite(JSON.stringify(fixture.record)), "saved");
    const original = storage.getItem(fixture.key);
    allowed = false;
    assert.equal(await guard.queueWrite(JSON.stringify(fixture.record)), "blocked");
    assert.equal(storage.getItem(fixture.key), original);
    assert.deepEqual(guard.getStatus(), { state: "blocked", reason: "conflict" });
    guard.dispose();
  });
}
