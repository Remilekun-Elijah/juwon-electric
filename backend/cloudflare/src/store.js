// JSON document storage on top of the D1 `records` table (migrations/0001_records.sql).
//
// Writes never replace a whole document from a stale snapshot:
// - updates re-read the row and compare-and-set on the exact stored JSON (retrying),
// - array appends use a single json_insert UPDATE,
// - deletes and updates target the resolved record id, and an update of a row that
//   has gone away is a 404 (never an insert).
import { ApiError, badRequest, notFound } from "./http.js";
import { OPS_NOT_FOUND_LABELS } from "../../shared/errors.js";

const COLLECTIONS = [
  "packages",
  "newsletters",
  "services",
  "customerSegments",
  "portfolio",
  "contacts",
  "carts",
  "orders",
  "admins",
  "passwordResets",
  "vacancies",
  // v3 commerce and operations modules
  "categories",
  "products",
  "inventoryMovements",
  "installationJobs",
  "settings",
  "notifications",
  "notificationReads",
  // Landing v1 website content
  "faqs",
  "testimonials",
  "clients",
  // Team and motion v1
  "teamMembers",
  // Uploads v1: image records and the system/uploads-usage total
  "uploads",
  "system",
];

// Catalog collections (public catalog records with admin-controlled sortOrder).
export const CATALOG_COLLECTIONS = ["packages", "services", "portfolio", "customerSegments", "categories", "products"];
// Collections whose records carry a unique slug (catalog plus vacancies, migrations/0008).
const SLUGGED_COLLECTIONS = [...CATALOG_COLLECTIONS, "vacancies"];

const NOT_FOUND_LABELS = {
  packages: "Package",
  services: "Service",
  portfolio: "Portfolio item",
  customerSegments: "Customer segment",
  orders: "Order",
  contacts: "Contact",
  newsletters: "Subscriber",
  admins: "User",
  carts: "Cart",
  vacancies: "Vacancy",
  ...OPS_NOT_FOUND_LABELS,
};

const CAS_ATTEMPTS = 5;
const FIELD_NAME = /^[A-Za-z][A-Za-z0-9_]{0,63}$/;
const UUID_SHAPE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

export const now = () => new Date().toISOString();

export const notFoundMessage = (collection) =>
  NOT_FOUND_LABELS[collection] ? `${NOT_FOUND_LABELS[collection]} not found.` : "Record not found.";

export const normalizeSlug = (value = "") =>
  String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

// D1 run() results carry meta.changes.
export const changesOf = (result) => Number(result?.meta?.changes ?? result?.changes ?? 0);

const toRecord = (row) => (row ? JSON.parse(row.data) : null);

const assertCollection = (collection) => {
  if (!COLLECTIONS.includes(collection)) badRequest("Unknown collection.");
};

const assertField = (field) => {
  if (!FIELD_NAME.test(field)) throw new Error(`Invalid field name: ${field}`);
};

// [slug, is_active, sort_order] column values for a record document.
export const rowValues = (item) => [
  item.slug || null,
  item.isActive === false ? 0 : 1,
  Number(item.sortOrder) || 0,
];

// ---------------------------------------------------------------------------
// Reads
// ---------------------------------------------------------------------------

export const listCollection = async (env, collection, options = {}) => {
  assertCollection(collection);
  const includeInactive = options.includeInactive === true;
  const query = includeInactive
    ? "SELECT data FROM records WHERE collection = ? ORDER BY sort_order ASC, created_at ASC"
    : "SELECT data FROM records WHERE collection = ? AND is_active != 0 ORDER BY sort_order ASC, created_at ASC";
  const result = await env.DB.prepare(query).bind(collection).all();
  return (result.results || []).map(toRecord);
};

export const getById = async (env, collection, id) => {
  assertCollection(collection);
  return toRecord(
    await env.DB.prepare("SELECT data FROM records WHERE collection = ? AND id = ?").bind(collection, String(id)).first()
  );
};

// Resolves a record by id, then slug, then legacyId (compared as numbers when numeric).
export const findCollectionItem = async (env, collection, key) => {
  assertCollection(collection);
  const value = String(key ?? "");
  if (!value) return null;

  const byId = await getById(env, collection, value);
  if (byId) return byId;

  const bySlug = await env.DB.prepare(
    "SELECT data FROM records WHERE collection = ? AND slug = ? ORDER BY created_at ASC LIMIT 1"
  )
    .bind(collection, value)
    .first();
  if (bySlug) return toRecord(bySlug);

  const numeric = /^\d+(\.\d+)?$/.test(value) ? Number(value) : null;
  const byLegacy = await env.DB.prepare(
    `SELECT data FROM records
      WHERE collection = ?
        AND (
          (json_type(data, '$.legacyId') = 'text' AND json_extract(data, '$.legacyId') = ?)
          OR (json_type(data, '$.legacyId') IN ('integer', 'real') AND json_extract(data, '$.legacyId') = ?)
        )
      ORDER BY created_at ASC LIMIT 1`
  )
    .bind(collection, value, numeric)
    .first();
  return toRecord(byLegacy);
};

export const getCollectionItem = async (env, collection, key) => {
  const item = await findCollectionItem(env, collection, key);
  if (!item) notFound(notFoundMessage(collection));
  return item;
};

// Newest record whose top-level field equals value.
export const findByField = async (env, collection, field, value) => {
  assertCollection(collection);
  assertField(field);
  return toRecord(
    await env.DB.prepare(
      "SELECT data FROM records WHERE collection = ? AND json_extract(data, ?) = ? ORDER BY created_at DESC LIMIT 1"
    )
      .bind(collection, `$.${field}`, value)
      .first()
  );
};

// ---------------------------------------------------------------------------
// Slugs and ordering
// ---------------------------------------------------------------------------

export const nextSortOrder = async (env, collection) => {
  const row = await env.DB.prepare(
    "SELECT COALESCE(MAX(sort_order), 0) + 1 AS next FROM records WHERE collection = ?"
  )
    .bind(collection)
    .first();
  return Number(row?.next) || 1;
};

const randomSlug = () => crypto.randomUUID().replaceAll("-", "").slice(0, 8);

// Normalizes the requested slug (or derives one), rejects uuid-shaped slugs and makes it
// unique inside the collection by appending -2, -3, ... (ignoring excludeId).
export const resolveSlug = async (env, collection, { input, fallback, excludeId = "" }) => {
  let base = normalizeSlug(input);
  if (base && UUID_SHAPE.test(base)) badRequest("Slug must not look like an id.");
  if (!base) base = normalizeSlug(fallback).slice(0, 120).replace(/-+$/, "");
  if (!base || UUID_SHAPE.test(base)) base = randomSlug();

  const rows = await env.DB.prepare(
    "SELECT slug FROM records WHERE collection = ? AND id != ? AND (slug = ? OR slug LIKE ?)"
  )
    .bind(collection, String(excludeId), base, `${base.slice(0, 110)}-%`)
    .all();
  const taken = new Set((rows.results || []).map((row) => row.slug));
  if (!taken.has(base)) return base;
  for (let suffix = 2; suffix < 10000; suffix += 1) {
    const tail = `-${suffix}`;
    const candidate = `${base.slice(0, 120 - tail.length).replace(/-+$/, "")}${tail}`;
    if (!taken.has(candidate)) return candidate;
  }
  return `${base.slice(0, 111)}-${randomSlug()}`;
};

// ---------------------------------------------------------------------------
// Writes
// ---------------------------------------------------------------------------

export const isUniqueViolation = (error) => /UNIQUE constraint failed/i.test(String(error?.message || error));

// Unique indexes (migrations/0010): product SKU, category/product slug. The handlers
// check first; the index only catches concurrent writes. Other collections keep the raw
// constraint error, which their handlers catch (vacancy slug retry, admin email 409).
const OPS_UNIQUE_COLLECTIONS = ["categories", "products"];
const rethrowUnique = (collection) => (error) => {
  if (OPS_UNIQUE_COLLECTIONS.includes(collection) && isUniqueViolation(error)) {
    throw new ApiError(409, "Another record was saved with the same value. Please try again.");
  }
  throw error;
};

const withoutUndefined = (payload) =>
  Object.fromEntries(Object.entries(payload || {}).filter(([, value]) => value !== undefined));

// payload.slug is the raw slug input for catalog collections; slugFallback is the text to
// derive a slug from. Other collections never get a slug.
export const createCollectionItem = async (env, collection, payload, { slugFallback, id } = {}) => {
  assertCollection(collection);
  const input = withoutUndefined(payload);
  const timestamp = now();
  const item = {
    isActive: true,
    createdAt: timestamp,
    updatedAt: timestamp,
    ...input,
    id: id || crypto.randomUUID(),
  };
  delete item.slug;
  if (SLUGGED_COLLECTIONS.includes(collection)) {
    item.slug = await resolveSlug(env, collection, { input: input.slug, fallback: slugFallback });
  }
  if (item.sortOrder === undefined || item.sortOrder === null) item.sortOrder = await nextSortOrder(env, collection);

  const [slug, isActive, sortOrder] = rowValues(item);
  await env.DB.prepare(
    `INSERT INTO records (id, collection, slug, data, is_active, sort_order, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
  )
    .bind(item.id, collection, slug, JSON.stringify(item), isActive, sortOrder, item.createdAt, item.updatedAt)
    .run()
    .catch(rethrowUnique(collection));
  return item;
};

// Applies only the fields in patch to the freshest stored document.
export const updateCollectionItem = async (env, collection, id, patch) => {
  assertCollection(collection);
  const changes = withoutUndefined(patch);
  delete changes.id;
  delete changes.createdAt;

  for (let attempt = 0; attempt < CAS_ATTEMPTS; attempt += 1) {
    const row = await env.DB.prepare("SELECT data FROM records WHERE collection = ? AND id = ?")
      .bind(collection, String(id))
      .first();
    if (!row) notFound(notFoundMessage(collection));
    const fresh = JSON.parse(row.data);
    const item = { ...fresh, ...changes, id: fresh.id, createdAt: fresh.createdAt, updatedAt: now() };
    const [slug, isActive, sortOrder] = rowValues(item);
    const result = await env.DB.prepare(
      `UPDATE records SET data = ?, slug = ?, is_active = ?, sort_order = ?, updated_at = ?
        WHERE collection = ? AND id = ? AND data = ?`
    )
      .bind(JSON.stringify(item), slug, isActive, sortOrder, item.updatedAt, collection, fresh.id, row.data)
      .run()
      .catch(rethrowUnique(collection));
    if (changesOf(result) === 1) return item;
  }
  throw new ApiError(409, "This record was changed by another request. Please try again.");
};

// Appends entry to the array field (creating it if needed) in one statement, and sets
// the given top-level scalar fields. Concurrent appends never lose entries.
export const appendToArray = async (env, collection, id, field, entry, set = {}) => {
  assertCollection(collection);
  assertField(field);
  const timestamp = now();
  const extra = Object.entries({ ...withoutUndefined(set), updatedAt: timestamp });
  extra.forEach(([key]) => assertField(key));
  const path = `$.${field}`;
  const result = await env.DB.prepare(
    `UPDATE records
      SET data = json_set(
            data,
            ?, json_insert(CASE WHEN json_type(data, ?) = 'array' THEN json_extract(data, ?) ELSE json('[]') END, '$[#]', json(?))
            ${extra.map(() => ", ?, ?").join("")}
          ),
          updated_at = ?
      WHERE collection = ? AND id = ?`
  )
    .bind(
      path,
      path,
      path,
      JSON.stringify(entry),
      ...extra.flatMap(([key, value]) => [`$.${key}`, value]),
      timestamp,
      collection,
      String(id)
    )
    .run();
  if (changesOf(result) !== 1) notFound(notFoundMessage(collection));
  return getById(env, collection, id);
};

export const deleteCollectionItem = async (env, collection, existing) => {
  assertCollection(collection);
  const result = await env.DB.prepare("DELETE FROM records WHERE collection = ? AND id = ?")
    .bind(collection, existing.id)
    .run();
  if (changesOf(result) !== 1) notFound(notFoundMessage(collection));
  return existing;
};

// ---------------------------------------------------------------------------
// Admin read status (migrations/0006_admin_reads.sql)
// ---------------------------------------------------------------------------
// Stored per admin, apart from the records, so marking something read never
// changes a contact or order. Times are epoch milliseconds.

export const READ_TYPES = ["contacts", "orders"];

export const readKey = (type, id) => `${type}:${id}`;

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

const ensureReadState = async (env, adminId, timestamp) => {
  await env.DB.prepare(
    "INSERT INTO admin_read_state (admin_id, since, updated_at) VALUES (?, ?, ?) ON CONFLICT (admin_id) DO NOTHING"
  )
    .bind(adminId, timestamp, timestamp)
    .run();
};

// Drops rows already covered by since, then returns the rest as { key: readAt }.
const readItemsAfter = async (env, adminId, since) => {
  await env.DB.prepare("DELETE FROM admin_reads WHERE admin_id = ? AND read_at <= ?").bind(adminId, since).run();
  const rows = await env.DB.prepare("SELECT record_key, read_at FROM admin_reads WHERE admin_id = ?")
    .bind(adminId)
    .all();
  return Object.fromEntries((rows.results || []).map((row) => [row.record_key, Number(row.read_at)]));
};

// { since, items }; creates the admin's baseline (since = now) on first use.
export const getReadStatus = async (env, adminId) => {
  const timestamp = Date.now();
  await ensureReadState(env, adminId, timestamp);
  const row = await env.DB.prepare("SELECT since FROM admin_read_state WHERE admin_id = ?").bind(adminId).first();
  const since = Number(row?.since ?? timestamp);
  return { since, items: await readItemsAfter(env, adminId, since) };
};

// Upserts the read time, keeping the larger value. Resolves to the stored read time.
export const markRecordRead = async (env, adminId, key, readAt) => {
  await ensureReadState(env, adminId, Date.now());
  const row = await env.DB.prepare(
    `INSERT INTO admin_reads (admin_id, record_key, read_at) VALUES (?, ?, ?)
      ON CONFLICT (admin_id, record_key) DO UPDATE SET read_at = MAX(admin_reads.read_at, excluded.read_at)
      RETURNING read_at`
  )
    .bind(adminId, key, readAt)
    .first();
  return Number(row?.read_at ?? readAt);
};

// Moves the admin's since forward (never back) and clears the rows it covers.
export const markAllRead = async (env, adminId, since) => {
  const row = await env.DB.prepare(
    `INSERT INTO admin_read_state (admin_id, since, updated_at) VALUES (?, ?, ?)
      ON CONFLICT (admin_id) DO UPDATE SET since = MAX(admin_read_state.since, excluded.since), updated_at = excluded.updated_at
      RETURNING since`
  )
    .bind(adminId, since, Date.now())
    .first();
  const stored = Number(row?.since ?? since);
  return { since: stored, items: await readItemsAfter(env, adminId, stored) };
};

// Removes a deleted record's read rows for every admin.
export const deleteRecordReads = async (env, key) => {
  await env.DB.prepare("DELETE FROM admin_reads WHERE record_key = ?").bind(key).run();
};
