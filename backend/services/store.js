import { randomUUID } from "crypto";
import { readFile, writeFile, mkdir } from "fs/promises";
import { dirname, resolve } from "path";
import { fileURLToPath } from "url";
import mongoose from "mongoose";
import { customerSegments, portfolioItems, serviceOfferings } from "../data/seed.js";
import { notFound } from "./errors.js";
import { normalizeSlug } from "./validators.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const dbPath = resolve(__dirname, "../data/db.json");
const plansPath = resolve(__dirname, "../../frontend/src/utils/plans.json");

let writeQueue = Promise.resolve();

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

const now = () => new Date().toISOString();
const useMongo = () => mongoose.connection.readyState === 1;
const toPlain = (item) => (item?.toObject ? item.toObject() : item);
const normalizeMongoRecord = (item) => {
  if (!item) return item;
  const id = item.id || item._id?.toString();
  const { _id, ...rest } = item;
  return { ...rest, id };
};

const withMeta = (item, index = 0) => {
  const id = item.id ? String(item.id) : randomUUID();

  return {
    id,
    slug: item.slug || normalizeSlug(item.name || item.title || `${Date.now()}-${index}`),
    isActive: item.isActive ?? true,
    sortOrder: item.sortOrder ?? index + 1,
    createdAt: item.createdAt || now(),
    updatedAt: item.updatedAt || now(),
    ...item,
    id,
  };
};

const normalizePackage = (item, index = 0) => ({
  ...withMeta(item, index),
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

const defaultDb = async () => {
  let packages = [];

  try {
    const rawPlans = await readFile(plansPath, "utf8");
    packages = flattenPlans(JSON.parse(rawPlans));
  } catch (error) {
    packages = [];
  }

  return {
    meta: {
      application: "Juwon Electric",
      version: 1,
      createdAt: now(),
      updatedAt: now(),
    },
    packages,
    newsletters: [],
    services: serviceOfferings.map(withMeta),
    customerSegments: customerSegments.map(withMeta),
    portfolio: portfolioItems.map(withMeta),
    contacts: [],
    carts: [],
    orders: [],
    admins: [],
    passwordResets: [],
  };
};

export const readDb = async () => {
  try {
    const raw = await readFile(dbPath, "utf8");
    return JSON.parse(raw);
  } catch (error) {
    const db = await defaultDb();
    await saveDb(db);
    return db;
  }
};

export const saveDb = async (db) => {
  db.meta = { ...(db.meta || {}), updatedAt: now() };
  await mkdir(dirname(dbPath), { recursive: true });
  writeQueue = writeQueue.then(() =>
    writeFile(dbPath, `${JSON.stringify(db, null, 2)}\n`)
  );
  return writeQueue;
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

export const getCollectionItem = async (collection, id) => {
  if (useMongo()) {
    const item = await models[collection]
      .findOne({
        $or: [
          mongoose.Types.ObjectId.isValid(id) ? { _id: id } : null,
          { id },
          { slug: id },
          { legacyId: Number.isNaN(Number(id)) ? id : Number(id) },
          { legacyId: id },
        ].filter(Boolean),
      })
      .lean();

    if (!item) throw notFound(collection);
    return normalizeMongoRecord(item);
  }

  const db = await readDb();
  const item = (db[collection] || []).find(
    (entry) => entry.id === id || entry.slug === id || String(entry.legacyId) === String(id)
  );
  if (!item) throw notFound(collection);
  return item;
};

export const findCollectionItem = async (collection, query) => {
  if (useMongo()) {
    const item = await models[collection].findOne(query).lean();
    return normalizeMongoRecord(item);
  }

  const db = await readDb();
  const items = db[collection] || [];
  return items.find((item) =>
    Object.entries(query).every(([key, value]) => item[key] === value)
  );
};

export const createCollectionItem = async (collection, payload) => {
  if (useMongo()) {
    const item = await models[collection].create(withMeta(payload));
    return toPlain(item);
  }

  const db = await readDb();
  const items = db[collection] || [];
  const item = withMeta(payload, items.length);
  db[collection] = [...items, item];
  await saveDb(db);
  return item;
};

export const updateCollectionItem = async (collection, id, payload) => {
  if (useMongo()) {
    const item = await models[collection].findOneAndUpdate(
      {
        $or: [
          mongoose.Types.ObjectId.isValid(id) ? { _id: id } : null,
          { id },
          { slug: id },
        ].filter(Boolean),
      },
      { ...payload, updatedAt: now() },
      { new: true }
    );

    if (!item) throw notFound(collection);
    return toPlain(item);
  }

  const db = await readDb();
  const items = db[collection] || [];
  const index = items.findIndex((entry) => entry.id === id || entry.slug === id);
  if (index === -1) throw notFound(collection);
  const updated = {
    ...items[index],
    ...payload,
    id: items[index].id,
    updatedAt: now(),
  };
  db[collection] = items.map((item, itemIndex) => (itemIndex === index ? updated : item));
  await saveDb(db);
  return updated;
};

export const updateCollectionItemByQuery = async (collection, query, payload) => {
  if (useMongo()) {
    const item = await models[collection].findOneAndUpdate(
      query,
      { ...payload, updatedAt: now() },
      { new: true }
    );

    if (!item) throw notFound(collection);
    return toPlain(item);
  }

  const db = await readDb();
  const items = db[collection] || [];
  const index = items.findIndex((item) =>
    Object.entries(query).every(([key, value]) => item[key] === value)
  );
  if (index === -1) throw notFound(collection);
  const updated = {
    ...items[index],
    ...payload,
    updatedAt: now(),
  };
  db[collection] = items.map((item, itemIndex) => (itemIndex === index ? updated : item));
  await saveDb(db);
  return updated;
};

export const deleteCollectionItem = async (collection, id) => {
  if (useMongo()) {
    const item = await models[collection].findOneAndDelete({
      $or: [
        mongoose.Types.ObjectId.isValid(id) ? { _id: id } : null,
        { id },
        { slug: id },
      ].filter(Boolean),
    });

    if (!item) throw notFound(collection);
    return toPlain(item);
  }

  const db = await readDb();
  const items = db[collection] || [];
  const item = items.find((entry) => entry.id === id || entry.slug === id);
  if (!item) throw notFound(collection);
  db[collection] = items.filter((entry) => entry.id !== item.id);
  await saveDb(db);
  return item;
};

export const appendCollectionItem = async (collection, payload) =>
  createCollectionItem(collection, {
    ...payload,
    status: payload.status || "new",
    receivedAt: now(),
  });

export const seedMongoIfEmpty = async () => {
  if (!useMongo()) return;

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
