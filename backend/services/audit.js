// Admin audit log. Writes are best-effort and never block or fail the action.
import { randomUUID } from "crypto";
import { normalizeIp } from "./ip.js";
import { track } from "./runtime.js";
import { deleteRecordsBefore, insertRecord } from "./store.js";

const RETENTION_MS = 180 * 24 * 60 * 60 * 1000;
const CLEANUP_INTERVAL_MS = 60 * 60 * 1000;
let lastCleanupAt = 0;

const truncate = (value, max) =>
  typeof value === "string" ? value.slice(0, max) : value ?? null;

export const STATIC_TOKEN_ACTOR = "static-token";

// Full client IP, normalized (IPv4-mapped IPv6 unwrapped).
export const requestIp = (req) => normalizeIp(req?.ip || req?.socket?.remoteAddress || "");
export const requestUserAgent = (req) => truncate(req?.get?.("user-agent") || null, 256);

const SENSITIVE_FIELDS = /password|token|secret|hash/i;
const IGNORED_FIELDS = new Set(["updatedAt", "createdAt", "id", "_id"]);

/** Names of fields in `keys` whose values differ between `before` and `after`. */
export const changedFields = (before = {}, after = {}, keys = Object.keys(after || {})) =>
  keys.filter(
    (key) =>
      !IGNORED_FIELDS.has(key) &&
      JSON.stringify(before?.[key] ?? null) !== JSON.stringify(after?.[key] ?? null)
  );

/**
 * Records an audit entry without awaiting it.
 * @param {object} req  Express request (admin, ip and user agent are taken from it).
 * @param {object} entry { action, entity, entityId, summary, changes, adminId?, adminEmail? }
 */
export const audit = (req, entry) => {
  const record = {
    id: randomUUID(),
    createdAt: new Date().toISOString(),
    adminId:
      entry.adminId ?? req?.admin?.id ?? (req?.adminStaticToken ? STATIC_TOKEN_ACTOR : null),
    adminEmail: truncate(
      entry.adminEmail ?? req?.admin?.email ?? (req?.adminStaticToken ? STATIC_TOKEN_ACTOR : null),
      254
    ),
    action: entry.action,
    entity: entry.entity ?? null,
    entityId: entry.entityId != null ? String(entry.entityId) : null,
    summary: truncate(entry.summary || "", 300),
    changes: (entry.changes || []).filter((name) => !SENSITIVE_FIELDS.test(name)),
    ip: requestIp(req),
    userAgent: requestUserAgent(req),
  };

  track(insertRecord("auditLogs", record)
    .then(() => {
      const now = Date.now();
      if (now - lastCleanupAt < CLEANUP_INTERVAL_MS) return null;
      lastCleanupAt = now;
      return deleteRecordsBefore(
        "auditLogs",
        "createdAt",
        new Date(now - RETENTION_MS).toISOString()
      );
    })
    .catch((error) => {
      console.error(`Failed to write audit log entry (${record.action}):`, error?.message);
    }));
};

// Helpers for the common create/update/delete shape.
const label = (item) => item?.name || item?.title || item?.emailAddress || item?.id || "";

export const auditCreate = (req, entity, item, keys) =>
  audit(req, {
    action: `${entity}.create`,
    entity,
    entityId: item?.id,
    summary: `Created ${entity} "${label(item)}"`,
    changes: changedFields({}, item, keys),
  });

export const auditUpdate = (req, entity, before, after, keys, action = `${entity}.update`) =>
  audit(req, {
    action,
    entity,
    entityId: after?.id ?? before?.id,
    summary: `Updated ${entity} "${label(after || before)}"`,
    changes: changedFields(before, after, keys),
  });

export const auditDelete = (req, entity, item) =>
  audit(req, {
    action: `${entity}.delete`,
    entity,
    entityId: item?.id,
    summary: `Deleted ${entity} "${label(item)}"`,
    changes: [],
  });
