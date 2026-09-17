// Orders and fulfilment (API_CONTRACT_V3 §6) for the Worker, at parity with
// backend/controllers/orders.js. Enums, transitions and planning: backend/shared/orders.js.
import { ok } from "../http.js";
import { deleteCollectionItem, deleteRecordReads, getById, getCollectionItem, listCollection, readKey } from "../store.js";
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
  jobSummary,
  markPaidPayload,
  orderAuditEntries,
  orderListFilter,
  orderUpdatePayload,
  planOrderChanges,
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
  if (plan.fulfillment?.from === "pending" && plan.fulfillment.to === "processing") {
    const packages = await listCollection(env, "packages", { includeInactive: true });
    lines = commitLines(plan.order, new Map(packages.map((pack) => [pack.id, pack])));
    reason = "sale";
    onShortfall = insufficientStockForOrder;
    if (lines.length) plan.patch.stockCommittedAt = new Date().toISOString();
  } else if (plan.fulfillment?.to === "cancelled" && plan.order.stockCommittedAt) {
    const movements = (await recordsWhere(env, "inventoryMovements", "referenceId", stored.id)).filter(
      (movement) => movement.referenceType === "order"
    );
    lines = reversalLines(movements);
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
  for (const entry of orderAuditEntries(plan)) audit({ ...entry, entity: "order", entityId: stored.id });
  return serializeOrder(result.record);
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
