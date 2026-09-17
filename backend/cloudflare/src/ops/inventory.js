// Inventory (API_CONTRACT_V3 §5) for the Worker, at parity with backend/controllers/inventory.js.
import { created, ok } from "../http.js";
import { getById, listCollection } from "../store.js";
import { requireCapability } from "../capabilities.js";
import { applyStockChanges } from "./stock.js";
import { getProductItem, queryOf } from "./catalog.js";
import { inventoryPage, serializeProduct } from "../../../shared/catalog.js";
import { pageParams } from "../../../shared/fields.js";
import {
  adjustmentPayload,
  crossedIntoLowStock,
  lowStockEmail,
  lowStockLine,
  lowStockProducts,
  lowStockRecipients,
  movementFilters,
  serializeMovement,
} from "../../../shared/inventory.js";
import { SETTINGS_ID, mergeSettings } from "../../../shared/settings.js";
import { lowStockNotification } from "../../../shared/notifications.js";
import { notify } from "../notifications.js";

export const getSettings = async (env) => mergeSettings(await getById(env, "settings", SETTINGS_ID));

export const actorOf = (admin) => (admin ? { id: admin.id, email: admin.email } : null);

const emailLowStock = async (env, sendNotification, lines, settings, options) => {
  const recipients = lowStockRecipients(settings);
  if (recipients === null || !lines.length) return false;
  const { subject, text, html } = lowStockEmail(lines, options);
  // No configured recipients: fall back to ADMIN_NOTIFY_EMAIL.
  const result = await sendNotification({ to: recipients.length ? recipients : env.ADMIN_NOTIFY_EMAIL, subject, text, html });
  return !result?.skipped && !result?.failed;
};

/** After any stock change: alert for products that crossed their reorder level (waitUntil). */
export const afterStockChange = (context, plans) => {
  const crossed = (plans || []).filter(crossedIntoLowStock).map((plan) => plan.product);
  if (!crossed.length) return;
  const { env, ctx, sendNotification } = context;
  for (const product of crossed) notify(env, ctx, lowStockNotification(product));
  const task = (async () => {
    await emailLowStock(env, sendNotification, crossed.map(lowStockLine), await getSettings(env), { digest: false });
  })().catch((error) => console.error("Low-stock alert failed:", error?.message));
  ctx?.waitUntil?.(task);
};

/** Digest of every active low-stock product. Resolves to { lowStock, emailed }. */
export const runLowStockCheck = async (env, sendNotification) => {
  const [settings, products] = await Promise.all([getSettings(env), listCollection(env, "products", { includeInactive: true })]);
  const low = lowStockProducts(products);
  return { lowStock: low.length, emailed: await emailLowStock(env, sendNotification, low.map(lowStockLine), settings, { digest: true }) };
};

export const recordInitialStock = async (context, product, quantity) => {
  const { plans } = await applyStockChanges(context.env, {
    lines: [{ productId: product.id, change: quantity }],
    reason: "initial",
    actor: actorOf(context.admin),
  });
  afterStockChange(context, plans);
  return plans[0].product;
};

const pageMovements = async (env, { productId, reason, from, to }, { page, limit }) => {
  const conditions = ["collection = 'inventoryMovements'"];
  const values = [];
  const add = (sql, value) => {
    conditions.push(sql);
    values.push(value);
  };
  if (productId) add("json_extract(data, '$.productId') = ?", productId);
  if (reason) add("json_extract(data, '$.reason') = ?", reason);
  if (from) add("created_at >= ?", from);
  if (to) add("created_at <= ?", to);
  const where = conditions.join(" AND ");
  const [count, rows] = await Promise.all([
    env.DB.prepare(`SELECT COUNT(*) AS total FROM records WHERE ${where}`).bind(...values).first(),
    env.DB.prepare(
      `SELECT data FROM records WHERE ${where}
        ORDER BY created_at DESC, json_extract(data, '$.sku') ASC, id DESC LIMIT ? OFFSET ?`
    )
      .bind(...values, limit, (page - 1) * limit)
      .all(),
  ]);
  return {
    items: (rows.results || []).map((row) => serializeMovement(JSON.parse(row.data))),
    page,
    limit,
    total: Number(count?.total || 0),
  };
};

export const handleInventoryAdmin = async (context) => {
  const { request, env, path, body, admin, audit, url, sendNotification } = context;
  const { method } = request;

  if (path === "/admin/inventory" && method === "GET") {
    requireCapability(admin, "inventory:read");
    const query = queryOf(url);
    const page = pageParams(query);
    const [products, categories] = await Promise.all([
      listCollection(env, "products", { includeInactive: true }),
      listCollection(env, "categories", { includeInactive: true }),
    ]);
    return ok("Inventory retrieved.", inventoryPage(products, categories, query, page));
  }

  if (path === "/admin/inventory/adjustments" && method === "POST") {
    requireCapability(admin, "inventory:adjust");
    const { productId, change, reason, note } = adjustmentPayload(body);
    const product = await getProductItem(env, productId);
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
    return created("Stock adjusted.", { movement: serializeMovement(movements[0]), product: serializeProduct(plans[0].product) });
  }

  if (path === "/admin/inventory/movements" && method === "GET") {
    requireCapability(admin, "inventory:read");
    const query = queryOf(url);
    const filters = movementFilters(query);
    return ok("Movements retrieved.", await pageMovements(env, filters, pageParams(query)));
  }

  if (path === "/admin/inventory/low-stock-check" && method === "POST") {
    requireCapability(admin, "inventory:adjust");
    return ok("Low-stock check complete.", await runLowStockCheck(env, sendNotification));
  }

  return null;
};
