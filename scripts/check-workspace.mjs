import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const ts = require("typescript");
require.extensions[".ts"] = (module, filename) => module._compile(ts.transpileModule(readFileSync(filename, "utf8"), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText, filename);
const { addQueuedRequest, moveQueuedRequest, recordMomentum, completedToday, readWorkspaceState } = require("../lib/workspace-state.ts");
const requests = Array.from({ length: 8 }, (_, i) => ({ id: `objective-${i}`, text: `Objective ${i}`, agentId: "tay", mode: "chat", paused: false }));
let queue = requests.reduce(addQueuedRequest, []);
assert.equal(queue.length, 8, "queue accepts more than three objectives");
assert.equal(addQueuedRequest(queue, requests[0]), queue, "acceptance is idempotent");
assert.equal(moveQueuedRequest(queue, "objective-2", -1)[1].id, "objective-2");
assert.equal(moveQueuedRequest(queue, "missing", -1), queue);
assert.equal(moveQueuedRequest(queue, "objective-0", -1), queue);
assert.equal(queue[0].id, "objective-0", "reordering does not mutate the original queue");
// Momentum belongs to the user's local calendar day, not the UTC date in its stored timestamp.
const completedAt = new Date(2026, 9, 4, 14).toISOString();
const reportDate = new Date(2026, 9, 4, 18);
const nextDay = new Date(2026, 9, 5, 18);
const events = recordMomentum([], "verified-move", completedAt);
assert.equal(recordMomentum(events, "verified-move", nextDay.toISOString()), events, "repeat execution cannot farm progress on another day");
assert.equal(events[0].at, completedAt, "repeated execution preserves the original completion timestamp");
assert.equal(completedToday(events, reportDate), 1);
assert.equal(completedToday(events, nextDay), 0);
const boundaryEvents = [
  new Date(2026, 9, 3, 23, 59, 59, 999),
  new Date(2026, 9, 4, 0, 0, 0, 0),
  new Date(2026, 9, 4, 23, 59, 59, 999),
  new Date(2026, 9, 5, 0, 0, 0, 0),
].map((at, index) => ({ id: `boundary-${index}`, at: at.toISOString() }));
assert.equal(completedToday(boundaryEvents, reportDate), 2, "today includes both local day boundaries and excludes adjacent days");
globalThis.localStorage = { getItem: () => JSON.stringify({ version: 1, conversations: [] }) };
assert.equal(readWorkspaceState().version, 1);
globalThis.localStorage.getItem = () => JSON.stringify({ version: 99 });
assert.equal(readWorkspaceState(), null);
delete globalThis.localStorage;
const { getAgentActionPolicy } = require("../lib/agent-foundation.ts");
assert.equal(getAgentActionPolicy("kj", "plan").allowed, true);
assert.equal(getAgentActionPolicy("kj", "payment", true).allowed, false, "KJ selection cannot grant payment authority");
assert.equal(getAgentActionPolicy("kj", "execute_local_task", true).allowed, false);
const { unseenCompletedWork, appendRecentCompletions } = require("../lib/task-completion-notices.ts");
const completed = ["existing", "new-one", "new-one", "new-two"].map(id => ({
  id, title: id, summary: `Verified result for ${id}`,
}));
assert.deepEqual(
  unseenCompletedWork(completed, new Set(["existing"])).map(item => item.id),
  ["new-one", "new-two"],
  "completion notifications never replay already observed tasks or duplicate polling responses",
);
assert.deepEqual(
  appendRecentCompletions(
    [{ id: "older", title: "Older", summary: "Already announced" }],
    completed,
    3,
  ).map(item => item.id),
  ["existing", "new-one", "new-two"],
  "only the latest three unique completions remain visible",
);
assert.deepEqual(
  appendRecentCompletions(completed.slice(0, 2), [], 3).map(item => item.id),
  ["existing", "new-one"],
  "no new completions means no new announcements",
);

console.log("Workspace checks passed: queue capacity, idempotency, immutable reorder, earned progress, storage schema.");
