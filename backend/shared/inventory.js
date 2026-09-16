// Inventory (API_CONTRACT_V3 §5): adjustments, movement records and low-stock rules.
//
// Stock only changes through movements. The product update and its movement insert are
// written in one atomic step: the JSON store lock, a D1 batch with compare-and-set guards
// (cloudflare/src/ops/stock.js), or conditional Mongo $inc updates with compensation
// (services/store.js applyStockChanges).
import { badRequest, conflict, notFound } from "./errors.js";
import { OPS_LIMITS, dateTime, isPlainObject, oneOf, queryText, text } from "./fields.js";

export const MOVEMENT_REASONS = ["initial", "restock", "adjustment", "damage", "return", "correction", "sale", "sale_reversal"];
export const ADJUSTMENT_REASONS = ["restock", "adjustment", "damage", "return", "correction"];

const INTEGER = /^-?\d+$/;

/** POST /admin/inventory/adjustments body: { productId, change, reason, note? }. */
export const adjustmentPayload = (body) => {
  const input = isPlainObject(body) ? body : {};
  const productId = text(input, "productId", { label: "Product", required: true, max: OPS_LIMITS.id });
  const raw = input.change;
  const change =
    typeof raw === "number" ? raw : typeof raw === "string" && INTEGER.test(raw.trim()) ? Number(raw) : Number.NaN;
  if (!Number.isInteger(change) || change === 0 || Math.abs(change) > 1_000_000) {
    throw badRequest("Change must be a non-zero whole number.");
  }
  const reason = input.reason;
  if (typeof reason !== "string" || !ADJUSTMENT_REASONS.includes(reason.trim())) throw badRequest("Reason is not valid.");
  const note = text(input, "note", { label: "Note", max: 500, multiline: true }) || null;
  return { productId, change, reason: reason.trim(), note };
};

/** Adds up changes per product: [{ productId, change }] -> Map(productId -> change), zeros dropped. */
export const mergeChanges = (lines) => {
  const merged = new Map();
  for (const { productId, change } of lines) merged.set(productId, (merged.get(productId) || 0) + change);
  for (const [productId, change] of merged) if (change === 0) merged.delete(productId);
  return merged;
};

/** Default error when a change would take stock below zero. */
export const belowZero = () => conflict("Stock cannot go below zero.");

/** Error for committing an order: every short product in `details`. */
export const insufficientStockForOrder = (shortfalls) =>
  conflict(
    "Insufficient stock to process this order.",
    shortfalls.map(({ product, change }) => ({
      productId: product.id,
      sku: product.sku,
      required: -change,
      available: Number(product.stockQuantity) || 0,
    }))
  );

/**
 * Plans stock changes against fresh product records. Throws 404 "Product not found." for
 * unknown products and `onShortfall(shortfalls)` when any product would go below zero.
 * Returns [{ product, change, before, after }] in productId order.
 */
export const planStockChanges = (merged, productsById, onShortfall = belowZero) => {
  const plans = [];
  const shortfalls = [];
  for (const [productId, change] of [...merged].sort(([a], [b]) => a.localeCompare(b))) {
    const product = productsById.get(productId);
    if (!product) throw notFound("Product not found.");
    const before = Number(product.stockQuantity) || 0;
    const after = before + change;
    if (after < 0) shortfalls.push({ product, change });
    plans.push({ product, change, before, after });
  }
  if (shortfalls.length) throw onShortfall(shortfalls);
  return plans;
};

export const buildMovement = ({ product, change, before, after }, { id, reason, note, reference, actor, timestamp }) => ({
  id,
  productId: product.id,
  sku: product.sku,
  productName: product.name,
  change,
  stockBefore: before,
  stockAfter: after,
  reason,
  referenceType: reference?.type ?? null,
  referenceId: reference?.id ?? null,
  note: note || null,
  createdBy: actor ? { id: actor.id, email: actor.email } : null,
  createdAt: timestamp,
  updatedAt: timestamp,
});

export const serializeMovement = (movement) => ({
  id: movement.id,
  productId: movement.productId,
  sku: movement.sku,
  productName: movement.productName,
  change: movement.change,
  stockBefore: movement.stockBefore,
  stockAfter: movement.stockAfter,
  reason: movement.reason,
  referenceType: movement.referenceType ?? null,
  referenceId: movement.referenceId ?? null,
  note: movement.note ?? null,
  createdBy: movement.createdBy ?? null,
  createdAt: movement.createdAt,
});

/** Movement list filters: { productId, reason, from, to } (from/to as ISO strings or ""). */
export const movementFilters = (query) => {
  const reason = queryText(query, "reason");
  if (reason && !MOVEMENT_REASONS.includes(reason)) throw badRequest("Reason is not valid.");
  const range = (key) => {
    const value = queryText(query, key);
    if (!value) return "";
    try {
      return dateTime({ value }, "value", { label: key }) || "";
    } catch {
      throw badRequest(`${key} must be a valid date.`);
    }
  };
  return { productId: queryText(query, "productId"), reason, from: range("from"), to: range("to") };
};

export const matchesMovementFilters = (movement, { productId, reason, from, to }) =>
  (!productId || movement.productId === productId) &&
  (!reason || movement.reason === reason) &&
  (!from || String(movement.createdAt) >= from) &&
  (!to || String(movement.createdAt) <= to);

// Binary string order, the same as SQLite's default collation.
const compare = (a, b) => (a < b ? -1 : a > b ? 1 : 0);

/** Newest first; movements written together are ordered by SKU (matches the D1 ORDER BY). */
export const movementOrder = (a, b) =>
  compare(String(b.createdAt), String(a.createdAt)) ||
  compare(String(a.sku), String(b.sku)) ||
  compare(String(b.id), String(a.id));

// ---- low stock --------------------------------------------------------------------------

/**
 * A movement triggers a low-stock alert when it crosses the reorder level:
 * stockBefore > reorderLevel >= stockAfter, and (reorderLevel > 0 or stockAfter === 0).
 */
export const crossedIntoLowStock = ({ product, before, after }) => {
  const level = Number(product?.reorderLevel) || 0;
  return before > level && after <= level && (level > 0 || after === 0);
};

export const lowStockLine = (product) => ({
  sku: product.sku,
  name: product.name,
  stockQuantity: Number(product.stockQuantity) || 0,
  reorderLevel: Number(product.reorderLevel) || 0,
});

/** Active products at or below their reorder level, lowest headroom first. */
export const lowStockProducts = (products) =>
  products
    .filter((product) => (product.status || "active") === "active" && (Number(product.stockQuantity) || 0) <= (Number(product.reorderLevel) || 0))
    .sort(
      (a, b) =>
        (Number(a.stockQuantity) || 0) - (Number(a.reorderLevel) || 0) - ((Number(b.stockQuantity) || 0) - (Number(b.reorderLevel) || 0)) ||
        String(a.name).localeCompare(String(b.name))
    );

const escapeHtml = (value) =>
  String(value ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

/** Email body for low-stock lines (an alert for products that just crossed, or the digest). */
export const lowStockEmail = (lines, { digest = false } = {}) => {
  const subject = digest
    ? `Low stock report: ${lines.length} ${lines.length === 1 ? "product" : "products"}`
    : `Low stock: ${lines.map((line) => line.name).join(", ")}`.slice(0, 200);
  const intro = digest ? "These products are at or below their reorder level:" : "These products just reached their reorder level:";
  const text = `${intro}\n\n${lines
    .map((line) => `${line.name} (${line.sku}): ${line.stockQuantity} in stock, reorder level ${line.reorderLevel}`)
    .join("\n")}`;
  const cell = 'style="padding:4px 8px"';
  const rows = lines
    .map(
      (line) =>
        `<tr><td ${cell}>${escapeHtml(line.name)}</td><td ${cell}>${escapeHtml(line.sku)}</td><td ${cell}>${line.stockQuantity}</td><td ${cell}>${line.reorderLevel}</td></tr>`
    )
    .join("");
  const html = `<p>${intro}</p><table style="border-collapse:collapse"><thead><tr><th ${cell}>Product</th><th ${cell}>SKU</th><th ${cell}>In stock</th><th ${cell}>Reorder level</th></tr></thead><tbody>${rows}</tbody></table>`;
  return { subject, text, html };
};

/** Email recipients from settings; an empty list means "use the runtime's env fallback". */
export const lowStockRecipients = (settings) =>
  settings?.inventory?.lowStockAlertsEnabled === false ? null : settings?.notifications?.lowStockEmails || [];

