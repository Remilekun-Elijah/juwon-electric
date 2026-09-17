"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  Banknote,
  BriefcaseBusiness,
  CircleCheck,
  ClipboardList,
  PackageX,
  ReceiptText,
  UsersRound,
} from "lucide-react";
import {
  Button,
  Card,
  EmptyState,
  ErrorState,
  ListCardHeader,
  Select,
  Skeleton,
  StatCard,
  StatusBadge,
  TBody,
  TD,
  TH,
  THead,
  TR,
  Table,
  TableEmpty,
} from "@/components/ui";
import { compactCurrency, formatCurrency, formatDate } from "@/lib/admin/format";
import { getDashboard, markDashboardPreview, resolveKpis } from "@/lib/api/admin";
import type { Dashboard as DashboardData } from "@/lib/api/types";
import { useAdmin, useAdminQuery } from "../AdminContext";
import { AdminPage } from "../AdminPage";

type Series = { label: string; value: number }[];

function RevenueChart({ series, loading }: { series: Series; loading: boolean }) {
  const max = Math.max(...series.map((item) => item.value), 1);
  const total = series.reduce((sum, item) => sum + item.value, 0);
  const average = series.length ? total / series.length : 0;
  const ticks = [1, 0.5, 0];

  return (
    <Card className="lg:col-span-2">
      <ListCardHeader title="Order value by day" description="Total order value for the last six days with orders." />
      <div className="p-5">
        <dl className="grid grid-cols-2 gap-4 sm:max-w-sm">
          <div>
            <dt className="text-xs text-slate-500">Total</dt>
            <dd className="mt-0.5 text-lg font-semibold tabular-nums text-slate-900">
              {loading ? <Skeleton className="h-6 w-24" /> : formatCurrency(total)}
            </dd>
          </div>
          <div>
            <dt className="text-xs text-slate-500">Daily average</dt>
            <dd className="mt-0.5 text-lg font-semibold tabular-nums text-slate-900">
              {loading ? <Skeleton className="h-6 w-24" /> : formatCurrency(average)}
            </dd>
          </div>
        </dl>

        {loading ? (
          <Skeleton className="mt-6 h-56 w-full" />
        ) : series.length ? (
          <>
            <div className="mt-6 flex h-56 gap-3" aria-hidden="true">
              <div className="flex w-14 shrink-0 flex-col justify-between pb-6 text-right text-[11px] tabular-nums text-slate-400">
                {ticks.map((tick) => (
                  <span key={tick} className="-translate-y-1/2 first:translate-y-0 last:translate-y-0">
                    {compactCurrency(max * tick)}
                  </span>
                ))}
              </div>
              <div className="relative flex min-w-0 flex-1 flex-col">
                <div className="pointer-events-none absolute inset-x-0 bottom-6 top-0 flex flex-col justify-between">
                  {ticks.map((tick) => (
                    <span key={tick} className={tick === 0 ? "border-t border-slate-200" : "border-t border-slate-100"} />
                  ))}
                </div>
                <div className="relative flex flex-1 items-end gap-2 sm:gap-4">
                  {series.map(({ label, value }) => (
                    <div key={label} className="group relative flex h-full min-w-0 flex-1 items-end justify-center">
                      <span className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-1 hidden -translate-x-1/2 whitespace-nowrap rounded-md border border-slate-200 bg-white px-2 py-1 text-xs shadow-elev-4 group-hover:block">
                        <span className="block text-slate-500">{label}</span>
                        <span className="block font-semibold tabular-nums text-slate-900">{formatCurrency(value)}</span>
                      </span>
                      <span
                        className="w-full max-w-[48px] rounded-t-sm bg-brand-500 transition-colors group-hover:bg-brand-700"
                        style={{ height: `${Math.max((value / max) * 100, value ? 2 : 0)}%` }}
                      />
                    </div>
                  ))}
                </div>
                <div className="flex h-6 items-end gap-2 sm:gap-4">
                  {series.map(({ label }) => (
                    <span key={label} className="min-w-0 flex-1 truncate text-center text-[11px] text-slate-400">
                      {label}
                    </span>
                  ))}
                </div>
              </div>
            </div>
            <table className="sr-only">
              <caption>Order value by day</caption>
              <thead>
                <tr>
                  <th scope="col">Day</th>
                  <th scope="col">Order value</th>
                </tr>
              </thead>
              <tbody>
                {series.map(({ label, value }) => (
                  <tr key={label}>
                    <td>{label}</td>
                    <td>{formatCurrency(value)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </>
        ) : (
          <EmptyState
            icon={Banknote}
            title="No order value yet"
            description="Daily totals will show here once customers place orders."
            className="min-h-[224px]"
          />
        )}
      </div>
    </Card>
  );
}

const statusRows = [
  { status: "pending", helper: "Waiting for confirmation or delivery" },
  { status: "completed", helper: "Delivered and closed" },
  { status: "cancelled", helper: "Stopped before delivery" },
];

function OrderStatusCard({ counts, loading, href }: { counts: Record<string, number>; loading: boolean; href?: string }) {
  return (
    <Card>
      <ListCardHeader title="Orders by status" />
      <ul className="divide-y divide-slate-100">
        {statusRows.map(({ status, helper }) => {
          const content = (
            <>
              <span className="min-w-0">
                <StatusBadge type="order" status={status} dot />
                <span className="mt-1.5 block text-xs text-slate-500">{helper}</span>
              </span>
              {loading ? (
                <Skeleton className="h-7 w-10" />
              ) : (
                <span className="text-2xl font-bold tabular-nums text-slate-900">{counts[status] || 0}</span>
              )}
            </>
          );
          const classes = "flex w-full items-center justify-between gap-3 px-5 py-4 text-left";
          return (
            <li key={status}>
              {href ? (
                <Link
                  href={href}
                  className={`${classes} transition-colors hover:bg-slate-50 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand-500`}
                >
                  {content}
                </Link>
              ) : (
                <div className={classes}>{content}</div>
              )}
            </li>
          );
        })}
      </ul>
    </Card>
  );
}

const PERIODS = [
  { value: "7", label: "Last 7 days" },
  { value: "30", label: "Last 30 days" },
  { value: "90", label: "Last 90 days" },
  { value: "365", label: "Last 12 months" },
];

const periodRange = (days: number) => {
  const to = new Date();
  const from = new Date(to.getTime() - days * 24 * 60 * 60 * 1000);
  return { from: from.toISOString(), to: to.toISOString() };
};

export function Dashboard() {
  const { can, notifications } = useAdmin();
  const [period, setPeriod] = useState("30");
  const range = useMemo(() => periodRange(Number(period)), [period]);
  const query = useAdminQuery<DashboardData>(`dashboard:${period}`, () => getDashboard(range).then((r) => r.data || {}), {
    enabled: can("dashboard:read"),
  });

  const dashboard = query.data || {};
  const stats = dashboard.stats || {};
  const isLoading = query.initialLoading;
  const resolved = query.data ? resolveKpis(dashboard, notifications.orders) : null;
  const kpis = resolved?.kpis;
  const preview = Boolean(resolved?.preview);
  // Without contract KPIs (and preview off) the cards say so instead of showing zeros.
  const kpisMissing = Boolean(resolved && !resolved.available);
  const kpiValue = (value: string | number | undefined) => (kpisMissing ? "—" : value ?? 0);

  useEffect(() => {
    if (preview) markDashboardPreview();
  }, [preview]);
  const ordersHref = can("orders:read") ? "/admin/orders" : undefined;
  const recentOrders = dashboard.recentOrders || [];

  if (!query.data && query.error) {
    return (
      <AdminPage module="dashboard">
        <ErrorState
          standalone
          title="The dashboard couldn’t be loaded"
          description={query.error}
          onRetry={query.reload}
          retrying={query.loading}
        />
      </AdminPage>
    );
  }

  return (
    <AdminPage
      module="dashboard"
      error={query.data ? query.error : undefined}
      onRetry={query.reload}
      retrying={query.loading}
      previewAreas={["dashboard"]}
      actions={
        <Select
          aria-label="Reporting period"
          className="w-44"
          value={period}
          onChange={(event) => setPeriod(event.target.value)}
          options={PERIODS}
        />
      }
    >
      <div className="space-y-6">
        <section aria-labelledby="kpi-heading" className="space-y-3">
          <h2 id="kpi-heading" className="text-sm font-semibold text-slate-700">
            {PERIODS.find((item) => item.value === period)?.label}
          </h2>
          {kpisMissing && (
            <p className="text-sm text-slate-500">
              Period figures need a server update that isn’t available yet. The totals below are unaffected.
            </p>
          )}
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
            <StatCard
              label="Revenue"
              value={kpiValue(kpis ? formatCurrency(kpis.revenue) : undefined)}
              helper="Paid and part-paid orders in this period"
              icon={Banknote}
              loading={isLoading}
            />
            <StatCard
              label="Open orders"
              value={kpiValue(kpis?.openOrders)}
              helper="Pending, processing or out for delivery"
              icon={ReceiptText}
              href={ordersHref}
              linkLabel="View orders"
              loading={isLoading}
            />
            <StatCard
              label="Low-stock items"
              value={kpiValue(kpis?.lowStockItems)}
              helper="Active products at or below reorder level"
              icon={PackageX}
              tone={kpis?.lowStockItems ? "warning" : "brand"}
              href={can("inventory:read") ? "/admin/inventory" : undefined}
              linkLabel="View stock"
              loading={isLoading}
            />
            <StatCard
              label="Open vacancies"
              value={kpiValue(kpis?.openVacancies)}
              helper="Live on the careers page"
              icon={BriefcaseBusiness}
              href={can("vacancies:read") ? "/admin/vacancies" : undefined}
              linkLabel="View vacancies"
              loading={isLoading}
            />
            <StatCard
              label="Upcoming jobs"
              value={kpiValue(kpis?.upcomingJobs)}
              helper="Installations scheduled in the next 7 days"
              icon={ClipboardList}
              href={can("jobs:read") ? "/admin/installations" : undefined}
              linkLabel="View jobs"
              loading={isLoading}
            />
          </div>
        </section>

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard
            label="Total revenue"
            value={formatCurrency(stats.totalRevenue)}
            helper="Value of all orders received"
            icon={Banknote}
            loading={isLoading}
          />
          <StatCard
            label="Orders"
            value={stats.orderCount || 0}
            helper={`${stats.pendingOrders || 0} pending`}
            icon={ReceiptText}
            href={ordersHref}
            linkLabel="View orders"
            loading={isLoading}
          />
          <StatCard
            label="Completed orders"
            value={stats.completedOrders || 0}
            helper="Delivered and closed"
            icon={CircleCheck}
            loading={isLoading}
          />
          <StatCard
            label="Leads"
            value={stats.leadCount || 0}
            helper={
              stats.contactCount != null
                ? `${stats.contactCount} messages, ${stats.subscriberCount || 0} subscribers`
                : "Messages and newsletter subscribers"
            }
            icon={UsersRound}
            href={can("leads:read") ? "/admin/contacts" : undefined}
            linkLabel="View messages"
            loading={isLoading}
          />
        </div>

        <div className="grid gap-4 lg:grid-cols-3">
          <RevenueChart series={dashboard.revenueSeries || []} loading={isLoading} />
          <OrderStatusCard counts={dashboard.statusCounts || {}} loading={isLoading} href={ordersHref} />
        </div>

        <Table
          aria-label="Recent orders"
          header={
            <ListCardHeader
              title="Recent orders"
              description="The five most recent orders."
              actions={
                ordersHref && (
                  <Button as={Link} href={ordersHref} variant="outline" size="sm">
                    View all orders
                    <ArrowRight aria-hidden="true" />
                  </Button>
                )
              }
            />
          }
        >
          <THead>
            <TH>Customer</TH>
            <TH className="hidden md:table-cell">Date</TH>
            <TH align="right">Total</TH>
            <TH>Status</TH>
          </THead>
          <TBody>
            {isLoading &&
              Array.from({ length: 4 }, (_, index) => (
                <TR key={index}>
                  <TD colSpan={4}>
                    <Skeleton className="h-9 w-full" />
                  </TD>
                </TR>
              ))}
            {!isLoading &&
              recentOrders.map((order) => (
                <TR key={order.id}>
                  <TD className="max-w-[220px]">
                    <p className="truncate font-medium text-slate-900">{order.name}</p>
                    <p className="truncate text-sm text-slate-500">{order.phoneNumber || "No phone"}</p>
                  </TD>
                  <TD className="hidden whitespace-nowrap md:table-cell">{formatDate(order.receivedAt)}</TD>
                  <TD align="right" className="whitespace-nowrap font-medium tabular-nums text-slate-900">
                    {formatCurrency(order.revenue)}
                  </TD>
                  <TD>
                    <StatusBadge type="order" status={order.status} />
                  </TD>
                </TR>
              ))}
            {!isLoading && !recentOrders.length && (
              <TableEmpty
                colSpan={4}
                icon={ReceiptText}
                title="No orders yet"
                description="Orders placed on the shop will show up here."
              />
            )}
          </TBody>
        </Table>
      </div>
    </AdminPage>
  );
}
