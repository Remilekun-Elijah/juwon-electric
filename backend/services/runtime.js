// Process-wide runtime state: the storage mode chosen at boot and the set of
// pending background tasks that graceful shutdown waits for.
import mongoose from "mongoose";
import { serviceUnavailable } from "./errors.js";

let storageMode = "json";

/** Called once at boot, after the database connection attempt. */
export const setStorageMode = (mode) => {
  storageMode = mode === "mongo" ? "mongo" : "json";
};

export const isMongoMode = () => storageMode === "mongo";

/**
 * True when the Mongo store must be used. Once Mongo was chosen at boot the
 * JSON store is never used again: a disconnected Mongo throws 503 instead.
 */
export const useMongo = () => {
  if (storageMode !== "mongo") return false;
  if (mongoose.connection.readyState !== 1) throw serviceUnavailable();
  return true;
};

const pending = new Set();

/** Tracks a background promise so shutdown can wait for it. Returns the promise. */
export const track = (promise) => {
  const tracked = Promise.resolve(promise).finally(() => pending.delete(tracked));
  tracked.catch(() => {});
  pending.add(tracked);
  return promise;
};

/** Runs `task` on the next turn (setImmediate), tracked; errors are logged, never thrown. */
export const runInBackground = (label, task) =>
  track(
    new Promise((resolve) => {
      setImmediate(() => {
        Promise.resolve()
          .then(task)
          .catch((error) => console.error(`${label} failed:`, error?.name, error?.message))
          .finally(resolve);
      });
    })
  );

export const waitForPending = async (timeoutMs) => {
  const deadline = Date.now() + timeoutMs;
  while (pending.size > 0 && Date.now() < deadline) {
    await Promise.race([
      Promise.allSettled([...pending]),
      new Promise((resolve) => setTimeout(resolve, Math.max(deadline - Date.now(), 0))),
    ]);
  }
  return pending.size;
};
