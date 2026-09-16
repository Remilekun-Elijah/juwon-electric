// Orders and fulfilment (API_CONTRACT_V3 §6): D4a backfill at read time, transitions,
// stock commit and reversal, payment, engineer assignment, audit.
// Runtime-agnostic scenario; returns the transcript for the parity test.
import assert from "node:assert/strict";
import { STATIC_TOKEN, recorder } from "./opsKit.js";

const FORBIDDEN = "You do not have permission to perform this action.";

// Public order bodies depend on runtime internals (the Worker stores a sortOrder): parity
// compares the fields this module owns.
const orderParts = (body) => {
  const data = body?.data || {};
  const pick = ["status", "paymentStatus", "fulfillmentStatus", "requiresInstallation", "assignedEngineerId", "legacyPaymentStatus", "paidAt", "stockCommittedAt", "totalAmount", "note", "isActive", "jobs"];
  return { message: body?.message, details: body?.details, data: Object.fromEntries(pick.filter((key) => key in data).map((key) => [key, data[key]])) };
};

export const runOrdersScenario = async (client) => {
  const { transcript, expect, call } = recorder(client);
  const sales = await client.seedAdmin("sales");
  const support = await client.seedAdmin("support");
  const engineer = await client.seedAdmin("engineer");
  const retired = await client.seedAdmin("engineer", { isActive: false });

  // ---- catalog: a package made of two products ----------------------------------------------
  const inverter = (await expect("inverter", "POST", "/admin/products", { body: { sku: "ORD-INV", name: "Order Inverter", price: 1, stockQuantity: 5, reorderLevel: 1 } }, 201)).body.data;
  const battery = (await expect("battery", "POST", "/admin/products", { body: { sku: "ORD-BAT", name: "Order Battery", price: 1, stockQuantity: 3 } }, 201)).body.data;
  await expect("package", "POST", "/admin/packages", {
    body: {
      legacyId: 9001,
      type: "tubular",
      name: "Order Kit",
      kva: 5,
      load: "Fridge",
      options: [{ name: "Without solar", price: 500000, kits: "2 batteries" }],
      items: [{ productId: inverter.id, quantity: 2 }, { productId: battery.id, quantity: 1 }],
    },
    project: (body) => ({ message: body?.message }),
  }, 201);

  const place = async (label, quantity) =>
    (
      await expect(label, "POST", "/order", {
        token: null,
        body: { name: `Customer ${quantity}`, phoneNumber: "08012345678", deliveryAddress: "1 Test Street", order: [{ id: 9001, quantity, optionName: "Without solar" }] },
        project: orderParts,
      }, 201, "Order placed successfully.")
    ).body.data;

  const order1 = await place("place order 1", 2);
  assert.deepEqual(
    { status: order1.status, paymentStatus: order1.paymentStatus, fulfillmentStatus: order1.fulfillmentStatus, requiresInstallation: order1.requiresInstallation, assignedEngineerId: order1.assignedEngineerId },
    { status: "pending", paymentStatus: "pending", fulfillmentStatus: "pending", requiresInstallation: false, assignedEngineerId: null }
  );
  const order2 = await place("place order 2", 3);

  // ---- legacy orders read with D4a defaults ---------------------------------------------------
  const legacyDone = await client.seedRecord("orders", { name: "Legacy Done", status: "completed", paymentStatus: "unpaid", receivedAt: "2025-01-10T10:00:00.000Z" });
  const legacyPartial = await client.seedRecord("orders", { name: "Legacy Partial", status: "pending", paymentStatus: "partial", receivedAt: "2025-01-11T10:00:00.000Z" });
  const legacyBare = await client.seedRecord("orders", { name: "Legacy Bare", receivedAt: "2025-01-12T10:00:00.000Z" });

  const done = (await expect("legacy completed/unpaid", "GET", `/admin/orders/${legacyDone.id}`, { project: orderParts }, 200, "Order retrieved.")).body.data;
  assert.deepEqual(
    { status: done.status, fulfillmentStatus: done.fulfillmentStatus, paymentStatus: done.paymentStatus, legacyPaymentStatus: done.legacyPaymentStatus, requiresInstallation: done.requiresInstallation, paidAt: done.paidAt, stockCommittedAt: done.stockCommittedAt, jobs: done.jobs },
    { status: "completed", fulfillmentStatus: "delivered", paymentStatus: "pending", legacyPaymentStatus: "unpaid", requiresInstallation: false, paidAt: null, stockCommittedAt: null, jobs: [] }
  );
  const partial = (await expect("legacy partial", "GET", `/admin/orders/${legacyPartial.id}`, { project: orderParts }, 200)).body.data;
  assert.equal(partial.paymentStatus, "partial");
  assert.equal("legacyPaymentStatus" in partial, false);
  const bare = (await expect("legacy without statuses", "GET", `/admin/orders/${legacyBare.id}`, { project: orderParts }, 200)).body.data;
  assert.deepEqual({ paymentStatus: bare.paymentStatus, legacyPaymentStatus: bare.legacyPaymentStatus, fulfillmentStatus: bare.fulfillmentStatus }, { paymentStatus: "pending", legacyPaymentStatus: null, fulfillmentStatus: "pending" });

  const delivered = (await expect("filter by fulfilment", "GET", "/admin/orders?fulfillmentStatus=delivered", { project: (body) => ({ names: body.data.map((order) => order.name) }) }, 200)).body.data;
  assert.deepEqual(delivered.map((order) => order.name), ["Legacy Done"]);
  const legacyRange = (await expect("filter by date", "GET", "/admin/orders?from=2025-01-11&to=2025-01-12", { project: (body) => ({ names: body.data.map((order) => order.name) }) }, 200)).body.data;
  assert.deepEqual(legacyRange.map((order) => order.name), ["Legacy Partial"]);
  await expect("bad fulfilment filter", "GET", "/admin/orders?fulfillmentStatus=shipped", {}, 400, "Fulfilment status is not valid.");

  // ---- PUT rules --------------------------------------------------------------------------------
  const put = (id, body) => ["PUT", `/admin/orders/${id}`, { body, project: orderParts }];
  await expect("status is read-only", ...put(order1.id, { status: "completed" }), 400, "Use fulfillmentStatus to change the order status.");
  const noted = (await expect("echoed status with a note", ...put(order1.id, { status: "pending", note: "Call first", paymentStatus: "unpaid" }), 200, "Order updated.")).body.data;
  assert.equal(noted.note, "Call first");
  assert.equal(noted.paymentStatus, "pending");
  await expect("invalid fulfilment jump", ...put(order1.id, { fulfillmentStatus: "delivered" }), 409, "Cannot change fulfilment status from pending to delivered.");
  await expect("invalid payment value", ...put(order1.id, { paymentStatus: "owing" }), 400, "Payment status is not valid.");

  // ---- stock commit ---------------------------------------------------------------------------------
  const fulfil = (id, status, options = {}) => ["POST", `/admin/orders/${id}/fulfillment`, { body: { status }, project: orderParts, ...options }];
  const short = await expect("insufficient stock", ...fulfil(order2.id, "processing"), 409, "Insufficient stock to process this order.");
  assert.deepEqual(short.body.details, [{ productId: inverter.id, sku: "ORD-INV", required: 6, available: 5 }]);
  const untouched = (await expect("nothing written on shortfall", "GET", `/admin/products/${inverter.id}`, {}, 200)).body.data;
  assert.equal(untouched.stockQuantity, 5);

  await expect("support cannot change fulfilment", ...fulfil(order1.id, "processing", { token: support.token }), 403, FORBIDDEN);
  await expect("missing fulfilment status", "POST", `/admin/orders/${order1.id}/fulfillment`, { body: {} }, 400, "Fulfilment status is not valid.");

  client.emails.length = 0;
  const processing = (await expect("commit stock", ...fulfil(order1.id, "processing", { token: sales.token }), 200, "Fulfilment status updated.")).body.data;
  assert.equal(processing.fulfillmentStatus, "processing");
  assert.equal(processing.status, "pending");
  assert.ok(processing.stockCommittedAt);
  const stockAfter = (await expect("inventory after commit", "GET", "/admin/inventory", {}, 200)).body.data;
  assert.deepEqual(
    Object.fromEntries(stockAfter.items.filter((row) => row.sku.startsWith("ORD-")).map((row) => [row.sku, row.stockQuantity])),
    { "ORD-INV": 1, "ORD-BAT": 1 }
  );
  const sales1 = (await expect("sale movements", "GET", "/admin/inventory/movements?reason=sale", {}, 200)).body.data;
  assert.deepEqual(sales1.items.map((movement) => [movement.sku, movement.change, movement.referenceType, movement.referenceId]), [
    ["ORD-BAT", -2, "order", order1.id],
    ["ORD-INV", -4, "order", order1.id],
  ]);
  assert.ok(client.emails.some((email) => email.subject === "Low stock: Order Inverter"), "sale movements trigger low-stock alerts");

  // Racing the same transition commits stock once.
  await expect("restock for the race", "POST", "/admin/inventory/adjustments", { body: { productId: inverter.id, change: 20, reason: "restock" } }, 201);
  await expect("restock battery", "POST", "/admin/inventory/adjustments", { body: { productId: battery.id, change: 20, reason: "restock" } }, 201);
  const racing = await Promise.all([1, 2, 3].map(() => client.request(...fulfil(order2.id, "processing").slice(0, 2), { token: STATIC_TOKEN, body: { status: "processing" } })));
  // Which racing request wins is timing-dependent; the transcript records the invariant.
  transcript.push({ label: "racing transitions", status: 0, body: { committedOnce: true } });
  assert.ok(racing.some((response) => response.status === 200));
  assert.ok(racing.every((response) => response.status === 200 || response.status === 409), JSON.stringify(racing.map((r) => r.body)));
  const order2Sales = (await expect("order 2 committed once", "GET", `/admin/inventory/movements?reason=sale`, { project: (body) => ({ total: body.data.total }) }, 200)).body.data;
  assert.equal(order2Sales.total, 4, "two sale movements per order, never duplicated");

  // ---- payment ----------------------------------------------------------------------------------------
  const paid = (await expect("mark paid", "POST", `/admin/orders/${order1.id}/mark-paid`, { body: { note: "Transfer" }, project: orderParts }, 200, "Order marked as paid.")).body.data;
  assert.equal(paid.paymentStatus, "paid");
  assert.ok(paid.paidAt);
  await expect("mark paid again is a no-op", "POST", `/admin/orders/${order1.id}/mark-paid`, { body: {}, project: orderParts }, 200, "Order marked as paid.");
  await expect("refund", ...put(order1.id, { paymentStatus: "refunded" }), 200);
  await expect("paid after refund", "POST", `/admin/orders/${order1.id}/mark-paid`, { body: {} }, 409, "Cannot change payment status from refunded to paid.");
  const failed = (await expect("partial to failed", ...put(legacyPartial.id, { paymentStatus: "failed" }), 200)).body.data;
  assert.equal(failed.paymentStatus, "failed");

  // ---- engineer assignment -------------------------------------------------------------------------------
  const assign = (id, engineerId) => ["POST", `/admin/orders/${id}/assign-engineer`, { body: { engineerId }, project: orderParts }];
  await expect("assign needs requiresInstallation", ...assign(order1.id, engineer.id), 409, "Order does not require installation.");
  await expect("require installation", ...put(order1.id, { requiresInstallation: true }), 200);
  await expect("assign a non-engineer", ...assign(order1.id, sales.id), 400, "Assignee must be an active engineer.");
  await expect("assign an inactive engineer", ...assign(order1.id, retired.id), 400, "Assignee must be an active engineer.");
  await expect("assign an unknown admin", ...assign(order1.id, "nobody"), 400, "Assignee must be an active engineer.");
  const assigned = (await expect("assign engineer", ...assign(order1.id, engineer.id), 200, "Engineer assigned.")).body.data;
  assert.equal(assigned.assignedEngineerId, engineer.id);
  const unassigned = (await expect("unassign engineer", ...assign(order1.id, null), 200, "Engineer unassigned.")).body.data;
  assert.equal(unassigned.assignedEngineerId, null);

  // ---- delivery and installation --------------------------------------------------------------------------
  await expect("out for delivery", ...fulfil(order1.id, "out_for_delivery"), 200);
  const deliveredOrder = (await expect("delivered", ...fulfil(order1.id, "delivered"), 200)).body.data;
  assert.equal(deliveredOrder.status, "completed");
  await expect("installed", ...fulfil(order1.id, "installed"), 200);
  await expect("legacy order cannot be installed", ...fulfil(legacyDone.id, "installed"), 409, "Order does not require installation.");
  await expect("terminal", ...fulfil(order1.id, "cancelled"), 409, "Cannot change fulfilment status from installed to cancelled.");

  // ---- cancel reverses committed stock ------------------------------------------------------------------
  const cancelled = (await expect("cancel order 2", ...fulfil(order2.id, "cancelled"), 200)).body.data;
  assert.equal(cancelled.status, "cancelled");
  assert.equal(cancelled.stockCommittedAt, null);
  const reversals = (await expect("reversal movements", "GET", "/admin/inventory/movements?reason=sale_reversal", {}, 200)).body.data;
  assert.deepEqual(reversals.items.map((movement) => [movement.sku, movement.change]), [["ORD-BAT", 3], ["ORD-INV", 6]]);
  await expect("cancel again is a no-op", ...fulfil(order2.id, "cancelled"), 200);
  const finalStock = (await expect("stock after reversal", "GET", "/admin/inventory?q=ORD-", {}, 200)).body.data;
  assert.deepEqual(Object.fromEntries(finalStock.items.map((row) => [row.sku, row.stockQuantity])), { "ORD-INV": 21, "ORD-BAT": 21 });

  // ---- audit ---------------------------------------------------------------------------------------------------
  const audits = await call("order audit entries", "GET", "/admin/audit-logs?entity=order&limit=100", {
    project: (body) => ({ actions: [...new Set(body.data.items.map((item) => item.action))].sort() }),
  });
  const actions = new Set(audits.body.data.items.map((item) => item.action));
  for (const action of ["order.update", "order.fulfillment_change", "order.status_change", "order.payment_change", "order.assign_engineer"]) {
    assert.ok(actions.has(action), `audit ${action}`);
  }

  await expect("delete legacy order", "DELETE", `/admin/orders/${legacyBare.id}`, { project: orderParts }, 200, "Order deleted.");

  return transcript;
};
