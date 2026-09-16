import { randomUUID } from "crypto";
import { copyFile, mkdir, readdir, readFile, rename, stat, unlink, writeFile } from "fs/promises";
import { dirname, join, resolve } from "path";
import { fileURLToPath } from "url";
import mongoose from "mongoose";
import { customerSegments, portfolioItems, serviceOfferings } from "../data/seed.js";
import { notFound } from "./errors.js";
import { isMongoMode, track, useMongo } from "./runtime.js";
import { normalizeSlug } from "./validators.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
// JSON_STORE_PATH overrides the JSON store location (e.g. for a throwaway test copy).
export const dbPath = process.env.JSON_STORE_PATH
  ? resolve(process.env.JSON_STORE_PATH)
  : resolve(__dirname, "../data/db.json");
const plansPath = resolve(__dirname, "../../frontend/src/utils/plans.json");

// Only the public catalog collections have slugs (and admin-controlled sortOrder).
export const CATALOG_COLLECTIONS = ["packages", "services", "portfolio", "customerSegments"];
const isCatalog = (collection) => CATALOG_COLLECTIONS.includes(collection);

let dbLock = Promise.resolve();

// Serialize read-modify-write cycles on the JSON file so concurrent requests
// cannot overwrite each other's changes.
const withDbLock = (task) => {
  const run = dbLock.then(task, task);
  dbLock = run.catch(() => {});
  return track(run);
};

const flexibleSchema = new mongoose.Schema(
  {},
  {
    strict: false,
    timestamps: true,
    versionKey: false,
    toJSON: {
      virtuals: true,
      transform: (_doc, ret) => {
        ret.id = ret.id || ret._id?.toString();
        delete ret._id;
        return ret;
      },
    },
    toObject: {
      virtuals: true,
      transform: (_doc, ret) => {
        ret.id = ret.id || ret._id?.toString();
        delete ret._id;
        return ret;
      },
    },
  }
);

const models = {
  packages: mongoose.models.Package || mongoose.model("Package", flexibleSchema, "packages"),
  newsletters:
    mongoose.models.Newsletter || mongoose.model("Newsletter", flexibleSchema, "newsletters"),
  services: mongoose.models.Service || mongoose.model("Service", flexibleSchema, "services"),
  customerSegments:
    mongoose.models.CustomerSegment ||
    mongoose.model("CustomerSegment", flexibleSchema, "customerSegments"),
  portfolio: mongoose.models.Portfolio || mongoose.model("Portfolio", flexibleSchema, "portfolio"),
  contacts: mongoose.models.Contact || mongoose.model("Contact", flexibleSchema, "contacts"),
  carts: mongoose.models.Cart || mongoose.model("Cart", flexibleSchema, "carts"),
  orders: mongoose.models.Order || mongoose.model("Order", flexibleSchema, "orders"),
  admins: mongoose.models.Admin || mongoose.model("Admin", flexibleSchema, "admins"),
  passwordResets:
    mongoose.models.PasswordReset ||
    mongoose.model("PasswordReset", flexibleSchema, "passwordResets"),
};

// Security records (admin sessions, audit log, processed webhook ids). They use
// application-level string ids and ISO-8601 string timestamps in both the JSON
// store and MongoDB, and no mongoose timestamps, so records look identical in
// either backend.
const recordSchema = (indexes = []) => {
  const schema = new mongoose.Schema(
    {},
    {
      strict: false,
      timestamps: false,
      versionKey: false,
      toJSON: { transform: (_doc, ret) => { delete ret._id; return ret; } },
      toObject: { transform: (_doc, ret) => { delete ret._id; return ret; } },
    }
  );
  indexes.forEach(([fields, options]) => schema.index(fields, options));
  return schema;
};

const securityModels = {
  sessions:
    mongoose.models.AdminSession ||
    mongoose.model(
      "AdminSession",
      recordSchema([
        [{ id: 1 }, { unique: true }],
        [{ adminId: 1 }],
        [{ expiresAt: 1 }],
      ]),
      "sessions"
    ),
  auditLogs:
    mongoose.models.AuditLog ||
    mongoose.model(
      "AuditLog",
      recordSchema([
        [{ id: 1 }, { unique: true }],
        [{ createdAt: -1 }],
        [{ action: 1, createdAt: -1 }],
        [{ entity: 1, createdAt: -1 }],
        [{ adminId: 1, createdAt: -1 }],
      ]),
      "auditLogs"
    ),
  webhookEvents:
    mongoose.models.WebhookEvent ||
    mongoose.model(
      "WebhookEvent",
      recordSchema([[{ id: 1 }, { unique: true }], [{ createdAt: 1 }]]),
      "webhookEvents"
    ),
};

// Per-admin read status (numbers are epoch milliseconds). Kept apart from the
// records so marking something read never changes a contact or order.
const readModels = {
  adminReadState:
    mongoose.models.AdminReadState ||
    mongoose.model("AdminReadState", recordSchema([[{ adminId: 1 }, { unique: true }]]), "adminReadState"),
  adminReads:
    mongoose.models.AdminRead ||
    mongoose.model(
      "AdminRead",
      recordSchema([
        [{ adminId: 1, recordKey: 1 }, { unique: true }],
        [{ recordKey: 1 }],
      ]),
      "adminReads"
    ),
};

const now = () => new Date().toISOString();
export { useMongo };

const normalizeMongoRecord = (item) => {
  if (!item) return item;
  const id = item.id || item._id?.toString();
  const { _id, ...rest } = item;
  return { ...rest, id };
};

const isDuplicateKey = (error) => error?.code === 11000;

// Drops keys whose value is undefined so they never override defaults or
// stored values.
const definedOnly = (object = {}) =>
  Object.fromEntries(Object.entries(object).filter(([, value]) => value !== undefined));

const withMeta = (item, index = 0, collection = "packages") => {
  const data = definedOnly(item);
  const id = data.id ? String(data.id) : randomUUID();
  const timestamp = now();

  return {
    id,
    ...(isCatalog(collection)
      ? {
          slug: data.slug || normalizeSlug(data.name || data.title || `${Date.now()}-${index}`),
          sortOrder: index + 1,
        }
      : {}),
    isActive: true,
    createdAt: timestamp,
    updatedAt: timestamp,
    ...data,
    id,
  };
};

const normalizePackage = (item, index = 0) => ({
  ...withMeta(item, index, "packages"),
  legacyId: item.legacyId ?? item.id,
  id: item._id || randomUUID(),
  category: item.category || item.type,
  type: item.type,
  name: item.name,
  load: item.load,
  kva: item.kva,
  volt: item.volt ?? null,
  options: item.options || [],
});

const flattenPlans = (groups) =>
  groups
    .flatMap((group) => group.plan || [])
    .map((item, index) => normalizePackage(item, index));

// Default public catalog (packages from frontend plans.json, the rest from
// data/seed.js). Record ids and timestamps are freshly generated; callers that
// need stable ids (e.g. the Cloudflare seed export) override them.
// With strict=true a missing/invalid plans.json throws instead of yielding [].
export const buildDefaultCatalog = async ({ strict = false } = {}) => {
  let packages = [];

  try {
    const rawPlans = await readFile(plansPath, "utf8");
    packages = flattenPlans(JSON.parse(rawPlans));
  } catch (error) {
    if (strict) throw error;
    packages = [];
  }

  return {
    packages,
    services: serviceOfferings.map((item, index) => withMeta(item, index, "services")),
    customerSegments: customerSegments.map((item, index) =>
      withMeta(item, index, "customerSegments")
    ),
    portfolio: portfolioItems.map((item, index) => withMeta(item, index, "portfolio")),
  };
};

const defaultDb = async () => {
  const catalog = await buildDefaultCatalog();

  return {
    meta: {
      application: "Juwon Electric",
      version: 1,
      createdAt: now(),
      updatedAt: now(),
    },
    packages: catalog.packages,
    newsletters: [],
    services: catalog.services,
    customerSegments: catalog.customerSegments,
    portfolio: catalog.portfolio,
    contacts: [],
    carts: [],
    orders: [],
    admins: [],
    passwordResets: [],
    sessions: [],
    auditLogs: [],
    webhookEvents: [],
    adminReadState: [],
    adminReads: [],
  };
};

const writeDbFile = async (db) => {
  db.meta = { ...(db.meta || {}), updatedAt: now() };
  await mkdir(dirname(dbPath), { recursive: true });
  const tempPath = `${dbPath}.${process.pid}.${randomUUID()}.tmp`;
  await writeFile(tempPath, `${JSON.stringify(db, null, 2)}\n`);
  await rename(tempPath, dbPath);
};

const loadDb = async () => {
  let raw;
  try {
    raw = await readFile(dbPath, "utf8");
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
    const db = await defaultDb();
    await writeDbFile(db);
    return db;
  }
  // Never fall back to (and overwrite with) the default db on a parse error.
  return JSON.parse(raw);
};

export const readDb = async () => loadDb();

export const saveDb = async (db) => withDbLock(() => writeDbFile(db));

// Mutations run inside the lock against a freshly loaded document. A mutator
// that returns { skipWrite: true, result } avoids the file write.
const mutateDb = (mutator) =>
  withDbLock(async () => {
    const db = await loadDb();
    const result = await mutator(db);
    if (result && result.skipWrite === true) return result.result;
    await writeDbFile(db);
    return result;
  });

const sortOrderOf = (item) => Number(item?.sortOrder) || 0;
const nextSortOrder = (items) => items.reduce((max, item) => Math.max(max, sortOrderOf(item)), 0) + 1;

// ---- lookups ----------------------------------------------------------------

// Mongo filter for a record id that also matches documents that only have _id.
const mongoIdFilter = (id) =>
  mongoose.Types.ObjectId.isValid(id) ? { $or: [{ id }, { _id: id }] } : { id };

const mongoQuery = (query = {}) => {
  if (!Object.prototype.hasOwnProperty.call(query, "id")) return query;
  const { id, ...rest } = query;
  return { ...rest, ...mongoIdFilter(id) };
};

export const listCollection = async (collection, { includeInactive = false } = {}) => {
  if (useMongo()) {
    const query = includeInactive ? {} : { isActive: { $ne: false } };
    const items = await models[collection].find(query).sort({ sortOrder: 1, createdAt: 1 }).lean();
    return items.map(normalizeMongoRecord);
  }

  const db = await readDb();
  const items = db[collection] || [];
  return items
    .filter((item) => includeInactive || item.isActive !== false)
    .sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));
};

/**
 * Resolves a record by id, then slug, then legacyId (in that priority order).
 * Throws "<Label> not found." (404).
 */
export const getCollectionItem = async (collection, key) => {
  const id = String(key ?? "");
  if (useMongo()) {
    const model = models[collection];
    const legacy = Number.isNaN(Number(id)) || id.trim() === "" ? [id] : [Number(id), id];
    const item =
      (await model.findOne(mongoIdFilter(id)).lean()) ||
      (await model.findOne({ slug: id }).lean()) ||
      (await model.findOne({ legacyId: { $in: legacy } }).lean());
    if (!item) throw notFound(collection);
    return normalizeMongoRecord(item);
  }

  const db = await readDb();
  const items = db[collection] || [];
  const item =
    items.find((entry) => entry.id === id) ||
    items.find((entry) => entry.slug !== undefined && entry.slug === id) ||
    items.find(
      (entry) =>
        entry.legacyId !== undefined && entry.legacyId !== null && String(entry.legacyId) === id
    );
  if (!item) throw notFound(collection);
  return item;
};

const matchesQuery = (item, query) =>
  Object.entries(query).every(([key, value]) =>
    value === null ? item[key] === null || item[key] === undefined : item[key] === value
  );

export const findCollectionItem = async (collection, query) => {
  if (useMongo()) {
    const item = await models[collection].findOne(mongoQuery(query)).lean();
    return normalizeMongoRecord(item);
  }

  const db = await readDb();
  const items = db[collection] || [];
  return items.find((item) => matchesQuery(item, query));
};

export const findCollectionItems = async (collection, query) => {
  if (useMongo()) {
    const items = await models[collection].find(mongoQuery(query)).lean();
    return items.map(normalizeMongoRecord);
  }
  const db = await readDb();
  return (db[collection] || []).filter((item) => matchesQuery(item, query));
};

const recency = (item) =>
  new Date(item?.receivedAt || item?.createdAt || 0).getTime() || 0;

/** Most recent (receivedAt/createdAt) record matching an equality query, or null. */
export const findLatestCollectionItem = async (collection, query) => {
  const items = await findCollectionItems(collection, query);
  return items.sort((a, b) => recency(b) - recency(a))[0] || null;
};

// ---- writes -------------------------------------------------------------------

/**
 * Creates a record. `prepare(items, item)` (optional) runs against the fresh
 * collection before insert (inside the JSON store lock) and may adjust the
 * item or throw (uniqueness checks). New catalog records without a sortOrder
 * go last.
 */
export const createCollectionItem = async (collection, payload, { prepare } = {}) => {
  if (useMongo()) {
    const model = models[collection];
    let item = withMeta(payload, 0, collection);
    if (isCatalog(collection)) {
      const needsSort = payload.sortOrder === undefined || payload.sortOrder === null;
      const needsSlug = !payload.slug;
      const items =
        needsSort || needsSlug || prepare
          ? (await model.find({}, { id: 1, slug: 1, sortOrder: 1, legacyId: 1 }).lean()).map(
              normalizeMongoRecord
            )
          : [];
      if (needsSort) item.sortOrder = nextSortOrder(items);
      if (prepare) item = (await prepare(items, item)) || item;
    } else if (prepare) {
      item = (await prepare([], item)) || item;
    }
    const doc = await model.create(item);
    return normalizeMongoRecord(doc.toObject({ transform: false, virtuals: false }));
  }

  return mutateDb(async (db) => {
    const items = db[collection] || [];
    let item = withMeta(payload, items.length, collection);
    if (isCatalog(collection) && (payload.sortOrder === undefined || payload.sortOrder === null)) {
      item.sortOrder = nextSortOrder(items);
    }
    if (prepare) item = (await prepare(items, item)) || item;
    db[collection] = [...items, item];
    return item;
  });
};

/**
 * Applies only the given (defined) fields to the fresh stored record with
 * this exact id. `prepare(items, existing, patch)` runs against fresh data
 * first (inside the JSON store lock) and may return an adjusted patch or throw.
 */
export const updateCollectionItem = async (collection, id, payload, { prepare } = {}) => {
  let patch = definedOnly(payload);
  delete patch.id;
  delete patch._id;

  if (useMongo()) {
    const model = models[collection];
    if (prepare) {
      const existing = normalizeMongoRecord(await model.findOne(mongoIdFilter(id)).lean());
      if (!existing) throw notFound(collection);
      const items = isCatalog(collection)
        ? (await model.find({}, { id: 1, slug: 1, sortOrder: 1, legacyId: 1 }).lean()).map(
            normalizeMongoRecord
          )
        : [];
      patch = (await prepare(items, existing, patch)) || patch;
    }
    const item = await model
      .findOneAndUpdate(
        mongoIdFilter(id),
        { $set: { ...patch, updatedAt: now() } },
        { new: true, timestamps: false }
      )
      .lean();
    if (!item) throw notFound(collection);
    return normalizeMongoRecord(item);
  }

  return mutateDb(async (db) => {
    const items = db[collection] || [];
    const index = items.findIndex((entry) => entry.id === id);
    if (index === -1) throw notFound(collection);
    if (prepare) patch = (await prepare(items, items[index], patch)) || patch;
    const updated = {
      ...items[index],
      ...definedOnly(patch),
      id: items[index].id,
      updatedAt: now(),
    };
    items[index] = updated;
    db[collection] = items;
    return updated;
  });
};

/**
 * Compare-and-set: applies `patch` to the first record matching the equality
 * `query` (null matches null/missing). Resolves to the updated record, or null
 * when nothing matched.
 */
export const updateCollectionItemIf = async (collection, query, patch) => {
  const changes = definedOnly(patch);
  if (useMongo()) {
    const item = await models[collection]
      .findOneAndUpdate(
        mongoQuery(query),
        { $set: { ...changes, updatedAt: now() } },
        { new: true, timestamps: false }
      )
      .lean();
    return item ? normalizeMongoRecord(item) : null;
  }

  return mutateDb((db) => {
    const items = db[collection] || [];
    const index = items.findIndex((item) => matchesQuery(item, query));
    if (index === -1) return { skipWrite: true, result: null };
    items[index] = { ...items[index], ...changes, updatedAt: now() };
    db[collection] = items;
    return items[index];
  });
};

export const updateCollectionItemByQuery = async (collection, query, payload) => {
  const item = await updateCollectionItemIf(collection, query, payload);
  if (!item) throw notFound(collection);
  return item;
};

/** Appends `entry` to the array `field` (atomically) and sets `patch` fields. */
export const appendToCollectionArray = async (collection, id, field, entry, patch = {}) => {
  const changes = definedOnly(patch);
  if (useMongo()) {
    const item = await models[collection]
      .findOneAndUpdate(
        mongoIdFilter(id),
        { $push: { [field]: entry }, $set: { ...changes, updatedAt: now() } },
        { new: true, timestamps: false }
      )
      .lean();
    if (!item) throw notFound(collection);
    return normalizeMongoRecord(item);
  }

  return mutateDb((db) => {
    const items = db[collection] || [];
    const index = items.findIndex((item) => item.id === id);
    if (index === -1) throw notFound(collection);
    const current = items[index];
    items[index] = {
      ...current,
      ...changes,
      [field]: [...(Array.isArray(current[field]) ? current[field] : []), entry],
      updatedAt: now(),
    };
    db[collection] = items;
    return items[index];
  });
};

/**
 * Finds the most recent record matching `query` and applies `update(existing)`
 * (a patch, or null for no change); creates `create` when none exists.
 * Resolves to { item, created }. Atomic in the JSON store.
 */
export const upsertCollectionItem = async (collection, query, { create, update }) => {
  if (useMongo()) {
    const existing = await findLatestCollectionItem(collection, query);
    if (!existing) {
      return { item: await createCollectionItem(collection, create), created: true };
    }
    const patch = update(existing);
    if (!patch) return { item: existing, created: false };
    return { item: await updateCollectionItem(collection, existing.id, patch), created: false };
  }

  return mutateDb((db) => {
    const items = db[collection] || [];
    const existing = items
      .filter((item) => matchesQuery(item, query))
      .sort((a, b) => recency(b) - recency(a))[0];
    if (!existing) {
      const item = withMeta(create, items.length, collection);
      db[collection] = [...items, item];
      return { item, created: true };
    }
    const patch = update(existing);
    if (!patch) return { skipWrite: true, result: { item: existing, created: false } };
    const index = items.indexOf(existing);
    items[index] = { ...existing, ...definedOnly(patch), id: existing.id, updatedAt: now() };
    db[collection] = items;
    return { item: items[index], created: false };
  });
};

/** Deletes the record with this exact id. */
export const deleteCollectionItem = async (collection, id) => {
  if (useMongo()) {
    const item = await models[collection].findOneAndDelete(mongoIdFilter(id)).lean();
    if (!item) throw notFound(collection);
    return normalizeMongoRecord(item);
  }

  return mutateDb((db) => {
    const items = db[collection] || [];
    const item = items.find((entry) => entry.id === id);
    if (!item) throw notFound(collection);
    db[collection] = items.filter((entry) => entry.id !== item.id);
    return item;
  });
};

export const deleteCollectionItemsByIds = async (collection, ids) => {
  if (!ids.length) return 0;
  if (useMongo()) {
    const result = await models[collection].deleteMany({ id: { $in: ids } });
    return result.deletedCount;
  }
  return mutateDb((db) => {
    const items = db[collection] || [];
    const remaining = items.filter((item) => !ids.includes(item.id));
    if (remaining.length === items.length) return { skipWrite: true, result: 0 };
    db[collection] = remaining;
    return items.length - remaining.length;
  });
};

/** Deletes records whose ISO string `field` is before `cutoffIso` (main collections). */
export const deleteCollectionItemsBefore = async (collection, field, cutoffIso) => {
  if (useMongo()) {
    // Mongoose timestamps may have stored Dates rather than ISO strings.
    const result = await models[collection].deleteMany({
      $or: [{ [field]: { $lt: cutoffIso } }, { [field]: { $lt: new Date(cutoffIso) } }],
    });
    return result.deletedCount;
  }
  const isStale = (item) => typeof item[field] === "string" && item[field] < cutoffIso;
  const snapshot = await readDb();
  if (!(snapshot[collection] || []).some(isStale)) return 0;
  return mutateDb((db) => {
    const items = db[collection] || [];
    db[collection] = items.filter((item) => !isStale(item));
    return items.length - db[collection].length;
  });
};

export const appendCollectionItem = async (collection, payload) =>
  createCollectionItem(collection, {
    ...payload,
    status: payload.status || "new",
    receivedAt: now(),
  });

export const seedMongoIfEmpty = async () => {
  if (mongoose.connection.readyState !== 1) return;

  const db = await defaultDb();

  await Promise.all(
    Object.entries(models).map(async ([collection, model]) => {
      const count = await model.estimatedDocumentCount();
      if (count > 0) return;
      const records = db[collection] || [];
      if (records.length === 0) return;
      await model.insertMany(records);
    })
  );
};

// ---------------------------------------------------------------------------
// Security records: sessions, auditLogs, webhookEvents.
// Queries are plain equality filters ({ field: value }); values are compared
// with === in the JSON store.
// ---------------------------------------------------------------------------

const matches = (record, filter = {}) =>
  Object.entries(filter).every(([key, value]) => record[key] === value);

const stripMongoId = (record) => {
  if (!record) return record;
  const { _id, ...rest } = record;
  return rest;
};

export const insertRecord = async (collection, record) => {
  if (useMongo()) {
    await securityModels[collection].collection.insertOne({ ...record });
    return record;
  }
  return mutateDb((db) => {
    db[collection] = [...(db[collection] || []), record];
    return record;
  });
};

// Inserts `record` only if no record with the same id exists. Resolves to true
// when inserted, false when it already existed. Atomic in both stores.
export const insertRecordIfAbsent = async (collection, record) => {
  if (useMongo()) {
    // The filter's `id` is copied into the inserted document by the upsert.
    const { id, ...rest } = record;
    try {
      const result = await securityModels[collection].collection.updateOne(
        { id },
        { $setOnInsert: rest },
        { upsert: true }
      );
      return result.upsertedCount === 1;
    } catch (error) {
      // Concurrent upserts of the same id: the loser sees a duplicate key.
      if (isDuplicateKey(error)) return false;
      throw error;
    }
  }
  return mutateDb((db) => {
    const items = db[collection] || [];
    if (items.some((item) => item.id === record.id)) return { skipWrite: true, result: false };
    db[collection] = [...items, record];
    return true;
  });
};

export const findRecord = async (collection, filter) => {
  if (useMongo()) {
    return stripMongoId(await securityModels[collection].findOne(filter).lean());
  }
  const db = await readDb();
  return (db[collection] || []).find((record) => matches(record, filter)) || null;
};

// Applies `patch` to every record matching `filter`; resolves to the count.
export const updateRecords = async (collection, filter, patch) => {
  if (useMongo()) {
    const result = await securityModels[collection].collection.updateMany(filter, {
      $set: patch,
    });
    return result.modifiedCount;
  }
  return mutateDb((db) => {
    let count = 0;
    db[collection] = (db[collection] || []).map((record) => {
      if (!matches(record, filter)) return record;
      count += 1;
      return { ...record, ...patch };
    });
    return count === 0 ? { skipWrite: true, result: 0 } : count;
  });
};

export const deleteRecords = async (collection, filter) => {
  if (useMongo()) {
    const result = await securityModels[collection].collection.deleteMany(filter);
    return result.deletedCount;
  }
  return mutateDb((db) => {
    const items = db[collection] || [];
    db[collection] = items.filter((record) => !matches(record, filter));
    return items.length - db[collection].length;
  });
};

// Deletes records whose ISO-8601 string `field` is before `cutoffIso`.
// Skips the JSON file write entirely when nothing is stale.
export const deleteRecordsBefore = async (collection, field, cutoffIso) => {
  if (useMongo()) {
    const result = await securityModels[collection].collection.deleteMany({
      [field]: { $lt: cutoffIso },
    });
    return result.deletedCount;
  }
  const isStale = (record) => typeof record[field] === "string" && record[field] < cutoffIso;
  const snapshot = await readDb();
  if (!(snapshot[collection] || []).some(isStale)) return 0;
  return mutateDb((db) => {
    const items = db[collection] || [];
    db[collection] = items.filter((record) => !isStale(record));
    return items.length - db[collection].length;
  });
};

// Newest first by createdAt. Returns { items, total }.
export const pageRecords = async (collection, { filter = {}, page = 1, limit = 50 } = {}) => {
  const skip = (page - 1) * limit;
  if (useMongo()) {
    const model = securityModels[collection];
    const [items, total] = await Promise.all([
      model.find(filter).sort({ createdAt: -1, id: -1 }).skip(skip).limit(limit).lean(),
      model.countDocuments(filter),
    ]);
    return { items: items.map(stripMongoId), total };
  }
  const db = await readDb();
  const all = (db[collection] || [])
    .filter((record) => matches(record, filter))
    .sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));
  return { items: all.slice(skip, skip + limit), total: all.length };
};

// Makes sure the security collection indexes exist (unique ids are relied on
// for webhook replay protection).
export const ensureSecurityIndexes = async () => {
  if (!isMongoMode() || mongoose.connection.readyState !== 1) return;
  await Promise.all([
    ...[...Object.values(securityModels), ...Object.values(readModels)].map((model) =>
      model.createIndexes()
    ),
    // Admin emails are unique (stored lowercase). Fails loudly on existing duplicates.
    models.admins.collection.createIndex(
      { email: 1 },
      { unique: true, name: "admins_email_unique", partialFilterExpression: { email: { $type: "string" } } }
    ),
  ]);
};

// ---------------------------------------------------------------------------
// Admin read status: adminReadState { adminId, since, updatedAt } and
// adminReads { adminId, recordKey, readAt }, unique on (adminId, recordKey).
// ---------------------------------------------------------------------------

// Runs a Mongo upsert, retrying once when a concurrent upsert of the same key
// wins the insert (E11000); the retry then updates the existing document.
const upsertWithRetry = async (task) => {
  try {
    return await task();
  } catch (error) {
    if (!isDuplicateKey(error)) throw error;
    return task();
  }
};

const readItemsMap = (rows) =>
  Object.fromEntries(rows.map((row) => [row.recordKey, Number(row.readAt)]));

const ensureMongoReadState = (adminId, timestamp) =>
  upsertWithRetry(() =>
    readModels.adminReadState.collection.updateOne(
      { adminId },
      { $setOnInsert: { since: timestamp, updatedAt: timestamp } },
      { upsert: true }
    )
  );

const mongoReadItemsAfter = async (adminId, since) => {
  const model = readModels.adminReads.collection;
  await model.deleteMany({ adminId, readAt: { $lte: since } });
  return readItemsMap(await model.find({ adminId }).toArray());
};

// Adds the admin's state row (since = timestamp) to the JSON store when missing.
const jsonReadState = (db, adminId, timestamp) => {
  db.adminReadState = db.adminReadState || [];
  let state = db.adminReadState.find((entry) => entry.adminId === adminId);
  let changed = false;
  if (!state) {
    state = { adminId, since: timestamp, updatedAt: timestamp };
    db.adminReadState.push(state);
    changed = true;
  }
  return { state, changed };
};

// Drops the admin's rows covered by since; returns { items, changed }.
const jsonReadItemsAfter = (db, adminId, since) => {
  const rows = db.adminReads || [];
  const kept = rows.filter((row) => !(row.adminId === adminId && Number(row.readAt) <= since));
  db.adminReads = kept;
  return {
    items: readItemsMap(kept.filter((row) => row.adminId === adminId)),
    changed: kept.length !== rows.length,
  };
};

/** { since, items } for this admin; creates the baseline (since = now) on first use. */
export const getAdminReadStatus = async (adminId) => {
  const timestamp = Date.now();
  if (useMongo()) {
    await ensureMongoReadState(adminId, timestamp);
    const state = await readModels.adminReadState.collection.findOne({ adminId });
    const since = Number(state?.since ?? timestamp);
    return { since, items: await mongoReadItemsAfter(adminId, since) };
  }
  return mutateDb((db) => {
    const { state, changed } = jsonReadState(db, adminId, timestamp);
    const since = Number(state.since);
    const pruned = jsonReadItemsAfter(db, adminId, since);
    const result = { since, items: pruned.items };
    return changed || pruned.changed ? result : { skipWrite: true, result };
  });
};

/** Stores max(existing, readAt) for the key; resolves to the stored read time. */
export const markAdminRecordRead = async (adminId, recordKey, readAt) => {
  const timestamp = Date.now();
  if (useMongo()) {
    await ensureMongoReadState(adminId, timestamp);
    const row = await upsertWithRetry(() =>
      readModels.adminReads.collection.findOneAndUpdate(
        { adminId, recordKey },
        { $max: { readAt } },
        { upsert: true, returnDocument: "after", includeResultMetadata: false }
      )
    );
    return Number(row?.readAt ?? readAt);
  }
  return mutateDb((db) => {
    jsonReadState(db, adminId, timestamp);
    db.adminReads = db.adminReads || [];
    const row = db.adminReads.find(
      (entry) => entry.adminId === adminId && entry.recordKey === recordKey
    );
    if (row) row.readAt = Math.max(Number(row.readAt) || 0, readAt);
    else db.adminReads.push({ adminId, recordKey, readAt });
    return row ? row.readAt : readAt;
  });
};

/** Moves the admin's since forward to max(existing, since) and clears covered rows. */
export const markAllAdminRead = async (adminId, since) => {
  const timestamp = Date.now();
  if (useMongo()) {
    const state = await upsertWithRetry(() =>
      readModels.adminReadState.collection.findOneAndUpdate(
        { adminId },
        { $max: { since }, $set: { updatedAt: timestamp } },
        { upsert: true, returnDocument: "after", includeResultMetadata: false }
      )
    );
    const stored = Number(state?.since ?? since);
    return { since: stored, items: await mongoReadItemsAfter(adminId, stored) };
  }
  return mutateDb((db) => {
    const { state } = jsonReadState(db, adminId, since);
    state.since = Math.max(Number(state.since) || 0, since);
    state.updatedAt = timestamp;
    return { since: state.since, items: jsonReadItemsAfter(db, adminId, state.since).items };
  });
};

/** Removes a deleted record's read rows for every admin. */
export const deleteRecordReads = async (recordKey) => {
  if (useMongo()) {
    const result = await readModels.adminReads.collection.deleteMany({ recordKey });
    return result.deletedCount;
  }
  return mutateDb((db) => {
    const rows = db.adminReads || [];
    db.adminReads = rows.filter((row) => row.recordKey !== recordKey);
    const removed = rows.length - db.adminReads.length;
    return removed === 0 ? { skipWrite: true, result: 0 } : removed;
  });
};

// ---- health and backups -------------------------------------------------------

/** True when the active store answers (Mongo ping, or the JSON file reads and parses). */
export const checkStoreHealth = async () => {
  try {
    if (isMongoMode()) {
      if (mongoose.connection.readyState !== 1) return false;
      await mongoose.connection.db.admin().ping();
      return true;
    }
    await readDb(); // creates the default store when missing; throws on unreadable/invalid JSON
    return true;
  } catch {
    return false;
  }
};

const BACKUPS_TO_KEEP = 5;

/**
 * Copies the JSON store (if it exists) to <store dir>/backups/db-<timestamp>.json
 * and keeps the newest 5 backups. Resolves to the backup path or null.
 */
export const backupJsonStore = async () => {
  const backupDir = join(dirname(dbPath), "backups");
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const target = join(backupDir, `db-${stamp}.json`);
  try {
    await stat(dbPath);
  } catch (error) {
    if (error.code === "ENOENT") return null;
    throw error;
  }
  await mkdir(backupDir, { recursive: true });
  await copyFile(dbPath, target);
  const backups = (await readdir(backupDir))
    .filter((name) => /^db-.*\.json$/.test(name))
    .sort();
  await Promise.all(
    backups
      .slice(0, Math.max(backups.length - BACKUPS_TO_KEEP, 0))
      .map((name) => unlink(join(backupDir, name)).catch(() => {}))
  );
  return target;
};
