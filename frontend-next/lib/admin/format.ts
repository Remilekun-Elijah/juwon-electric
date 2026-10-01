/** Formatting helpers shared by admin screens (port of frontend/src/pages/Admin/utils/adminFormatters.js). */

export const parseMoney = (value: unknown): number => {
  if (typeof value === "number") return value;
  if (!value) return 0;
  const numeric = String(value).replace(/[^\d.-]/g, "");
  return Number(numeric) || 0;
};

export const formatCurrency = (value: unknown) =>
  new Intl.NumberFormat("en-NG", { style: "currency", currency: "NGN", maximumFractionDigits: 0 }).format(
    Number(value) || 0
  );

export const compactCurrency = (value: unknown) =>
  new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(Number(value) || 0);

type OrderLike = { total?: unknown; totalAmount?: unknown; order?: { price?: unknown; quantity?: unknown }[] };

export const getOrderRevenue = (order: OrderLike | null | undefined) => {
  const total = parseMoney(order?.totalAmount) || parseMoney(order?.total);
  if (total) return total;
  return (order?.order || []).reduce((sum, item) => sum + parseMoney(item.price) * Number(item.quantity || 1), 0);
};

const toDate = (value: unknown) => {
  if (!value) return null;
  const date = new Date(value as string);
  return Number.isNaN(date.getTime()) ? null : date;
};

export const formatDate = (value: unknown) => {
  const date = toDate(value);
  return date ? date.toLocaleDateString("en-NG", { day: "numeric", month: "short", year: "numeric" }) : "—";
};

export const formatDateTime = (value: unknown) => {
  const date = toDate(value);
  return date
    ? date.toLocaleString("en-NG", { day: "numeric", month: "short", year: "numeric", hour: "numeric", minute: "2-digit" })
    : "—";
};

export const getRecordDate = (item: { receivedAt?: string; createdAt?: string } | null | undefined) =>
  item?.receivedAt || item?.createdAt;

export const matchesQuery = (query: string, ...values: unknown[]) => {
  const needle = query.trim().toLowerCase();
  if (!needle) return true;
  return values.some((value) => String(value ?? "").toLowerCase().includes(needle));
};

export const errorMessage = (error: unknown, fallback = "Something went wrong.") =>
  error instanceof Error && error.message ? error.message : fallback;
