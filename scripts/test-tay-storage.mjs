/** Real SQLite regression checks for the Tay workspace storage boundary. */
import assert from "node:assert/strict";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";

const require = createRequire(import.meta.url);
const ts = require("typescript");
const previousTsLoader = require.extensions[".ts"];
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

const signals = [
  ["TAY_SERVERLESS_BUILD", "1"],
  ["NETLIFY", "true"],
  ["AWS_LAMBDA_FUNCTION_NAME", "tay-storage-test"],
  ["VERCEL", "1"],
];
const environmentKeys = ["TAY_DATA_DIR", "CONTEXT", ...signals.map(([key]) => key)];
const originalEnvironment = new Map(environmentKeys.map((key) => [key, process.env[key]]));
for (const key of environmentKeys) delete process.env[key];

const testRoot = mkdtempSync(join(tmpdir(), "tay-storage-test-"));
const dataDir = join(testRoot, "workspace");
const databaseFile = join(dataDir, "tay.sqlite");
process.env.TAY_DATA_DIR = dataDir;

const { getDatabase, openDatabase, resetDatabaseForTests, WorkspaceStorageError } = require("../lib/tay/db.ts");
const { fail } = require("../lib/tay/http.ts");
const failures = [];
let passed = 0;

async function check(name, fn) {
  try {
    await fn();
    passed++;
    console.log(`PASS ${name}`);
  } catch (error) {
    failures.push({ name, error });
  }
}

function expectUnavailable(fn) {
  let captured;
  assert.throws(fn, (error) => {
    captured = error;
    return error instanceof WorkspaceStorageError && error.status === 503;
  });
  return captured;
}

try {
  await check("filesystem failures return safe, non-cacheable 503 JSON", async () => {
    // A regular file blocks mkdir without depending on the test user's UID.
    writeFileSync(dataDir, "This is an isolated test fixture, not a directory.");
    try {
      const error = expectUnavailable(() => getDatabase());
      assert.ok(error.cause instanceof Error, "Keep the original error for private diagnostics.");
      assert.ok(error.cause.message.includes(dataDir), "The fixture must exercise an error containing its path.");
      const response = fail(error);
      assert.equal(response.status, 503);
      assert.equal(response.headers.get("cache-control"), "no-store");
      const body = await response.json();
      assert.deepEqual(Object.keys(body).sort(), ["error", "ok"]);
      assert.equal(body.ok, false);
      assert.equal(body.error, error.message);
      assert.match(body.error, /storage.*unavailable/i);
      assert.equal(JSON.stringify(body).includes(dataDir), false);
      assert.doesNotMatch(JSON.stringify(body), /EEXIST|ENOTDIR|mkdir|stack|cause/);
    } finally {
      rmSync(dataDir, { force: true });
    }
  });

  await check("a failed initialization does not poison the cached connection", () => {
    mkdirSync(dataDir, { recursive: true });
    writeFileSync(databaseFile, "Not a SQLite database.");
    try {
      expectUnavailable(() => getDatabase());
    } finally {
      rmSync(databaseFile, { force: true });
    }
    const db = getDatabase();
    assert.equal(db.get("SELECT COUNT(*) AS count FROM users").count, 0);
  });

  await check("saved artifacts survive closing and reopening real SQLite storage", () => {
    const db = getDatabase();
    db.run(
      "INSERT INTO project_files (id, project_id, path, content, version, updated_at) VALUES (?,?,?,?,?,?)",
      ["file_storage_probe", "project_storage_probe", "briefs/storage.md", "Persisted on disk.", 1, "2026-10-19T00:00:00Z"],
    );
    resetDatabaseForTests();
    assert.throws(() => db.get("SELECT 1"), /closed|not open/i);
    const reopened = getDatabase();
    assert.notEqual(reopened, db);
    const row = reopened.get("SELECT content, version FROM project_files WHERE id = ?", ["file_storage_probe"]);
    assert.deepEqual({ ...row }, { content: "Persisted on disk.", version: 1 });
  });

  for (const [key, value] of signals) {
    await check(`${key} rejects cached and new SQLite handles, including writable temporary paths`, () => {
      getDatabase(); // A previously successful local handle must not bypass the guard.
      const attemptedFile = join(testRoot, `denied-${key}`, "tay.sqlite");
      process.env[key] = value;
      try {
        expectUnavailable(() => getDatabase());
        expectUnavailable(() => openDatabase(attemptedFile));
        assert.equal(existsSync(dirname(attemptedFile)), false, "Denied storage must not create files or directories.");
        resetDatabaseForTests();
        expectUnavailable(() => getDatabase());
      } finally {
        delete process.env[key];
      }
      assert.equal(getDatabase().get("SELECT COUNT(*) AS count FROM project_files").count, 1);
    });
  }

  await check("the database enforces one owner across independent connections", () => {
    const db = getDatabase();
    const insert = "INSERT INTO users (id,email,display_name,role,is_owner,disabled,password_salt,password_hash,created_at) VALUES (?,?,?,?,?,?,?,?,?)";
    const values = (id, isOwner) => [id, `${id}@example.test`, id, isOwner ? "owner" : "member", isOwner, 0, "fixture-salt", "fixture-hash", "2026-10-19T00:00:00Z"];
    db.run(insert, values("owner_storage_probe", 1));
    const other = openDatabase(databaseFile);
    try {
      assert.throws(() => other.run(insert, values("second_owner_storage_probe", 1)), /UNIQUE constraint failed: users\.is_owner/);
      other.run(insert, values("member_storage_probe", 0));
      assert.throws(() => other.run("UPDATE users SET is_owner = 1 WHERE id = ?", ["member_storage_probe"]), /UNIQUE constraint failed: users\.is_owner/);
      assert.equal(db.get("SELECT COUNT(*) AS count FROM users WHERE is_owner = 1").count, 1);
      assert.equal(db.get("SELECT COUNT(*) AS count FROM users WHERE is_owner = 0").count, 1);
    } finally {
      other.close();
    }
  });

  await check("Netlify builds embed the serverless marker without requiring runtime build variables", async () => {
    const cases = [
      { netlify: undefined, context: undefined, expected: "" },
      { netlify: "true", context: undefined, expected: "1" },
      { netlify: undefined, context: "production", expected: "1" },
      { netlify: undefined, context: "deploy-preview", expected: "1" },
      { netlify: undefined, context: "branch-deploy", expected: "1" },
    ];
    try {
      for (const [index, input] of cases.entries()) {
        if (input.netlify === undefined) delete process.env.NETLIFY;
        else process.env.NETLIFY = input.netlify;
        if (input.context === undefined) delete process.env.CONTEXT;
        else process.env.CONTEXT = input.context;
        const url = new URL(`../next.config.mjs?storage-test=${index}`, import.meta.url);
        const { default: config } = await import(url.href);
        assert.equal(config.env.TAY_SERVERLESS_BUILD, input.expected);
      }
    } finally {
      delete process.env.NETLIFY;
      delete process.env.CONTEXT;
    }
  });
} finally {
  resetDatabaseForTests();
  rmSync(testRoot, { recursive: true, force: true });
  for (const [key, value] of originalEnvironment) {
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
  if (previousTsLoader) require.extensions[".ts"] = previousTsLoader;
  else delete require.extensions[".ts"];
}

if (failures.length) {
  for (const { name, error } of failures) console.error(`FAIL ${name}\n${error.stack ?? error}`);
  process.exitCode = 1;
} else {
  console.log(`Tay storage safety: ${passed} checks passed.`);
}
