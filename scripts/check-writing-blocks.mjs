import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { createRequire } from "node:module";

const temp = mkdtempSync(join(tmpdir(), "tay-writing-test-"));
try {
  execFileSync(process.execPath, [resolve("node_modules/typescript/bin/tsc"),
    "lib/writing-block.ts", "--target", "ES2022", "--module", "commonjs", "--skipLibCheck", "--outDir", temp,
  ], { stdio: "inherit" });
  const require = createRequire(import.meta.url);
  const lib = require(join(temp, "writing-block.js"));
  const exact = "Hello 👑\n\nhttps://example.com/?q=one&x=two\n- café\n- 中文\n\tconst value = `<a>`;\n";
  let state = lib.createWritingBlock(exact, 1000);
  assert.equal(lib.writingBlockText(state), exact, "preserve whitespace, Unicode and code exactly");
  let copied = "";
  assert.deepEqual(await lib.copyWritingText(exact, {
    writeText: async (text) => { copied = text; }, fallbackCopy: () => { throw new Error("must not use fallback"); }, selectForManualCopy: () => false,
  }), { copied: true, manualSelection: false });
  assert.equal(copied, exact, "modern clipboard receives only exact content");
  assert.deepEqual(await lib.copyWritingText(exact, {
    writeText: async () => { throw new Error("permission denied"); },
    fallbackCopy: (text) => { copied = text; return true; }, selectForManualCopy: () => false,
  }), { copied: true, manualSelection: false });
  assert.equal(copied, exact, "legacy fallback receives exact content after modern clipboard failure");
  let selected = false;
  assert.deepEqual(await lib.copyWritingText(exact, {
    writeText: async () => { throw new Error("denied"); }, fallbackCopy: () => false,
    selectForManualCopy: () => { selected = true; return true; },
  }), { copied: false, manualSelection: true });
  assert.equal(selected, true, "failed clipboard offers manual selection rather than silent failure");
  assert.deepEqual(await lib.copyWritingText(exact, {
    fallbackCopy: () => { throw new Error("unavailable"); }, selectForManualCopy: () => { throw new Error("not mounted"); },
  }), { copied: false, manualSelection: false });
  state = lib.editWritingBlock(state, exact + "User edit", "user", 2000, true);
  state = lib.editWritingBlock(state, exact + "User edited", "user", 2100, true);
  assert.equal(state.versions.length, 2, "coalesce a typing burst into one undo step");
  const saved = lib.parseWritingBlockState(JSON.stringify(state), "regenerated text");
  assert.equal(lib.writingBlockText(saved), exact + "User edited", "persisted user content overrides generation");
  assert.equal(lib.writingBlockText(lib.undoWritingBlock(saved)), exact);
  assert.equal(lib.writingBlockText(lib.redoWritingBlock(lib.undoWritingBlock(saved))), exact + "User edited");

  state = lib.createWritingBlock("before TARGET after", 1);
  const request = lib.createWritingRevisionRequest(state, "shorten", { start: 7, end: 13 });
  assert.equal(request.scope, "selection");
  assert.equal(request.selectedText, "TARGET");
  const revision = lib.applyWritingRevision(state, request, "NEW", 2);
  assert.equal(revision.applied, true);
  assert.equal(lib.writingBlockText(revision.state), "before NEW after", "only selected content changes");
  const changed = lib.editWritingBlock(state, "before USER after", "user", 3);
  assert.equal(lib.applyWritingRevision(changed, request, "NEW").applied, false, "reject stale AI results");
  const undoThenRedo = lib.redoWritingBlock(lib.undoWritingBlock(changed));
  assert.equal(lib.applyWritingRevision(undoThenRedo, request, "NEW").applied, false, "history movement invalidates old requests");
  const whole = lib.createWritingRevisionRequest(state, "rewrite", { start: 0, end: 0 });
  assert.equal(whole.scope, "block");
  assert.equal(lib.writingBlockText(lib.applyWritingRevision(state, whole, "replacement").state), "replacement");

  let longHistory = lib.createWritingBlock(exact, 0);
  for (let i = 1; i < 100; i++) longHistory = lib.editWritingBlock(longHistory, `Revision ${i}`, "user", i * 1000);
  assert.equal(longHistory.versions.length, 60);
  assert.equal(longHistory.original, exact, "original survives bounded history");
  assert.equal(lib.writingBlockText(lib.restoreWritingVersion(longHistory, longHistory.original)), exact);
  assert.equal(lib.writingBlockText(lib.parseWritingBlockState("bad-json", "fallback")), "fallback");
  assert.equal(lib.writingBlockText(lib.parseWritingBlockState(JSON.stringify({ ...state, position: 999 }), "fallback")), "fallback");
  const branched = lib.editWritingBlock(lib.undoWritingBlock(revision.state), "new branch", "user");
  assert.equal(lib.redoWritingBlock(branched), branched, "editing after undo drops redo only, not the original");
  assert.ok(branched.archive.some((item) => item.content === "before NEW after"), "previous AI revisions survive editing after undo");
  const candidate = lib.recordWritingAlternative(branched, "new generation");
  assert.equal(lib.writingBlockText(candidate), "new branch", "regeneration cannot replace authored content");
  assert.ok(candidate.archive.some((item) => item.content === "new generation"));
  const asset = { id: "conversation:message:block", title: "Email", kind: "text", content: exact, updatedAt: 1 };
  const assets = lib.saveWritingAsset([asset], { ...asset, content: "edited", updatedAt: 2 });
  assert.equal(assets.length, 1);
  assert.equal(assets[0].content, "edited", "asset save uses authoritative edited content");
  assert.deepEqual(lib.parseWritingAssets(JSON.stringify(assets)), assets);
  assert.deepEqual(lib.parseWritingAssets("null"), []);
  console.log("Writing block checks passed: exact text, clipboard success/failure fallbacks, history, persistence, scoped revisions, stale-result protection, and asset versions.");
} finally {
  rmSync(temp, { recursive: true, force: true });
}
