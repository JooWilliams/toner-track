import { Router } from "express";
import { db } from "../db.js";
import { h, HttpError, emptyToNull } from "../lib/http.js";

const router = Router();

function parseYield(v) {
  if (v === "" || v == null) return null;
  const n = Number(v);
  if (!Number.isFinite(n) || n < 0) {
    throw new HttpError(400, "Rendimento esperado deve ser um número maior ou igual a zero.");
  }
  return Math.round(n);
}

const LIST_SQL = (where) => `
  SELECT p.*,
    (SELECT COUNT(*) FROM changes c WHERE c.printer_id = p.id AND c.type = 'toner')    AS toner_changes,
    (SELECT COUNT(*) FROM changes c WHERE c.printer_id = p.id AND c.type = 'cilindro') AS drum_changes,
    (SELECT MAX(c.page_count) FROM changes c WHERE c.printer_id = p.id)                AS last_count,
    (SELECT MAX(c.change_date) FROM changes c WHERE c.printer_id = p.id)               AS last_change_date
  FROM printers p
  ${where}
  ORDER BY p.name COLLATE NOCASE
`;

// GET /api/printers?q=
router.get(
  "/",
  h((req, res) => {
    const q = (req.query.q || "").toString().trim();
    if (q) {
      const like = `%${q}%`;
      res.json(
        db
          .prepare(LIST_SQL("WHERE p.name LIKE ? OR IFNULL(p.location,'') LIKE ? OR IFNULL(p.model,'') LIKE ?"))
          .all(like, like, like)
      );
    } else {
      res.json(db.prepare(LIST_SQL("")).all());
    }
  })
);

// GET /api/printers/:id
router.get(
  "/:id",
  h((req, res) => {
    const row = db.prepare("SELECT * FROM printers WHERE id = ?").get(Number(req.params.id));
    if (!row) throw new HttpError(404, "Impressora não encontrada.");
    res.json(row);
  })
);

// POST /api/printers
router.post(
  "/",
  h((req, res) => {
    const name = emptyToNull(req.body?.name);
    if (!name) throw new HttpError(400, "O nome da impressora é obrigatório.");
    const info = db
      .prepare(
        `INSERT INTO printers (name, location, model, expected_toner_yield, expected_drum_yield)
         VALUES (?, ?, ?, ?, ?)`
      )
      .run(
        name,
        emptyToNull(req.body?.location),
        emptyToNull(req.body?.model),
        parseYield(req.body?.expected_toner_yield),
        parseYield(req.body?.expected_drum_yield)
      );
    res.status(201).json(db.prepare("SELECT * FROM printers WHERE id = ?").get(info.lastInsertRowid));
  })
);

// PUT /api/printers/:id
router.put(
  "/:id",
  h((req, res) => {
    const id = Number(req.params.id);
    const existing = db.prepare("SELECT * FROM printers WHERE id = ?").get(id);
    if (!existing) throw new HttpError(404, "Impressora não encontrada.");

    const name = req.body?.name !== undefined ? emptyToNull(req.body.name) : existing.name;
    if (!name) throw new HttpError(400, "O nome da impressora é obrigatório.");

    db.prepare(
      `UPDATE printers
       SET name = ?, location = ?, model = ?, expected_toner_yield = ?, expected_drum_yield = ?,
           updated_at = datetime('now')
       WHERE id = ?`
    ).run(
      name,
      req.body?.location !== undefined ? emptyToNull(req.body.location) : existing.location,
      req.body?.model !== undefined ? emptyToNull(req.body.model) : existing.model,
      req.body?.expected_toner_yield !== undefined
        ? parseYield(req.body.expected_toner_yield)
        : existing.expected_toner_yield,
      req.body?.expected_drum_yield !== undefined
        ? parseYield(req.body.expected_drum_yield)
        : existing.expected_drum_yield,
      id
    );
    res.json(db.prepare("SELECT * FROM printers WHERE id = ?").get(id));
  })
);

// DELETE /api/printers/:id  (cascade removes its changes)
router.delete(
  "/:id",
  h((req, res) => {
    const info = db.prepare("DELETE FROM printers WHERE id = ?").run(Number(req.params.id));
    if (!info.changes) throw new HttpError(404, "Impressora não encontrada.");
    res.status(204).end();
  })
);

export default router;
