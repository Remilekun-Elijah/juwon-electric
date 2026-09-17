// Admin audit log (D1 table audit_logs, migrations/0004_admin_security.sql).
// Writes are best-effort: they run in ctx.waitUntil and never fail the admin action.
import { badRequest, describeError, getClientIp, getUserAgent } from "./http.js";
import { pageParams } from "./validation.js";

const RETENTION_MS = 180 * 24 * 60 * 60 * 1000;
const CLEANUP_PROBABILITY = 0.02;
const SENSITIVE_FIELD = /password|token|secret|hash/i;
const IGNORED_FIELDS = new Set(["id", "createdAt", "updatedAt"]);

// Field names whose values differ between the stored record and the update. Values are never logged.
export const changedFields = (before = {}, after = {}) =>
  Object.keys(after).filter(
    (key) =>
      !IGNORED_FIELDS.has(key) &&
      !SENSITIVE_FIELD.test(key) &&
      after[key] !== undefined &&
      JSON.stringify(before?.[key] ?? null) !== JSON.stringify(after[key] ?? null)
  );

export const providedFields = (payload = {}) =>
  Object.keys(payload).filter(
    (key) =>
      !IGNORED_FIELDS.has(key) &&
      !SENSITIVE_FIELD.test(key) &&
      payload[key] !== undefined &&
      payload[key] !== null &&
      payload[key] !== ""
  );

export const recordAudit = (env, ctx, request, admin, entry) => {
  const createdAt = new Date().toISOString();
  const changes = (entry.changes || []).filter((name) => !SENSITIVE_FIELD.test(name));
  const write = async () => {
    await env.DB.prepare(
      `INSERT INTO audit_logs
        (id, created_at, admin_id, admin_email, action, entity, entity_id, summary, changes, ip, user_agent)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
      .bind(
        crypto.randomUUID(),
        createdAt,
        admin?.id || null,
        String(admin?.email || entry.email || "").slice(0, 254) || null,
        entry.action,
        entry.entity || null,
        entry.entityId === undefined || entry.entityId === null ? null : String(entry.entityId),
        String(entry.summary || "").slice(0, 500),
        JSON.stringify(changes),
        getClientIp(request) === "unknown" ? null : getClientIp(request),
        getUserAgent(request)
      )
      .run();

    if (Math.random() < CLEANUP_PROBABILITY) {
      await env.DB.prepare("DELETE FROM audit_logs WHERE created_at < ?")
        .bind(new Date(Date.now() - RETENTION_MS).toISOString())
        .run();
    }
  };

  const task = write().catch((error) =>
    console.error(`Audit log write failed (${entry.action})`, describeError(error))
  );
  if (ctx?.waitUntil) ctx.waitUntil(task);
  return task;
};

const filterValue = (params, key) => {
  const value = (params.get(key) || "").trim();
  if (value.length > 100) badRequest(`${key} must be 100 characters or fewer.`);
  return value;
};

export const listAuditLogs = async (env, params) => {
  const { page, limit } = pageParams(params, 50);
  const filters = [
    ["action", filterValue(params, "action")],
    ["entity", filterValue(params, "entity")],
    ["admin_id", filterValue(params, "adminId")],
  ].filter(([, value]) => value);

  const where = filters.length ? `WHERE ${filters.map(([column]) => `${column} = ?`).join(" AND ")}` : "";
  const values = filters.map(([, value]) => value);

  const [countRow, rows] = await Promise.all([
    env.DB.prepare(`SELECT COUNT(*) AS total FROM audit_logs ${where}`).bind(...values).first(),
    env.DB.prepare(
      `SELECT id, created_at, admin_id, admin_email, action, entity, entity_id, summary, changes, ip, user_agent
        FROM audit_logs ${where} ORDER BY created_at DESC, id DESC LIMIT ? OFFSET ?`
    )
      .bind(...values, limit, (page - 1) * limit)
      .all(),
  ]);

  const items = (rows.results || []).map((row) => {
    let changes;
    try {
      changes = JSON.parse(row.changes || "[]");
    } catch {
      changes = [];
    }
    return {
      id: row.id,
      createdAt: row.created_at,
      adminId: row.admin_id,
      adminEmail: row.admin_email,
      action: row.action,
      entity: row.entity,
      entityId: row.entity_id,
      summary: row.summary,
      changes,
      ip: row.ip,
      userAgent: row.user_agent,
    };
  });

  return { items, page, limit, total: Number(countRow?.total || 0) };
};
