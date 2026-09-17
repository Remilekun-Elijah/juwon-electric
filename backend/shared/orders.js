// Orders and fulfilment (API_CONTRACT_V3 §6, decision D4a as settled by the contract).
// Enum and transition tables, read-time normalisation of legacy orders, update planning and
// stock commitment. Pure: storage and atomic writes live in each runtime.
import { badRequest, conflict } from "./errors.js";
import { OPS_LIMITS, boolean, dateTime, isPlainObject, queryText, text } from "./fields.js";

export const FULFILLMENT_STATUSES = ["pending", "processing", "out_for_delivery", "delivered", "installed", "cancelled"];
export const PAYMENT_STATUSES = ["pending", "partial", "paid", "failed", "refunded"];

export const FULFILLMENT_TRANSITIONS = {
  pending: ["processing", "cancelled"],
  processing: ["out_for_delivery", "delivered", "cancelled"],
  out_for_delivery: ["delivered", "cancelled"],
  delivered: ["installed"],
  installed: [],
  cancelled: [],
};

export const PAYMENT_TRANSITIONS = {
  pending: ["partial", "paid", "failed"],
  partial: ["paid", "refunded", "failed"],
  failed: ["pending", "partial", "paid"],
  paid: ["refunded"],
  refunded: [],
};

/** Legacy `status`, derived from the fulfilment status on every read and write. */
export const derivedStatus = (fulfillmentStatus) =>
  fulfillmentStatus === "cancelled"
    ? "cancelled"
    : fulfillmentStatus === "delivered" || fulfillmentStatus === "installed"
      ? "completed"
      : "pending";

const LEGACY_FULFILLMENT = { completed: "delivered", cancelled: "cancelled" };

/**
 * Fields a stored order is missing or holds in legacy form (§6.1 backfill). Applied at read
 * time by both runtimes and persisted on the next write; D1 migration 0011 does the same.
 */
export const orderBackfill = (order) => {
  const patch = {};
  if (!FULFILLMENT_STATUSES.includes(order.fulfillmentStatus)) {
    patch.fulfillmentStatus = LEGACY_FULFILLMENT[order.status] || "pending";
  }
  if (!PAYMENT_STATUSES.includes(order.paymentStatus)) {
    patch.paymentStatus = "pending";
    if (order.legacyPaymentStatus === undefined) {
      patch.legacyPaymentStatus = typeof order.paymentStatus === "string" ? order.paymentStatus : null;
    }
  }
  if (typeof order.requiresInstallation !== "boolean") patch.requiresInstallation = false;
  for (const key of ["assignedEngineerId", "paidAt", "stockCommittedAt"]) {
    if (order[key] === undefined) patch[key] = null;
  }
  return patch;
};

/**
 * Order as returned by admin endpoints: backfilled, with `status` derived. The internal
 * `sortOrder` (only the Worker stores one for orders) is not part of the order shape.
 */
export const serializeOrder = (order) => {
  const { sortOrder: _sortOrder, ...normalized } = { ...order, ...orderBackfill(order) };
  return { ...normalized, status: derivedStatus(normalized.fulfillmentStatus) };
};

/** Fields every new public order is stored with (§6.1). */
export const NEW_ORDER_FIELDS = Object.freeze({
  status: "pending",
  paymentStatus: "pending",
  fulfillmentStatus: "pending",
  requiresInstallation: false,
  assignedEngineerId: null,
});

// ---- validation ----------------------------------------------------------------------------

const fulfillmentField = (body, key, { required = false } = {}) => {
  const raw = body?.[key];
  if (raw === undefined || raw === null || raw === "") {
    if (required) throw badRequest("Fulfilment status is not valid.");
    return undefined;
  }
  if (typeof raw !== "string" || !FULFILLMENT_STATUSES.includes(raw.trim())) throw badRequest("Fulfilment status is not valid.");
  return raw.trim();
};

const paymentField = (body) => {
  const raw = body?.paymentStatus;
  if (raw === undefined || raw === null || raw === "") return undefined;
  if (typeof raw !== "string") throw badRequest("Payment status is not valid.");
  const value = raw.trim() === "unpaid" ? "pending" : raw.trim(); // input alias (§6.4)
  if (!PAYMENT_STATUSES.includes(value)) throw badRequest("Payment status is not valid.");
  return value;
};

const noteField = (body) =>
  body?.note === undefined || body?.note === null ? undefined : text(body, "note", { label: "Note", max: OPS_LIMITS.note, multiline: true });

export const assertFulfillmentTransition = (order, to) => {
  const from = order.fulfillmentStatus;
  if (!FULFILLMENT_TRANSITIONS[from]?.includes(to)) throw conflict(`Cannot change fulfilment status from ${from} to ${to}.`);
  if (to === "installed" && order.requiresInstallation !== true) throw conflict("Order does not require installation.");
};

export const assertPaymentTransition = (order, to) => {
  const from = order.paymentStatus;
  if (!PAYMENT_TRANSITIONS[from]?.includes(to)) throw conflict(`Cannot change payment status from ${from} to ${to}.`);
};

/** Validated PUT /admin/orders/:id body (only sent fields). */
export const orderUpdatePayload = (body, current) => {
  const input = isPlainObject(body) ? body : {};
  const payload = {
    note: noteField(input),
    isActive: boolean(input, "isActive", { label: "isActive" }),
    requiresInstallation: boolean(input, "requiresInstallation", { label: "requiresInstallation" }),
    paymentStatus: paymentField(input),
    fulfillmentStatus: fulfillmentField(input, "fulfillmentStatus"),
  };
  const status = input.status;
  if (status !== undefined && status !== null && status !== "" && status !== current.status) {
    throw badRequest("Use fulfillmentStatus to change the order status.");
  }
  return payload;
};

/** POST /admin/orders/:id/fulfillment body. */
export const fulfillmentPayload = (body) => {
  const input = isPlainObject(body) ? body : {};
  return { fulfillmentStatus: fulfillmentField(input, "status", { required: true }), note: noteField(input) };
};

/** POST /admin/orders/:id/mark-paid body. */
export const markPaidPayload = (body) => ({ paymentStatus: "paid", note: noteField(isPlainObject(body) ? body : {}) });

/** POST /admin/orders/:id/assign-engineer body: { engineerId: string | null }. */
export const engineerIdPayload = (body) => {
  const raw = isPlainObject(body) ? body.engineerId : undefined;
  if (raw === null) return null;
  if (typeof raw !== "string" || !raw.trim() || raw.trim().length > OPS_LIMITS.id) {
    throw badRequest("Assignee must be an active engineer.");
  }
  return raw.trim();
};

export const assertActiveEngineer = (admin) => {
  const role = admin?.role === "super_admin" ? "superadmin" : admin?.role;
  if (!admin || admin.isActive === false || role !== "engineer") throw badRequest("Assignee must be an active engineer.");
};

// ---- planning --------------------------------------------------------------------------------

const hasOpenJobs = (jobs) => jobs.some((job) => job.status !== "cancelled");

/**
 * Plans an order update. `changes` holds validated fields (see the payload helpers).
 * `context`: { jobs (installation jobs of this order), timestamp }.
 * Returns { patch, fulfillment: { from, to } | null, payment: { from, to } | null, other: string[] }.
 * The patch always carries the backfilled fields and the derived `status`.
 */
export const planOrderChanges = (stored, changes, { jobs = [], timestamp }) => {
  const order = serializeOrder(stored);
  const patch = { ...orderBackfill(stored) };
  const other = [];

  for (const key of ["note", "isActive"]) {
    if (changes[key] !== undefined && changes[key] !== order[key]) {
      patch[key] = changes[key];
      other.push(key);
    }
  }
  if (changes.requiresInstallation !== undefined && changes.requiresInstallation !== order.requiresInstallation) {
    if (changes.requiresInstallation === false && hasOpenJobs(jobs)) throw conflict("Order has installation jobs.");
    patch.requiresInstallation = changes.requiresInstallation;
    other.push("requiresInstallation");
  }

  let fulfillment = null;
  if (changes.fulfillmentStatus !== undefined && changes.fulfillmentStatus !== order.fulfillmentStatus) {
    assertFulfillmentTransition({ ...order, requiresInstallation: patch.requiresInstallation ?? order.requiresInstallation }, changes.fulfillmentStatus);
    fulfillment = { from: order.fulfillmentStatus, to: changes.fulfillmentStatus };
    patch.fulfillmentStatus = changes.fulfillmentStatus;
  }

  let payment = null;
  if (changes.paymentStatus !== undefined && changes.paymentStatus !== order.paymentStatus) {
    assertPaymentTransition(order, changes.paymentStatus);
    payment = { from: order.paymentStatus, to: changes.paymentStatus };
    patch.paymentStatus = changes.paymentStatus;
    if (changes.paymentStatus === "paid" && !order.paidAt) patch.paidAt = timestamp;
  }

  patch.status = derivedStatus(patch.fulfillmentStatus ?? order.fulfillmentStatus);
  return { patch, order, fulfillment, payment, other };
};

/**
 * Stock lines for pending -> processing: each order line's package items times the line
 * quantity, aggregated per product. Lines without a resolvable package (or packages
 * without items) add nothing. Returns [{ productId, change }] with negative changes.
 */
export const commitLines = (order, packagesById) => {
  const totals = new Map();
  for (const line of Array.isArray(order.order) ? order.order : []) {
    const pack = packagesById.get(line?.packageId);
    const quantity = Number(line?.quantity) || 1;
    for (const item of Array.isArray(pack?.items) ? pack.items : []) {
      totals.set(item.productId, (totals.get(item.productId) || 0) + item.quantity * quantity);
    }
  }
  return [...totals].map(([productId, total]) => ({ productId, change: -total }));
};

/** Stock lines that reverse this order's committed stock: sale minus sale_reversal movements. */
export const reversalLines = (movements) => {
  const net = new Map();
  for (const movement of movements) {
    if (movement.reason !== "sale" && movement.reason !== "sale_reversal") continue;
    net.set(movement.productId, (net.get(movement.productId) || 0) - movement.change);
  }
  return [...net].filter(([, change]) => change > 0).map(([productId, change]) => ({ productId, change }));
};

/** Audit entries for a planned change (§6.4): one per kind, plus the legacy status alias. */
export const orderAuditEntries = (plan) => {
  const { order, fulfillment, payment, other, patch } = plan;
  const who = order.name || order.id;
  const entries = [];
  if (fulfillment) {
    entries.push({
      action: "order.fulfillment_change",
      summary: `Order from ${who}: fulfilment ${fulfillment.from} → ${fulfillment.to}`,
      changes: ["fulfillmentStatus"],
    });
    if (patch.status !== order.status) {
      entries.push({ action: "order.status_change", summary: `Order from ${who}: status ${order.status} → ${patch.status}`, changes: ["status"] });
    }
  }
  if (payment) {
    entries.push({ action: "order.payment_change", summary: `Order from ${who}: payment ${payment.from} → ${payment.to}`, changes: ["paymentStatus"] });
  }
  if (other.length) entries.push({ action: "order.update", summary: `Updated order from ${who}`, changes: other });
  return entries;
};

// ---- listing ---------------------------------------------------------------------------------

/** GET /admin/orders filters (§6.4). Returns a predicate over serialized orders. */
export const orderListFilter = (query) => {
  const fulfillmentStatus = queryText(query, "fulfillmentStatus");
  if (fulfillmentStatus && !FULFILLMENT_STATUSES.includes(fulfillmentStatus)) throw badRequest("Fulfilment status is not valid.");
  const paymentStatus = queryText(query, "paymentStatus");
  if (paymentStatus && !PAYMENT_STATUSES.includes(paymentStatus)) throw badRequest("Payment status is not valid.");
  const engineerId = queryText(query, "engineerId");
  const requiresInstallation = queryText(query, "requiresInstallation");
  if (requiresInstallation && !["true", "false"].includes(requiresInstallation)) {
    throw badRequest("requiresInstallation must be true or false.");
  }
  const range = (key) => {
    const value = queryText(query, key);
    if (!value) return "";
    try {
      return dateTime({ value }, "value") || "";
    } catch {
      throw badRequest(`${key} must be a valid date.`);
    }
  };
  const from = range("from");
  const to = range("to");
  return (order) => {
    const placed = String(order.receivedAt || order.createdAt || "");
    return (
      (!fulfillmentStatus || order.fulfillmentStatus === fulfillmentStatus) &&
      (!paymentStatus || order.paymentStatus === paymentStatus) &&
      (!engineerId || order.assignedEngineerId === engineerId) &&
      (!requiresInstallation || String(order.requiresInstallation) === requiresInstallation) &&
      (!from || placed >= from) &&
      (!to || placed <= to)
    );
  };
};

export const jobSummary = (job) => ({
  id: job.id,
  status: job.status,
  engineerId: job.engineerId ?? null,
  scheduledAt: job.scheduledAt ?? null,
});

export const assertOrderDeletable = (jobs) => {
  if (hasOpenJobs(jobs)) throw conflict("Order has installation jobs.");
};
