// STAND-IN (FE-1): FE-2 owns this file (FE_CONVENTIONS §1.1). It exists only so Badge's StatusBadge builds on
// agents/fe-public; it copies the Vite file with the same exported API. Integration keeps FE-2's version.

type StatusMeta = { tone: string; label: string };

export const statusMaps: Record<string, Record<string, StatusMeta>> = {
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

export const defaultStatus: Record<string, string> = {
  order: "pending",
  payment: "unpaid",
  contact: "new",
  newsletter: "active",
  catalog: "active",
};

const toSentenceCase = (value: string) => {
  const text = String(value).replace(/[_-]+/g, " ").trim().toLowerCase();
  return text ? text.charAt(0).toUpperCase() + text.slice(1) : "";
};

export function getStatusMeta(type: string, status?: string | boolean | null): StatusMeta {
  let key: string | boolean | null | undefined = status;
  if (typeof status === "boolean") {
    key = status ? "active" : type === "catalog" ? "hidden" : "inactive";
  }
  if (key == null || key === "") key = defaultStatus[type];
  const normalized = String(key ?? "").toLowerCase();
  return statusMaps[type]?.[normalized] ?? { tone: "neutral", label: toSentenceCase(normalized) || "Unknown" };
}
