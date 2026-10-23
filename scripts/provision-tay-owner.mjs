#!/usr/bin/env node
/**
 * Run only from the authorized operator's protected server console.
 * Required: TAY_OWNER_EMAIL. Optional: TAY_OWNER_NAME (display name).
 * TAY_DATA_DIR must refer to the same persistent store used by the application.
 * Passwords are entered without echo, or supplied on stdin with an explicit
 * --password-stdin flag. Never place a password in arguments or configuration.
 */
import { createInterface } from "node:readline";
import { Writable } from "node:stream";

class ConsoleInputError extends Error {}

function hiddenPassword(prompt) {
  return new Promise((resolve, reject) => {
    // readline still handles editing, Unicode, Ctrl+C and terminal restoration,
    // but its echo output is discarded, including on redirected console logs.
    const silentOutput = new Writable({ write(_chunk, _encoding, done) { done(); } });
    const input = createInterface({ input: process.stdin, output: silentOutput, terminal: true });
    let settled = false;
    function cancel() {
      if (settled) return;
      settled = true;
      input.close();
      process.stderr.write("\n");
      reject(new ConsoleInputError("Owner provisioning was cancelled."));
    }
    input.once("SIGINT", cancel);
    input.once("close", cancel);
    process.stderr.write(prompt);
    input.question("", (value) => {
      settled = true;
      input.close();
      process.stderr.write("\n");
      resolve(value);
    });
  });
}

async function stdinPassword() {
  const chunks = [];
  let bytes = 0;
  for await (const chunk of process.stdin) {
    bytes += chunk.length;
    if (bytes > 1024) throw new ConsoleInputError("Password input is too long.");
    chunks.push(chunk);
  }
  let value;
  try {
    value = new TextDecoder("utf-8", { fatal: true }).decode(Buffer.concat(chunks));
  } catch {
    throw new ConsoleInputError("Password input must be valid UTF-8 text.");
  }
  // A pipe may add one line ending. Preserve spaces and every other character.
  value = value.replace(/\r?\n$/, "");
  if (/[\r\n]/.test(value)) throw new ConsoleInputError("Supply exactly one password on stdin.");
  return value;
}

async function main() {
  const args = process.argv.slice(2);
  if (args.length === 1 && args[0] === "--help") {
    process.stdout.write(
      "Usage: node scripts/provision-tay-owner.mjs [--password-stdin]\n" +
      "Run from the protected server console with TAY_OWNER_EMAIL configured.\n" +
      "Set TAY_DATA_DIR to the application's persistent store and optionally TAY_OWNER_NAME.\n" +
      "Default: enter and confirm a hidden password in the terminal.\n" +
      "--password-stdin: read one password from a protected pipe, never from command arguments.\n" +
      "Existing accounts, ownership and passwords are never replaced.\n",
    );
    return;
  }
  if (args.length > 1 || (args.length === 1 && args[0] !== "--password-stdin")) {
    // Do not echo unknown arguments: someone may accidentally put a secret there.
    throw new ConsoleInputError("Unsupported arguments. Use --help; never pass a password as an argument.");
  }
  const [major, minor] = process.versions.node.split(".").map(Number);
  if (major !== 24 || minor < 15) throw new ConsoleInputError("Use Node 24.15.0 or later in the Node 24 line.");
  const piped = args[0] === "--password-stdin";
  if (piped && process.stdin.isTTY) {
    throw new ConsoleInputError("--password-stdin requires a protected pipe. Omit it for a hidden terminal prompt.");
  }
  if (!piped && (!process.stdin.isTTY || !process.stderr.isTTY)) {
    throw new ConsoleInputError("Use a protected terminal, or explicitly supply a secret pipe with --password-stdin.");
  }

  // Restrict newly created database files and directories without changing any
  // pre-existing permissions or records.
  process.umask(0o077);
  const { requireSource } = await import("./tay-source-loader.mjs");
  const accounts = requireSource("../lib/tay/accounts.ts");
  if (!accounts.normalizeEmail(process.env.TAY_OWNER_EMAIL)) {
    throw new ConsoleInputError("Set a valid TAY_OWNER_EMAIL in the protected server environment before provisioning.");
  }
  let password = piped ? await stdinPassword() : await hiddenPassword("Owner password: ");
  if (!piped) {
    let confirmation = await hiddenPassword("Confirm password: ");
    if (password !== confirmation) throw new ConsoleInputError("The passwords did not match. No account was created.");
    confirmation = "";
  }

  const { openDatabase, DATA_DIR } = requireSource("../lib/tay/db.ts");
  let db;
  try {
    db = openDatabase();
    const owner = accounts.provisionOwnerFromConsole(db, password, process.env.TAY_OWNER_NAME || "Founding owner");
    process.stdout.write(`Founding owner provisioned. Owner ID: ${owner.id}\nStore: ${DATA_DIR}\nSign in using the configured email.\n`);
  } catch (error) {
    if (error instanceof accounts.OwnerProvisioningError) throw new ConsoleInputError(error.message);
    throw new ConsoleInputError("Owner provisioning failed. Check the server runtime and persistent store; existing accounts were not replaced.");
  } finally {
    password = "";
    db?.close();
  }
}

main().catch((error) => {
  // Do not dump stack traces, environment values, inputs, or raw database errors.
  process.stderr.write(`${error instanceof ConsoleInputError ? error.message : "Owner provisioning could not start. Check the runtime and installed project dependencies."}\n`);
  process.exitCode = 1;
});
