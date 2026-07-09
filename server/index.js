import express from "express";
import cors from "cors";
import path from "node:path";
import fs from "node:fs";
import { fileURLToPath } from "node:url";

import "./db.js"; // initialize database + schema
import printers from "./routes/printers.js";
import changes from "./routes/changes.js";
import dashboard from "./routes/dashboard.js";
import stats from "./routes/stats.js";
import reports from "./routes/reports.js";
import backup from "./routes/backup.js";
import { HttpError } from "./lib/http.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DIST = path.join(__dirname, "..", "dist");

const app = express();
app.use(cors());
app.use(express.json());

app.get("/api/health", (_req, res) =>
  res.json({ ok: true, name: "TonerTrack", time: new Date().toISOString() })
);
app.use("/api/printers", printers);
app.use("/api/changes", changes);
app.use("/api/dashboard", dashboard);
app.use("/api/stats", stats);
app.use("/api/reports", reports);
app.use("/api/backup", backup);

app.use("/api", (_req, res) => res.status(404).json({ error: "Rota da API não encontrada." }));

const isDev = process.env.NODE_ENV === "development";

if (isDev) {
  // Em desenvolvimento o app é servido pelo Vite (5173). Redireciona acessos
  // diretos à porta da API para o Vite, evitando exibir um build antigo do dist/.
  const viteUrl = process.env.VITE_URL || "http://localhost:5173";
  app.get("*", (req, res) => res.redirect(302, viteUrl + req.originalUrl));
} else if (fs.existsSync(path.join(DIST, "index.html"))) {
  // Produção (após `npm run build`): serve o SPA compilado com history fallback.
  app.use(express.static(DIST));
  app.get("*", (_req, res) => res.sendFile(path.join(DIST, "index.html")));
}

// Central error handler — turns thrown HttpError / unexpected errors into JSON.
app.use((err, _req, res, _next) => {
  const status = err instanceof HttpError ? err.status : 500;
  if (status >= 500) console.error(err);
  res.status(status).json({ error: err.message || "Erro interno do servidor." });
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`\n  ▸ TonerTrack API rodando em http://localhost:${PORT}\n`);
});
