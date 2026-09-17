// Settings and notifications (API_CONTRACT_V3 §8). Rules are shared with the Worker
// (backend/shared/settings.js, backend/shared/notifications.js).
import { actorOf } from "./inventory.js";
import { actingAdmin } from "../middleware/capabilities.js";
import { asyncHandler } from "../services/asyncHandler.js";
import { audit } from "../services/audit.js";
import { ok } from "../services/http.js";
import { getSettings } from "../services/settings.js";
import { findCollectionItem, findCollectionItems, listCollection, upsertCollectionItem } from "../services/store.js";
import { notFound } from "../shared/errors.js";
import { pageParams } from "../shared/fields.js";
import {
  WATERMARK,
  inAudience,
  notificationPage,
  readRowId,
  readStateOf,
  serializeNotification,
  watermarkFor,
} from "../shared/notifications.js";
import { SETTINGS_ID, mergeSettings, planSettingsUpdate, publicSettings, settingsDocument } from "../shared/settings.js";

// ---- settings ---------------------------------------------------------------------------------

export const getPublicSettings = asyncHandler(async (_req, res) => {
  ok(res, "Settings retrieved.", publicSettings(await getSettings()));
});

export const adminGetSettings = asyncHandler(async (_req, res) => {
  ok(res, "Settings retrieved.", await getSettings());
});

export const adminUpdateSettings = asyncHandler(async (req, res) => {
  const { settings, changes } = planSettingsUpdate(await getSettings(), req.body);
  const document = settingsDocument(settings, actorOf(req), new Date().toISOString());
  const { item } = await upsertCollectionItem("settings", { id: SETTINGS_ID }, {
    create: { id: SETTINGS_ID, ...document },
    update: () => document,
  });
  audit(req, { action: "settings.update", entity: "settings", entityId: SETTINGS_ID, summary: "Updated settings", changes });
  ok(res, "Settings updated.", mergeSettings(item));
});

// ---- notifications ---------------------------------------------------------------------------------

const readRows = (adminId) => findCollectionItems("notificationReads", { adminId });

export const adminListNotifications = asyncHandler(async (req, res) => {
  const admin = actingAdmin(req);
  const page = pageParams(req.query);
  const [notifications, rows] = await Promise.all([
    listCollection("notifications", { includeInactive: true }),
    readRows(admin.id),
  ]);
  ok(res, "Notifications retrieved.", notificationPage(notifications, admin, rows, req.query, page));
});

export const adminReadNotification = asyncHandler(async (req, res) => {
  const admin = actingAdmin(req);
  const notification = await findCollectionItem("notifications", { id: req.params.id });
  if (!notification || !inAudience(notification, admin)) throw notFound("Notification not found.");
  const id = readRowId(admin.id, notification.id);
  const readAt = new Date().toISOString();
  await upsertCollectionItem("notificationReads", { id }, {
    create: { id, adminId: admin.id, notificationId: notification.id, readAt },
    update: () => null,
  });
  ok(res, "Notification marked as read.", serializeNotification(notification, readStateOf(await readRows(admin.id))));
});

export const adminReadAllNotifications = asyncHandler(async (req, res) => {
  const admin = actingAdmin(req);
  const notifications = await listCollection("notifications", { includeInactive: true });
  const readAt = watermarkFor(notifications, admin, new Date().toISOString());
  const id = readRowId(admin.id, WATERMARK);
  await upsertCollectionItem("notificationReads", { id }, {
    create: { id, adminId: admin.id, notificationId: WATERMARK, readAt },
    update: (existing) => (String(existing.readAt) >= readAt ? null : { readAt }),
  });
  ok(res, "All notifications marked as read.", { unreadCount: 0 });
});
