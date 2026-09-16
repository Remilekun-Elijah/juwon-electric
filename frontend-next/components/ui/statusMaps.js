/**
 * Status → { tone, label } maps used by <StatusBadge>. Labels are sentence case.
 * Values mirror backend/controllers/orders.js (ORDER_STATUSES, paymentStatus),
 * contact.js / Admin Operations lead options, and newsletter/catalog isActive flags.
 */
export const statusMaps = {
  order: {
    pending: { tone: "warning", label: "Pending" },
    completed: { tone: "success", label: "Completed" },
    cancelled: { tone: "danger", label: "Cancelled" },
  },
  payment: {
    unpaid: { tone: "neutral", label: "Unpaid" },
    partial: { tone: "info", label: "Partially paid" },
    paid: { tone: "success", label: "Paid" },
    refunded: { tone: "neutral", label: "Refunded" },
  },
  contact: {
    new: { tone: "info", label: "New" },
    contacted: { tone: "success", label: "Contacted" },
    completed: { tone: "neutral", label: "Completed" },
  },
  newsletter: {
    new: { tone: "info", label: "New" },
    active: { tone: "success", label: "Active" },
    inactive: { tone: "neutral", label: "Inactive" },
  },
  catalog: {
    active: { tone: "success", label: "Active" },
    hidden: { tone: "neutral", label: "Hidden" },
    featured: { tone: "brand", label: "Featured" },
  },
};

/** Default status when a record has none. */
export const defaultStatus = {
  order: "pending",
  payment: "unpaid",
  contact: "new",
  newsletter: "active",
  catalog: "active",
};

const toSentenceCase = (value) => {
  const text = String(value).replace(/[_-]+/g, " ").trim().toLowerCase();
  return text ? text.charAt(0).toUpperCase() + text.slice(1) : "";
};

/**
 * Resolve { tone, label } for a status. Booleans map to active/inactive (newsletter) or active/hidden (catalog).
 * Unknown values fall back to a neutral tone with a sentence-cased label.
 */
export function getStatusMeta(type, status) {
  let key = status;
  if (typeof status === "boolean") {
    key = status ? "active" : type === "catalog" ? "hidden" : "inactive";
  }
  if (key == null || key === "") key = defaultStatus[type];
  const normalized = String(key ?? "").toLowerCase();
  return statusMaps[type]?.[normalized] ?? { tone: "neutral", label: toSentenceCase(normalized) || "Unknown" };
}
