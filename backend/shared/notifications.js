// Notifications (API_CONTRACT_V3 §8.2): record builders, audience rules and per-admin read
// state. Storage and notify() live in each runtime (backend/services/notifications.js and
// backend/cloudflare/src/notifications.js).
//
// Read state is kept in the `notificationReads` collection:
//   { id: "<adminId>:<notificationId>", adminId, notificationId, readAt }  one notification read
//   { id: "<adminId>:*", adminId, notificationId: "*", readAt }             read-all watermark
// A notification is read when a row exists for it, or when it was created at or before the
// admin's watermark.
import { hasCapability } from "./capabilities.js";
import { badRequest } from "./errors.js";
import { paginate, queryText } from "./fields.js";

export const NOTIFICATION_TYPES = ["low_stock", "new_order", "vacancy_posted", "job_assigned"];
export const NOTIFICATION_ENTITIES = ["product", "order", "vacancy", "job"];
export const NOTIFICATION_RETENTION_MS = 90 * 24 * 60 * 60 * 1000;
export const WATERMARK = "*";

const AUDIENCE_CAPABILITY = {
  low_stock: "inventory:read",
  new_order: "orders:read",
  vacancy_posted: "vacancies:read",
};

/** True when `admin` may see the notification (job_assigned: only its recipient). */
export const inAudience = (notification, admin) => {
  if (notification.type === "job_assigned") return Boolean(admin?.id) && notification.recipientId === admin.id;
  const capability = AUDIENCE_CAPABILITY[notification.type];
  return Boolean(capability) && hasCapability(admin, capability);
};

const clip = (value, max) => String(value ?? "").slice(0, max);

/** Stored notification record for notify({ type, title, message, entity, entityId, recipientId?, data? }). */
export const buildNotification = ({ type, title, message, entity, entityId, recipientId = null, data = null }, { id, timestamp }) => {
  if (!NOTIFICATION_TYPES.includes(type)) throw new Error(`Unknown notification type: ${type}`);
  if (!NOTIFICATION_ENTITIES.includes(entity)) throw new Error(`Unknown notification entity: ${entity}`);
  return {
    id,
    type,
    title: clip(title, 200),
    message: clip(message, 1000),
    entity,
    entityId: String(entityId),
    recipientId: type === "job_assigned" ? recipientId ?? null : null,
    data: data && typeof data === "object" && !Array.isArray(data) ? data : null,
    isActive: true,
    createdAt: timestamp,
    updatedAt: timestamp,
  };
};

export const readRowId = (adminId, notificationId) => `${adminId}:${notificationId}`;

/** { watermark, readIds } from an admin's notificationReads rows. */
export const readStateOf = (rows) => {
  let watermark = "";
  const readIds = new Set();
  for (const row of rows) {
    if (row.notificationId === WATERMARK) watermark = String(row.readAt || "");
    else readIds.add(row.notificationId);
  }
  return { watermark, readIds };
};

const isRead = (notification, { watermark, readIds }) =>
  readIds.has(notification.id) || (Boolean(watermark) && String(notification.createdAt) <= watermark);

export const serializeNotification = (notification, readState) => ({
  id: notification.id,
  type: notification.type,
  title: notification.title,
  message: notification.message,
  entity: notification.entity,
  entityId: notification.entityId,
  recipientId: notification.recipientId ?? null,
  data: notification.data ?? null,
  read: isRead(notification, readState),
  createdAt: notification.createdAt,
});

const compare = (a, b) => (a < b ? -1 : a > b ? 1 : 0);
const newestFirst = (a, b) => compare(String(b.createdAt), String(a.createdAt)) || compare(String(b.id), String(a.id));

/**
 * GET /admin/notifications page: audience-filtered, newest first, `unread=true` and `type`
 * filters; `unreadCount` counts every unread notification in the audience (all types).
 */
export const notificationPage = (notifications, admin, rows, query, page) => {
  const unreadOnly = queryText(query, "unread");
  if (unreadOnly && !["true", "false"].includes(unreadOnly)) throw badRequest("unread must be true or false.");
  const type = queryText(query, "type");
  if (type && !NOTIFICATION_TYPES.includes(type)) throw badRequest("Type is not valid.");
  const readState = readStateOf(rows);
  const visible = notifications
    .filter((notification) => inAudience(notification, admin))
    .map((notification) => serializeNotification(notification, readState))
    .sort(newestFirst);
  const unreadCount = visible.filter((notification) => !notification.read).length;
  const items = visible.filter(
    (notification) => (!type || notification.type === type) && (unreadOnly !== "true" || !notification.read)
  );
  return { ...paginate(items, page), unreadCount };
};

/** The newest createdAt among notifications visible to the admin (the read-all watermark). */
export const watermarkFor = (notifications, admin, timestamp) =>
  notifications
    .filter((notification) => inAudience(notification, admin))
    .reduce((latest, notification) => (String(notification.createdAt) > latest ? String(notification.createdAt) : latest), timestamp);

// ---- builders for the events BE-2 and BE-1 emit ------------------------------------------------

export const lowStockNotification = (product) => ({
  type: "low_stock",
  title: `Low stock: ${product.name}`,
  message: `${product.name} (${product.sku}) has ${Number(product.stockQuantity) || 0} in stock (reorder level ${Number(product.reorderLevel) || 0}).`,
  entity: "product",
  entityId: product.id,
});

export const newOrderNotification = (order) => ({
  type: "new_order",
  title: "New order",
  message:
    order.channel === "in_store"
      ? `In-store order for ${order.name || "a customer"}${order.total ? ` of ${order.total}` : ""}.`
      : `${order.name || "A customer"} placed an order${order.total ? ` of ${order.total}` : ""}.`,
  entity: "order",
  entityId: order.id,
  data: { channel: order.channel === "in_store" ? "in_store" : "website" },
});

export const vacancyPostedNotification = (vacancy) => ({
  type: "vacancy_posted",
  title: "Vacancy posted",
  message: `"${vacancy.title}" is now open.`,
  entity: "vacancy",
  entityId: vacancy.id,
});

/** job_assigned for one crew member (`recipientId`, default the lead). */
export const jobAssignedNotification = (job, order, recipientId = job.engineerIds?.[0] ?? job.engineerId) => ({
  type: "job_assigned",
  title: "Installation job assigned",
  message: `You have been assigned an installation job${order?.name ? ` for ${order.name}` : ""}${job.scheduledAt ? ` on ${job.scheduledAt.slice(0, 10)}` : ""}.`,
  entity: "job",
  entityId: job.id,
  recipientId,
});
