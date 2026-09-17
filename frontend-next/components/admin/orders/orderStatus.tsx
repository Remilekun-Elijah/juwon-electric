import { Badge, type Tone } from "@/components/ui";
import {
  fulfillmentLabels,
  jobStatusLabels,
  normalizeFulfillmentStatus,
  normalizePaymentStatus,
  paymentLabels,
} from "@/lib/admin/transitions";
import type { FulfillmentStatus, JobStatus, Order, OrderChannel, PaymentStatus } from "@/lib/api/types";

const fulfillmentTones: Record<FulfillmentStatus, Tone> = {
  pending: "warning",
  processing: "info",
  out_for_delivery: "brand",
  delivered: "success",
  installed: "success",
  cancelled: "danger",
};

const paymentTones: Record<PaymentStatus, Tone> = {
  pending: "neutral",
  partial: "info",
  paid: "success",
  failed: "danger",
  refunded: "neutral",
};

const jobTones: Record<JobStatus, Tone> = {
  unassigned: "warning",
  assigned: "info",
  in_progress: "brand",
  completed: "success",
  cancelled: "danger",
};

export const channelLabels: Record<OrderChannel, string> = { website: "Website", in_store: "In store" };

/** Commerce v2 §2.2: orders without `channel` came from the website. */
export const orderChannel = (order: Pick<Order, "channel">): OrderChannel =>
  order.channel === "in_store" ? "in_store" : "website";

export function ChannelBadge({ channel }: { channel: OrderChannel }) {
  return <Badge tone={channel === "in_store" ? "info" : "neutral"}>{channelLabels[channel]}</Badge>;
}

export const orderFulfillment = (order: Order) => normalizeFulfillmentStatus(order);
export const orderPayment = (order: Order) => normalizePaymentStatus(order.paymentStatus);

export function FulfillmentBadge({ status, dot }: { status: FulfillmentStatus; dot?: boolean }) {
  return (
    <Badge tone={fulfillmentTones[status]} dot={dot}>
      {fulfillmentLabels[status]}
    </Badge>
  );
}

export function PaymentBadge({ status }: { status: PaymentStatus }) {
  return <Badge tone={paymentTones[status]}>{paymentLabels[status]}</Badge>;
}

export function JobStatusBadge({ status }: { status: JobStatus }) {
  return <Badge tone={jobTones[status] ?? "neutral"}>{jobStatusLabels[status] ?? status}</Badge>;
}
