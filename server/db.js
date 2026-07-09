import { DatabaseSync } from "node:sqlite";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.join(__dirname, "data");
export const DB_PATH = path.join(DATA_DIR, "tonertrack.db");

fs.mkdirSync(DATA_DIR, { recursive: true });

export const db = new DatabaseSync(DB_PATH);

// WAL improves read/write concurrency; foreign_keys enables ON DELETE CASCADE.
db.exec("PRAGMA journal_mode = WAL;");
db.exec("PRAGMA foreign_keys = ON;");

db.exec(`
  CREATE TABLE IF NOT EXISTS printers (
    id                    INTEGER PRIMARY KEY AUTOINCREMENT,
    name                  TEXT NOT NULL,
    location              TEXT,
    model                 TEXT,
    expected_toner_yield  INTEGER,
    expected_drum_yield   INTEGER,
    created_at            TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at            TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS changes (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    printer_id   INTEGER NOT NULL REFERENCES printers(id) ON DELETE CASCADE,
    type         TEXT NOT NULL CHECK (type IN ('toner','cilindro')),
    change_date  TEXT NOT NULL,
    page_count   INTEGER NOT NULL,
    responsible  TEXT,
    notes        TEXT,
    created_at   TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at   TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE INDEX IF NOT EXISTS idx_changes_printer ON changes(printer_id);
  CREATE INDEX IF NOT EXISTS idx_changes_type    ON changes(type);
  CREATE INDEX IF NOT EXISTS idx_changes_date    ON changes(change_date);
`);

/** Checkpoint the WAL into the main db file (used before file-level backup). */
export function checkpoint() {
  try {
    db.exec("PRAGMA wal_checkpoint(TRUNCATE);");
  } catch {
    /* best-effort */
  }
}
