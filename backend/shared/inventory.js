// Inventory (PRD §6.2): stock adjustments, movement records and low-stock rules.
//
// Stock only changes through movements. Every change writes an inventoryMovements record
// { productId, sku, productName, change, quantityBefore, quantityAfter, reason, note,
//   referenceType, referenceId, createdById, createdByEmail, createdAt } in the same
// atomic step as the product update (JSON store lock, D1 batch). In Mongo mode the
// product updates are conditional $inc writes with compensation (see services/store.js).
import { badRequest, conflict } from "./errors.js";
import { OPS_LIMITS, integer, oneOf, text } from "./fields.js";

/** Reasons an admin can give for a manual adjustment. */
export const ADJUSTMENT_REASONS = ["restock", "correction", "damage", "return", "other"];

/** Reasons written by the system. */
export const SYSTEM_REASONS = ["initial", "order_fulfilment", "order_cancellation"];

export const MOVEMENT_REASONS = [...ADJUSTMENT_REASONS, ...SYSTEM_REASONS];

export const adjustmentPayload = (body) => {
  const change = integer(body, "quantity", {
    label: "Quantity",
    required: true,
    min: -OPS_LIMITS.adjustmentMax,
    max: OPS_LIMITS.adjustmentMax,
  });
  if (change === 0) throw badRequest("Quantity must not be 0.");
  return {
    change,
    reason: oneOf(body, "reason", ADJUSTMENT_REASONS, { label: "Reason", required: true }),
    note: text(body, "note", { label: "Note", max: OPS_LIMITS.note, multiline: true }),
  };
};

/** Adds up changes per product: [{ productId, change }] -> Map(productId -> change). */
export const mergeChanges = (lines) => {
  const merged = new Map();
  for (const { productId, change } of lines) {
    merged.set(productId, (merged.get(productId) || 0) + change);
  }
  for (const [productId, change] of merged) if (change === 0) merged.delete(productId);
  return merged;
};

export const insufficientStock = (product, change) =>
  conflict(
    `Not enough stock for ${product.name} (${product.sku}): ${Number(product.stockQuantity) || 0} available, ${-change} needed.`,
    { productId: product.id, available: Number(product.stockQuantity) || 0, requested: -change }
  );

/**
 * Plans the stock changes against fresh product records. Throws 400 for unknown products
 * and 409 when stock would go below zero. Returns [{ product, change, before, after }].
 */
export const planStockChanges = (merged, productsById) =>
  [...merged].map(([productId, change]) => {
    const product = productsById.get(productId);
    if (!product) throw badRequest("Product not found.");
    const before = Number(product.stockQuantity) || 0;
    const after = before + change;
    if (after < 0) throw insufficientStock(product, change);
    return { product, change, before, after };
  });

export const buildMovement = ({ product, change, before, after }, { id, reason, note, reference, actor, timestamp }) => ({
  id,
  productId: product.id,
  sku: product.sku,
  productName: product.name,
  change,
  quantityBefore: before,
  quantityAfter: after,
  reason,
  note: note || "",
  referenceType: reference?.type ?? null,
  referenceId: reference?.id ?? null,
  createdById: actor?.id ?? null,
  createdByEmail: actor?.email ?? null,
  isActive: true,
  createdAt: timestamp,
  updatedAt: timestamp,
});

// ---- low stock --------------------------------------------------------------------------

export const reorderThreshold = (product, settings) => {
  const own = product?.reorderLevel;
  if (own !== undefined && own !== null && Number.isFinite(Number(own))) return Number(own);
  return Number(settings?.inventory?.defaultReorderLevel) || 0;
};

/** Archived products are never reported. */
export const isLowStock = (product, settings) =>
  product?.status !== "archived" && (Number(product?.stockQuantity) || 0) <= reorderThreshold(product, settings);

/** True when a change moved the product from above its threshold to at or below it. */
export const crossedIntoLowStock = ({ product, before, after }, settings) => {
  const threshold = reorderThreshold(product, settings);
  return product?.status !== "archived" && before > threshold && after <= threshold;
};

export const lowStockItem = (product, settings) => ({
  id: product.id,
  sku: product.sku,
  name: product.name,
  status: product.status,
  stockQuantity: Number(product.stockQuantity) || 0,
  reorderLevel: reorderThreshold(product, settings),
});

export const lowStockItems = (products, settings) =>
  products
    .filter((product) => isLowStock(product, settings))
    .map((product) => lowStockItem(product, settings))
    .sort((a, b) => a.stockQuantity - a.reorderLevel - (b.stockQuantity - b.reorderLevel) || a.name.localeCompare(b.name));

const escapeHtml = (value) =>
  String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

/** Email for low-stock items (a digest, or the products that just crossed their threshold). */
export const lowStockEmail = (items, { digest = false } = {}) => {
  const subject = digest
    ? `Low stock report: ${items.length} ${items.length === 1 ? "product" : "products"}`
    : `Low stock: ${items.map((item) => item.name).join(", ")}`.slice(0, 200);
  const lines = items.map((item) => `${item.name} (${item.sku}): ${item.stockQuantity} in stock, reorder level ${item.reorderLevel}`);
  const text = `${digest ? "These products are at or below their reorder level" : "These products just reached their reorder level"}:\n\n${lines.join("\n")}`;
  const rows = items
    .map(
      (item) =>
        `<tr><td style="padding:4px 8px">${escapeHtml(item.name)}</td><td style="padding:4px 8px">${escapeHtml(item.sku)}</td><td style="padding:4px 8px;text-align:right">${item.stockQuantity}</td><td style="padding:4px 8px;text-align:right">${item.reorderLevel}</td></tr>`
    )
    .join("");
  const html = `<p>${digest ? "These products are at or below their reorder level:" : "These products just reached their reorder level:"}</p><table style="border-collapse:collapse"><thead><tr><th style="padding:4px 8px;text-align:left">Product</th><th style="padding:4px 8px;text-align:left">SKU</th><th style="padding:4px 8px;text-align:right">In stock</th><th style="padding:4px 8px;text-align:right">Reorder level</th></tr></thead><tbody>${rows}</tbody></table>`;
  return { subject, text, html };
};

// ---- movement queries ----------------------------------------------------------------------

export const newestFirst = (a, b) =>
  String(b.createdAt).localeCompare(String(a.createdAt)) || String(b.id).localeCompare(String(a.id));
