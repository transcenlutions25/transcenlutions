/**
 * Minimal local typings for Node's built-in `node:sqlite` module.
 *
 * The project's installed @types/node predates this module. Rather than
 * upgrading the whole type dependency tree, the surface this workspace uses is
 * declared here: it is small, and every call site goes through the wrapper in
 * `db.ts`.
 */
declare module "node:sqlite" {
  export class StatementSync {
    run(...params: unknown[]): { changes: number | bigint; lastInsertRowid: number | bigint };
    get(...params: unknown[]): unknown;
    all(...params: unknown[]): unknown[];
  }

  export interface DatabaseSyncOptions {
    open?: boolean;
    readOnly?: boolean;
    enableForeignKeyConstraints?: boolean;
    allowExtension?: boolean;
  }

  export class DatabaseSync {
    constructor(path: string, options?: DatabaseSyncOptions);
    exec(sql: string): void;
    prepare(sql: string): StatementSync;
    close(): void;
  }
}
