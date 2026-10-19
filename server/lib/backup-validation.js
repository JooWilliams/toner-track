export function verifyBackupDatabase(database) {
  const integrity = database.prepare("PRAGMA integrity_check").all();
  if (integrity.length !== 1 || integrity[0].integrity_check !== "ok") {
    throw new Error(`Falha na integridade SQLite: ${integrity.map((row) => row.integrity_check).join("; ")}`);
  }
  const foreignKeyErrors = database.prepare("PRAGMA foreign_key_check").all();
  if (foreignKeyErrors.length) throw new Error(`Foram encontrados ${foreignKeyErrors.length} erro(s) de chave estrangeira.`);

  const tables = new Set(
    database.prepare("SELECT name FROM sqlite_master WHERE type = 'table'").all().map((row) => row.name)
  );
  for (const table of ["printers", "changes", "schema_migrations", "audit_log", "auth_credentials"]) {
    if (!tables.has(table)) throw new Error(`O arquivo não contém a tabela obrigatória "${table}".`);
  }
  const version = database.prepare("SELECT MAX(version) AS version FROM schema_migrations").get().version;
  if (version < 2) throw new Error("O arquivo de backup tem uma versão de esquema desatualizada.");
  return { integrity: "ok", schemaVersion: version };
}
