import express from "express";
import path from "node:path";
import fs from "node:fs";
import { fileURLToPath } from "node:url";

import "./db.js";
import printers from "./routes/printers.js";
import changes from "./routes/changes.js";
import dashboard from "./routes/dashboard.js";
import stats from "./routes/stats.js";
import reports from "./routes/reports.js";
import backup from "./routes/backup.js";
import auth from "./routes/auth.js";
import audit from "./routes/audit.js";
import { HttpError } from "./lib/http.js";
import { requireAuth } from "./lib/auth.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DIST = path.join(__dirname, "..", "dist");
const app = express();

app.disable("x-powered-by");
app.use(express.json({ limit: "100kb" }));
app.get("/api/health", (_req, res) =>
  res.json({ ok: true, name: "TonerTrack", time: new Date().toISOString() })
);
app.use("/api", (_req, res, next) => {
  res.setHeader("Cache-Control", "no-store");
  next();
});
app.use("/api/auth", auth);
app.use("/api", requireAuth);
app.use("/api/printers", printers);
app.use("/api/changes", changes);
app.use("/api/dashboard", dashboard);
app.use("/api/stats", stats);
app.use("/api/reports", reports);
app.use("/api/backup", backup);
app.use("/api/audit", audit);
app.use("/api", (_req, res) => res.status(404).json({ error: "Rota da API não encontrada." }));

const isDev = process.env.NODE_ENV === "development";
if (isDev) {
  const viteUrl = process.env.VITE_URL || "http://localhost:5173";
  app.get("*", (req, res) => res.redirect(302, viteUrl + req.originalUrl));
} else if (fs.existsSync(path.join(DIST, "index.html"))) {
  app.use(express.static(DIST));
  app.get("*", (_req, res) => res.sendFile(path.join(DIST, "index.html")));
}

app.use((err, _req, res, _next) => {
  const status = err instanceof HttpError ? err.status : 500;
  if (status >= 500) console.error(err);
  res.status(status).json({ error: err.message || "Erro interno do servidor." });
});

export default app;
