const migrations = [
  (db) => {
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
    `);
  },
  (db) => {
    db.exec(`
      CREATE TABLE IF NOT EXISTS auth_credentials (
        id            INTEGER PRIMARY KEY CHECK (id = 1),
        username      TEXT NOT NULL UNIQUE,
        password_hash TEXT NOT NULL,
        salt          TEXT NOT NULL,
        created_at    TEXT NOT NULL DEFAULT (datetime('now'))
      );

      CREATE TABLE IF NOT EXISTS audit_log (
        id          INTEGER PRIMARY KEY AUTOINCREMENT,
        actor       TEXT NOT NULL,
        action      TEXT NOT NULL,
        entity      TEXT NOT NULL,
        entity_id   INTEGER,
        before_json TEXT,
        after_json  TEXT,
        created_at  TEXT NOT NULL DEFAULT (datetime('now'))
      );

      CREATE TABLE IF NOT EXISTS app_meta (
        key   TEXT PRIMARY KEY,
        value TEXT NOT NULL
      );

      CREATE INDEX IF NOT EXISTS idx_changes_printer_type_date
        ON changes(printer_id, type, change_date, id);
      CREATE INDEX IF NOT EXISTS idx_changes_date_id
        ON changes(change_date DESC, id DESC);
      CREATE INDEX IF NOT EXISTS idx_changes_responsible
        ON changes(responsible);
      CREATE INDEX IF NOT EXISTS idx_audit_created_id
        ON audit_log(created_at DESC, id DESC);
    `);
  },
];

export function runMigrations(db) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      version    INTEGER PRIMARY KEY,
      applied_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);
  let current = db.prepare("SELECT COALESCE(MAX(version), 0) AS version FROM schema_migrations").get().version;
  if (current > migrations.length) {
    throw new Error(`O banco usa a versão ${current}, não suportada por esta versão do TonerTrack.`);
  }

  for (let index = current; index < migrations.length; index++) {
    db.exec("BEGIN IMMEDIATE");
    try {
      migrations[index](db);
      db.prepare("INSERT INTO schema_migrations (version) VALUES (?)").run(index + 1);
      db.exec("COMMIT");
    } catch (error) {
      db.exec("ROLLBACK");
      throw error;
    }
  }
}
