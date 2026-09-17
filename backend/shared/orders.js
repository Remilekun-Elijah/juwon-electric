// Orders and fulfilment (API_CONTRACT_V3 §6, decision D4a as settled by the contract).
// Enum and transition tables, read-time normalisation of legacy orders, update planning and
// stock commitment. Pure: storage and atomic writes live in each runtime.
import { badRequest, conflict } from "./errors.js";
import { OPS_LIMITS, boolean, dateTime, email, integer, isPlainObject, phone, queryText, text } from "./fields.js";
import { formatNaira, normalizeOptions } from "./packagePricing.js";

export const ORDER_CHANNELS = ["website", "in_store"];
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
 * Commerce v2 fields every order response carries (COMMERCE_V2 §2.2). Read-time defaults
 * only: website orders stored before in-store sales have none of them.
 */
export const orderCommerceDefaults = (order) => ({
  channel: ORDER_CHANNELS.includes(order.channel) ? order.channel : "website",
  subtotal: typeof order.subtotal === "number" ? order.subtotal : null,
  discount: isPlainObject(order.discount) ? order.discount : null,
  createdBy: isPlainObject(order.createdBy) ? order.createdBy : null,
});

/**
 * Order as returned by admin endpoints: backfilled, with `status` derived and the commerce
 * defaults. The internal `sortOrder` (only the Worker stores one for orders) is not part of
 * the order shape.
 */
export const serializeOrder = (order) => {
  const { sortOrder: _sortOrder, ...normalized } = { ...order, ...orderBackfill(order) };
  return { ...normalized, ...orderCommerceDefaults(normalized), status: derivedStatus(normalized.fulfillmentStatus) };
};

/**
 * Fields every new public order is stored with (§6.1). Website orders are packages, which are sold installed,
 * so they start with requiresInstallation: true (owner decision 2026-09-17). Older orders keep their stored value.
 */
export const NEW_ORDER_FIELDS = Object.freeze({
  channel: "website",
  status: "pending",
  paymentStatus: "pending",
  fulfillmentStatus: "pending",
  requiresInstallation: true,
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

/**
 * Next fulfilment statuses for an order. In-store orders may also go delivered -> cancelled
 * (a walk-in customer returns the goods), which restores committed stock like any cancel.
 */
export const allowedFulfillmentTransitions = (order) => {
  const from = order?.fulfillmentStatus;
  const base = FULFILLMENT_TRANSITIONS[from] || [];
  return order?.channel === "in_store" && from === "delivered" ? [...base, "cancelled"] : base;
};

export const assertFulfillmentTransition = (order, to) => {
  const from = order.fulfillmentStatus;
  if (!allowedFulfillmentTransitions(order).includes(to)) throw conflict(`Cannot change fulfilment status from ${from} to ${to}.`);
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

const matchText = (value) => String(value ?? "").trim().toLowerCase();

// Legacy lines (placed before snapshots): the current items of the ordered option (after the
// read-time migration), else the package's deprecated top-level items.
const legacyLineItems = (line, pack) => {
  if (!pack) return [];
  const option = normalizeOptions(pack).find((entry) => matchText(entry.name) === matchText(line.optionName));
  if (option && Array.isArray(option.items)) return option.items;
  return Array.isArray(pack.items) ? pack.items : [];
};

/** True when the stored line sells a product directly (in-store); anything else is a package line. */
export const isProductLine = (line) => line?.type === "product";

/**
 * Stock lines to commit an order (pending -> processing, or an in-store "collected" sale),
 * from the order line snapshots (COMMERCE_V2 §1.3): product lines take their quantity,
 * package lines their components times the line quantity. Package lines without
 * `components` fall back to the current package (`packagesById` is only needed for those).
 * Aggregated per product; returns [{ productId, change }] with negative changes.
 */
export const commitLines = (order, packagesById = new Map()) => {
  const totals = new Map();
  const add = (productId, count) => {
    if (productId && count > 0) totals.set(productId, (totals.get(productId) || 0) + count);
  };
  for (const line of Array.isArray(order.order) ? order.order : []) {
    const quantity = Number(line?.quantity) || 1;
    if (isProductLine(line)) {
      add(line.productId, quantity);
      continue;
    }
    const components = Array.isArray(line?.components) ? line.components : legacyLineItems(line, packagesById.get(line?.packageId));
    for (const item of components) add(item?.productId, (Number(item?.quantity) || 0) * quantity);
  }
  return [...totals].map(([productId, total]) => ({ productId, change: -total }));
};

/** True when some package line lacks a snapshot, so the current packages are needed. */
export const needsPackagesToCommit = (order) =>
  (Array.isArray(order.order) ? order.order : []).some((line) => !isProductLine(line) && !Array.isArray(line?.components));

/** Stock lines that reverse this order's committed stock: sale minus sale_reversal movements. */
export const reversalLines = (movements) => {
  const net = new Map();
  for (const movement of movements) {
    if (movement.reason !== "sale" && movement.reason !== "sale_reversal") continue;
    net.set(movement.productId, (net.get(movement.productId) || 0) - movement.change);
  }
  return [...net].filter(([, change]) => change > 0).map(([productId, change]) => ({ productId, change }));
};

/**
 * Splits reversal lines into those whose product still exists and the SKUs of deleted
 * products (taken from the movements), so a cancel never fails on a deleted product (CO-01).
 */
export const restorableLines = (lines, existingIds, movements) => {
  const skuOf = new Map(movements.map((movement) => [movement.productId, movement.sku]));
  const kept = lines.filter((line) => existingIds.has(line.productId));
  const skipped = lines
    .filter((line) => !existingIds.has(line.productId))
    .map((line) => skuOf.get(line.productId) || line.productId)
    .sort();
  return { lines: kept, skippedSkus: skipped };
};

/**
 * Audit entries for a planned change (§6.4): one per kind, plus the legacy status alias.
 * `skippedSkus`: products whose stock could not be restored because they were deleted.
 */
export const orderAuditEntries = (plan, { skippedSkus = [] } = {}) => {
  const { order, fulfillment, payment, other, patch } = plan;
  const who = order.name || order.id;
  const entries = [];
  if (fulfillment) {
    const notes = skippedSkus.map((sku) => `; stock not restored for deleted product ${sku}`).join("");
    entries.push({
      action: "order.fulfillment_change",
      summary: `Order from ${who}: fulfilment ${fulfillment.from} → ${fulfillment.to}${notes}`,
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
  const channel = queryText(query, "channel");
  if (channel && !ORDER_CHANNELS.includes(channel)) throw badRequest("Channel is not valid.");
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
      (!channel || order.channel === channel) &&
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

// ---- in-store orders (COMMERCE_V2 §2) -------------------------------------------------------

export const IN_STORE_LIMITS = Object.freeze({
  lines: 50,
  quantityMax: 1000,
  personName: 100,
  deliveryAddress: 500,
  note: 500,
  discountReasonMin: 3,
  discountReasonMax: 200,
  discountMax: 1_000_000_000_000,
});

const FULFILMENTS = ["collected", "later"];
const IN_STORE_PAYMENT_STATUSES = ["pending", "partial", "paid"];

const inStoreLines = (raw) => {
  if (!Array.isArray(raw) || raw.length === 0) throw badRequest("Add at least one product.");
  if (raw.length > IN_STORE_LIMITS.lines) throw badRequest(`An order can have at most ${IN_STORE_LIMITS.lines} lines.`);
  const seen = new Set();
  return raw.map((entry) => {
    if (!isPlainObject(entry)) throw badRequest("Invalid order line.");
    const productId = text(entry, "productId", { label: "Product", required: true, max: OPS_LIMITS.id });
    if (seen.has(productId)) throw badRequest("Each product can appear once per order.");
    seen.add(productId);
    return {
      productId,
      quantity: integer(entry, "quantity", { label: "Quantity", required: true, min: 1, max: IN_STORE_LIMITS.quantityMax }),
    };
  });
};

const discountInput = (raw) => {
  if (raw === undefined || raw === null) return { amount: 0, reason: null };
  if (!isPlainObject(raw)) throw badRequest("Discount is not valid.");
  const amount = integer(raw, "amount", { label: "Discount amount", min: 0, max: IN_STORE_LIMITS.discountMax }) ?? 0;
  if (amount === 0) return { amount: 0, reason: null };
  const reason = text(raw, "reason", { label: "Discount reason", required: true, max: IN_STORE_LIMITS.discountReasonMax });
  if (reason.length < IN_STORE_LIMITS.discountReasonMin) {
    throw badRequest(`Discount reason must be at least ${IN_STORE_LIMITS.discountReasonMin} characters.`);
  }
  return { amount, reason };
};

/** Validated POST /admin/orders body (shape only; products and totals: priceInStoreOrder). */
export const inStoreOrderPayload = (body) => {
  const input = isPlainObject(body) ? body : {};
  if (!isPlainObject(input.customer)) throw badRequest("Name is required.");
  const customer = input.customer;
  const name = text(customer, "name", { label: "Name", required: true, max: IN_STORE_LIMITS.personName });
  const phoneNumber = phone(customer, "phoneNumber");
  if (!phoneNumber) throw badRequest("Phone number is required.");
  const emailAddress = email(customer, "emailAddress", { label: "Email address" }) || null;
  const deliveryAddress =
    text(customer, "deliveryAddress", { label: "Delivery address", max: IN_STORE_LIMITS.deliveryAddress, multiline: true }) || null;

  const lines = inStoreLines(input.lines);
  const discount = discountInput(input.discount);

  const fulfilment = input.fulfilment;
  if (typeof fulfilment !== "string" || !FULFILMENTS.includes(fulfilment)) throw badRequest("Fulfilment is not valid.");
  const paymentStatus = input.paymentStatus;
  if (typeof paymentStatus !== "string" || !IN_STORE_PAYMENT_STATUSES.includes(paymentStatus)) {
    throw badRequest("Payment status is not valid.");
  }
  const requiresInstallation = boolean(input, "requiresInstallation", { label: "requiresInstallation" }) ?? false;
  if (requiresInstallation && fulfilment !== "later") throw badRequest("Installation requires a later fulfilment.");
  if (fulfilment === "later" && !deliveryAddress) throw badRequest("Delivery address is required for later fulfilment.");
  const note = text(input, "note", { label: "Note", max: IN_STORE_LIMITS.note, multiline: true }) || null;

  return { customer: { name, phoneNumber, emailAddress, deliveryAddress }, lines, discount, fulfilment, paymentStatus, requiresInstallation, note };
};

/**
 * Prices validated in-store lines with current product prices. Products must exist and not
 * be archived (hidden is allowed); the discount can't exceed the subtotal.
 */
export const priceInStoreOrder = (input, productsById) => {
  const order = input.lines.map(({ productId, quantity }) => {
    const product = productsById.get(productId);
    if (!product) throw badRequest("Product not found.");
    if ((product.status || "active") === "archived") throw badRequest("Archived products can't be sold.");
    const unitPrice = Number(product.price) || 0;
    return { type: "product", productId: product.id, sku: product.sku, name: product.name, quantity, unitPrice, lineTotal: unitPrice * quantity };
  });
  const subtotal = order.reduce((sum, line) => sum + line.lineTotal, 0);
  if (input.discount.amount > subtotal) throw badRequest("Discount can't be more than the subtotal.");
  return { order, subtotal, totalAmount: subtotal - input.discount.amount };
};

/**
 * The stored in-store order record. `id` and `timestamp` come from the runtime. A collected
 * sale is stored delivered with stock committed; the runtime commits the stock in the same
 * atomic write.
 */
export const inStoreOrderRecord = (input, priced, { id, actor, timestamp }) => {
  const collected = input.fulfilment === "collected";
  const fulfillmentStatus = collected ? "delivered" : "pending";
  return {
    id,
    ...input.customer,
    order: priced.order,
    subtotal: priced.subtotal,
    discount: input.discount.amount > 0 ? { amount: input.discount.amount, reason: input.discount.reason } : null,
    totalAmount: priced.totalAmount,
    total: formatNaira(priced.totalAmount),
    channel: "in_store",
    createdBy: actor ? { id: actor.id, email: actor.email } : null,
    source: "admin",
    status: derivedStatus(fulfillmentStatus),
    paymentStatus: input.paymentStatus,
    paidAt: input.paymentStatus === "paid" ? timestamp : null,
    fulfillmentStatus,
    requiresInstallation: input.requiresInstallation,
    assignedEngineerId: null,
    stockCommittedAt: collected ? timestamp : null,
    note: input.note,
    isActive: true,
    receivedAt: timestamp,
    createdAt: timestamp,
    updatedAt: timestamp,
  };
};

/** Audit entries for a new in-store order: order.create, plus the fulfilment move when collected. */
export const inStoreAuditEntries = (order) => {
  const count = order.order.reduce((sum, line) => sum + line.quantity, 0);
  const discount = order.discount ? `; discount ${formatNaira(order.discount.amount)} (${order.discount.reason})` : "";
  const entries = [
    {
      action: "order.create",
      summary: `In-store order for ${order.name}: ${count} ${count === 1 ? "item" : "items"}, ${formatNaira(order.totalAmount)}${discount}`,
      changes: ["order", "channel", "paymentStatus", "fulfillmentStatus"],
    },
  ];
  if (order.fulfillmentStatus === "delivered") {
    entries.push({
      action: "order.fulfillment_change",
      summary: `Order from ${order.name}: fulfilment pending → delivered`,
      changes: ["fulfillmentStatus"],
    });
  }
  return entries;
};
