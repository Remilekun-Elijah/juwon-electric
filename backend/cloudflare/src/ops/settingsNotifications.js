// Settings and notifications (API_CONTRACT_V3 §8) for the Worker, at parity with
// backend/controllers/settingsNotifications.js.
import { ok } from "../http.js";
import { createCollectionItem, getById, listCollection, updateCollectionItem } from "../store.js";
import { requireCapability } from "../capabilities.js";
import { actorOf, getSettings } from "./inventory.js";
import { queryOf } from "./catalog.js";
import { notFound } from "../../../shared/errors.js";
import { pageParams } from "../../../shared/fields.js";
import {
  WATERMARK,
  inAudience,
  notificationPage,
  readRowId,
  readStateOf,
  serializeNotification,
  watermarkFor,
} from "../../../shared/notifications.js";
import { SETTINGS_ID, mergeSettings, planSettingsUpdate, publicSettings, settingsDocument } from "../../../shared/settings.js";

/** Creates the record with a fixed id, or applies `update(existing)` (a patch or null) when it exists. */
const upsertById = async (env, collection, id, create, update) => {
  for (let attempt = 0; attempt < 2; attempt += 1) {
    const existing = await getById(env, collection, id);
    if (existing) {
      const patch = update(existing);
      return patch ? updateCollectionItem(env, collection, id, patch) : existing;
    }
    try {
      return await createCollectionItem(env, collection, create, { id });
    } catch (error) {
      // A concurrent request created it first (primary key): update instead.
      if (!/UNIQUE constraint failed|SQLITE_CONSTRAINT/i.test(String(error?.message)) || attempt > 0) throw error;
    }
  }
  return getById(env, collection, id);
};

const readRows = async (env, adminId) => {
  const rows = await env.DB.prepare(
    "SELECT data FROM records WHERE collection = 'notificationReads' AND json_extract(data, '$.adminId') = ?"
  )
    .bind(adminId)
    .all();
  return (rows.results || []).map((row) => JSON.parse(row.data));
};

export const handleSettingsPublic = async ({ request, env, path }) => {
  if (request.method !== "GET" || path !== "/settings/public") return null;
  return ok("Settings retrieved.", publicSettings(await getSettings(env)));
};

export const handleSettingsAdmin = async (context) => {
  const { request, env, path, body, admin, audit } = context;
  const { method } = request;

  if (path === "/admin/settings" && method === "GET") {
    requireCapability(admin, "settings:read");
    return ok("Settings retrieved.", await getSettings(env));
  }
  if (path === "/admin/settings" && method === "PUT") {
    requireCapability(admin, "settings:write");
    const { settings, changes } = planSettingsUpdate(await getSettings(env), body);
    const document = settingsDocument(settings, actorOf(admin), new Date().toISOString());
    const item = await upsertById(env, "settings", SETTINGS_ID, document, () => document);
    audit({ action: "settings.update", entity: "settings", entityId: SETTINGS_ID, summary: "Updated settings", changes });
    return ok("Settings updated.", mergeSettings(item));
  }

  if (path === "/admin/notifications" && method === "GET") {
    requireCapability(admin, "notifications:read");
    const query = queryOf(context.url);
    const page = pageParams(query);
    const [notifications, rows] = await Promise.all([
      listCollection(env, "notifications", { includeInactive: true }),
      readRows(env, admin.id),
    ]);
    return ok("Notifications retrieved.", notificationPage(notifications, admin, rows, query, page));
  }
  if (path === "/admin/notifications/read-all" && method === "POST") {
    requireCapability(admin, "notifications:read");
    const notifications = await listCollection(env, "notifications", { includeInactive: true });
    const readAt = watermarkFor(notifications, admin, new Date().toISOString());
    const id = readRowId(admin.id, WATERMARK);
    await upsertById(env, "notificationReads", id, { adminId: admin.id, notificationId: WATERMARK, readAt }, (existing) =>
      String(existing.readAt) >= readAt ? null : { readAt }
    );
    return ok("All notifications marked as read.", { unreadCount: 0 });
  }
  const readMatch = /^\/admin\/notifications\/([^/]+)\/read$/.exec(path);
  if (readMatch && method === "POST") {
    requireCapability(admin, "notifications:read");
    const notification = await getById(env, "notifications", readMatch[1]);
    if (!notification || !inAudience(notification, admin)) throw notFound("Notification not found.");
    const id = readRowId(admin.id, notification.id);
    await upsertById(
      env,
      "notificationReads",
      id,
      { adminId: admin.id, notificationId: notification.id, readAt: new Date().toISOString() },
      () => null
    );
    return ok("Notification marked as read.", serializeNotification(notification, readStateOf(await readRows(env, admin.id))));
  }
  return null;
};
