import { db } from "../db.js";

export function recordAudit(actor, action, entity, entityId, before = null, after = null) {
  db.prepare(
    `INSERT INTO audit_log (actor, action, entity, entity_id, before_json, after_json)
     VALUES (?, ?, ?, ?, ?, ?)`
  ).run(
    actor,
    action,
    entity,
    entityId ?? null,
    before == null ? null : JSON.stringify(before),
    after == null ? null : JSON.stringify(after)
  );
}

export function withTransaction(fn) {
  db.exec("BEGIN IMMEDIATE");
  try {
    const result = fn();
    db.exec("COMMIT");
    return result;
  } catch (error) {
    db.exec("ROLLBACK");
    throw error;
  }
}
