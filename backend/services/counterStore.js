// Fixed-window counters for rate limits and login lockouts.
//
// Mongo mode (connected): documents in the `rateLimits` collection
//   { _id: key, count, resetAt: Date } with a TTL index on resetAt, updated
//   atomically so counts are shared across instances.
// Otherwise (JSON mode, or a Mongo call fails): an in-memory Map per process.
//
// Counters are never written to the JSON file store.
import mongoose from "mongoose";
import { isMongoMode } from "./runtime.js";

const COLLECTION = "rateLimits";
const memory = new Map();

const pruneTimer = setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of memory) {
    if (entry.resetAt <= now) memory.delete(key);
  }
}, 60 * 1000);
pruneTimer.unref?.();

const useMongo = () => isMongoMode() && mongoose.connection.readyState === 1;
const collection = () => mongoose.connection.db.collection(COLLECTION);
const isDuplicateKey = (error) => error?.code === 11000;

let warnedFallback = false;
const warnFallback = (error) => {
  if (warnedFallback) return;
  warnedFallback = true;
  console.warn(
    `Rate limit store: MongoDB call failed, using in-memory counters for this request. Reason: ${error?.name} ${error?.message}`
  );
};

// ---- memory implementation ------------------------------------------------

// Synchronous: two concurrent requests can never read the same count.
const memoryHit = (key, windowMs) => {
  const now = Date.now();
  let entry = memory.get(key);
  if (!entry || entry.resetAt <= now) {
    entry = { count: 0, resetAt: now + windowMs };
    memory.set(key, entry);
  }
  entry.count += 1;
  return { count: entry.count, resetAt: entry.resetAt };
};

const memoryGet = (key) => {
  const entry = memory.get(key);
  if (!entry || entry.resetAt <= Date.now()) return null;
  return { count: entry.count, resetAt: entry.resetAt };
};

// ---- public API -------------------------------------------------------------

const mongoHit = async (key, windowMs) => {
  const now = new Date();
  const live = { $and: [{ $ne: [{ $type: "$resetAt" }, "missing"] }, { $gt: ["$resetAt", now] }] };
  // Aggregation-pipeline update: both fields are computed from the
  // pre-update document, so the increment/reset is a single atomic op.
  const doc = await collection().findOneAndUpdate(
    { _id: key },
    [
      {
        $set: {
          count: { $cond: [live, { $add: ["$count", 1] }, 1] },
          resetAt: { $cond: [live, "$resetAt", new Date(now.getTime() + windowMs)] },
        },
      },
    ],
    { upsert: true, returnDocument: "after" }
  );
  const value = doc && "value" in doc && !("count" in doc) ? doc.value : doc;
  return { count: value.count, resetAt: new Date(value.resetAt).getTime() };
};

/** Increments `key` in a window of `windowMs`. Resolves to { count, resetAt(ms) }. */
export const hitCounter = async (key, windowMs) => {
  if (useMongo()) {
    try {
      try {
        return await mongoHit(key, windowMs);
      } catch (error) {
        // Two concurrent upserts of a new key: the loser retries once as an update.
        if (!isDuplicateKey(error)) throw error;
        return await mongoHit(key, windowMs);
      }
    } catch (error) {
      warnFallback(error);
    }
  }
  return memoryHit(key, windowMs);
};

/** Resolves to { count, resetAt(ms) } for a live counter, or null. */
export const getCounter = async (key) => {
  if (useMongo()) {
    try {
      const doc = await collection().findOne({ _id: key });
      if (doc && new Date(doc.resetAt).getTime() > Date.now()) {
        return { count: doc.count, resetAt: new Date(doc.resetAt).getTime() };
      }
      // Fall through: a memory counter may exist from an earlier Mongo failure.
    } catch (error) {
      warnFallback(error);
    }
  }
  return memoryGet(key);
};

/** Sets `key` to { count, resetAt(ms) }. */
export const setCounter = async (key, count, resetAt) => {
  if (useMongo()) {
    try {
      await collection().updateOne(
        { _id: key },
        { $set: { count, resetAt: new Date(resetAt) } },
        { upsert: true }
      );
      return;
    } catch (error) {
      if (isDuplicateKey(error)) {
        try {
          await collection().updateOne({ _id: key }, { $set: { count, resetAt: new Date(resetAt) } });
          return;
        } catch (retryError) {
          warnFallback(retryError);
        }
      } else {
        warnFallback(error);
      }
    }
  }
  memory.set(key, { count, resetAt });
};

export const deleteCounter = async (key) => {
  memory.delete(key);
  if (useMongo()) {
    try {
      await collection().deleteOne({ _id: key });
    } catch (error) {
      warnFallback(error);
    }
  }
};

const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/** Deletes every counter whose key starts with `prefix`. */
export const deleteCountersByPrefix = async (prefix) => {
  for (const key of memory.keys()) {
    if (key.startsWith(prefix)) memory.delete(key);
  }
  if (useMongo()) {
    try {
      await collection().deleteMany({ _id: { $regex: `^${escapeRegex(prefix)}` } });
    } catch (error) {
      warnFallback(error);
    }
  }
};

export const ensureCounterIndexes = async () => {
  if (!useMongo()) return;
  await collection().createIndex({ resetAt: 1 }, { expireAfterSeconds: 0 });
};

// Called once after the database connection attempt.
export const announceCounterStore = () => {
  if (!useMongo()) {
    console.warn(
      "Rate limits and login lockouts are stored in memory: they reset on restart and are not shared across instances."
    );
  }
};
