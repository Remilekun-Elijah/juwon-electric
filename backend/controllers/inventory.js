// Inventory (PRD §6.2): stock adjustments, movement history and low-stock reporting.
// Rules are shared with the Worker (backend/shared/inventory.js).
import { sendMail } from "../mail/mail.js";
import { asyncHandler } from "../services/asyncHandler.js";
import { STATIC_TOKEN_ACTOR, audit } from "../services/audit.js";
import { created, ok } from "../services/http.js";
import { runInBackground } from "../services/runtime.js";
import { getSettings } from "../services/settings.js";
import {
  applyStockChanges,
  getCollectionItem,
  listCollection,
  pageCollection,
} from "../services/store.js";
import { OPS_LIMITS, pageParams, queryText } from "../shared/fields.js";
import {
  MOVEMENT_REASONS,
  adjustmentPayload,
  crossedIntoLowStock,
  lowStockEmail,
  lowStockItem,
  lowStockItems,
} from "../shared/inventory.js";
import { badRequest } from "../shared/errors.js";

export const actorOf = (req) =>
  req.admin
    ? { id: req.admin.id, email: req.admin.email }
    : { id: STATIC_TOKEN_ACTOR, email: STATIC_TOKEN_ACTOR };

/** Sends the low-stock email; resolves to true when delivered. Never rejects. */
const sendLowStockEmail = async (items, settings, options) => {
  const { subject, html } = lowStockEmail(items, options);
  const recipients = settings.notificationEmails.lowStock;
  // No configured recipients: sendMail falls back to the SMTP_FROM mailbox.
  return sendMail({ subject, to: recipients.length ? recipients : undefined, data: html }, (body) => body);
};

/**
 * Runs after every stock change: products that just reached their reorder level trigger
 * an email (in the background). Hooks for notifications are added by the notifications module.
 */
export const afterStockChange = (plans) => {
  if (!plans?.length) return;
  runInBackground("Low-stock check", async () => {
    const settings = await getSettings();
    const crossed = plans.filter((plan) => crossedIntoLowStock(plan, settings));
    if (!crossed.length) return;
    const items = crossed.map((plan) => lowStockItem(plan.product, settings));
    await sendLowStockEmail(items, settings, { digest: false });
  });
};

/** Daily digest of every low-stock product (skipped when disabled in settings). */
export const runLowStockDigest = async ({ force = false } = {}) => {
  const settings = await getSettings();
  const items = lowStockItems(await listCollection("products", { includeInactive: true }), settings);
  if (!items.length || (!force && !settings.inventory.lowStockDigestEnabled)) return { items, emailed: false };
  return { items, emailed: await sendLowStockEmail(items, settings, { digest: true }) };
};

/** Initial stock for a new product, recorded as an "initial" movement. */
export const recordInitialStock = async (req, product, quantity) => {
  const result = await applyStockChanges({
    lines: [{ productId: product.id, change: quantity }],
    reason: "initial",
    actor: actorOf(req),
  });
  afterStockChange(result.plans);
  return result.plans[0].product;
};

export const adminAdjustStock = asyncHandler(async (req, res) => {
  const product = await getCollectionItem("products", req.params.id);
  const { change, reason, note } = adjustmentPayload(req.body || {});
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
  created(res, "Stock adjusted.", { product: plans[0].product, movement: movements[0] });
});

const movementFilter = (query) => {
  const reason = queryText(query, "reason");
  if (reason && !MOVEMENT_REASONS.includes(reason)) {
    throw badRequest(`reason must be one of: ${MOVEMENT_REASONS.join(", ")}.`);
  }
  const productId = queryText(query, "productId");
  if (productId.length > OPS_LIMITS.id) throw badRequest(`productId must be ${OPS_LIMITS.id} characters or fewer.`);
  return { ...(productId ? { productId } : {}), ...(reason ? { reason } : {}) };
};

export const adminListProductMovements = asyncHandler(async (req, res) => {
  const product = await getCollectionItem("products", req.params.id);
  const filter = { ...movementFilter(req.query), productId: product.id };
  ok(res, "Stock movements retrieved.", await pageCollection("inventoryMovements", { filter, ...pageParams(req.query) }));
});

export const adminListMovements = asyncHandler(async (req, res) => {
  const filter = movementFilter(req.query);
  ok(res, "Stock movements retrieved.", await pageCollection("inventoryMovements", { filter, ...pageParams(req.query) }));
});

export const adminLowStock = asyncHandler(async (_req, res) => {
  const [settings, products] = await Promise.all([getSettings(), listCollection("products", { includeInactive: true })]);
  ok(res, "Low-stock products retrieved.", lowStockItems(products, settings));
});

export const adminNotifyLowStock = asyncHandler(async (req, res) => {
  const result = await runLowStockDigest({ force: true });
  audit(req, {
    action: "inventory.low_stock_notify",
    entity: "product",
    summary: `Sent low-stock report (${result.items.length} products)`,
  });
  ok(res, result.emailed ? "Low-stock report sent." : "Low-stock report not sent.", result);
});
