"use strict";

const assert = require("node:assert/strict");
const { execFileSync } = require("node:child_process");
const { mkdtempSync, rmSync } = require("node:fs");
const { tmpdir } = require("node:os");
const { join, resolve } = require("node:path");
const { after, test } = require("node:test");

const root = resolve(__dirname, "..");
const temp = mkdtempSync(join(tmpdir(), "tay-composer-intent-"));
let resolveComposerIntent;
try {
  execFileSync(process.execPath, [require.resolve("typescript/bin/tsc"),
    join(root, "lib/composer-intent.ts"), "--target", "ES2022", "--module", "commonjs",
    "--moduleResolution", "node", "--strict", "--skipLibCheck", "--outDir", temp,
  ], { cwd: root, stdio: "inherit" });
  ({ resolveComposerIntent } = require(join(temp, "composer-intent.js")));
} catch (error) {
  rmSync(temp, { recursive: true, force: true });
  throw error;
}
after(() => rmSync(temp, { recursive: true, force: true }));

const proposal = (permissionStatus = "allowed", type = "create_task") => ({ action: { permissionStatus, type } });
const web = (patch = {}) => ({ runtime: "web", actionBusy: false, response: null, hasResult: false, queuedCount: 0, ...patch });
const desktop = (patch = {}) => ({ runtime: "desktop", loaded: true, busy: false, submitting: false,
  agentEnabled: true, hasActiveObjective: false, queuedCount: 0, ...patch });

function checkResolution(result, intent, reasonCode, canSubmit = true) {
  assert.equal(result.effectiveIntent, intent);
  assert.equal(result.buttonLabel, { send: "Send", queue: "Queue", steer: "Steer" }[intent]);
  assert.equal(result.reasonCode, reasonCode);
  assert.equal(result.canSubmit, canSubmit);
  assert.ok(result.reason.length > 0, "every routing outcome has visible explanation");
}

test("idle web Send is labeled Send and starts a new request", () => {
  const result = resolveComposerIntent("send", web());
  checkResolution(result, "send", "send_ready");
  assert.equal(result.requestedIntent, "send");
  assert.equal(result.canSteer, false);
});

test("only actionable, unresolved proposals make web Send queue", () => {
  for (const permissionStatus of ["allowed", "requires_approval"]) {
    checkResolution(resolveComposerIntent("send", web({ response: proposal(permissionStatus) })), "queue", "proposal_pending");
  }
  for (const response of [proposal("blocked"), proposal("allowed", "none"), proposal("requires_approval", "none"), proposal("blocked", "none")]) {
    checkResolution(resolveComposerIntent("send", web({ response })), "send", "send_ready");
  }
  checkResolution(resolveComposerIntent("send", web({ response: proposal(), hasResult: true })), "send", "send_ready");
});

test("running actions and existing backlog keep web requests queued", () => {
  checkResolution(resolveComposerIntent("send", web({ actionBusy: true })), "queue", "work_running");
  checkResolution(resolveComposerIntent("send", web({ actionBusy: true, response: proposal("blocked") })), "queue", "work_running");
  for (const queuedCount of [1, 3, 40]) {
    checkResolution(resolveComposerIntent("send", web({ queuedCount })), "queue", "queue_pending");
    checkResolution(resolveComposerIntent("send", web({ queuedCount, response: proposal(), hasResult: true })), "queue", "queue_pending");
  }
  assert.match(resolveComposerIntent("send", web({ queuedCount: 1 })).reason, /open Queue to start/i);
});

test("explicit Queue remains Queue even when idle or an action is pending", () => {
  for (const context of [web(), web({ actionBusy: true }), web({ response: proposal() }), web({ queuedCount: 4 }), desktop(), desktop({ hasActiveObjective: true })]) {
    const result = resolveComposerIntent("queue", context);
    checkResolution(result, "queue", "queue_requested");
    assert.equal(result.requestedIntent, "queue");
  }
});

test("web Steer keeps the existing pre-execution guard without substituting Send or Queue", () => {
  for (const response of [proposal(), proposal("requires_approval"), proposal("blocked"), proposal("allowed", "none")]) {
    const result = resolveComposerIntent("steer", web({ response, queuedCount: 2 }));
    checkResolution(result, "steer", "steer_ready");
    assert.equal(result.canSteer, true);
    assert.match(result.reason, /Approval rules still apply/);
  }
  for (const context of [web(), web({ response: proposal(), hasResult: true }), web({ response: proposal(), actionBusy: true })]) {
    const result = resolveComposerIntent("steer", context);
    checkResolution(result, "steer", "steer_unavailable", false);
    assert.equal(result.canSteer, false);
  }
});

test("desktop Send exposes queue semantics for active or waiting objectives", () => {
  const idle = resolveComposerIntent("send", desktop());
  checkResolution(idle, "send", "desktop_ready");
  assert.match(idle.reason, /Mac queue/);
  checkResolution(resolveComposerIntent("send", desktop({ hasActiveObjective: true })), "queue", "desktop_active");
  checkResolution(resolveComposerIntent("send", desktop({ queuedCount: 2 })), "queue", "desktop_queue");
  checkResolution(resolveComposerIntent("send", desktop({ hasActiveObjective: true, queuedCount: 2 })), "queue", "desktop_active");
});

test("a desktop dependency is explicit queue intent without assuming its completion status", () => {
  const result = resolveComposerIntent("send", desktop({ hasDependency: true }));
  checkResolution(result, "queue", "desktop_dependency");
  assert.match(result.reason, /^Send will queue with the selected Start after dependency/);
  assert.doesNotMatch(result.reason, /wait|pending|unfinished/i);
  checkResolution(resolveComposerIntent("queue", desktop({ hasDependency: true })), "queue", "queue_requested");
  checkResolution(resolveComposerIntent("steer", desktop({ hasDependency: true })), "steer", "steer_unavailable", false);
  checkResolution(resolveComposerIntent("steer", desktop({ hasDependency: true, hasActiveObjective: true })), "steer", "steer_ready");
});

test("every available Send-to-Queue fallback explains the change before submission", () => {
  for (const context of [web({ actionBusy: true }), web({ response: proposal() }), web({ queuedCount: 1 }),
    desktop({ hasActiveObjective: true }), desktop({ queuedCount: 1 }), desktop({ hasDependency: true })]) {
    const result = resolveComposerIntent("send", context);
    assert.equal(result.effectiveIntent, "queue");
    assert.match(result.reason, /^Send will queue/);
    if (context.runtime === "web") assert.match(result.reason, /Open Queue to start it later/);
  }
});

test("desktop mutation busy is unavailable rather than confused with an active objective", () => {
  for (const patch of [{ busy: true }, { submitting: true }, { busy: true, submitting: true }]) {
    for (const chosenIntent of ["send", "queue", "steer"]) {
      const result = resolveComposerIntent(chosenIntent, desktop({ hasActiveObjective: true, ...patch }));
      checkResolution(result, chosenIntent === "steer" ? "steer" : "queue", "desktop_busy", false);
      assert.equal(result.canSteer, false);
    }
  }
  checkResolution(resolveComposerIntent("send", desktop({ busy: true })), "send", "desktop_busy", false);
});

test("desktop loading and disabled-agent guards preserve the chosen Steer intent", () => {
  for (const [patch, code] of [[{ loaded: false }, "desktop_loading"], [{ agentEnabled: false }, "desktop_agent_unavailable"]]) {
    for (const chosenIntent of ["send", "queue", "steer"]) {
      const result = resolveComposerIntent(chosenIntent, desktop(patch));
      checkResolution(result, chosenIntent, code, false);
      assert.equal(result.canSteer, false);
    }
  }
});

test("desktop Steer requires an active objective even with a nonempty queue", () => {
  for (const queuedCount of [0, 5]) {
    checkResolution(resolveComposerIntent("steer", desktop({ queuedCount })), "steer", "steer_unavailable", false);
    const result = resolveComposerIntent("steer", desktop({ hasActiveObjective: true, queuedCount }));
    checkResolution(result, "steer", "steer_ready");
    assert.equal(result.canSteer, true);
    assert.match(result.reason, /after its current model response/);
  }
});

test("all web state combinations retain the original routing and steering safeguards", () => {
  const responses = [null, proposal(), proposal("requires_approval"), proposal("blocked"), proposal("allowed", "none"), proposal("blocked", "none")];
  for (const chosenIntent of ["send", "queue", "steer"]) {
    for (const response of responses) for (const hasResult of [false, true]) {
      for (const actionBusy of [false, true]) for (const queuedCount of [0, 1, 5]) {
        const context = web({ response, hasResult, actionBusy, queuedCount });
        const result = resolveComposerIntent(chosenIntent, context);
        const actionable = response && !hasResult && response.action.permissionStatus !== "blocked" && response.action.type !== "none";
        const expected = chosenIntent === "steer" ? "steer" : chosenIntent === "queue" || actionBusy || actionable || queuedCount ? "queue" : "send";
        assert.equal(result.effectiveIntent, expected, JSON.stringify(context));
        assert.equal(result.canSteer, Boolean(response && !hasResult && !actionBusy));
        assert.equal(result.canSubmit, chosenIntent !== "steer" || result.canSteer);
      }
    }
  }
});

test("all desktop state combinations retain bridge and active-objective safeguards", () => {
  for (const chosenIntent of ["send", "queue", "steer"]) {
    for (const loaded of [false, true]) for (const busy of [false, true]) for (const submitting of [false, true]) {
      for (const agentEnabled of [false, true]) for (const hasActiveObjective of [false, true]) for (const queuedCount of [0, 3]) for (const hasDependency of [false, true]) {
        const context = desktop({ loaded, busy, submitting, agentEnabled, hasActiveObjective, queuedCount, hasDependency });
        const result = resolveComposerIntent(chosenIntent, context);
        const available = loaded && !busy && !submitting && agentEnabled;
        assert.equal(result.canSteer, available && hasActiveObjective, JSON.stringify(context));
        assert.equal(result.canSubmit, available && (chosenIntent !== "steer" || hasActiveObjective));
        assert.equal(result.effectiveIntent, chosenIntent === "send" && (hasActiveObjective || queuedCount > 0 || hasDependency) ? "queue" : chosenIntent);
      }
    }
  }
});

test("resolution is deterministic and leaves caller-owned state unchanged", () => {
  const response = Object.freeze({ action: Object.freeze({ type: "create_task", permissionStatus: "requires_approval" }) });
  const context = Object.freeze(web({ response, queuedCount: 3 }));
  const before = JSON.stringify(context);
  const first = resolveComposerIntent("send", context);
  assert.deepEqual(resolveComposerIntent("send", context), first);
  assert.equal(JSON.stringify(context), before);
});
