// Demo data so the dashboard, charts and yield colors have something to show.
//   npm run seed          -> only seeds when the database is empty
//   npm run seed:reset    -> wipes printers + changes, then seeds
import { db } from "./db.js";

const reset = process.argv.includes("--reset");

const existing = db.prepare("SELECT COUNT(*) n FROM printers").get().n;
if (existing > 0 && !reset) {
  console.log(`Banco já possui ${existing} impressora(s). Use "npm run seed:reset" para recriar.`);
  process.exit(0);
}

if (reset) {
  db.exec("DELETE FROM changes; DELETE FROM printers;");
  db.exec("DELETE FROM sqlite_sequence WHERE name IN ('changes','printers');");
}

const printers = [
  { name: "HP LaserJet — Recepção", location: "Recepção", model: "HP M428fdw", toner: 3000, drum: 12000 },
  { name: "Brother — Financeiro", location: "Financeiro", model: "Brother HL-L2540DW", toner: 2600, drum: 12000 },
  { name: "Xerox — Almoxarifado", location: "Almoxarifado", model: "Xerox B215", toner: 1500, drum: 10000 },
];

const insP = db.prepare(
  `INSERT INTO printers (name, location, model, expected_toner_yield, expected_drum_yield) VALUES (?, ?, ?, ?, ?)`
);
const ids = printers.map((p) => insP.run(p.name, p.location, p.model, p.toner, p.drum).lastInsertRowid);

// [printerIndex, type, date, counter, responsible]
const changes = [
  [0, "toner", "2025-10-05", 1000, "João Silva"],
  [0, "cilindro", "2025-10-05", 1000, "João Silva"],
  [0, "toner", "2025-12-02", 4200, "João Silva"], // 3200 -> Excelente
  [0, "toner", "2026-02-10", 7050, "Maria Souza"], // 2850 -> Dentro
  [0, "toner", "2026-04-15", 9200, "Maria Souza"], // 2150 -> Abaixo (alerta)
  [0, "cilindro", "2026-05-01", 12800, "Carlos Pereira"], // 11800 -> Dentro
  [0, "toner", "2026-06-20", 12300, "João Silva"], // 3100 -> Excelente

  [1, "toner", "2025-11-10", 500, "Maria Souza"],
  [1, "cilindro", "2025-11-10", 500, "Maria Souza"],
  [1, "toner", "2026-01-12", 3050, "Maria Souza"], // 2550 -> Dentro
  [1, "toner", "2026-03-05", 5000, "Carlos Pereira"], // 1950 -> Próximo do limite
  [1, "toner", "2026-05-18", 7600, "João Silva"], // 2600 -> Excelente

  [2, "toner", "2025-12-01", 200, "Carlos Pereira"],
  [2, "cilindro", "2025-12-01", 200, "Carlos Pereira"],
  [2, "toner", "2026-01-20", 1500, "Carlos Pereira"], // 1300 -> Próximo do limite
  [2, "toner", "2026-02-28", 2600, "Maria Souza"], // 1100 -> Abaixo (alerta)
  [2, "toner", "2026-04-10", 4300, "João Silva"], // 1700 -> Excelente
];

const insC = db.prepare(
  `INSERT INTO changes (printer_id, type, change_date, page_count, responsible, notes) VALUES (?, ?, ?, ?, ?, ?)`
);
for (const [pi, type, date, counter, resp] of changes) {
  insC.run(ids[pi], type, date, counter, resp, null);
}

console.log(`✔ Seed concluído: ${printers.length} impressoras e ${changes.length} trocas inseridas.`);
db.close();
