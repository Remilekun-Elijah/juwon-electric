import orderTemplate from "../mail/_orderTemplate.js";
import { sendMail } from "../mail/mail.js";
import { formatMoney, loadPricingPackages, priceItems } from "./_pricing.js";
import { LIMITS as RATE_LIMITS, enforceLimit } from "../middleware/rateLimit.js";
import { takeTurnstileToken, verifyTurnstile } from "../middleware/turnstile.js";
import { forgetRecordReads } from "./adminReads.js";
import { actorOf, afterStockChange } from "./inventory.js";
import { asyncHandler } from "../services/asyncHandler.js";
import { audit, auditDelete } from "../services/audit.js";
import { created, ok } from "../services/http.js";
import { track } from "../services/runtime.js";
import {
  appendCollectionItem,
  applyStockChanges,
  createCollectionItem,
  deleteCollectionItem,
  findCollectionItem,
  findCollectionItems,
  getCollectionItem,
  listCollection,
} from "../services/store.js";
import {
  LIMITS,
  optionalString,
  requiredPhone,
  requiredString,
  validateEmail,
  validatePricingItems,
} from "../services/validators.js";
import { insufficientStockForOrder } from "../shared/inventory.js";
import {
  NEW_ORDER_FIELDS,
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
} from "../shared/orders.js";
import { randomUUID } from "crypto";
import { conflict } from "../shared/errors.js";
import { packageLineSnapshot } from "../shared/packagePricing.js";
import { notify } from "../services/notifications.js";
import { getSettings } from "../services/settings.js";
import { newOrderNotification } from "../shared/notifications.js";

const kvaLabel = (pack) =>
  `${pack.kva}kva ${pack.volt ? `+ ${pack.volt}volt` : ""}`.trim();

const typeLabel = (type) =>
  String(type ?? "").trim().toLowerCase() === "hybrid lithium"
    ? "Hybrid inverter + lithium"
    : `Inverter + ${type}`;

// Prices come from the package catalog; client-sent price/total are ignored.
// Stored items keep the shape the checkout form sends (display labels and
// "₦1,150,000" money strings) so the admin UI and order email keep working.
// Each line also stores its snapshot (COMMERCE_V2 §1.3): type "package", the option's
// components per package, productsTotal and priceAdjustment. The display type label moves
// to `typeLabel`.
const priceOrderItems = async (validated) => {
  const packages = await loadPricingPackages();
  const priced = priceItems(packages, validated, { kind: "order" });

  const order = priced.map(({ pack, option, unitPrice, quantity, lineTotal }) => ({
    package: option.kits
      ? `${kvaLabel(pack)} inverter with ${option.kits}`
      : `${kvaLabel(pack)} ${pack.name}`,
    ...packageLineSnapshot(option),
    typeLabel: typeLabel(pack.type),
    kva: kvaLabel(pack),
    volt: pack.volt ?? null,
    price: formatMoney(unitPrice),
    quantity,
    name: pack.name,
    packageId: pack.id,
    legacyId: pack.legacyId,
    optionName: option.name,
    unitPrice,
    lineTotal,
  }));
  const total = priced.reduce((sum, item) => sum + item.lineTotal, 0);

  return { order, total: formatMoney(total), totalAmount: total };
};

export const placeOrder = asyncHandler(async (req, res) => {
  const turnstileToken = takeTurnstileToken(req.body);
  const customer = {
    name: requiredString(req.body, "name", "Name", { max: LIMITS.personName }),
    phoneNumber: requiredPhone(req.body),
    emailAddress: validateEmail(
      optionalString(req.body, "emailAddress", { label: "Email address", max: LIMITS.email })
    ),
    deliveryAddress: requiredString(req.body, "deliveryAddress", "Delivery address", {
      max: LIMITS.deliveryAddress,
      multiline: true,
    }),
  };
  const source =
    optionalString(req.body, "source", { label: "Source", max: LIMITS.source }) || "client";
  const validated = validatePricingItems(req.body?.order, "order");

  await enforceLimit(req, res, "public-order", RATE_LIMITS.publicWrite);
  await verifyTurnstile(req, turnstileToken, "order");

  const payload = {
    ...customer,
    ...(await priceOrderItems(validated)),
    ...NEW_ORDER_FIELDS,
    source,
  };

  const order = await appendCollectionItem("orders", payload);
  notify(newOrderNotification(order));
  const { orderEmails } = (await getSettings()).notifications;

  track(
    sendMail(
      {
        subject: "You have a new order",
        // No configured recipients: sendMail falls back to the SMTP_FROM mailbox.
        to: orderEmails.length ? orderEmails : undefined,
        data: order,
      },
      orderTemplate
    )
  );

  created(res, "Order placed successfully.", order);
});

export const jobsOf = (orderId) => findCollectionItems("installationJobs", { orderId });

/**
 * Writes a planned order change (shared/orders.js planOrderChanges): stock commit on
 * pending -> processing, stock reversal on cancel, and the order patch, in one atomic step
 * guarded by the order's current fulfilment and payment status. Audits every change.
 */
export const applyOrderPlan = async (req, stored, plan) => {
  let lines = [];
  let reason = null;
  let onShortfall;
  let skippedSkus = [];
  if (plan.fulfillment?.from === "pending" && plan.fulfillment.to === "processing") {
    // Order line snapshots (COMMERCE_V2 §1.3); only legacy lines need the current packages.
    const packages = needsPackagesToCommit(plan.order) ? await listCollection("packages", { includeInactive: true }) : [];
    lines = commitLines(plan.order, new Map(packages.map((pack) => [pack.id, pack])));
    reason = "sale";
    onShortfall = insufficientStockForOrder;
    if (lines.length) plan.patch.stockCommittedAt = new Date().toISOString();
  } else if (plan.fulfillment?.to === "cancelled" && plan.order.stockCommittedAt) {
    const movements = await findCollectionItems("inventoryMovements", { referenceType: "order", referenceId: stored.id });
    const reversal = reversalLines(movements);
    // Deleted products are skipped (and noted in the audit) instead of failing the cancel.
    const existing = reversal.length
      ? await findCollectionItems("products", {}).then((products) => new Set(products.map((product) => product.id)))
      : new Set();
    ({ lines, skippedSkus } = restorableLines(reversal, existing, movements));
    reason = "sale_reversal";
    plan.patch.stockCommittedAt = null;
  }

  const result = await applyStockChanges({
    lines,
    reason,
    reference: { type: "order", id: stored.id },
    actor: actorOf(req),
    onShortfall,
    record: {
      collection: "orders",
      id: stored.id,
      expect: { fulfillmentStatus: stored.fulfillmentStatus ?? null, paymentStatus: stored.paymentStatus ?? null },
      patch: plan.patch,
    },
  });
  afterStockChange(result.plans);
  for (const entry of orderAuditEntries(plan, { skippedSkus })) audit(req, { ...entry, entity: "order", entityId: stored.id });
  return serializeOrder(result.record);
};

/**
 * POST /admin/orders (COMMERCE_V2 §2.2): an in-store sale of products. A collected sale
 * commits stock and inserts the order in one atomic step (no order on a shortfall).
 */
export const adminCreateOrder = asyncHandler(async (req, res) => {
  const input = inStoreOrderPayload(req.body);
  const products = await findCollectionItems("products", {});
  const priced = priceInStoreOrder(input, new Map(products.map((product) => [product.id, product])));
  const actor = actorOf(req);
  const record = inStoreOrderRecord(input, priced, { id: randomUUID(), actor, timestamp: new Date().toISOString() });

  let order;
  if (input.fulfilment === "collected") {
    const result = await applyStockChanges({
      lines: priced.order.map((line) => ({ productId: line.productId, change: -line.quantity })),
      reason: "sale",
      reference: { type: "order", id: record.id },
      actor,
      onShortfall: insufficientStockForOrder,
      record: { collection: "orders", insert: record },
    });
    afterStockChange(result.plans);
    order = result.record;
  } else {
    order = await createCollectionItem("orders", record);
  }

  for (const entry of inStoreAuditEntries(order)) audit(req, { ...entry, entity: "order", entityId: order.id });
  notify(newOrderNotification(order));
  created(res, "Order created.", serializeOrder(order));
});

export const adminListOrders = asyncHandler(async (req, res) => {
  const matches = orderListFilter(req.query);
  const orders = (await listCollection("orders", { includeInactive: true })).map(serializeOrder).filter(matches);
  ok(res, "Orders retrieved.", orders);
});

export const adminGetOrder = asyncHandler(async (req, res) => {
  const order = await getCollectionItem("orders", req.params.id);
  ok(res, "Order retrieved.", { ...serializeOrder(order), jobs: (await jobsOf(order.id)).map(jobSummary) });
});

export const adminUpdateOrder = asyncHandler(async (req, res) => {
  const stored = await getCollectionItem("orders", req.params.id);
  const changes = orderUpdatePayload(req.body, serializeOrder(stored));
  const jobs = changes.requiresInstallation === false ? await jobsOf(stored.id) : [];
  const plan = planOrderChanges(stored, changes, { jobs, timestamp: new Date().toISOString() });
  ok(res, "Order updated.", await applyOrderPlan(req, stored, plan));
});

export const adminOrderFulfillment = asyncHandler(async (req, res) => {
  const changes = fulfillmentPayload(req.body);
  const stored = await getCollectionItem("orders", req.params.id);
  const plan = planOrderChanges(stored, changes, { timestamp: new Date().toISOString() });
  ok(res, "Fulfilment status updated.", await applyOrderPlan(req, stored, plan));
});

export const adminMarkOrderPaid = asyncHandler(async (req, res) => {
  const changes = markPaidPayload(req.body);
  const stored = await getCollectionItem("orders", req.params.id);
  const plan = planOrderChanges(stored, changes, { timestamp: new Date().toISOString() });
  ok(res, "Order marked as paid.", await applyOrderPlan(req, stored, plan));
});

export const adminAssignOrderEngineer = asyncHandler(async (req, res) => {
  const engineerId = engineerIdPayload(req.body);
  const stored = await getCollectionItem("orders", req.params.id);
  if (engineerId) assertActiveEngineer(await findCollectionItem("admins", { id: engineerId }));
  const order = serializeOrder(stored);
  if (!order.requiresInstallation) throw conflict("Order does not require installation.");

  const plan = planOrderChanges(stored, {}, { timestamp: new Date().toISOString() });
  plan.patch.assignedEngineerId = engineerId;
  const result = await applyStockChanges({
    lines: [],
    record: {
      collection: "orders",
      id: stored.id,
      expect: { fulfillmentStatus: stored.fulfillmentStatus ?? null, assignedEngineerId: stored.assignedEngineerId ?? null },
      patch: plan.patch,
    },
  });
  audit(req, {
    action: "order.assign_engineer",
    entity: "order",
    entityId: stored.id,
    summary: engineerId
      ? `Assigned engineer ${engineerId} to order from ${order.name || order.id}`
      : `Unassigned the engineer from order from ${order.name || order.id}`,
    changes: ["assignedEngineerId"],
  });
  ok(res, engineerId ? "Engineer assigned." : "Engineer unassigned.", serializeOrder(result.record));
});

export const adminDeleteOrder = asyncHandler(async (req, res) => {
  const existing = await getCollectionItem("orders", req.params.id);
  assertOrderDeletable(await jobsOf(existing.id));
  const order = await deleteCollectionItem("orders", existing.id);
  await forgetRecordReads("orders", order.id);
  auditDelete(req, "order", order);
  ok(res, "Order deleted.", serializeOrder(order));
});
