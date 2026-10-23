/**
 * Drains the durable Tay agent job queue.
 *
 * This is a foreground process, not a hidden daemon: it logs every job it
 * claims and exits when told to. Run it under a process supervisor in
 * production, with the same TAY_DATA_DIR (or hosted database) as the app.
 *
 *   node scripts/tay-queue-worker.mjs --once
 *   node scripts/tay-queue-worker.mjs --minutes=30 --project=prj_...
 *
 * Options:
 *   --once              drain the ready queue, then exit
 *   --minutes=<n>       maximum wall time (default 10)
 *   --project=<id>      only work on one project
 *   --owner=<name>      lease owner label (default worker:<pid>)
 */
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const ts = require("typescript");
require.extensions[".ts"] = (module, filename) =>
  module._compile(
    ts.transpileModule(readFileSync(filename, "utf8"), {
      compilerOptions: {
        esModuleInterop: true,
        module: ts.ModuleKind.CommonJS,
        moduleResolution: ts.ModuleResolutionKind.NodeJs,
        target: ts.ScriptTarget.ES2022,
      },
      fileName: filename,
    }).outputText,
    filename,
  );

const { getDatabase } = require("../lib/tay/db.ts");
const { queueHealth, runQueueTick } = require("../lib/tay/queue.ts");

const argv = process.argv.slice(2);
const option = (name) => {
  const hit = argv.find((value) => value.startsWith(`--${name}=`));
  return hit ? hit.slice(name.length + 3) : null;
};

const once = argv.includes("--once");
const minutes = Math.max(Number(option("minutes") ?? 10), 1);
const projectId = option("project") ?? undefined;
const owner = option("owner") ?? `worker:${process.pid}`;
const leaseSeconds = 120;
const deadline = Date.now() + minutes * 60_000;

const db = getDatabase();
console.log(JSON.stringify({ at: new Date().toISOString(), worker: owner, once, minutes, projectId: projectId ?? null }));

process.on("SIGINT", () => {
  db.close();
  process.exit(0);
});
process.on("SIGTERM", () => {
  db.close();
  process.exit(0);
});

for (;;) {
  const tick = await runQueueTick(db, { owner, limit: 5, leaseSeconds, projectId });
  if (tick.processed > 0) {
    console.log(JSON.stringify({ at: new Date().toISOString(), ...tick }));
  }
  if (once && tick.processed === 0) break;
  if (!once && Date.now() >= deadline) break;
  if (tick.processed === 0) await new Promise((resolve) => setTimeout(resolve, 2000));
}

console.log(JSON.stringify({ at: new Date().toISOString(), health: queueHealth(db, projectId) }));
db.close();
