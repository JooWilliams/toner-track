import { DatabaseSync } from "node:sqlite";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { runMigrations } from "./lib/migrations.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.join(__dirname, "data");
export const DB_PATH = path.resolve(process.env.TONERTRACK_DB_PATH || path.join(DATA_DIR, "tonertrack.db"));

fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });

export const db = new DatabaseSync(DB_PATH);
db.exec("PRAGMA journal_mode = WAL;");
db.exec("PRAGMA foreign_keys = ON;");
runMigrations(db);

export function checkpoint() {
  const result = db.prepare("PRAGMA wal_checkpoint(FULL)").get();
  if (result.busy) throw new Error("Não foi possível finalizar as gravações antes do backup.");
}
