import mongoose from "mongoose";
import config from "../config.js";
import { seedSuperAdmin } from "./adminAuthService.js";
import { seedMongoIfEmpty } from "./store.js";

export const connectDatabase = async () => {
  if (!config.mongodb_uri) {
    console.log("No MONGODB_URI configured. Using JSON file storage.");
    await seedSuperAdmin();
    return false;
  }

  try {
    await mongoose.connect(config.mongodb_uri);
    await seedMongoIfEmpty();
    await seedSuperAdmin();
    console.log("MongoDB connected.");
    return true;
  } catch (error) {
    if (process.env.MONGODB_REQUIRED === "true") throw error;
    console.warn(
      `MongoDB unavailable. Using JSON file storage. Reason: ${error.message}`,
    );
    await seedSuperAdmin();
    return false;
  }
};
