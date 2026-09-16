// Per-admin read status for messages (contacts) and orders. Stored apart from
// the records, so these routes never change a record and are not audited.
import { asyncHandler } from "../services/asyncHandler.js";
import { STATIC_TOKEN_ACTOR } from "../services/audit.js";
import { badRequest } from "../services/errors.js";
import { ok } from "../services/http.js";
import {
  getAdminReadStatus,
  getCollectionItem,
  listCollection,
  markAdminRecordRead,
  deleteRecordReads,
  markAllAdminRead,
} from "../services/store.js";

export const READ_TYPES = ["contacts", "orders"];
const MAX_READ_ID_LENGTH = 64;

export const readKey = (type, id) => `${type}:${id}`;

const readerId = (req) => req.admin?.id ?? STATIC_TOKEN_ACTOR;

const dateMs = (value) => {
  if (value === undefined || value === null || value === "") return 0;
  const time = new Date(value).getTime();
  return Number.isFinite(time) ? time : 0;
};

// Latest customer activity on a contact or order (0 when no date is usable).
export const recordActivity = (type, record) => {
  const created = dateMs(record?.receivedAt) || dateMs(record?.createdAt);
  if (type !== "contacts") return created;
  const replies = Array.isArray(record?.inboundReplies) ? record.inboundReplies : [];
  return replies.reduce(
    (latest, reply) => Math.max(latest, dateMs(reply?.receivedAt)),
    Math.max(created, dateMs(record?.lastInboundReplyAt))
  );
};

// Removes a deleted record's read rows for every admin. Best effort: failures are logged.
export const forgetRecordReads = async (type, id) => {
  try {
    await deleteRecordReads(readKey(type, id));
  } catch (error) {
    console.error("Failed to delete read status:", error?.name, error?.message);
  }
};

export const adminGetReads = asyncHandler(async (req, res) => {
  ok(res, "Read status retrieved.", await getAdminReadStatus(readerId(req)));
});

export const adminMarkRead = asyncHandler(async (req, res) => {
  const body = req.body && typeof req.body === "object" ? req.body : {};
  const { type, id } = body;
  if (typeof type !== "string" || !READ_TYPES.includes(type)) {
    throw badRequest("Type must be contacts or orders.");
  }
  if (typeof id !== "string" || !id.trim() || id.length > MAX_READ_ID_LENGTH) {
    throw badRequest("Id is required.");
  }
  const record = await getCollectionItem(type, id);
  const key = readKey(type, record.id);
  const readAt = await markAdminRecordRead(
    readerId(req),
    key,
    Math.max(Date.now(), recordActivity(type, record))
  );
  ok(res, "Marked as read.", { key, readAt });
});

export const adminMarkAllRead = asyncHandler(async (req, res) => {
  const lists = await Promise.all(
    READ_TYPES.map((type) => listCollection(type, { includeInactive: true }))
  );
  const newest = READ_TYPES.reduce(
    (latest, type, index) =>
      lists[index].reduce((max, record) => Math.max(max, recordActivity(type, record)), latest),
    0
  );
  ok(res, "All marked as read.", await markAllAdminRead(readerId(req), Math.max(Date.now(), newest)));
});
