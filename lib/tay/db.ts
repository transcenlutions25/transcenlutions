/**
 * Tay workspace persistence.
 *
 * Uses Node's built-in SQLite driver so the consolidated workspace needs no
 * native dependency and no hosted database to run. Data lives in a local file
 * outside source control (`TAY_DATA_DIR`, default `.workspace-data`).
 *
 * The schema is versioned in `lib/tay/migrations.ts`; opening the database
 * applies any pending migration before the handle is returned.
 */
import { DatabaseSync } from "node:sqlite";
import { mkdirSync } from "node:fs";
import path from "node:path";
import { applyMigrations } from "./migrations";

export const DATA_DIR = process.env.TAY_DATA_DIR
  ? path.resolve(process.env.TAY_DATA_DIR)
  : path.join(process.cwd(), ".workspace-data");

export interface Database {
  run(sql: string, params?: unknown[]): void;
  get<T>(sql: string, params?: unknown[]): T | undefined;
  all<T>(sql: string, params?: unknown[]): T[];
  /** Multi-statement SQL. Only used by the migration runner and pragmas. */
  exec(sql: string): void;
  close(): void;
}

let shared: { db: DatabaseSync; wrapper: Database } | null = null;

function wrap(db: DatabaseSync): Database {
  return {
    run(sql, params = []) {
      db.prepare(sql).run(...(params as never[]));
    },
    get<T>(sql: string, params: unknown[] = []) {
      return db.prepare(sql).get(...(params as never[])) as T | undefined;
    },
    all<T>(sql: string, params: unknown[] = []) {
      return db.prepare(sql).all(...(params as never[])) as T[];
    },
    exec(sql) {
      db.exec(sql);
    },
    close() {
      db.close();
    },
  };
}

function prepare(db: DatabaseSync): Database {
  db.exec("PRAGMA busy_timeout = 5000;");
  db.exec("PRAGMA journal_mode = WAL;");
  db.exec("PRAGMA foreign_keys = ON;");
  const wrapper = wrap(db);
  applyMigrations(wrapper);
  return wrapper;
}

/** Fail closed on ephemeral hosts; this adapter is a single-server store. */
export function validateStorageEnvironment(): void {
  if (process.env.NODE_ENV !== "production") return;
  if (process.env.NETLIFY || process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME) {
    throw new Error("Tay SQLite requires a persistent single-server volume; serverless account persistence is not configured.");
  }
  if (!process.env.TAY_DATA_DIR || !path.isAbsolute(process.env.TAY_DATA_DIR)) {
    throw new Error("Set an absolute TAY_DATA_DIR on a verified persistent volume before using hosted Tay accounts.");
  }
}

/** Opens the workspace database, creating the file and migrating it when needed. */
export function openDatabase(file = path.join(DATA_DIR, "tay.sqlite")): Database {
  validateStorageEnvironment();
  mkdirSync(path.dirname(file), { recursive: true });
  return prepare(new DatabaseSync(file));
}

/** Process-wide handle. Next.js may reload modules, so the handle is cached. */
export function getDatabase(): Database {
  validateStorageEnvironment();
  if (!shared) {
    mkdirSync(DATA_DIR, { recursive: true });
    const db = new DatabaseSync(path.join(DATA_DIR, "tay.sqlite"));
    shared = { db, wrapper: prepare(db) };
  }
  return shared.wrapper;
}

/** Test hook: isolates any store that caches the connection. */
export function resetDatabaseForTests() {
  shared?.db.close();
  shared = null;
}
