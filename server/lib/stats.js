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
      _min: null,
      _max: null,
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
    b._min = b._min == null ? c.page_count : Math.min(b._min, c.page_count);
    b._max = b._max == null ? c.page_count : Math.max(b._max, c.page_count);
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
    pages: b._max != null ? b._max - b._min : 0,
    avg_toner: avg(b._tonerUsed),
    avg_drum: avg(b._drumUsed),
  }));
}

/** High-level KPIs for the dashboard cards and the PDF summary. */
export function computeSummary() {
  const printers_count = db.prepare("SELECT COUNT(*) n FROM printers").get().n;
  const toners_replaced = db.prepare("SELECT COUNT(*) n FROM changes WHERE type='toner'").get().n;
  const drums_replaced = db.prepare("SELECT COUNT(*) n FROM changes WHERE type='cilindro'").get().n;
  const pages_printed = db
    .prepare(
      `SELECT IFNULL(SUM(mx - mn), 0) total FROM (
         SELECT MAX(page_count) mx, MIN(page_count) mn FROM changes GROUP BY printer_id
       )`
    )
    .get().total;

  const all = fetchEnrichedChanges({});
  const tonerUsed = all.filter((c) => c.type === "toner" && c.pages_used != null).map((c) => c.pages_used);
  const drumUsed = all.filter((c) => c.type === "cilindro" && c.pages_used != null).map((c) => c.pages_used);

  const top_volume_printer = db
    .prepare(
      `SELECT p.name, (MAX(c.page_count) - MIN(c.page_count)) pages
       FROM changes c JOIN printers p ON p.id = c.printer_id
       GROUP BY c.printer_id
       HAVING pages > 0
       ORDER BY pages DESC LIMIT 1`
    )
    .get();

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
    top_volume_printer: top_volume_printer || null,
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
      if (c.pages_used) m.paginas += c.pages_used;
      if (c.type === "toner") m.toners++;
      else m.cilindros++;
    }
    if (!yAgg.has(y)) yAgg.set(y, { paginas: 0, toners: 0, cilindros: 0 });
    const ya = yAgg.get(y);
    if (c.pages_used) ya.paginas += c.pages_used;
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
