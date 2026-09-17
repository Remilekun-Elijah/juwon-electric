// Dashboard KPIs (API_CONTRACT_V3 §9). Runtime-agnostic scenario; returns the transcript.
import assert from "node:assert/strict";
import { recorder } from "./opsKit.js";

const DAY = 24 * 60 * 60 * 1000;
const at = (offsetDays) => new Date(Date.now() + offsetDays * DAY).toISOString();

// The default period ends "now", which differs per run: compare the KPI values only.
const kpiValues = (body) => {
  const { period: _period, ...values } = body?.data?.kpis || {};
  return { message: body?.message, values };
};

export const runDashboardScenario = async (client) => {
  const { transcript, expect } = recorder(client);
  const hr = await client.seedAdmin("hr");
  const engineer = await client.seedAdmin("engineer");

  const order = (fields) => client.seedRecord("orders", { name: "KPI", ...fields });
  await order({ receivedAt: at(-1), totalAmount: 1000, total: "₦1,000", paymentStatus: "paid", fulfillmentStatus: "delivered", status: "completed" });
  await order({ receivedAt: at(-2), total: "₦500", paymentStatus: "partial", fulfillmentStatus: "processing", status: "pending" });
  await order({ receivedAt: at(-3), totalAmount: 7000, paymentStatus: "paid", fulfillmentStatus: "cancelled", status: "cancelled" });
  await order({ receivedAt: at(-4), totalAmount: 9000, paymentStatus: "unpaid", status: "pending" });
  await order({ receivedAt: at(-60), totalAmount: 250, paymentStatus: "paid", fulfillmentStatus: "out_for_delivery", status: "pending" });

  await client.seedRecord("products", { sku: "KPI-1", name: "Low", status: "active", stockQuantity: 1, reorderLevel: 2 });
  await client.seedRecord("products", { sku: "KPI-2", name: "Hidden low", status: "hidden", stockQuantity: 0, reorderLevel: 0 });
  await client.seedRecord("products", { sku: "KPI-3", name: "Fine", status: "active", stockQuantity: 9, reorderLevel: 2 });

  await client.seedRecord("vacancies", { title: "Open role", slug: "open-role", status: "open" });
  await client.seedRecord("vacancies", { title: "Draft role", slug: "draft-role", status: "draft" });

  const job = (fields) => client.seedRecord("installationJobs", { orderId: "x", ...fields });
  await job({ status: "assigned", scheduledAt: at(2) });
  await job({ status: "unassigned", scheduledAt: at(6) });
  await job({ status: "unassigned", scheduledAt: at(10) });
  await job({ status: "in_progress", scheduledAt: at(1) });
  await job({ status: "assigned", scheduledAt: at(-1) });
  await job({ status: "assigned", scheduledAt: null });

  const dashboard = (await expect("dashboard with kpis", "GET", "/admin/dashboard", { token: hr.token, project: kpiValues }, 200, "Dashboard retrieved.")).body.data;
  assert.ok(dashboard.stats && dashboard.statusCounts && dashboard.revenueSeries && dashboard.recentOrders, "existing keys unchanged");
  const { period, ...values } = dashboard.kpis;
  assert.deepEqual(values, { revenue: 1500, openOrders: 3, lowStockItems: 1, openVacancies: 1, upcomingJobs: 2 });
  assert.ok(Date.parse(period.to) - Date.parse(period.from) === 30 * DAY);

  const wide = (
    await expect("explicit period", "GET", "/admin/dashboard?from=2000-01-01&to=2000-12-31", { project: (body) => ({ kpis: body?.data?.kpis }) }, 200)
  ).body.data;
  assert.deepEqual(wide.kpis.period, { from: "2000-01-01T00:00:00.000Z", to: "2000-12-31T00:00:00.000Z" });
  assert.equal(wide.kpis.revenue, 0);

  const withOld = (await expect("from only", "GET", `/admin/dashboard?from=${at(-90).slice(0, 10)}`, { project: kpiValues }, 200)).body.data;
  assert.equal(withOld.kpis.revenue, 1750);

  await expect("bad from", "GET", "/admin/dashboard?from=yesterday", {}, 400, "from must be a valid date.");
  await expect("bad to", "GET", "/admin/dashboard?to=2026-13-45", {}, 400, "to must be a valid date.");
  await expect("range too long", "GET", "/admin/dashboard?from=2020-01-01&to=2022-01-01", {}, 400, "Date range must be 366 days or fewer.");
  await expect("from after to", "GET", "/admin/dashboard?from=2024-02-01&to=2024-01-01", {}, 400, "from must be before to.");
  await expect("engineer has no dashboard", "GET", "/admin/dashboard", { token: engineer.token }, 403, "You do not have permission to perform this action.");

  return transcript;
};
