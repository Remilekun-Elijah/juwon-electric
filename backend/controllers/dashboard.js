import { asyncHandler } from "../services/asyncHandler.js";
import { ok } from "../services/http.js";
import { listCollection } from "../services/store.js";

const parseMoney = (value) => {
  if (typeof value === "number") return value;
  if (!value) return 0;
  return Number(String(value).replace(/[^\d.-]/g, "")) || 0;
};

const getOrderRevenue = (order) => {
  const total = parseMoney(order?.total);
  if (total) return total;

  return (order?.order || []).reduce(
    (sum, item) => sum + parseMoney(item.price) * Number(item.quantity || 1),
    0
  );
};

const normalizeOrderStatus = (status) =>
  ["completed", "cancelled"].includes(status) ? status : "pending";

const getRevenueSeries = (orders) => {
  const buckets = orders.reduce((series, order) => {
    const date = new Date(order.receivedAt || order.createdAt || Date.now());
    if (Number.isNaN(date.getTime())) return series;
    const key = date.toISOString().slice(0, 10);
    return {
      ...series,
      [key]: (series[key] || 0) + getOrderRevenue(order),
    };
  }, {});

  return Object.entries(buckets)
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(-6)
    .map(([key, value]) => ({
      label: new Date(key).toLocaleDateString("en-NG", {
        month: "short",
        day: "numeric",
        timeZone: "UTC",
      }),
      value,
    }));
};

const getStatusCounts = (orders) =>
  orders.reduce((counts, order) => {
    const status = normalizeOrderStatus(order.status);
    return { ...counts, [status]: (counts[status] || 0) + 1 };
  }, {});

export const adminDashboard = asyncHandler(async (_req, res) => {
  const [orders, contacts, newsletter] = await Promise.all([
    listCollection("orders", { includeInactive: true }),
    listCollection("contacts", { includeInactive: true }),
    listCollection("newsletters", { includeInactive: true }),
  ]);

  const totalRevenue = orders.reduce((sum, order) => sum + getOrderRevenue(order), 0);
  const recentOrders = [...orders]
    .sort(
      (a, b) =>
        new Date(b.receivedAt || b.createdAt || 0) -
        new Date(a.receivedAt || a.createdAt || 0)
    )
    .slice(0, 5)
    .map((order) => ({
      id: order.id,
      name: order.name,
      phoneNumber: order.phoneNumber,
      deliveryAddress: order.deliveryAddress,
      status: normalizeOrderStatus(order.status),
      revenue: getOrderRevenue(order),
      receivedAt: order.receivedAt || order.createdAt,
    }));

  ok(res, "Dashboard retrieved.", {
    stats: {
      totalRevenue,
      orderCount: orders.length,
      pendingOrders: orders.filter((order) => normalizeOrderStatus(order.status) === "pending").length,
      completedOrders: orders.filter((order) => order.status === "completed").length,
      leadCount: contacts.length + newsletter.length,
      contactCount: contacts.length,
      subscriberCount: newsletter.length,
    },
    statusCounts: getStatusCounts(orders),
    revenueSeries: getRevenueSeries(orders),
    recentOrders,
  });
});
