/**
 * Archil disk storage for Tay files that must outlive a single run.
 *
 * Server-only. The API key is read from a plain server env var
 * (`ARCHIL_API_KEY`, never `NEXT_PUBLIC_…`) and this module must never be
 * imported by a client component.
 *
 *   ARCHIL_API_KEY  `key-…` from https://console.archil.com/api-keys (required).
 *                   A disk/mount token (`adt_…`) is a different credential and
 *                   the API rejects it with HTTP 401. Keys are region-scoped.
 *   ARCHIL_REGION   defaults to aws-us-east-1. Commands run only in
 *                   aws-us-east-1, aws-us-west-2 and aws-eu-west-1.
 *   ARCHIL_DISK_ID  `dsk-…` disk this workspace stores files on.
 *
 * Every `exec` is a fresh container that mounts the disk at /mnt/data; files on
 * the disk persist, container state does not. Exec mounts are shared, so write
 * into a fresh per-job subdirectory (or run `archil checkout <path>` inside the
 * command) instead of a directory another job owns, which is read-only.
 *
 * Nothing here is called yet; the workspace's own files still live in the local
 * SQLite store (see `lib/tay/db.ts`). Call `runOnStorageDisk`,
 * `writeStorageFile` or `readStorageFile` from a server route or task step when
 * a deliverable must survive the machine it was made on.
 */
import * as archil from "disk";
import type { Disk as ArchilDisk } from "disk";

export const DEFAULT_ARCHIL_REGION = "aws-us-east-1";

/** Archil runs serverless exec commands only in these regions. */
export const ARCHIL_EXEC_REGIONS: readonly string[] = ["aws-us-east-1", "aws-us-west-2", "aws-eu-west-1"];

export interface ArchilConfig {
  apiKey: string;
  region: string;
  diskId: string;
}

/** Thrown when the server is not configured to talk to Archil. Never contains the key. */
export class ArchilConfigurationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ArchilConfigurationError";
  }
}

function env(name: string): string {
  return (process.env[name] ?? "").trim();
}

/** Reads the server-side Archil settings. Never log the returned key. */
export function archilConfig(): ArchilConfig {
  return {
    apiKey: env("ARCHIL_API_KEY"),
    region: env("ARCHIL_REGION") || DEFAULT_ARCHIL_REGION,
    diskId: env("ARCHIL_DISK_ID"),
  };
}

/** True when an API key is present. Says nothing about whether it is valid. */
export function archilConfigured(): boolean {
  return archilConfig().apiKey.length > 0;
}

/** Per-instance client, so no process-wide SDK configuration is mutated. */
function client(): archil.Archil {
  if (typeof window !== "undefined") {
    throw new ArchilConfigurationError("Archil storage is server-only; do not import it from a client component.");
  }
  const { apiKey, region } = archilConfig();
  if (!apiKey) {
    throw new ArchilConfigurationError(
      "ARCHIL_API_KEY is not set. Add an API key from https://console.archil.com/api-keys to the server environment.",
    );
  }
  return new archil.Archil({ apiKey, region });
}

/** The disk named by ARCHIL_DISK_ID. Throws when it is unset or unknown. */
export async function getStorageDisk(): Promise<ArchilDisk> {
  const { diskId } = archilConfig();
  if (!diskId) {
    throw new ArchilConfigurationError(
      "ARCHIL_DISK_ID is not set. Create a disk with createStorageDisk() (or `npm run check:archil`) and save its dsk-… id.",
    );
  }
  return client().disks.get(diskId);
}

/**
 * Creates a disk and returns its identity. The one-time mount token in the SDK
 * result is deliberately dropped: commands do not need it and it must not be
 * printed or logged.
 */
export async function createStorageDisk(name: string): Promise<{ id: string; name: string; region: string }> {
  const { region } = archilConfig();
  const { disk } = await client().disks.create({ name });
  return { id: disk.id, name: disk.name, region: disk.region || region };
}

export interface DiskCommandResult {
  stdout: string;
  stderr: string;
  exitCode: number;
  totalMs: number;
}

/** Runs one command in its own container with the storage disk mounted at /mnt/data. */
export async function runOnStorageDisk(command: string): Promise<DiskCommandResult> {
  const { region } = archilConfig();
  if (!ARCHIL_EXEC_REGIONS.includes(region)) {
    throw new ArchilConfigurationError(
      `ARCHIL_REGION is ${region}, which cannot run commands. Use one of ${ARCHIL_EXEC_REGIONS.join(", ")}.`,
    );
  }
  const disk = await getStorageDisk();
  const result = await disk.exec(command);
  return { stdout: result.stdout, stderr: result.stderr, exitCode: result.exitCode, totalMs: result.timing?.totalMs ?? 0 };
}

/** Writes a file on the storage disk through the object API (no container needed). */
export async function writeStorageFile(
  key: string,
  body: string | Uint8Array,
  contentType = "application/octet-stream",
): Promise<void> {
  const disk = await getStorageDisk();
  await disk.putObject(key, body, contentType);
}

/** Reads a file from the storage disk as UTF-8 text. Throws if the key is missing. */
export async function readStorageFile(key: string): Promise<string> {
  const disk = await getStorageDisk();
  return new TextDecoder("utf-8").decode(await disk.getObject(key));
}
