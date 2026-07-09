import { Router } from "express";
import { db } from "../db.js";
import { h, HttpError, emptyToNull } from "../lib/http.js";
import { fetchEnrichedChanges, fetchEnrichedChangeById } from "../lib/enriched.js";

const router = Router();

const TYPES = ["toner", "cilindro"];

function validateBody(body, { partial = false } = {}) {
  const out = {};
  if (!partial || body.printer_id !== undefined) {
    const pid = Number(body.printer_id);
    if (!pid) throw new HttpError(400, "Selecione a impressora.");
    if (!db.prepare("SELECT 1 FROM printers WHERE id = ?").get(pid))
      throw new HttpError(400, "Impressora não encontrada.");
    out.printer_id = pid;
  }
  if (!partial || body.type !== undefined) {
    if (!TYPES.includes(body.type)) throw new HttpError(400, "Tipo de troca inválido.");
    out.type = body.type;
  }
  if (!partial || body.change_date !== undefined) {
    const d = (body.change_date || "").toString().slice(0, 10);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(d)) throw new HttpError(400, "Data da troca inválida.");
    out.change_date = d;
  }
  if (!partial || body.page_count !== undefined) {
    const pc = Number(body.page_count);
    if (!Number.isFinite(pc) || pc < 0) throw new HttpError(400, "Contador de páginas inválido.");
    out.page_count = Math.round(pc);
  }
  out.responsible = emptyToNull(body.responsible);
  out.notes = emptyToNull(body.notes);
  return out;
}

// GET /api/changes?printerId=&type=&from=&to=&responsible=
router.get(
  "/",
  h((req, res) => {
    const { printerId, type, from, to, responsible } = req.query;
    res.json(fetchEnrichedChanges({ printerId, type, from, to, responsible }));
  })
);

// GET /api/changes/recent?limit=8
router.get(
  "/recent",
  h((req, res) => {
    const limit = Math.min(Number(req.query.limit) || 8, 50);
    res.json(fetchEnrichedChanges({ limit }));
  })
);

// GET /api/changes/:id
router.get(
  "/:id",
  h((req, res) => {
    const row = fetchEnrichedChangeById(req.params.id);
    if (!row) throw new HttpError(404, "Troca não encontrada.");
    res.json(row);
  })
);

// POST /api/changes  -> returns the enriched record (with pages_used + status)
router.post(
  "/",
  h((req, res) => {
    const v = validateBody(req.body || {});
    const info = db
      .prepare(
        `INSERT INTO changes (printer_id, type, change_date, page_count, responsible, notes)
         VALUES (?, ?, ?, ?, ?, ?)`
      )
      .run(v.printer_id, v.type, v.change_date, v.page_count, v.responsible, v.notes);
    res.status(201).json(fetchEnrichedChangeById(info.lastInsertRowid));
  })
);

// PUT /api/changes/:id
router.put(
  "/:id",
  h((req, res) => {
    const id = Number(req.params.id);
    const existing = db.prepare("SELECT * FROM changes WHERE id = ?").get(id);
    if (!existing) throw new HttpError(404, "Troca não encontrada.");
    const v = validateBody({ ...existing, ...req.body });
    db.prepare(
      `UPDATE changes
       SET printer_id = ?, type = ?, change_date = ?, page_count = ?, responsible = ?, notes = ?,
           updated_at = datetime('now')
       WHERE id = ?`
    ).run(v.printer_id, v.type, v.change_date, v.page_count, v.responsible, v.notes, id);
    res.json(fetchEnrichedChangeById(id));
  })
);

// DELETE /api/changes/:id
router.delete(
  "/:id",
  h((req, res) => {
    const info = db.prepare("DELETE FROM changes WHERE id = ?").run(Number(req.params.id));
    if (!info.changes) throw new HttpError(404, "Troca não encontrada.");
    res.status(204).end();
  })
);

export default router;
