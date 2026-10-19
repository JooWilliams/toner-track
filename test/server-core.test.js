import assert from "node:assert/strict";
import { afterEach, test } from "node:test";
import { DatabaseSync } from "node:sqlite";
import { verifyBackupDatabase } from "../server/lib/backup-validation.js";
import { hashPassword, verifyPassword } from "../server/lib/auth-password.js";
import { printedPagesSince } from "../server/lib/counter.js";
import { runMigrations } from "../server/lib/migrations.js";
import { parsePagination } from "../server/lib/pagination.js";

const databases = new Set();

function createDatabase() {
  const database = new DatabaseSync(":memory:");
  databases.add(database);
  return database;
}

afterEach(() => {
  for (const database of databases) database.close();
  databases.clear();
});

test("printed pages count each consecutive meter advance once", () => {
  const readings = [
    { previous: null, current: 1000 },
    { previous: 1000, current: 1300 },
    { previous: 1300, current: 1800 },
  ];
  const deltas = readings.map(({ previous, current }) => printedPagesSince(previous, current));
  assert.deepEqual(deltas, [null, 300, 500]);
  assert.equal(deltas.reduce((sum, delta) => sum + (delta ?? 0), 0), 800);
});

test("counter reset establishes a new baseline without a negative page delta", () => {
  assert.equal(printedPagesSince(1800, 50), null);
  assert.equal(printedPagesSince(50, 250), 200);
  assert.equal(printedPagesSince(250, 250), 0);
});

test("migrations are repeatable and preserve existing legacy tables", () => {
  const database = createDatabase();
  database.exec(`
    CREATE TABLE printers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      location TEXT,
      model TEXT,
      expected_toner_yield INTEGER,
      expected_drum_yield INTEGER,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE TABLE changes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      printer_id INTEGER NOT NULL REFERENCES printers(id) ON DELETE CASCADE,
      type TEXT NOT NULL CHECK (type IN ('toner','cilindro')),
      change_date TEXT NOT NULL,
      page_count INTEGER NOT NULL,
      responsible TEXT,
      notes TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    INSERT INTO printers (id, name) VALUES (7, 'Legada');
  `);

  runMigrations(database);
  runMigrations(database);

  assert.equal(database.prepare("SELECT name FROM printers WHERE id = 7").get().name, "Legada");
  assert.equal(database.prepare("SELECT MAX(version) AS version FROM schema_migrations").get().version, 2);
  assert.equal(database.prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'audit_log'").get().name, "audit_log");
});

test("backup verification checks integrity, foreign keys, and current schema", () => {
  const database = createDatabase();
  runMigrations(database);
  assert.deepEqual(verifyBackupDatabase(database), { integrity: "ok", schemaVersion: 2 });
});

test("password hashes are salted and verified without storing the password", async () => {
  const first = await hashPassword("uma senha forte", "test-salt");
  const second = await hashPassword("uma senha forte", "another-salt");
  assert.notEqual(first.hash, second.hash);
  assert.equal(await verifyPassword("uma senha forte", first.salt, first.hash), true);
  assert.equal(await verifyPassword("senha errada", first.salt, first.hash), false);
});

test("pagination applies defaults and a hard maximum", () => {
  assert.deepEqual(parsePagination({}), { limit: 50, offset: 0 });
  assert.deepEqual(parsePagination({ limit: "1000", offset: "50" }), { limit: 100, offset: 50 });
  assert.throws(() => parsePagination({ limit: "0" }), /paginação inválidos/);
  assert.throws(() => parsePagination({ offset: "-1" }), /paginação inválidos/);
});
