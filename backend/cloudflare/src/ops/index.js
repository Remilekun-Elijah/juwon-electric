// v3 commerce and operations modules (BE-2). Dispatched from src/index.js: public
// handlers before the legacy public routes, admin handlers after requireAdmin.
import { handleCatalogAdmin, handleCatalogPublic } from "./catalog.js";
import { handleInventoryAdmin, runLowStockDigest } from "./inventory.js";

const PUBLIC_HANDLERS = [handleCatalogPublic];
const ADMIN_HANDLERS = [handleCatalogAdmin, handleInventoryAdmin];

const firstResponse = async (handlers, context) => {
  for (const handler of handlers) {
    const response = await handler(context);
    if (response) return response;
  }
  return null;
};

export const handleOpsPublic = (context) => firstResponse(PUBLIC_HANDLERS, context);
export const handleOpsAdmin = (context) => firstResponse(ADMIN_HANDLERS, context);

/** Cron trigger (wrangler.toml [triggers]): daily low-stock digest. */
export const handleOpsScheduled = async (env, sendNotification) => {
  await runLowStockDigest(env, sendNotification);
};
