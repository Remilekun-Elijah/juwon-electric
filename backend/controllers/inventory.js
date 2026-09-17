// Inventory (API_CONTRACT_V3 §5): stock view, adjustments, movement history and low-stock
// alerts. Rules are shared with the Worker (backend/shared/inventory.js).
import { sendMail } from "../mail/mail.js";
import { asyncHandler } from "../services/asyncHandler.js";
import { STATIC_TOKEN_ACTOR, audit } from "../services/audit.js";
import { created, ok } from "../services/http.js";
import { runInBackground } from "../services/runtime.js";
import { notify } from "../services/notifications.js";
import { getSettings } from "../services/settings.js";
import { lowStockNotification } from "../shared/notifications.js";
import { applyStockChanges, getProductItem, listCollection, pageMovements } from "../services/store.js";
import { inventoryPage, serializeProduct } from "../shared/catalog.js";
import { pageParams } from "../shared/fields.js";
import {
  adjustmentPayload,
  crossedIntoLowStock,
  lowStockEmail,
  lowStockLine,
  lowStockProducts,
  lowStockRecipients,
  movementFilters,
  serializeMovement,
} from "../shared/inventory.js";

export const actorOf = (req) =>
  req.admin ? { id: req.admin.id, email: req.admin.email } : { id: STATIC_TOKEN_ACTOR, email: STATIC_TOKEN_ACTOR };

/** Emails low-stock lines; resolves to true when delivered. Never rejects. */
const emailLowStock = async (lines, settings, options) => {
  const recipients = lowStockRecipients(settings);
  if (recipients === null || !lines.length) return false;
  const { subject, html } = lowStockEmail(lines, options);
  // No configured recipients: sendMail falls back to the SMTP_FROM mailbox.
  return sendMail({ subject, to: recipients.length ? recipients : undefined, data: html }, (body) => body);
};

/** After any stock change: alert for products that crossed their reorder level (background). */
export const afterStockChange = (plans) => {
  const crossed = (plans || []).filter(crossedIntoLowStock).map((plan) => plan.product);
  if (!crossed.length) return;
  for (const product of crossed) notify(lowStockNotification(product));
  runInBackground("Low-stock alert", async () => {
    await emailLowStock(crossed.map(lowStockLine), await getSettings(), { digest: false });
  });
};

/** Digest of every active low-stock product. Resolves to { lowStock, emailed }. */
export const runLowStockCheck = async () => {
  const [settings, products] = await Promise.all([getSettings(), listCollection("products", { includeInactive: true })]);
  const low = lowStockProducts(products);
  return { lowStock: low.length, emailed: await emailLowStock(low.map(lowStockLine), settings, { digest: true }) };
};

/** Initial stock for a new product, written as an "initial" movement. */
export const recordInitialStock = async (req, product, quantity) => {
  const { plans } = await applyStockChanges({
    lines: [{ productId: product.id, change: quantity }],
    reason: "initial",
    actor: actorOf(req),
  });
  afterStockChange(plans);
  return plans[0].product;
};

export const adminListInventory = asyncHandler(async (req, res) => {
  const page = pageParams(req.query);
  const [products, categories] = await Promise.all([
    listCollection("products", { includeInactive: true }),
    listCollection("categories", { includeInactive: true }),
  ]);
  ok(res, "Inventory retrieved.", inventoryPage(products, categories, req.query, page));
});

export const adminAdjustStock = asyncHandler(async (req, res) => {
  const { productId, change, reason, note } = adjustmentPayload(req.body);
  const product = await getProductItem(productId);
  const { plans, movements } = await applyStockChanges({
    lines: [{ productId: product.id, change }],
    reason,
    note,
    actor: actorOf(req),
  });
  afterStockChange(plans);
  audit(req, {
    action: "inventory.adjust",
    entity: "product",
    entityId: product.id,
    summary: `Adjusted stock of "${product.name}" by ${change > 0 ? "+" : ""}${change} (${reason})`,
    changes: ["stockQuantity"],
  });
  created(res, "Stock adjusted.", { movement: serializeMovement(movements[0]), product: serializeProduct(plans[0].product) });
});

export const adminListMovements = asyncHandler(async (req, res) => {
  const filters = movementFilters(req.query);
  const page = await pageMovements(filters, pageParams(req.query));
  ok(res, "Movements retrieved.", { ...page, items: page.items.map(serializeMovement) });
});

export const adminLowStockCheck = asyncHandler(async (_req, res) => {
  ok(res, "Low-stock check complete.", await runLowStockCheck());
});
