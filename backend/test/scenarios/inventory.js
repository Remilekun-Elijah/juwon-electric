// Inventory (API_CONTRACT_V3 §5): stock view, adjustments, movements, low-stock alerts.
// Runtime-agnostic scenario; returns the transcript for the parity test.
import assert from "node:assert/strict";
import { ALERT_MAILBOX, STATIC_TOKEN, recorder } from "./opsKit.js";

const FORBIDDEN = "You do not have permission to perform this action.";

export const runInventoryScenario = async (client) => {
  const { transcript, expect } = recorder(client);
  const inventoryUser = await client.seedAdmin("inventory");
  const sales = await client.seedAdmin("sales");
  const support = await client.seedAdmin("support");

  const battery = (
    await expect("create product with stock", "POST", "/admin/products", {
      body: { sku: "BAT-100", name: "100Ah Battery", price: 250000, stockQuantity: 10, reorderLevel: 3 },
    }, 201)
  ).body.data;

  // ---- initial movement ------------------------------------------------------------------
  const initial = (
    await expect("initial movement", "GET", `/admin/inventory/movements?productId=${battery.id}`, {}, 200, "Movements retrieved.")
  ).body.data;
  assert.equal(initial.total, 1);
  assert.deepEqual(Object.keys(initial.items[0]).sort(), [
    "change", "createdAt", "createdBy", "id", "note", "productId", "productName", "reason", "referenceId", "referenceType",
    "sku", "stockAfter", "stockBefore",
  ]);
  assert.deepEqual(
    { reason: initial.items[0].reason, change: initial.items[0].change, stockBefore: initial.items[0].stockBefore, stockAfter: initial.items[0].stockAfter },
    { reason: "initial", change: 10, stockBefore: 0, stockAfter: 10 }
  );
  assert.deepEqual(initial.items[0].createdBy, { id: "static-token", email: "static-token" });

  // ---- adjustment validation ---------------------------------------------------------------
  const adjust = (body, options = {}) => ["POST", "/admin/inventory/adjustments", { body, ...options }];
  await expect("change 0", ...adjust({ productId: battery.id, change: 0, reason: "restock" }), 400, "Change must be a non-zero whole number.");
  await expect("fractional change", ...adjust({ productId: battery.id, change: 1.5, reason: "restock" }), 400, "Change must be a non-zero whole number.");
  await expect("missing reason", ...adjust({ productId: battery.id, change: 2 }), 400, "Reason is not valid.");
  await expect("system reason", ...adjust({ productId: battery.id, change: 2, reason: "sale" }), 400, "Reason is not valid.");
  await expect("missing product", ...adjust({ change: 2, reason: "restock" }), 400, "Product is required.");
  await expect("unknown product", ...adjust({ productId: "missing", change: 2, reason: "restock" }), 404, "Product not found.");
  await expect("note too long", ...adjust({ productId: battery.id, change: 2, reason: "restock", note: "n".repeat(501) }), 400, "Note must be 500 characters or fewer.");

  // ---- adjustments ------------------------------------------------------------------------------
  const damage = (
    await expect("inventory user records damage", ...adjust({ productId: battery.id, change: -4, reason: "damage", note: "Water damage" }, { token: inventoryUser.token }), 201, "Stock adjusted.")
  ).body.data;
  assert.equal(damage.product.stockQuantity, 6);
  assert.deepEqual(
    { stockBefore: damage.movement.stockBefore, stockAfter: damage.movement.stockAfter, note: damage.movement.note },
    { stockBefore: 10, stockAfter: 6, note: "Water damage" }
  );
  assert.deepEqual(damage.movement.createdBy, { id: inventoryUser.id, email: inventoryUser.email });

  await expect("below zero", ...adjust({ productId: battery.id, change: -7, reason: "correction" }), 409, "Stock cannot go below zero.");
  await expect("adjust by SKU", ...adjust({ productId: "bat-100", change: 1, reason: "restock" }), 201);
  await expect("sales cannot adjust", ...adjust({ productId: battery.id, change: 1, reason: "restock" }, { token: sales.token }), 403, FORBIDDEN);
  await expect("support cannot read inventory", "GET", "/admin/inventory", { token: support.token }, 403, FORBIDDEN);

  // ---- concurrency: never oversell, one movement per change -------------------------------
  const race = (
    await expect("create race product", "POST", "/admin/products", { body: { sku: "RACE-1", name: "Race Cable", price: 100, stockQuantity: 5 } }, 201)
  ).body.data;
  const responses = await Promise.all(
    Array.from({ length: 12 }, () => client.request(...adjust({ productId: race.id, change: -1, reason: "correction" }, { token: STATIC_TOKEN })))
  );
  const statuses = responses.map((response) => response.status).sort();
  transcript.push({ label: "concurrent adjustments", method: "POST", path: "/admin/inventory/adjustments", status: 0, body: statuses });
  assert.deepEqual(statuses, [201, 201, 201, 201, 201, 409, 409, 409, 409, 409, 409, 409]);
  const raceProduct = (await expect("race product stock", "GET", `/admin/products/${race.id}`, {}, 200)).body.data;
  assert.equal(raceProduct.stockQuantity, 0);
  const raceMovements = (
    await expect("race movements", "GET", `/admin/inventory/movements?productId=${race.id}&reason=correction`, {
      project: (body) => ({ total: body.data.total, after: body.data.items.map((item) => item.stockAfter).sort() }),
    }, 200)
  ).body.data;
  assert.equal(raceMovements.total, 5);
  assert.deepEqual(raceMovements.items.map((item) => item.stockAfter).sort(), [0, 1, 2, 3, 4]);

  // ---- movement listing ----------------------------------------------------------------------
  const firstPage = (await expect("movements page", "GET", `/admin/inventory/movements?productId=${battery.id}&limit=2`, {}, 200)).body.data;
  assert.equal(firstPage.items.length, 2);
  assert.equal(firstPage.total, 3);
  assert.ok(firstPage.items[0].createdAt >= firstPage.items[1].createdAt);
  await expect("bad reason filter", "GET", "/admin/inventory/movements?reason=stolen", {}, 400, "Reason is not valid.");
  await expect("bad from", "GET", "/admin/inventory/movements?from=yesterday", {}, 400, "from must be a valid date.");
  const future = (await expect("to before any movement", "GET", "/admin/inventory/movements?to=2000-01-01", {}, 200)).body.data;
  assert.equal(future.total, 0);
  await expect("bad page", "GET", "/admin/inventory/movements?page=0", {}, 400, "page must be a whole number from 1 to 100000.");

  // ---- inventory view --------------------------------------------------------------------------
  const view = (await expect("inventory view", "GET", "/admin/inventory", { token: sales.token }, 200, "Inventory retrieved.")).body.data;
  assert.deepEqual(view.items.map((row) => row.sku), ["RACE-1", "BAT-100"]);
  assert.deepEqual(Object.keys(view.items[0]).sort(), [
    "categoryId", "lowStock", "name", "productId", "reorderLevel", "sku", "status", "stockQuantity", "updatedAt",
  ]);
  const out = (await expect("out of stock", "GET", "/admin/inventory?stock=out", {}, 200)).body.data;
  assert.deepEqual(out.items.map((row) => row.sku), ["RACE-1"]);
  await expect("bad stock filter", "GET", "/admin/inventory?stock=some", {}, 400, "stock must be one of: all, low, out.");

  // ---- low-stock alerts -----------------------------------------------------------------------
  client.emails.length = 0;
  await expect("cross the reorder level", ...adjust({ productId: battery.id, change: -4, reason: "damage" }), 201);
  assert.equal(client.emails.length, 1, "one alert");
  assert.equal(client.emails[0].subject, "Low stock: 100Ah Battery");
  assert.deepEqual(client.emails[0].to, [ALERT_MAILBOX]);
  assert.match(client.emails[0].html, /BAT-100/);

  client.emails.length = 0;
  await expect("already below the level", ...adjust({ productId: battery.id, change: -1, reason: "damage" }), 201);
  assert.equal(client.emails.length, 0, "no second alert");

  const noLevel = (
    await expect("product without reorder level", "POST", "/admin/products", { body: { sku: "FUSE-1", name: "Fuse", price: 50, stockQuantity: 2 } }, 201)
  ).body.data;
  assert.equal(noLevel.reorderLevel, 0);
  client.emails.length = 0;
  await expect("to zero with level 0 alerts", ...adjust({ productId: noLevel.id, change: -2, reason: "correction" }), 201);
  assert.equal(client.emails.length, 1);

  client.emails.length = 0;
  const check = (await expect("low-stock check", "POST", "/admin/inventory/low-stock-check", { body: {} }, 200, "Low-stock check complete.")).body.data;
  assert.deepEqual(check, { lowStock: 3, emailed: true });
  assert.equal(client.emails[0].subject, "Low stock report: 3 products");
  await expect("low-stock check needs inventory:adjust", "POST", "/admin/inventory/low-stock-check", { token: sales.token, body: {} }, 403, FORBIDDEN);

  return transcript;
};
