import { randomBytes } from "node:crypto";
import { db } from "../db.js";
import { hashPassword, verifyPassword } from "./auth-password.js";

const SESSION_COOKIE = "tonertrack_session";
const SESSION_TTL_MS = 8 * 60 * 60 * 1000;
const sessions = new Map();
const loginAttempts = new Map();

function readCookie(req, name) {
  const header = req.headers.cookie || "";
  for (const part of header.split(";")) {
    const [key, ...value] = part.trim().split("=");
    if (key === name) return value.join("=");
  }
  return null;
}

function setSessionCookie(req, res, token) {
  const secure = req.secure || process.env.COOKIE_SECURE === "true" ? "; Secure" : "";
  res.setHeader(
    "Set-Cookie",
    `${SESSION_COOKIE}=${encodeURIComponent(token)}; HttpOnly; SameSite=Strict; Path=/; Max-Age=${SESSION_TTL_MS / 1000}${secure}`
  );
}

export function clearSessionCookie(res) {
  res.setHeader("Set-Cookie", `${SESSION_COOKIE}=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0`);
}

export function getAuthenticatedUser(req) {
  const token = readCookie(req, SESSION_COOKIE);
  if (!token) return null;
  const session = sessions.get(token);
  if (!session || session.expiresAt <= Date.now()) {
    sessions.delete(token);
    return null;
  }
  return session.username;
}

export function createSession(req, res, username) {
  const token = randomBytes(32).toString("base64url");
  sessions.set(token, { username, expiresAt: Date.now() + SESSION_TTL_MS });
  setSessionCookie(req, res, token);
}

export function destroySession(req) {
  const token = readCookie(req, SESSION_COOKIE);
  if (token) sessions.delete(token);
}

export function isLoginRateLimited(ip) {
  const now = Date.now();
  const attempts = (loginAttempts.get(ip) || []).filter((time) => now - time < 15 * 60 * 1000);
  loginAttempts.set(ip, attempts);
  return attempts.length >= 5;
}

export function recordFailedLogin(ip) {
  const attempts = loginAttempts.get(ip) || [];
  attempts.push(Date.now());
  loginAttempts.set(ip, attempts);
}

export function clearFailedLogins(ip) {
  loginAttempts.delete(ip);
}

export function requireAuth(req, res, next) {
  const username = getAuthenticatedUser(req);
  if (!username) {
    res.status(401).json({ error: "Autenticação necessária." });
    return;
  }
  req.authUser = username;
  next();
}

export function getAdminCredential() {
  return db.prepare("SELECT username, password_hash, salt FROM auth_credentials WHERE id = 1").get();
}
