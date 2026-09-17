// Reads the global settings document merged over the defaults (backend/shared/settings.js).
import { SETTINGS_ID, mergeSettings } from "../shared/settings.js";
import { findCollectionItem } from "./store.js";

export const getSettings = async () =>
  mergeSettings((await findCollectionItem("settings", { id: SETTINGS_ID })) || null);
