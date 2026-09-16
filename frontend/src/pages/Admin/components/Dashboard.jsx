/* eslint-disable react/prop-types */
import { ArrowRight, Banknote, CircleCheck, ReceiptText, UsersRound } from "lucide-react";
import {
  Button,
  Card,
  EmptyState,
  ErrorState,
  ListCardHeader,
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
} from "../../../components/ui";
import { formatCurrency, formatDate } from "../utils/adminFormatters";
import AdminPage from "./AdminPage";
import { useAdmin } from "./adminContext";

const compactCurrency = (value) =>
  new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(value || 0);

const RevenueChart = ({ series, loading }) => {
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
                        className="w-full max-w-[48px] rounded-t bg-brand-500 transition-colors group-hover:bg-brand-700"
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
};

const statusRows = [
  { status: "pending", helper: "Waiting for confirmation or delivery" },
  { status: "completed", helper: "Delivered and closed" },
  { status: "cancelled", helper: "Stopped before delivery" },
];

const OrderStatusCard = ({ counts, loading, onView }) => (
  <Card>
    <ListCardHeader title="Orders by status" />
    <ul className="divide-y divide-slate-100">
      {statusRows.map(({ status, helper }) => (
        <li key={status}>
          <button
            type="button"
            onClick={onView}
            className="flex w-full items-center justify-between gap-3 px-5 py-4 text-left transition-colors hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand-500"
          >
            <span className="min-w-0">
              <StatusBadge type="order" status={status} dot />
              <span className="mt-1.5 block text-xs text-slate-500">{helper}</span>
            </span>
            {loading ? (
              <Skeleton className="h-7 w-10" />
            ) : (
              <span className="text-2xl font-bold tabular-nums text-slate-900">{counts[status] || 0}</span>
            )}
          </button>
        </li>
      ))}
    </ul>
  </Card>
);

const Dashboard = ({ data, setActive }) => {
  const { loaded, error, refresh, loading } = useAdmin();
  const dashboard = data.dashboard || {};
  const stats = dashboard.stats || {};
  const statusCounts = dashboard.statusCounts || {};
  const revenueSeries = dashboard.revenueSeries || [];
  const recentOrders = dashboard.recentOrders || [];
  const firstLoad = !loaded.dashboard;
  const isLoading = firstLoad && !error;
  const viewOrders = () => setActive("orders");

  if (firstLoad && error) {
    return (
      <AdminPage module="dashboard" showLoadError={false}>
        <ErrorState
          standalone
          title="The dashboard couldn’t be loaded"
          description={error}
          onRetry={refresh}
          retrying={loading}
        />
      </AdminPage>
    );
  }

  return (
    <AdminPage module="dashboard">
      <div className="space-y-6">
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
            onClick={viewOrders}
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
            onClick={() => setActive("contacts")}
            linkLabel="View messages"
            loading={isLoading}
          />
        </div>

        <div className="grid gap-4 lg:grid-cols-3">
          <RevenueChart series={revenueSeries} loading={isLoading} />
          <OrderStatusCard counts={statusCounts} loading={isLoading} onView={viewOrders} />
        </div>

        <Table
          aria-label="Recent orders"
          header={
            <ListCardHeader
              title="Recent orders"
              description="The five most recent orders."
              actions={
                <Button variant="outline" size="sm" onClick={viewOrders}>
                  View all orders
                  <ArrowRight aria-hidden="true" />
                </Button>
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
                    <p className="truncate text-sm text-slate-500">{order.phoneNumber || order.deliveryAddress}</p>
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
};

export default Dashboard;
