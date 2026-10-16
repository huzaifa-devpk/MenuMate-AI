import fs from "node:fs";
import path from "node:path";
import Database from "better-sqlite3";
import { SCHEMA_SQL } from "./schema";

export type Db = Database.Database;

/**
 * Open (and create if needed) the SQLite database and apply the schema.
 * Pass ":memory:" for tests.
 */
export function openDatabase(filePath: string): Db {
  if (filePath !== ":memory:") {
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
  }
  const db = new Database(filePath);
  db.pragma("foreign_keys = ON");
  db.pragma("busy_timeout = 5000");
  // WAL is for on-disk files. In-memory databases used by tests stay on the default journal.
  if (filePath !== ":memory:") {
    db.pragma("journal_mode = WAL");
  }
  db.exec(SCHEMA_SQL);
  migrate(db);
  return db;
}

/** Add columns introduced after the first schema without rebuilding the file. */
function migrate(db: Db) {
  const columns = db.prepare("PRAGMA table_info(restaurants)").all() as Array<{ name: string }>;
  if (!columns.some((column) => column.name === "is_demo")) {
    db.exec("ALTER TABLE restaurants ADD COLUMN is_demo INTEGER NOT NULL DEFAULT 0");
  }
}
