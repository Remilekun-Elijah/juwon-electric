import orderTemplate from "../mail/_orderTemplate.js";
import { sendMail } from "../mail/mail.js";
import { formatMoney, priceItems } from "./_pricing.js";
import { LIMITS as RATE_LIMITS, enforceLimit } from "../middleware/rateLimit.js";
import { takeTurnstileToken, verifyTurnstile } from "../middleware/turnstile.js";
import { asyncHandler } from "../services/asyncHandler.js";
import { auditDelete, auditUpdate } from "../services/audit.js";
import { created, ok } from "../services/http.js";
import { track } from "../services/runtime.js";
import {
  appendCollectionItem,
  deleteCollectionItem,
  getCollectionItem,
  listCollection,
  updateCollectionItem,
} from "../services/store.js";
import {
  LIMITS,
  optionalBoolean,
  optionalString,
  requiredPhone,
  requiredString,
  enumField,
  validateEmail,
  validatePricingItems,
} from "../services/validators.js";

const ORDER_STATUSES = ["pending", "completed", "cancelled"];
const PAYMENT_STATUSES = ["unpaid", "partial", "paid", "refunded"];

const kvaLabel = (pack) =>
  `${pack.kva}kva ${pack.volt ? `+ ${pack.volt}volt` : ""}`.trim();

const typeLabel = (type) =>
  String(type ?? "").trim().toLowerCase() === "hybrid lithium"
    ? "Hybrid inverter + lithium"
    : `Inverter + ${type}`;

// Prices come from the package catalog; client-sent price/total are ignored.
// Stored items keep the shape the checkout form sends (display labels and
// "₦1,150,000" money strings) so the admin UI and order email keep working.
const priceOrderItems = async (validated) => {
  const packages = await listCollection("packages");
  const priced = priceItems(packages, validated, { kind: "order" });

  const order = priced.map(({ pack, option, unitPrice, quantity, lineTotal }) => ({
    package: option.kits
      ? `${kvaLabel(pack)} inverter with ${option.kits}`
      : `${kvaLabel(pack)} ${pack.name}`,
    type: typeLabel(pack.type),
    kva: kvaLabel(pack),
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
    status: "pending",
    paymentStatus: "unpaid",
    source,
  };

  const order = await appendCollectionItem("orders", payload);

  track(
    sendMail(
      {
        subject: "You have a new order",
        data: order,
      },
      orderTemplate
    )
  );

  created(res, "Order placed successfully.", order);
});

export const adminListOrders = asyncHandler(async (_req, res) => {
  const orders = await listCollection("orders", { includeInactive: true });
  ok(res, "Orders retrieved.", orders);
});

export const adminGetOrder = asyncHandler(async (req, res) => {
  const order = await getCollectionItem("orders", req.params.id);
  ok(res, "Order retrieved.", order);
});

export const adminUpdateOrder = asyncHandler(async (req, res) => {
  const body = req.body || {};
  const existing = await getCollectionItem("orders", req.params.id);
  const status = enumField(body, "status", ORDER_STATUSES, {
    label: "Status",
    existing: existing.status,
  });
  const paymentStatus = enumField(body, "paymentStatus", PAYMENT_STATUSES, {
    label: "Payment status",
    existing: existing.paymentStatus,
  });
  const note =
    body.note === undefined || body.note === null
      ? undefined
      : optionalString(body, "note", { label: "Note", max: LIMITS.note, multiline: true });
  const isActive = optionalBoolean(body, "isActive", undefined);

  // Only the fields that were sent are written (against the fresh record).
  // Stored legacy values stay readable; only new writes are validated.
  const patch = { status, paymentStatus, note, isActive };
  const changedKeys = Object.keys(patch).filter((key) => patch[key] !== undefined);
  const order = await updateCollectionItem("orders", existing.id, patch);
  const statusChanged = status !== undefined && existing.status !== order.status;
  auditUpdate(
    req,
    "order",
    existing,
    order,
    changedKeys,
    statusChanged ? "order.status_change" : "order.update"
  );
  ok(res, "Order updated.", order);
});

export const adminDeleteOrder = asyncHandler(async (req, res) => {
  const existing = await getCollectionItem("orders", req.params.id);
  const order = await deleteCollectionItem("orders", existing.id);
  auditDelete(req, "order", order);
  ok(res, "Order deleted.", order);
});
