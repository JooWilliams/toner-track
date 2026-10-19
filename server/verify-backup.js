import { DatabaseSync } from "node:sqlite";
import fs from "node:fs";
import path from "node:path";
import { verifyBackupDatabase } from "./lib/backup-validation.js";

const backupPath = process.argv[2];
if (!backupPath) {
  console.error("Uso: npm run backup:verify -- <arquivo.db>");
  process.exitCode = 2;
} else {
  const absolutePath = path.resolve(backupPath);
  if (!fs.existsSync(absolutePath) || !fs.statSync(absolutePath).isFile()) {
    console.error(`Arquivo de backup não encontrado: ${absolutePath}`);
    process.exitCode = 2;
  } else {
    const database = new DatabaseSync(absolutePath, { readOnly: true });
    try {
      const result = verifyBackupDatabase(database);
      console.log(`Backup íntegro. Versão do esquema: ${result.schemaVersion}.`);
    } catch (error) {
      console.error(`Backup inválido: ${error.message}`);
      process.exitCode = 1;
    } finally {
      database.close();
    }
  }
}
