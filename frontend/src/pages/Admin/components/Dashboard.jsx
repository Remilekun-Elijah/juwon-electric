/* eslint-disable react/prop-types */
import { Mail, ShoppingCart, TrendingUp, Work } from "@mui/icons-material";
import { formatCurrency } from "../utils/adminFormatters";

const StatCard = ({ label, value, helper, icon: Icon }) => (
  <div className="admin-dashboard-card">
    <span className="admin-card-icon"><Icon /></span>
    <div>
      <p>{label}</p>
      <strong>{value}</strong>
      <small>{helper}</small>
    </div>
  </div>
);

const TrendChart = ({ revenueSeries, maxRevenue }) => {
  const total = revenueSeries.reduce((sum, item) => sum + item.value, 0);
  const average = revenueSeries.length ? total / revenueSeries.length : 0;

  return (
    <div className="admin-trend">
      <div className="admin-trend-summary">
        <div>
          <span>Tracked value</span>
          <strong>{formatCurrency(total)}</strong>
        </div>
        <div>
          <span>Average</span>
          <strong>{formatCurrency(average)}</strong>
        </div>
      </div>
      <div className="admin-chart">
        {revenueSeries.length ? (
          revenueSeries.map(({ label, value }) => (
            <div key={label} className="admin-chart-bar">
              <em>{formatCurrency(value)}</em>
              <span style={{ height: `${Math.max((value / maxRevenue) * 100, 8)}%` }} />
              <small>{label}</small>
            </div>
          ))
        ) : (
          <p className="admin-empty">Revenue appears here when orders arrive.</p>
        )}
      </div>
    </div>
  );
};

const Dashboard = ({ data, setActive }) => {
  const dashboard = data.dashboard || {};
  const stats = dashboard.stats || {};
  const statusCounts = dashboard.statusCounts || {};
  const revenueSeries = dashboard.revenueSeries || [];
  const maxRevenue = Math.max(...revenueSeries.map((item) => item.value), 1);
  const recentOrders = dashboard.recentOrders || [];

  return (
    <section className="admin-dashboard">
      <div className="admin-dashboard-grid">
        <StatCard
          label="Total Revenue"
          value={formatCurrency(stats.totalRevenue)}
          helper="All captured orders"
          icon={TrendingUp}
        />
        <StatCard
          label="Orders"
          value={stats.orderCount || 0}
          helper={`${stats.pendingOrders || 0} pending`}
          icon={ShoppingCart}
        />
        <StatCard
          label="Completed"
          value={stats.completedOrders || 0}
          helper="Closed sales"
          icon={Work}
        />
        <StatCard
          label="Leads"
          value={stats.leadCount || 0}
          helper="Messages + subscribers"
          icon={Mail}
        />
      </div>

      <div className="admin-dashboard-layout">
        <div className="admin-panel">
          <div className="admin-panel-title">
            <div>
              <span>Revenue</span>
              <h2>Order value trend</h2>
            </div>
          </div>
          <TrendChart revenueSeries={revenueSeries} maxRevenue={maxRevenue} />
        </div>

        <div className="admin-panel">
          <div className="admin-panel-title">
            <div>
              <span>Pipeline</span>
              <h2>Order status</h2>
            </div>
          </div>
          <div className="admin-status-list">
            {["pending", "completed", "cancelled"].map((status) => (
              <button key={status} onClick={() => setActive("orders")}>
                <span className={`admin-chip admin-chip-${status}`}>{status}</span>
                <strong>{statusCounts[status] || 0}</strong>
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="admin-panel">
        <div className="admin-panel-title">
          <div>
            <span>Latest activity</span>
            <h2>Recent orders</h2>
          </div>
          <button className="admin-ghost" onClick={() => setActive("orders")}>
            View orders
          </button>
        </div>
        <div className="admin-table">
          {recentOrders.map((order) => (
            <article key={order.id} className="admin-record">
              <div>
                <strong>{order.name}</strong>
                <span>{order.phoneNumber || order.deliveryAddress}</span>
              </div>
              <strong>{formatCurrency(order.revenue)}</strong>
              <span className={`admin-chip admin-chip-${order.status || "pending"}`}>
                {order.status || "pending"}
              </span>
            </article>
          ))}
          {!recentOrders.length && <p className="admin-empty">No orders yet.</p>}
        </div>
      </div>
    </section>
  );
};

export default Dashboard;
