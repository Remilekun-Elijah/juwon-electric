"use client";

import { useState } from "react";
import { BadgeCheck, CircleX } from "lucide-react";
import { toast } from "sonner";
import { DetailList } from "@/components/admin/DetailList";
import { Alert, Button, ConfirmDialog, Field, Select } from "@/components/ui";
import { formatDateTime } from "@/lib/admin/format";
import { PAYMENT_TRANSITIONS, allowedFulfillmentTransitions, fulfillmentLabels, paymentLabels } from "@/lib/admin/transitions";
import { ApiError, errorDetails, markOrderPaid, setFulfillmentStatus, setOrderPaymentStatus } from "@/lib/api/admin";
import type { FulfillmentStatus, InsufficientStockDetail, Order, PaymentStatus } from "@/lib/api/types";
import { FulfillmentBadge, PaymentBadge, isRefundDue, orderFulfillment, orderPayment } from "./orderStatus";
import { useOrderAction } from "./useOrderAction";

type Props = { order: Order; canUpdate: boolean; onChange: (order: Order) => void; onReload: () => Promise<void> };

const stockIssueOf = (error: unknown) => {
  if (!(error instanceof ApiError) || error.status !== 409) return null;
  const details = errorDetails<InsufficientStockDetail[]>(error);
  return Array.isArray(details) && details.length ? { message: error.message, details } : null;
};

export function OrderStatusPanel({ order, canUpdate, onChange, onReload }: Props) {
  const { busy, run } = useOrderAction(onChange, onReload);
  const [stockIssue, setStockIssue] = useState<{ message: string; details: InsufficientStockDetail[] } | null>(null);
  const [confirmCancel, setConfirmCancel] = useState(false);

  const fulfillment = orderFulfillment(order);
  const payment = orderPayment(order);
  const nextFulfillment = allowedFulfillmentTransitions({ fulfillmentStatus: fulfillment, channel: order.channel }).filter(
    (status) => status !== "installed" || order.requiresInstallation
  );
  const nextPayment = PAYMENT_TRANSITIONS[payment];

  const changeFulfillment = async (status: FulfillmentStatus) => {
    setStockIssue(null);
    await run(
      `fulfillment:${status}`,
      () => setFulfillmentStatus(order, status),
      `Order marked as ${fulfillmentLabels[status].toLowerCase()}`,
      (error) => {
        const issue = stockIssueOf(error);
        if (!issue) return false;
        setStockIssue(issue);
        toast.error(issue.message);
        return true;
      }
    );
    if (status === "cancelled") setConfirmCancel(false);
  };

  const changePayment = (status: PaymentStatus) =>
    run("payment", () => setOrderPaymentStatus(order, status), `Payment marked as ${paymentLabels[status].toLowerCase()}`);

  const markPaid = () => run("mark-paid", () => markOrderPaid(order), "Order marked as paid");

  return (
    <>
      <section aria-labelledby="order-fulfilment-heading" className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 id="order-fulfilment-heading" className="text-sm font-semibold text-slate-900">
            Fulfilment
          </h3>
          <FulfillmentBadge status={fulfillment} dot />
        </div>

        {stockIssue && (
          <Alert tone="danger" title={stockIssue.message} onDismiss={() => setStockIssue(null)}>
            <p>Restock these products, then try again.</p>
            <ul className="mt-2 space-y-1">
              {stockIssue.details.map((item) => (
                <li key={item.productId} className="flex flex-wrap justify-between gap-x-3 tabular-nums">
                  <span className="font-medium">{item.sku}</span>
                  <span>
                    Needs {item.required}, {item.available} available
                  </span>
                </li>
              ))}
            </ul>
          </Alert>
        )}

        {canUpdate && nextFulfillment.length > 0 ? (
          <div className="space-y-2">
            <p className="text-xs text-slate-500">
              Move the order to its next step. Moving it to processing takes its items out of stock.
            </p>
            <div className="flex flex-wrap gap-2">
              {nextFulfillment.map((status) =>
                status === "cancelled" ? (
                  <Button
                    key={status}
                    size="sm"
                    variant="soft-danger"
                    icon={<CircleX aria-hidden="true" />}
                    disabled={Boolean(busy)}
                    onClick={() => setConfirmCancel(true)}
                  >
                    Cancel order
                  </Button>
                ) : (
                  <Button
                    key={status}
                    size="sm"
                    variant="outline"
                    loading={busy === `fulfillment:${status}`}
                    disabled={Boolean(busy)}
                    onClick={() => changeFulfillment(status)}
                  >
                    Mark as {fulfillmentLabels[status].toLowerCase()}
                  </Button>
                )
              )}
            </div>
          </div>
        ) : (
          nextFulfillment.length === 0 && (
            <p className="text-xs text-slate-500">This order is {fulfillmentLabels[fulfillment].toLowerCase()}. No further steps.</p>
          )
        )}
      </section>

      <section aria-labelledby="order-payment-heading" className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 id="order-payment-heading" className="text-sm font-semibold text-slate-900">
            Payment
          </h3>
          <PaymentBadge status={payment} />
        </div>
        {isRefundDue(order) && (
          <Alert tone="warning" title="Refund due">
            This order was cancelled after payment. Refund the customer, then set payment to Refunded.
          </Alert>
        )}

        {canUpdate && nextPayment.length > 0 && (
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
            <Field label="Payment status" className="sm:flex-1">
              {({ id }) => (
                <Select
                  id={id}
                  value={payment}
                  disabled={Boolean(busy)}
                  options={[payment, ...nextPayment].map((value) => ({ value, label: paymentLabels[value] }))}
                  onChange={(event) => {
                    const value = event.target.value as PaymentStatus;
                    if (value !== payment) void changePayment(value);
                  }}
                />
              )}
            </Field>
            {nextPayment.includes("paid") && (
              <Button
                variant="primary"
                icon={<BadgeCheck aria-hidden="true" />}
                loading={busy === "mark-paid"}
                loadingText="Saving…"
                disabled={Boolean(busy)}
                onClick={markPaid}
              >
                Mark as paid
              </Button>
            )}
          </div>
        )}

        <DetailList
          items={[
            { label: "Paid on", value: order.paidAt ? formatDateTime(order.paidAt) : "Not paid yet" },
            {
              label: "Stock",
              value: order.stockCommittedAt ? `Taken out of stock ${formatDateTime(order.stockCommittedAt)}` : "Not taken out of stock",
            },
          ]}
        />
      </section>

      <ConfirmDialog
        open={confirmCancel}
        onClose={() => setConfirmCancel(false)}
        onConfirm={() => changeFulfillment("cancelled")}
        loading={busy === "fulfillment:cancelled"}
        loadingText="Cancelling…"
        title="Cancel order"
        description={`Are you sure you want to cancel the order from “${order.name || "this customer"}”? Any stock taken for it goes back into inventory. This can’t be undone.`}
        confirmLabel="Cancel order"
        cancelLabel="Keep order"
      />
    </>
  );
}
