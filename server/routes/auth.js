import { Router } from "express";
import { db } from "../db.js";
import { recordAudit, withTransaction } from "../lib/audit.js";
import {
  clearFailedLogins,
  clearSessionCookie,
  createSession,
  destroySession,
  getAdminCredential,
  getAuthenticatedUser,
  isLoginRateLimited,
  recordFailedLogin,
} from "../lib/auth.js";
import { hashPassword, verifyPassword } from "../lib/auth-password.js";
import { h, HttpError } from "../lib/http.js";

const router = Router();

router.get(
  "/status",
  h((req, res) => {
    res.setHeader("Cache-Control", "no-store");
    const username = getAuthenticatedUser(req);
    res.json({
      configured: Boolean(getAdminCredential()),
      authenticated: Boolean(username),
      username: username ?? null,
    });
  })
);

router.post(
  "/setup",
  h(async (req, res) => {
    const username = String(req.body?.username || "").trim();
    const password = String(req.body?.password || "");
    if (!/^[a-zA-Z0-9._-]{3,32}$/.test(username)) {
      throw new HttpError(400, "O usuário deve ter de 3 a 32 caracteres: letras, números, ponto, hífen ou sublinhado.");
    }
    if (password.length < 12) throw new HttpError(400, "A senha deve ter pelo menos 12 caracteres.");
    if (password.length > 256) throw new HttpError(400, "A senha não pode exceder 256 caracteres.");
    const credentials = await hashPassword(password);
    withTransaction(() => {
      if (getAdminCredential()) throw new HttpError(409, "A conta administradora já foi configurada.");
      db.prepare(
        "INSERT INTO auth_credentials (id, username, password_hash, salt) VALUES (1, ?, ?, ?)"
      ).run(username, credentials.hash, credentials.salt);
      recordAudit(username, "setup", "account", 1, null, { username });
    });
    createSession(req, res, username);
    res.status(201).json({ username });
  })
);

router.post(
  "/login",
  h(async (req, res) => {
    const ip = req.ip || "unknown";
    if (isLoginRateLimited(ip)) throw new HttpError(429, "Muitas tentativas. Aguarde 15 minutos e tente novamente.");
    const credentials = getAdminCredential();
    if (!credentials) throw new HttpError(409, "Configure a conta administradora antes de entrar.");
    const username = String(req.body?.username || "").trim();
    const password = String(req.body?.password || "");
    if (password.length > 256) throw new HttpError(400, "A senha não pode exceder 256 caracteres.");
    const passwordMatches = await verifyPassword(password, credentials.salt, credentials.password_hash);
    const valid = username === credentials.username && passwordMatches;
    if (!valid) {
      recordFailedLogin(ip);
      throw new HttpError(401, "Usuário ou senha inválidos.");
    }
    clearFailedLogins(ip);
    recordAudit(credentials.username, "login", "account", 1);
    createSession(req, res, credentials.username);
    res.json({ username: credentials.username });
  })
);

router.post(
  "/logout",
  h((req, res) => {
    const username = getAuthenticatedUser(req);
    if (username) recordAudit(username, "logout", "account", 1);
    destroySession(req);
    clearSessionCookie(res);
    res.status(204).end();
  })
);

export default router;
