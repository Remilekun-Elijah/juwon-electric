/**
 * Status enums, labels and allowed transitions from API_CONTRACT_V3 (§3, §6.2, §7.1).
 * The UI uses these to offer only valid next steps; the server re-checks every transition.
 */
import type { FulfillmentStatus, JobStatus, PaymentStatus, VacancyStatus } from "@/lib/api/types";

export const FULFILLMENT_TRANSITIONS: Record<FulfillmentStatus, readonly FulfillmentStatus[]> = {
  pending: ["processing", "cancelled"],
  processing: ["out_for_delivery", "delivered", "cancelled"],
  out_for_delivery: ["delivered", "cancelled"],
  delivered: ["installed"],
  installed: [],
  cancelled: [],
};

/** Next fulfilment statuses, mirroring backend/shared/orders.js: in-store sales may also go delivered -> cancelled (a return). */
export const allowedFulfillmentTransitions = (order: {
  fulfillmentStatus: FulfillmentStatus;
  channel?: string | null;
}): readonly FulfillmentStatus[] => {
  const base = FULFILLMENT_TRANSITIONS[order.fulfillmentStatus] ?? [];
  return order.channel === "in_store" && order.fulfillmentStatus === "delivered" ? [...base, "cancelled"] : base;
};

export const PAYMENT_TRANSITIONS: Record<PaymentStatus, readonly PaymentStatus[]> = {
  pending: ["partial", "paid", "failed"],
  partial: ["paid", "refunded", "failed"],
  failed: ["pending", "partial", "paid"],
  paid: ["refunded"],
  refunded: [],
};

/** Admin job transitions. `assigned` and `unassigned` are reached through assign, not the status endpoint. */
export const JOB_TRANSITIONS: Record<JobStatus, readonly JobStatus[]> = {
  unassigned: ["assigned", "cancelled"],
  assigned: ["unassigned", "in_progress", "cancelled"],
  in_progress: ["completed", "cancelled"],
  completed: [],
  cancelled: [],
};

/** What an engineer may do from `/admin/me/jobs`. */
export const ENGINEER_JOB_TRANSITIONS: Partial<Record<JobStatus, JobStatus>> = {
  assigned: "in_progress",
  in_progress: "completed",
};

export const VACANCY_TRANSITIONS: Record<VacancyStatus, readonly VacancyStatus[]> = {
  draft: ["open"],
  open: ["draft", "closed"],
  closed: ["open", "draft"],
};

export const fulfillmentLabels: Record<FulfillmentStatus, string> = {
  pending: "Pending",
  processing: "Processing",
  out_for_delivery: "Out for delivery",
  delivered: "Delivered",
  installed: "Installed",
  cancelled: "Cancelled",
};

export const paymentLabels: Record<PaymentStatus, string> = {
  pending: "Unpaid",
  partial: "Part-paid",
  paid: "Paid",
  failed: "Failed",
  refunded: "Refunded",
};

export const jobStatusLabels: Record<JobStatus, string> = {
  unassigned: "Unassigned",
  assigned: "Assigned",
  in_progress: "In progress",
  completed: "Completed",
  cancelled: "Cancelled",
};

export const vacancyStatusLabels: Record<VacancyStatus, string> = {
  draft: "Draft",
  open: "Open",
  closed: "Closed",
};

/** Contract §6.4 input alias: legacy `unpaid` reads as `pending`. */
export const normalizePaymentStatus = (value: unknown): PaymentStatus => {
  if (value === "unpaid" || value == null || value === "") return "pending";
  return (Object.keys(PAYMENT_TRANSITIONS) as PaymentStatus[]).includes(value as PaymentStatus)
    ? (value as PaymentStatus)
    : "pending";
};

/** Pre-backfill orders only have legacy `status` (contract §6.1 backfill table). */
export const normalizeFulfillmentStatus = (order: { fulfillmentStatus?: unknown; status?: unknown }): FulfillmentStatus => {
  const value = order.fulfillmentStatus;
  if (typeof value === "string" && value in FULFILLMENT_TRANSITIONS) return value as FulfillmentStatus;
  if (order.status === "completed") return "delivered";
  if (order.status === "cancelled") return "cancelled";
  return "pending";
};
