import orderTemplate from "../mail/_orderTemplate.js";
import { sendMail } from "../mail/mail.js";
import { asyncHandler } from "../services/asyncHandler.js";
import { badRequest } from "../services/errors.js";
import { created, ok } from "../services/http.js";
import {
  appendCollectionItem,
  getCollectionItem,
  listCollection,
  updateCollectionItem,
} from "../services/store.js";
import { optionalString, requiredString, validateEmail } from "../services/validators.js";

const ORDER_STATUSES = ["pending", "completed", "cancelled"];

const normalizeOrderItems = (items) => {
  if (!Array.isArray(items) || items.length === 0) {
    throw badRequest("At least one order item is required.");
  }

  return items.map((item) => ({
    package: requiredString(item, "package", "Package"),
    type: optionalString(item, "type"),
    kva: optionalString(item, "kva"),
    price: item.price,
    quantity: Number(item.quantity || 1),
  }));
};

export const placeOrder = asyncHandler(async (req, res) => {
  const payload = {
    name: requiredString(req.body, "name", "Name"),
    phoneNumber: requiredString(req.body, "phoneNumber", "Phone number"),
    emailAddress: validateEmail(optionalString(req.body, "emailAddress")),
    deliveryAddress: requiredString(req.body, "deliveryAddress", "Delivery address"),
    order: normalizeOrderItems(req.body.order),
    total: req.body.total,
    status: "pending",
    paymentStatus: "unpaid",
    source: optionalString(req.body, "source") || "client",
  };

  const order = await appendCollectionItem("orders", payload);

  sendMail(
    {
      subject: "You have a new order",
      data: order,
    },
    orderTemplate
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
  const status = req.body.status || "pending";
  if (!ORDER_STATUSES.includes(status)) {
    throw badRequest("Invalid order status.");
  }

  const order = await updateCollectionItem("orders", req.params.id, {
    status,
    paymentStatus: req.body.paymentStatus || "unpaid",
    note: optionalString(req.body, "note"),
    isActive: req.body.isActive ?? true,
  });
  ok(res, "Order updated.", order);
});
