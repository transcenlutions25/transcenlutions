/** Regression checks for console-only founding-owner provisioning. */
import assert from "node:assert/strict";
import { after, test } from "node:test";
import { existsSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import { requireSource } from "./tay-source-loader.mjs";

const root = mkdtempSync(join(tmpdir(), "tay-owner-regression-"));
const email = "founder@example.test";
const password = "a synthetic owner password";
process.env.TAY_DATA_DIR = join(root, "request-store");
process.env.TAY_OWNER_EMAIL = email;
process.env.TAY_PUBLIC_ORIGIN = "https://tay.example.test";
// These fixtures exercise a persistent single-server runtime, never real data.
for (const flag of ["TAY_SERVERLESS_BUILD", "NETLIFY", "AWS_LAMBDA_FUNCTION_NAME", "VERCEL"]) delete process.env[flag];

const { openDatabase } = requireSource("../lib/tay/db.ts");
const accounts = requireSource("../lib/tay/accounts.ts");
const { POST: bootstrapRequest } = requireSource("../app/api/tay/bootstrap/route.ts");
const cli = fileURLToPath(new URL("./provision-tay-owner.mjs", import.meta.url));
const repo = fileURLToPath(new URL("../", import.meta.url));

after(() => rmSync(root, { recursive: true, force: true }));

function withDatabase(name, check) {
  const db = openDatabase(join(root, name, "tay.sqlite"));
  try {
    return check(db);
  } finally {
    db.close();
  }
}

function rows(db) {
  return Object.fromEntries(["users", "sessions", "projects", "audit_events"].map((table) => [table, db.all(`SELECT * FROM ${table} ORDER BY rowid`)]));
}

function runConsole(name, args = ["--password-stdin"], secret = password) {
  return spawnSync(process.execPath, [cli, ...args], {
    cwd: repo,
    env: {
      ...process.env,
      NODE_ENV: "production",
      TAY_DATA_DIR: join(root, name),
      TAY_OWNER_EMAIL: email,
      TAY_OWNER_NAME: "Founding Owner",
    },
    input: `${secret}\n`,
    encoding: "utf8",
    timeout: 15000,
  });
}

test("provisioning requires a valid configured founder in every environment", () => {
  const previousMode = process.env.NODE_ENV;
  try {
    withDatabase("missing-identity", (db) => {
      for (const mode of ["development", "production"]) {
        process.env.NODE_ENV = mode;
        for (const value of [undefined, "", "not-an-email"]) {
          if (value === undefined) delete process.env.TAY_OWNER_EMAIL;
          else process.env.TAY_OWNER_EMAIL = value;
          assert.throws(() => accounts.provisionOwnerFromConsole(db, password, "Founder"), /valid TAY_OWNER_EMAIL/);
          assert.equal(accounts.countUsers(db), 0);
        }
      }
    });
  } finally {
    process.env.TAY_OWNER_EMAIL = email;
    if (previousMode === undefined) delete process.env.NODE_ENV;
    else process.env.NODE_ENV = previousMode;
  }
});

test("provisioning stores one immutable identity and password hash without a session", () => {
  withDatabase("provision", (db) => {
    const owner = accounts.provisionOwnerFromConsole(db, password, "Founding Owner");
    assert.equal(owner.email, email);
    assert.equal(owner.isOwner, true);
    assert.match(owner.id, /^usr_[0-9a-f]{24}$/);
    assert.equal(accounts.authenticate(db, email, password)?.id, owner.id);
    assert.equal(db.get("SELECT COUNT(*) AS n FROM sessions").n, 0);
    const stored = db.get("SELECT * FROM users WHERE id = ?", [owner.id]);
    assert.notEqual(stored.password_hash, password);
    assert.equal(accounts.verifyPassword(password, stored.password_salt, stored.password_hash), true);
    const event = db.get("SELECT * FROM audit_events WHERE kind = 'owner_provisioned'");
    assert.deepEqual(JSON.parse(event.detail), { ownerBinding: "operator_console", userId: owner.id });
    assert.equal(JSON.stringify(event).includes(password), false);
  });
});

test("reprovisioning preserves an existing owner's ID, password, sessions and projects", () => {
  withDatabase("preserve-owner", (db) => {
    const owner = accounts.provisionOwnerFromConsole(db, password, "Original Owner");
    accounts.createSession(db, owner.id);
    db.run("INSERT INTO projects (id, owner_id, name, summary, status, created_at, updated_at) VALUES (?,?,?,?,?,?,?)", [
      "preserved-project", owner.id, "Existing work", "Keep this data", "active", accounts.now(), accounts.now(),
    ]);
    const before = rows(db);
    try {
      for (const configured of [email, "replacement@example.test"]) {
        process.env.TAY_OWNER_EMAIL = configured;
        assert.throws(() => accounts.provisionOwnerFromConsole(db, "different synthetic password", "Replacement"), /already exists/);
        assert.deepEqual(rows(db), before);
      }
    } finally {
      process.env.TAY_OWNER_EMAIL = email;
    }
    assert.equal(accounts.authenticate(db, email, password)?.id, owner.id);
  });
});

test("a pre-existing account is never automatically promoted or overwritten", () => {
  withDatabase("preserve-member", (db) => {
    const member = accounts.createUser(db, email, password, "Existing Member", "member");
    const before = rows(db);
    assert.throws(() => accounts.provisionOwnerFromConsole(db, "new synthetic password", "Owner"), /cannot promote or replace/);
    assert.deepEqual(rows(db), before);
    assert.equal(accounts.authenticate(db, email, password)?.id, member.id);
    assert.equal(accounts.ownerExists(db), false);
  });
});

test("an audit failure rolls back owner creation and releases the transaction", () => {
  withDatabase("atomic", (db) => {
    db.run("CREATE TRIGGER reject_owner_audit BEFORE INSERT ON audit_events BEGIN SELECT RAISE(ABORT, 'synthetic audit failure'); END");
    assert.throws(() => accounts.provisionOwnerFromConsole(db, password, "Founder"), /synthetic audit failure/);
    assert.equal(accounts.countUsers(db), 0);
    assert.equal(db.get("SELECT COUNT(*) AS n FROM audit_events").n, 0);
    db.run("DROP TRIGGER reject_owner_audit");
    assert.equal(accounts.provisionOwnerFromConsole(db, password, "Founder").isOwner, true);
  });
});

test("the real HTTP handler rejects the correct founder email without creating storage or a cookie", async () => {
  assert.equal(existsSync(join(root, "request-store")), false);
  const response = await bootstrapRequest(new Request("https://tay.example.test/api/tay/bootstrap", {
    method: "POST",
    headers: { "content-type": "application/json", origin: "https://tay.example.test" },
    body: JSON.stringify({ email, password, displayName: "Founder", role: "owner", isOwner: true }),
  }));
  assert.equal(response.status, 403);
  assert.equal(response.headers.has("set-cookie"), false);
  assert.deepEqual(await response.json(), { ok: false, error: "Owner setup is unavailable through the website." });
  assert.equal(existsSync(join(root, "request-store")), false);
});

test("the disabled bootstrap still enforces the actual bounded JSON boundary", async () => {
  const wrongOrigin = await bootstrapRequest(new Request("https://tay.example.test/api/tay/bootstrap", {
    method: "POST",
    headers: { "content-type": "application/json", origin: "https://unrelated.example.test" },
    body: "{}",
  }));
  assert.equal(wrongOrigin.status, 403);
  assert.equal((await wrongOrigin.json()).error, "Cross-site request rejected.");
  const oversized = await bootstrapRequest(new Request("https://tay.example.test/api/tay/bootstrap", {
    method: "POST",
    headers: { "content-type": "application/json", origin: "https://tay.example.test" },
    body: JSON.stringify({ extra: "x".repeat(9000) }),
  }));
  assert.equal(oversized.status, 413);
  assert.equal(existsSync(join(root, "request-store")), false);
});

test("the protected console pipe provisions a usable account without printing its password", () => {
  const result = runConsole("cli-account");
  assert.equal(result.error, undefined);
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /Founding owner provisioned/);
  assert.equal(`${result.stdout}${result.stderr}`.includes(password), false);
  const db = openDatabase(join(root, "cli-account", "tay.sqlite"));
  try {
    const owner = accounts.authenticate(db, email, password);
    assert.equal(owner?.isOwner, true);
    assert.equal(db.get("SELECT COUNT(*) AS n FROM sessions").n, 0);
    const before = rows(db);
    const repeated = runConsole("cli-account", ["--password-stdin"], "a different synthetic password");
    assert.equal(repeated.status, 1);
    assert.deepEqual(rows(db), before);
  } finally {
    db.close();
  }
});

test("password arguments and implicit non-terminal input are refused without logging secrets", () => {
  const badArgs = runConsole("cli-args", ["--password", password]);
  assert.equal(badArgs.error, undefined);
  assert.equal(badArgs.status, 1);
  assert.equal(`${badArgs.stdout}${badArgs.stderr}`.includes(password), false);
  assert.equal(existsSync(join(root, "cli-args")), false);
  const noFlag = runConsole("cli-no-flag", []);
  assert.equal(noFlag.error, undefined);
  assert.equal(noFlag.status, 1);
  assert.equal(`${noFlag.stdout}${noFlag.stderr}`.includes(password), false);
  assert.equal(existsSync(join(root, "cli-no-flag")), false);
});
