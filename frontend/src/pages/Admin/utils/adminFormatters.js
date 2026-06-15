export const jsonValue = (value) =>
  typeof value === "string" ? value : JSON.stringify(value || [], null, 2);

export const parseMoney = (value) => {
  if (typeof value === "number") return value;
  if (!value) return 0;
  const numeric = String(value).replace(/[^\d.-]/g, "");
  return Number(numeric) || 0;
};

export const formatCurrency = (value) =>
  new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    maximumFractionDigits: 0,
  }).format(value || 0);

export const getOrderRevenue = (order) => {
  const total = parseMoney(order?.total);
  if (total) return total;

  return (order?.order || []).reduce((sum, item) => {
    return sum + parseMoney(item.price) * Number(item.quantity || 1);
  }, 0);
};

export const getStatusCounts = (orders = []) =>
  orders.reduce((counts, order) => {
    const status = order.status || "pending";
    return { ...counts, [status]: (counts[status] || 0) + 1 };
  }, {});

export const getRevenueSeries = (orders = []) => {
  const buckets = orders.reduce((series, order) => {
    const date = new Date(order.receivedAt || order.createdAt || Date.now());
    const key = date.toLocaleDateString("en-NG", {
      month: "short",
      day: "numeric",
    });
    return {
      ...series,
      [key]: (series[key] || 0) + getOrderRevenue(order),
    };
  }, {});

  return Object.entries(buckets).slice(-6);
};
