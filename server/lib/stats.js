import { db } from "../db.js";
import { fetchEnrichedChanges } from "./enriched.js";

const round = (n) => Math.round(n);
const avg = (arr) => (arr.length ? round(arr.reduce((a, b) => a + b, 0) / arr.length) : 0);

/** Per-printer aggregates used by the Reports preview, Excel and PDF exports. */
export function computePrinterStats() {
  const printers = db.prepare("SELECT * FROM printers ORDER BY name COLLATE NOCASE").all();
  const all = fetchEnrichedChanges({});

  const byPrinter = new Map();
  for (const p of printers) {
    byPrinter.set(p.id, {
      printer_id: p.id,
      name: p.name,
      location: p.location,
      model: p.model,
      expected_toner_yield: p.expected_toner_yield,
      expected_drum_yield: p.expected_drum_yield,
      toners: 0,
      cilindros: 0,
      pages: 0,
      avg_toner: 0,
      avg_drum: 0,
      _tonerUsed: [],
      _drumUsed: [],
      _pages: 0,
    });
  }

  for (const c of all) {
    const b = byPrinter.get(c.printer_id);
    if (!b) continue;
    if (c.type === "toner") {
      b.toners++;
      if (c.pages_used != null) b._tonerUsed.push(c.pages_used);
    } else {
      b.cilindros++;
      if (c.pages_used != null) b._drumUsed.push(c.pages_used);
    }
    b._pages += c.pages_printed ?? 0;
  }

  return [...byPrinter.values()].map((b) => ({
    printer_id: b.printer_id,
    name: b.name,
    location: b.location,
    model: b.model,
    expected_toner_yield: b.expected_toner_yield,
    expected_drum_yield: b.expected_drum_yield,
    toners: b.toners,
    cilindros: b.cilindros,
    pages: b._pages,
    avg_toner: avg(b._tonerUsed),
    avg_drum: avg(b._drumUsed),
  }));
}

/** High-level KPIs for the dashboard cards and the PDF summary. */
export function computeSummary() {
  const printers_count = db.prepare("SELECT COUNT(*) n FROM printers").get().n;
  const toners_replaced = db.prepare("SELECT COUNT(*) n FROM changes WHERE type='toner'").get().n;
  const drums_replaced = db.prepare("SELECT COUNT(*) n FROM changes WHERE type='cilindro'").get().n;
  const all = fetchEnrichedChanges({});
  const pages_printed = all.reduce((total, change) => total + (change.pages_printed ?? 0), 0);
  const pagesByPrinter = new Map();
  for (const change of all) {
    if (change.pages_printed != null) {
      pagesByPrinter.set(change.printer_id, (pagesByPrinter.get(change.printer_id) || 0) + change.pages_printed);
    }
  }
  const tonerUsed = all.filter((c) => c.type === "toner" && c.pages_used != null).map((c) => c.pages_used);
  const drumUsed = all.filter((c) => c.type === "cilindro" && c.pages_used != null).map((c) => c.pages_used);

  const topVolume = [...pagesByPrinter.entries()].filter(([, pages]) => pages > 0).sort((a, b) => b[1] - a[1])[0];
  const top_volume_printer = topVolume
    ? {
        name: db.prepare("SELECT name FROM printers WHERE id = ?").get(topVolume[0]).name,
        pages: topVolume[1],
      }
    : null;

  const top_toner_printer = db
    .prepare(
      `SELECT p.name, COUNT(*) count
       FROM changes c JOIN printers p ON p.id = c.printer_id
       WHERE c.type = 'toner'
       GROUP BY c.printer_id
       ORDER BY count DESC, p.name COLLATE NOCASE LIMIT 1`
    )
    .get();

  return {
    printers_count,
    toners_replaced,
    drums_replaced,
    pages_printed,
    avg_pages_toner: avg(tonerUsed),
    avg_pages_drum: avg(drumUsed),
    top_volume_printer,
    top_toner_printer: top_toner_printer || null,
  };
}

/** Monthly (last 12) and yearly consumption series for the dashboard charts. */
export function computeSeries() {
  const all = fetchEnrichedChanges({});

  const now = new Date();
  const monthKeys = [];
  for (let i = 11; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    monthKeys.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`);
  }

  const mAgg = new Map(monthKeys.map((k) => [k, { paginas: 0, toners: 0, cilindros: 0 }]));
  const yAgg = new Map();

  for (const c of all) {
    const ym = c.change_date.slice(0, 7);
    const y = c.change_date.slice(0, 4);
    if (mAgg.has(ym)) {
      const m = mAgg.get(ym);
      m.paginas += c.pages_printed ?? 0;
      if (c.type === "toner") m.toners++;
      else m.cilindros++;
    }
    if (!yAgg.has(y)) yAgg.set(y, { paginas: 0, toners: 0, cilindros: 0 });
    const ya = yAgg.get(y);
    ya.paginas += c.pages_printed ?? 0;
    if (c.type === "toner") ya.toners++;
    else ya.cilindros++;
  }

  const monthly = monthKeys.map((k) => {
    const [y, m] = k.split("-");
    return { key: `${m}/${y.slice(2)}`, ...mAgg.get(k) };
  });

  const yearly = [...yAgg.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([key, v]) => ({ key, ...v }));

  return { monthly, yearly };
}
