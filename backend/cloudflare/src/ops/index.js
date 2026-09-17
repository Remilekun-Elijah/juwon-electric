// v3 commerce and operations modules (BE-2). Dispatched from src/index.js: public
// handlers before the legacy public routes, admin handlers after requireAdmin.
import { handleCatalogAdmin, handleCatalogPublic } from "./catalog.js";
import { handleContentAdmin, handleContentPublic } from "./content.js";
import { handleInventoryAdmin, runLowStockCheck } from "./inventory.js";
import { handleJobsAdmin } from "./jobs.js";
import { handleOrdersAdmin } from "./orders.js";
import { handleSettingsAdmin, handleSettingsPublic } from "./settingsNotifications.js";
import { runUploadsMaintenance } from "../uploads.js";
import { describeError } from "../http.js";

const PUBLIC_HANDLERS = [handleCatalogPublic, handleSettingsPublic, handleContentPublic];
const ADMIN_HANDLERS = [
  handleCatalogAdmin,
  handleInventoryAdmin,
  handleOrdersAdmin,
  handleJobsAdmin,
  handleSettingsAdmin,
  handleContentAdmin,
];

const firstResponse = async (handlers, context) => {
  for (const handler of handlers) {
    const response = await handler(context);
    if (response) return response;
  }
  return null;
};

export const handleOpsPublic = (context) => firstResponse(PUBLIC_HANDLERS, context);
export const handleOpsAdmin = (context) => firstResponse(ADMIN_HANDLERS, context);

/**
 * Cron trigger (wrangler.toml [triggers]): daily low-stock digest, then the upload sweep, usage
 * reconcile and private storage alert (UPLOADS_V1 §3, §4). Each task runs even if the other fails.
 */
export const handleOpsScheduled = async (env, sendNotification) => {
  await runLowStockCheck(env, sendNotification).catch((error) =>
    console.error("Scheduled low-stock digest failed:", describeError(error))
  );
  await runUploadsMaintenance(env, sendNotification).catch((error) =>
    console.error("Scheduled upload maintenance failed:", describeError(error))
  );
};
