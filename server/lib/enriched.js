import { db } from "../db.js";
import { computeYieldStatus } from "./yield.js";
import { printedPagesSince } from "./counter.js";

// Counter deltas and reset markers are computed over the full table before filters,
// so history pagination cannot alter meter continuity or component-yield intervals.
const BASE_CTE = `
  WITH readings AS (
    SELECT
      c.id, c.printer_id, c.type, c.change_date, c.page_count,
      c.responsible, c.notes, c.created_at, c.updated_at,
      p.name AS printer_name, p.location AS printer_location, p.model AS printer_model,
      LAG(c.page_count) OVER (
        PARTITION BY c.printer_id
        ORDER BY c.change_date, c.id
      ) AS prev_printer_count,
      LAG(c.page_count) OVER (
        PARTITION BY c.printer_id, c.type
        ORDER BY c.change_date, c.id
      ) AS prev_count,
      p.expected_toner_yield, p.expected_drum_yield
    FROM changes c
    JOIN printers p ON p.id = c.printer_id
  ),
  metered AS (
    SELECT *,
      CASE
        WHEN prev_printer_count IS NULL OR page_count < prev_printer_count THEN NULL
        ELSE page_count - prev_printer_count
      END AS pages_printed,
      CASE
        WHEN prev_printer_count IS NOT NULL AND page_count < prev_printer_count THEN 1
        ELSE 0
      END AS counter_reset
    FROM readings
  ),
  accumulated AS (
    SELECT *,
      SUM(COALESCE(pages_printed, 0)) OVER (
        PARTITION BY printer_id ORDER BY change_date, id
        ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW
      ) AS cumulative_pages,
      SUM(counter_reset) OVER (
        PARTITION BY printer_id ORDER BY change_date, id
        ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW
      ) AS cumulative_resets
    FROM metered
  ),
  enriched AS (
    SELECT *,
      LAG(cumulative_pages) OVER (
        PARTITION BY printer_id, type
        ORDER BY change_date, id
      ) AS prev_component_pages,
      LAG(cumulative_resets) OVER (
        PARTITION BY printer_id, type
        ORDER BY change_date, id
      ) AS prev_component_resets
    FROM accumulated
  )
`;

function decorate(r) {
  const expected = r.type === "toner" ? r.expected_toner_yield : r.expected_drum_yield;
  const isFirst = r.prev_count == null;
  const resetSincePreviousComponent =
    !isFirst && r.cumulative_resets > r.prev_component_resets;
  const pagesUsed =
    isFirst || resetSincePreviousComponent
      ? null
      : r.cumulative_pages - r.prev_component_pages;
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
    pages_printed: r.pages_printed ?? printedPagesSince(r.prev_printer_count, r.page_count),
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
  const { whereSql, params } = buildWhere(filters);
  const paginated = filters.limit != null;
  const limitSql = paginated ? "LIMIT ? OFFSET ?" : "";
  const queryParams = paginated
    ? [...params, Number(filters.limit), Number(filters.offset) || 0]
    : params;
  const sql = `
    ${BASE_CTE}
    SELECT * FROM enriched
    ${whereSql}
    ORDER BY change_date DESC, id DESC
    ${limitSql}
  `;
  return db.prepare(sql).all(...queryParams).map(decorate);
}

export function countEnrichedChanges(filters = {}) {
  const { whereSql, params } = buildWhere(filters);
  const sql = `${BASE_CTE} SELECT COUNT(*) AS total FROM enriched ${whereSql}`;
  return db.prepare(sql).get(...params).total;
}

function buildWhere(filters) {
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
  return { whereSql, params };
}

/** One enriched change by id (or null). */
export function fetchEnrichedChangeById(id) {
  const sql = `${BASE_CTE} SELECT * FROM enriched WHERE id = ?`;
  const row = db.prepare(sql).get(Number(id));
  return row ? decorate(row) : null;
}
