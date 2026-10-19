import { Router } from "express";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { db } from "../db.js";
import { recordAudit } from "../lib/audit.js";
import { h } from "../lib/http.js";

const router = Router();

router.get(
  "/status",
  h((_req, res) => {
    const row = db.prepare("SELECT value FROM app_meta WHERE key = 'last_backup_at'").get();
    res.json({ last_backup_at: row?.value ?? null });
  })
);

router.get(
  "/",
  h((req, res, next) => {
    const directory = fs.mkdtempSync(path.join(os.tmpdir(), "tonertrack-backup-"));
    const file = path.join(directory, "tonertrack.db");
    const cleanup = () => fs.rmSync(directory, { recursive: true, force: true });
    const previousBackup = db.prepare("SELECT value FROM app_meta WHERE key = 'last_backup_at'").get();
    const timestamp = new Date().toISOString();
    try {
      db.prepare(
        `INSERT INTO app_meta (key, value) VALUES ('last_backup_at', ?)
         ON CONFLICT(key) DO UPDATE SET value = excluded.value`
      ).run(timestamp);
      db.prepare("VACUUM INTO ?").run(file);
      recordAudit(req.authUser, "backup", "database", null);
      res.setHeader("Content-Type", "application/x-sqlite3");
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="tonertrack-backup-${timestamp.slice(0, 10).replace(/-/g, "")}.db"`
      );
      res.on("close", cleanup);
      res.on("finish", cleanup);
      const stream = fs.createReadStream(file);
      stream.on("error", (error) => {
        cleanup();
        if (res.headersSent) res.destroy(error);
        else next(error);
      });
      stream.pipe(res);
    } catch (error) {
      if (previousBackup) {
        db.prepare("UPDATE app_meta SET value = ? WHERE key = 'last_backup_at'").run(previousBackup.value);
      } else {
        db.prepare("DELETE FROM app_meta WHERE key = 'last_backup_at'").run();
      }
      cleanup();
      throw error;
    }
  })
);

export default router;
