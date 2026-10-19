import { Router } from "express";
import { db } from "../db.js";
import { h } from "../lib/http.js";
import { parsePagination } from "../lib/pagination.js";

const router = Router();

router.get(
  "/",
  h((req, res) => {
    const { limit: pageSize, offset } = parsePagination(req.query);
    const rows = db
      .prepare(
        `SELECT id, actor, action, entity, entity_id, before_json, after_json, created_at
         FROM audit_log
         ORDER BY id DESC
         LIMIT ? OFFSET ?`
      )
      .all(pageSize, offset)
      .map((row) => ({
        ...row,
        before: row.before_json ? JSON.parse(row.before_json) : null,
        after: row.after_json ? JSON.parse(row.after_json) : null,
      }));
    const total = db.prepare("SELECT COUNT(*) AS total FROM audit_log").get().total;
    res.json({ items: rows, total, limit: pageSize, offset });
  })
);

export default router;
