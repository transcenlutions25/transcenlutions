#!/usr/bin/env node
/**
 * Archil persistence check.
 *
 * Writes one unique line inside a fresh subdirectory of the Archil disk in a
 * first exec container, then reads it back in a second, separate exec
 * container. Because each exec gets a new container, matching output proves the
 * file persisted on the disk rather than in container state.
 *
 *   ARCHIL_API_KEY=key-… npm run check:archil
 *
 * Uses ARCHIL_DISK_ID when it is set; otherwise creates one disk (its one-time
 * mount token is never printed) and prints the dsk-… id to save. Nothing is
 * deployed and no other disk is touched.
 */
import { randomBytes } from "node:crypto";
import {
  archilConfig,
  archilConfigured,
  createStorageDisk,
  getStorageDisk,
  runOnStorageDisk,
} from "../lib/tay/archil-storage.ts";

function fatal(message) {
  console.error(`Archil persistence check failed.\n${message}`);
  process.exit(1);
}

if (!archilConfigured()) {
  fatal(
    "ARCHIL_API_KEY is not set. Add an API key that starts with key- from https://console.archil.com/api-keys to the server environment (.env.local for Next.js) and run `npm run check:archil` again.",
  );
}

const config = archilConfig();
console.log(`Archil region: ${config.region}`);

let disk;
try {
  if (config.diskId) {
    disk = await getStorageDisk();
  } else {
    const created = await createStorageDisk(`tay-files-${Date.now().toString(36)}-${randomBytes(2).toString("hex")}`);
    process.env.ARCHIL_DISK_ID = created.id;
    disk = await getStorageDisk();
    console.log(`Created disk ${created.name} (${created.id}).`);
  }
} catch (error) {
  const status = error && typeof error === "object" && "status" in error ? error.status : undefined;
  const hint =
    status === 401
      ? "\nHTTP 401: ARCHIL_API_KEY is probably a disk/mount token (adt_…) or a key created in another region. Use a key-… key from https://console.archil.com/api-keys in an AWS region."
      : "";
  fatal(`${error instanceof Error ? error.message : String(error)}${hint}`);
}

const jobDir = `tay-checks/${new Date().toISOString().replace(/[:.]/g, "-")}-${randomBytes(4).toString("hex")}`;
const line = `archil-persistence ${new Date().toISOString()} ${randomBytes(6).toString("hex")}`;

// Exec 1: its own container. A fresh subdirectory claims ownership, so the
// shared mount is writable.
let written;
try {
  written = await runOnStorageDisk(`mkdir -p ${jobDir} && printf '%s\n' '${line}' > ${jobDir}/proof.txt`);
} catch (error) {
  fatal(`the write exec could not run: ${error instanceof Error ? error.message : String(error)}`);
}
if (written.exitCode !== 0 || !written.stdout.includes(line)) {
  fatal(`the write exec exited ${written.exitCode}.\nstdout: ${written.stdout}\nstderr: ${written.stderr}`);
}
console.log(`Exec 1 wrote ${jobDir}/proof.txt (${written.totalMs} ms).`);

// Exec 2: a different container, same disk.
let readBack;
try {
  readBack = await runOnStorageDisk(`cat ${jobDir}/proof.txt`);
} catch (error) {
  fatal(`the read exec could not run: ${error instanceof Error ? error.message : String(error)}`);
}
if (readBack.exitCode !== 0) {
  fatal(`the read exec exited ${readBack.exitCode}.\nstderr: ${readBack.stderr}`);
}

const read = readBack.stdout.trim();
if (!read.includes(line)) {
  fatal(`the second exec did not return the line the first one wrote.\nwrote: ${line}\nread:  ${read}`);
}

console.log(`Exec 2 read it back in a separate container (${readBack.totalMs} ms).`);
console.log(`Disk: ${disk.name} (${disk.id}) · region ${disk.region}`);
console.log(`Read-back output: ${read}`);
console.log(`Persistence check passed. Save ARCHIL_DISK_ID=${disk.id} to reuse this disk.`);
