import { Router } from "express";
import fs from "node:fs";
import { h } from "../lib/http.js";
import { DB_PATH, checkpoint } from "../db.js";

const router = Router();

// GET /api/backup  -> downloads the whole SQLite file
router.get(
  "/",
  h((_req, res) => {
    checkpoint();
    const stamp = new Date().toISOString().slice(0, 10).replace(/-/g, "");
    res.setHeader("Content-Type", "application/x-sqlite3");
    res.setHeader("Content-Disposition", `attachment; filename="tonertrack-backup-${stamp}.db"`);
    fs.createReadStream(DB_PATH).pipe(res);
  })
);

export default router;
