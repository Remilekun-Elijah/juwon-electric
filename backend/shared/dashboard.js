// Dashboard KPIs (API_CONTRACT_V3 §9): the additive `kpis` key of GET /admin/dashboard.
// The existing stats, statusCounts, revenueSeries and recentOrders are unchanged.
import { badRequest } from "./errors.js";
import { queryText } from "./fields.js";
import { lowStockProducts } from "./inventory.js";
import { serializeOrder } from "./orders.js";

const DAY_MS = 24 * 60 * 60 * 1000;
const DEFAULT_DAYS = 30;
const MAX_DAYS = 366;

const parseDate = (query, key) => {
  const value = queryText(query, key);
  if (!value) return null;
  const time = /^\d{4}-\d{2}-\d{2}/.test(value) ? new Date(value).getTime() : Number.NaN;
  if (!Number.isFinite(time)) throw badRequest(`${key} must be a valid date.`);
  return time;
};

/**
 * { from, to } (ISO strings) from ?from&to. Defaults: `to` = now, `from` = 30 days before `to`.
 * Validated before any data is read.
 */
export const dashboardPeriod = (query, nowMs) => {
  const fromMs = parseDate(query, "from");
  const toMs = parseDate(query, "to");
  const to = toMs ?? nowMs;
  const from = fromMs ?? to - DEFAULT_DAYS * DAY_MS;
  if (from > to) throw badRequest("from must be before to.");
  if (to - from > MAX_DAYS * DAY_MS) throw badRequest("Date range must be 366 days or fewer.");
  return { from: new Date(from).toISOString(), to: new Date(to).toISOString() };
};

const parseMoney = (value) => {
  if (typeof value === "number") return value;
  if (!value) return 0;
  return Number(String(value).replace(/[^\d.-]/g, "")) || 0;
};

const orderAmount = (order) => (Number.isFinite(Number(order.totalAmount)) && order.totalAmount !== null && order.totalAmount !== undefined ? Number(order.totalAmount) : parseMoney(order.total));

const OPEN_FULFILMENT = ["pending", "processing", "out_for_delivery"];

export const dashboardKpis = ({ orders, products, vacancies, jobs }, period, nowMs) => {
  const normalized = orders.map(serializeOrder);
  const inPeriod = (order) => {
    const placed = String(order.receivedAt || order.createdAt || "");
    return placed >= period.from && placed <= period.to;
  };
  const revenue = normalized
    .filter((order) => inPeriod(order) && order.fulfillmentStatus !== "cancelled" && ["paid", "partial"].includes(order.paymentStatus))
    .reduce((sum, order) => sum + orderAmount(order), 0);
  const now = new Date(nowMs).toISOString();
  const weekAhead = new Date(nowMs + 7 * DAY_MS).toISOString();
  return {
    period,
    revenue,
    openOrders: normalized.filter((order) => OPEN_FULFILMENT.includes(order.fulfillmentStatus)).length,
    lowStockItems: lowStockProducts(products).length,
    openVacancies: vacancies.filter((vacancy) => vacancy.status === "open").length,
    upcomingJobs: jobs.filter(
      (job) => ["unassigned", "assigned"].includes(job.status) && job.scheduledAt && job.scheduledAt >= now && job.scheduledAt <= weekAhead
    ).length,
  };
};
