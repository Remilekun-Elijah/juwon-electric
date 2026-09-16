import mongoose from "mongoose";
import config from "../config.js";
import { seedSuperAdmin } from "./adminAuthService.js";
import { setStorageMode } from "./runtime.js";
import { seedMongoIfEmpty } from "./store.js";

const describe = (error) => [error?.name, error?.message].filter(Boolean).join(": ");

/**
 * Chooses the store once at boot:
 * - no MONGODB_URI: JSON file store.
 * - MONGODB_URI and (NODE_ENV=production or MONGODB_REQUIRED=true): Mongo or
 *   throw (the app exits non-zero); never a JSON fallback.
 * - MONGODB_URI otherwise (development): Mongo, or JSON with a loud warning.
 * Once Mongo is chosen, later disconnects answer 503 instead of switching stores.
 */
export const connectDatabase = async () => {
  if (!config.mongodb_uri) {
    console.log("No MONGODB_URI configured. Using JSON file storage.");
    setStorageMode("json");
    await seedSuperAdmin();
    return false;
  }

  const required =
    process.env.NODE_ENV === "production" || process.env.MONGODB_REQUIRED === "true";

  try {
    await mongoose.connect(config.mongodb_uri, { serverSelectionTimeoutMS: 10000 });
  } catch (error) {
    if (required) {
      throw new Error(
        `MongoDB connection failed and MongoDB is required (NODE_ENV=production or MONGODB_REQUIRED=true). ${describe(error)}`
      );
    }
    console.warn(
      "\n**********************************************************************\n" +
        "WARNING: MongoDB is unavailable. Falling back to the local JSON file store\n" +
        "(development only; production exits instead). Data written now will NOT be\n" +
        `in MongoDB. Reason: ${describe(error)}\n` +
        "**********************************************************************"
    );
    await mongoose.disconnect().catch(() => {});
    setStorageMode("json");
    await seedSuperAdmin();
    return false;
  }

  setStorageMode("mongo");
  mongoose.connection.on("disconnected", () =>
    console.error("MongoDB disconnected: requests answer 503 until it reconnects.")
  );
  mongoose.connection.on("reconnected", () => console.log("MongoDB reconnected."));
  await seedMongoIfEmpty();
  await seedSuperAdmin();
  console.log("MongoDB connected.");
  return true;
};
