// Inventory (PRD §6.2) for the Worker, at parity with backend/controllers/inventory.js.
import { created, ok } from "../http.js";
import { getById, getCollectionItem, listCollection } from "../store.js";
import { requireCapability } from "../capabilities.shim.js";
import { applyStockChanges } from "./stock.js";
import { badRequest } from "../../../shared/errors.js";
import { OPS_LIMITS, pageParams, queryText } from "../../../shared/fields.js";
import {
  MOVEMENT_REASONS,
  adjustmentPayload,
  crossedIntoLowStock,
  lowStockEmail,
  lowStockItem,
  lowStockItems,
} from "../../../shared/inventory.js";
import { SETTINGS_ID, mergeSettings } from "../../../shared/settings.js";

export const getSettings = async (env) => mergeSettings(await getById(env, "settings", SETTINGS_ID));

export const actorOf = (admin) => ({ id: admin?.id ?? null, email: admin?.email ?? null });

const sendLowStockEmail = async (env, sendNotification, items, settings, options) => {
  const { subject, text, html } = lowStockEmail(items, options);
  const recipients = settings.notificationEmails.lowStock;
  // No configured recipients: fall back to ADMIN_NOTIFY_EMAIL.
  const result = await sendNotification({ to: recipients.length ? recipients : env.ADMIN_NOTIFY_EMAIL, subject, text, html });
  return !result?.skipped && !result?.failed;
};

/**
 * Runs after every stock change: products that just reached their reorder level trigger
 * an email via ctx.waitUntil.
 */
export const afterStockChange = ({ env, ctx, sendNotification }, plans) => {
  if (!plans?.length) return;
  const task = (async () => {
    const settings = await getSettings(env);
    const crossed = plans.filter((plan) => crossedIntoLowStock(plan, settings));
    if (!crossed.length) return;
    const items = crossed.map((plan) => lowStockItem(plan.product, settings));
    await sendLowStockEmail(env, sendNotification, items, settings, { digest: false });
  })().catch((error) => console.error("Low-stock check failed:", error?.message));
  ctx?.waitUntil?.(task);
};

/** Daily digest (cron trigger) of every low-stock product; skipped when disabled in settings. */
export const runLowStockDigest = async (env, sendNotification, { force = false } = {}) => {
  const settings = await getSettings(env);
  const items = lowStockItems(await listCollection(env, "products", { includeInactive: true }), settings);
  if (!items.length || (!force && !settings.inventory.lowStockDigestEnabled)) return { items, emailed: false };
  return { items, emailed: await sendLowStockEmail(env, sendNotification, items, settings, { digest: true }) };
};

export const recordInitialStock = async (context, product, quantity) => {
  const result = await applyStockChanges(context.env, {
    lines: [{ productId: product.id, change: quantity }],
    reason: "initial",
    actor: actorOf(context.admin),
  });
  afterStockChange(context, result.plans);
  return result.plans[0].product;
};

const movementFilter = (url) => {
  const query = Object.fromEntries(url.searchParams);
  const reason = queryText(query, "reason");
  if (reason && !MOVEMENT_REASONS.includes(reason)) {
    throw badRequest(`reason must be one of: ${MOVEMENT_REASONS.join(", ")}.`);
  }
  const productId = queryText(query, "productId");
  if (productId.length > OPS_LIMITS.id) throw badRequest(`productId must be ${OPS_LIMITS.id} characters or fewer.`);
  return { productId, reason, ...pageParams(query) };
};

const pageMovements = async (env, { productId, reason, page, limit }) => {
  const conditions = ["collection = 'inventoryMovements'"];
  const values = [];
  if (productId) {
    conditions.push("json_extract(data, '$.productId') = ?");
    values.push(productId);
  }
  if (reason) {
    conditions.push("json_extract(data, '$.reason') = ?");
    values.push(reason);
  }
  const where = conditions.join(" AND ");
  const [count, rows] = await Promise.all([
    env.DB.prepare(`SELECT COUNT(*) AS total FROM records WHERE ${where}`).bind(...values).first(),
    env.DB.prepare(`SELECT data FROM records WHERE ${where} ORDER BY created_at DESC, id DESC LIMIT ? OFFSET ?`)
      .bind(...values, limit, (page - 1) * limit)
      .all(),
  ]);
  return {
    items: (rows.results || []).map((row) => JSON.parse(row.data)),
    page,
    limit,
    total: Number(count?.total || 0),
  };
};

export const handleInventoryAdmin = async (context) => {
  const { request, env, path, body, admin, audit, url, sendNotification } = context;
  const { method } = request;

  const adjustMatch = /^\/admin\/products\/([^/]+)\/stock-adjustments$/.exec(path);
  if (adjustMatch && method === "POST") {
    requireCapability(admin, "inventory:write");
    const product = await getCollectionItem(env, "products", adjustMatch[1]);
    const { change, reason, note } = adjustmentPayload(body);
    const { plans, movements } = await applyStockChanges(env, {
      lines: [{ productId: product.id, change }],
      reason,
      note,
      actor: actorOf(admin),
    });
    afterStockChange(context, plans);
    audit({
      action: "inventory.adjust",
      entity: "product",
      entityId: product.id,
      summary: `Adjusted stock of "${product.name}" by ${change > 0 ? "+" : ""}${change} (${reason})`,
      changes: ["stockQuantity"],
    });
    return created("Stock adjusted.", { product: plans[0].product, movement: movements[0] });
  }

  const historyMatch = /^\/admin\/products\/([^/]+)\/stock-movements$/.exec(path);
  if (historyMatch && method === "GET") {
    requireCapability(admin, "inventory:read");
    const product = await getCollectionItem(env, "products", historyMatch[1]);
    const filter = { ...movementFilter(url), productId: product.id };
    return ok("Stock movements retrieved.", await pageMovements(env, filter));
  }

  if (path === "/admin/inventory/movements" && method === "GET") {
    requireCapability(admin, "inventory:read");
    return ok("Stock movements retrieved.", await pageMovements(env, movementFilter(url)));
  }

  if (path === "/admin/inventory/low-stock" && method === "GET") {
    requireCapability(admin, "inventory:read");
    const [settings, products] = await Promise.all([
      getSettings(env),
      listCollection(env, "products", { includeInactive: true }),
    ]);
    return ok("Low-stock products retrieved.", lowStockItems(products, settings));
  }

  if (path === "/admin/inventory/low-stock/notify" && method === "POST") {
    requireCapability(admin, "inventory:write");
    const result = await runLowStockDigest(env, sendNotification, { force: true });
    audit({
      action: "inventory.low_stock_notify",
      entity: "product",
      summary: `Sent low-stock report (${result.items.length} products)`,
    });
    return ok(result.emailed ? "Low-stock report sent." : "Low-stock report not sent.", result);
  }

  return null;
};
