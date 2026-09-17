// Orders and fulfilment (API_CONTRACT_V3 §6) for the Worker, at parity with
// backend/controllers/orders.js. Enums, transitions and planning: backend/shared/orders.js.
import { created, ok } from "../http.js";
import {
  createCollectionItem,
  deleteCollectionItem,
  deleteRecordReads,
  getById,
  getCollectionItem,
  listCollection,
  nextSortOrder,
  readKey,
} from "../store.js";
import { notify } from "../notifications.js";
import { newOrderNotification } from "../../../shared/notifications.js";
import { requireCapability } from "../capabilities.js";
import { applyStockChanges } from "./stock.js";
import { actorOf, afterStockChange } from "./inventory.js";
import { idAfter, queryOf } from "./catalog.js";
import { conflict } from "../../../shared/errors.js";
import { insufficientStockForOrder } from "../../../shared/inventory.js";
import {
  assertActiveEngineer,
  assertOrderDeletable,
  commitLines,
  engineerIdPayload,
  fulfillmentPayload,
  inStoreAuditEntries,
  inStoreOrderPayload,
  inStoreOrderRecord,
  jobSummary,
  markPaidPayload,
  needsPackagesToCommit,
  orderAuditEntries,
  orderListFilter,
  orderUpdatePayload,
  planOrderChanges,
  priceInStoreOrder,
  restorableLines,
  reversalLines,
  serializeOrder,
} from "../../../shared/orders.js";

const recordsWhere = async (env, collection, field, value) => {
  const rows = await env.DB.prepare(
    `SELECT data FROM records WHERE collection = ? AND json_extract(data, '$.${field}') = ? ORDER BY created_at ASC, id ASC`
  )
    .bind(collection, value)
    .all();
  return (rows.results || []).map((row) => JSON.parse(row.data));
};

export const jobsOfOrder = (env, orderId) => recordsWhere(env, "installationJobs", "orderId", orderId);

/** Writes a planned order change atomically (see applyOrderPlan in backend/controllers/orders.js). */
export const applyOrderPlan = async (context, stored, plan) => {
  const { env, admin, audit } = context;
  let lines = [];
  let reason = null;
  let onShortfall;
  let skippedSkus = [];
  if (plan.fulfillment?.from === "pending" && plan.fulfillment.to === "processing") {
    // Order line snapshots (COMMERCE_V2 §1.3); only legacy lines need the current packages.
    const packages = needsPackagesToCommit(plan.order) ? await listCollection(env, "packages", { includeInactive: true }) : [];
    lines = commitLines(plan.order, new Map(packages.map((pack) => [pack.id, pack])));
    reason = "sale";
    onShortfall = insufficientStockForOrder;
    if (lines.length) plan.patch.stockCommittedAt = new Date().toISOString();
  } else if (plan.fulfillment?.to === "cancelled" && plan.order.stockCommittedAt) {
    const movements = (await recordsWhere(env, "inventoryMovements", "referenceId", stored.id)).filter(
      (movement) => movement.referenceType === "order"
    );
    const reversal = reversalLines(movements);
    // Deleted products are skipped (and noted in the audit) instead of failing the cancel.
    const existing = reversal.length
      ? new Set((await listCollection(env, "products", { includeInactive: true })).map((product) => product.id))
      : new Set();
    ({ lines, skippedSkus } = restorableLines(reversal, existing, movements));
    reason = "sale_reversal";
    plan.patch.stockCommittedAt = null;
  }

  const result = await applyStockChanges(env, {
    lines,
    reason,
    reference: { type: "order", id: stored.id },
    actor: actorOf(admin),
    onShortfall,
    record: {
      collection: "orders",
      id: stored.id,
      expect: { fulfillmentStatus: stored.fulfillmentStatus ?? null, paymentStatus: stored.paymentStatus ?? null },
      patch: plan.patch,
    },
  });
  afterStockChange(context, result.plans);
  for (const entry of orderAuditEntries(plan, { skippedSkus })) audit({ ...entry, entity: "order", entityId: stored.id });
  return serializeOrder(result.record);
};

/**
 * POST /admin/orders (COMMERCE_V2 §2.2), at parity with adminCreateOrder in
 * backend/controllers/orders.js. A collected sale inserts the order in the same D1 batch as
 * the stock commit (no order on a shortfall).
 */
const createInStoreOrder = async (context) => {
  const { env, ctx, body, admin, audit } = context;
  const input = inStoreOrderPayload(body);
  const products = await listCollection(env, "products", { includeInactive: true });
  const priced = priceInStoreOrder(input, new Map(products.map((product) => [product.id, product])));
  const actor = actorOf(admin);
  const record = inStoreOrderRecord(input, priced, { id: crypto.randomUUID(), actor, timestamp: timestamp() });

  let order;
  if (input.fulfilment === "collected") {
    const result = await applyStockChanges(env, {
      lines: priced.order.map((line) => ({ productId: line.productId, change: -line.quantity })),
      reason: "sale",
      reference: { type: "order", id: record.id },
      actor,
      onShortfall: insufficientStockForOrder,
      record: { collection: "orders", insert: { ...record, sortOrder: await nextSortOrder(env, "orders") } },
    });
    afterStockChange(context, result.plans);
    order = result.record;
  } else {
    order = await createCollectionItem(env, "orders", record, { id: record.id });
  }

  for (const entry of inStoreAuditEntries(order)) audit({ ...entry, entity: "order", entityId: order.id });
  notify(env, ctx, newOrderNotification(order));
  return created("Order created.", serializeOrder(order));
};

const timestamp = () => new Date().toISOString();

export const handleOrdersAdmin = async (context) => {
  const { request, env, path, body, admin, audit, url } = context;
  const { method } = request;

  if (path === "/admin/orders" && method === "GET") {
    requireCapability(admin, "orders:read");
    const matches = orderListFilter(queryOf(url));
    const orders = (await listCollection(env, "orders", { includeInactive: true })).map(serializeOrder).filter(matches);
    return ok("Orders retrieved.", orders);
  }
  if (path === "/admin/orders" && method === "POST") {
    requireCapability(admin, "orders:create");
    return createInStoreOrder(context);
  }

  const orderId = idAfter(path, "/admin/orders");
  if (orderId && method === "GET") {
    requireCapability(admin, "orders:read");
    const order = await getCollectionItem(env, "orders", orderId);
    return ok("Order retrieved.", { ...serializeOrder(order), jobs: (await jobsOfOrder(env, order.id)).map(jobSummary) });
  }
  if (orderId && method === "PUT") {
    requireCapability(admin, "orders:update");
    const stored = await getCollectionItem(env, "orders", orderId);
    const changes = orderUpdatePayload(body, serializeOrder(stored));
    const jobs = changes.requiresInstallation === false ? await jobsOfOrder(env, stored.id) : [];
    const plan = planOrderChanges(stored, changes, { jobs, timestamp: timestamp() });
    return ok("Order updated.", await applyOrderPlan(context, stored, plan));
  }
  if (orderId && method === "DELETE") {
    requireCapability(admin, "orders:delete");
    const existing = await getCollectionItem(env, "orders", orderId);
    assertOrderDeletable(await jobsOfOrder(env, existing.id));
    await deleteCollectionItem(env, "orders", existing);
    try {
      await deleteRecordReads(env, readKey("orders", existing.id));
    } catch (error) {
      console.error("Failed to delete read status:", error?.message);
    }
    audit({ action: "order.delete", entity: "order", entityId: existing.id, summary: `Deleted order from ${existing.name || existing.id}` });
    return ok("Order deleted.", serializeOrder(existing));
  }

  const action = /^\/admin\/orders\/([^/]+)\/(fulfillment|mark-paid|assign-engineer)$/.exec(path);
  if (!action || method !== "POST") return null;
  requireCapability(admin, "orders:update");
  const [, id, kind] = action;

  if (kind === "fulfillment") {
    const changes = fulfillmentPayload(body);
    const stored = await getCollectionItem(env, "orders", id);
    const plan = planOrderChanges(stored, changes, { timestamp: timestamp() });
    return ok("Fulfilment status updated.", await applyOrderPlan(context, stored, plan));
  }

  if (kind === "mark-paid") {
    const changes = markPaidPayload(body);
    const stored = await getCollectionItem(env, "orders", id);
    const plan = planOrderChanges(stored, changes, { timestamp: timestamp() });
    return ok("Order marked as paid.", await applyOrderPlan(context, stored, plan));
  }

  const engineerId = engineerIdPayload(body);
  const stored = await getCollectionItem(env, "orders", id);
  if (engineerId) assertActiveEngineer(await getById(env, "admins", engineerId));
  const order = serializeOrder(stored);
  if (!order.requiresInstallation) throw conflict("Order does not require installation.");
  const plan = planOrderChanges(stored, {}, { timestamp: timestamp() });
  plan.patch.assignedEngineerId = engineerId;
  const result = await applyStockChanges(env, {
    lines: [],
    record: {
      collection: "orders",
      id: stored.id,
      expect: { fulfillmentStatus: stored.fulfillmentStatus ?? null, assignedEngineerId: stored.assignedEngineerId ?? null },
      patch: plan.patch,
    },
  });
  audit({
    action: "order.assign_engineer",
    entity: "order",
    entityId: stored.id,
    summary: engineerId
      ? `Assigned engineer ${engineerId} to order from ${order.name || order.id}`
      : `Unassigned the engineer from order from ${order.name || order.id}`,
    changes: ["assignedEngineerId"],
  });
  return ok(engineerId ? "Engineer assigned." : "Engineer unassigned.", serializeOrder(result.record));
};
