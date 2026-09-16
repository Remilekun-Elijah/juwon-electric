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

const toDate = (value) => {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

export const formatDate = (value) => {
  const date = toDate(value);
  return date
    ? date.toLocaleDateString("en-NG", { day: "numeric", month: "short", year: "numeric" })
    : "—";
};

export const formatDateTime = (value) => {
  const date = toDate(value);
  return date
    ? date.toLocaleString("en-NG", {
        day: "numeric",
        month: "short",
        year: "numeric",
        hour: "numeric",
        minute: "2-digit",
      })
    : "—";
};

export const getRecordDate = (item) => item?.receivedAt || item?.createdAt;

export const matchesQuery = (query, ...values) => {
  const needle = query.trim().toLowerCase();
  if (!needle) return true;
  return values.some((value) => String(value ?? "").toLowerCase().includes(needle));
};
