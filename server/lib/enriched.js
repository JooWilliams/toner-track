import { db } from "../db.js";
import { computeYieldStatus } from "./yield.js";

// Computes "páginas rodadas desde a última troca" via a window function.
// The LAG runs over the FULL table (inside the CTE) so filters applied afterwards
// never corrupt the previous-counter lookup.
const BASE_CTE = `
  WITH enriched AS (
    SELECT
      c.id, c.printer_id, c.type, c.change_date, c.page_count,
      c.responsible, c.notes, c.created_at, c.updated_at,
      p.name AS printer_name, p.location AS printer_location, p.model AS printer_model,
      p.expected_toner_yield, p.expected_drum_yield,
      LAG(c.page_count) OVER (
        PARTITION BY c.printer_id, c.type
        ORDER BY c.change_date, c.id
      ) AS prev_count
    FROM changes c
    JOIN printers p ON p.id = c.printer_id
  )
`;

function decorate(r) {
  const expected = r.type === "toner" ? r.expected_toner_yield : r.expected_drum_yield;
  const isFirst = r.prev_count == null;
  let pagesUsed = isFirst ? null : r.page_count - r.prev_count;
  // A negative delta means the printer's page counter was reset/replaced —
  // we can't derive a meaningful yield, so treat it as unknown.
  if (pagesUsed != null && pagesUsed < 0) pagesUsed = null;
  const status = computeYieldStatus(pagesUsed, expected, isFirst);
  return {
    id: r.id,
    printer_id: r.printer_id,
    printer_name: r.printer_name,
    printer_location: r.printer_location,
    printer_model: r.printer_model,
    type: r.type,
    change_date: r.change_date,
    page_count: r.page_count,
    prev_count: r.prev_count,
    pages_used: pagesUsed,
    expected_yield: expected,
    responsible: r.responsible,
    notes: r.notes,
    status,
    created_at: r.created_at,
    updated_at: r.updated_at,
  };
}

/**
 * Fetch changes enriched with pages_used + yield status.
 * @param {{printerId?:number|string, type?:string, from?:string, to?:string, responsible?:string, limit?:number}} filters
 */
export function fetchEnrichedChanges(filters = {}) {
  const where = [];
  const params = [];
  if (filters.printerId) {
    where.push("printer_id = ?");
    params.push(Number(filters.printerId));
  }
  if (filters.type) {
    where.push("type = ?");
    params.push(filters.type);
  }
  if (filters.from) {
    where.push("change_date >= ?");
    params.push(filters.from);
  }
  if (filters.to) {
    where.push("change_date <= ?");
    params.push(filters.to);
  }
  if (filters.responsible) {
    where.push("responsible LIKE ?");
    params.push(`%${filters.responsible}%`);
  }
  const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";
  const limitSql = filters.limit ? `LIMIT ${Number(filters.limit)}` : "";

  const sql = `
    ${BASE_CTE}
    SELECT * FROM enriched
    ${whereSql}
    ORDER BY change_date DESC, id DESC
    ${limitSql}
  `;
  return db.prepare(sql).all(...params).map(decorate);
}

/** One enriched change by id (or null). */
export function fetchEnrichedChangeById(id) {
  const sql = `${BASE_CTE} SELECT * FROM enriched WHERE id = ?`;
  const row = db.prepare(sql).get(Number(id));
  return row ? decorate(row) : null;
}
