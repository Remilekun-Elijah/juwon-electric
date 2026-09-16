"use client";

import { useState } from "react";
import { CalendarDays, Mail, MapPin, Package, Phone, Trash2 } from "lucide-react";
import { useAdmin } from "@/components/admin/AdminContext";
import { DetailList } from "@/components/admin/DetailList";
import { Alert, Button, Field, LoadingState, Textarea } from "@/components/admin/kit";
import { formatCurrency, formatDateTime, getOrderRevenue, getRecordDate, parseMoney } from "@/lib/admin/format";
import { updateOrder } from "@/lib/api/admin";
import type { Order, OrderLine } from "@/lib/api/types";
import { LIMITS } from "@/lib/validation";
import { OrderInstallation } from "./OrderInstallation";
import { OrderStatusPanel } from "./OrderStatusPanel";
import { useOrderAction } from "./useOrderAction";


const linkClasses = "text-brand-600 hover:text-brand-700 hover:underline underline-offset-4";

type Props = {
  order: Order | null;
  loading: boolean;
  error: string;
  onChange: (order: Order) => void;
  onReload: () => Promise<void>;
  onDelete?: () => void;
};

const text = (value: unknown) => (value == null || value === "" ? "" : String(value));

/** New orders carry `name`/`optionName`; older ones `package`/`type`/`kva`. */
const lineName = (line: OrderLine) => text(line.name) || text(line.package) || "Item";
const lineDetail = (line: OrderLine) => text(line.optionName) || text(line.type) || text(line.kva);
const lineUnitPrice = (line: OrderLine) => (typeof line.unitPrice === "number" ? line.unitPrice : parseMoney(line.price));

export function OrderDetails({ order, loading, error, onChange, onReload, onDelete }: Props) {
  const { can } = useAdmin();

  if (loading) {
    return <LoadingState title="Loading order" className="min-h-[320px]" />;
  }

  if (error) {
    return (
      <Alert tone="danger" title="Couldn’t load this order">
        <p>{error}</p>
      </Alert>
    );
  }

  if (!order) return null;

  const items = order.order || [];
  const canUpdate = can("orders:update");

  return (
    <>
      <OrderStatusPanel key={order.id} order={order} canUpdate={canUpdate} onChange={onChange} />

      <section aria-labelledby="order-customer-heading">
        <h3 id="order-customer-heading" className="text-sm font-semibold text-slate-900">
          Customer
        </h3>
        <DetailList
          className="mt-1"
          items={[
            {
              label: "Phone",
              icon: Phone,
              value: order.phoneNumber ? (
                <a className={linkClasses} href={`tel:${order.phoneNumber}`}>
                  {order.phoneNumber}
                </a>
              ) : (
                "Not provided"
              ),
            },
            {
              label: "Email",
              icon: Mail,
              value: order.emailAddress ? (
                <a className={linkClasses} href={`mailto:${order.emailAddress}`}>
                  {order.emailAddress}
                </a>
              ) : (
                "Not provided"
              ),
            },
            { label: "Placed on", icon: CalendarDays, value: formatDateTime(getRecordDate(order)) },
            { label: "Delivery address", icon: MapPin, value: order.deliveryAddress || "Not provided", full: true },
          ]}
        />
      </section>

      <section aria-labelledby="order-items-heading">
        <h3 id="order-items-heading" className="text-sm font-semibold text-slate-900">
          Items <span className="font-normal text-slate-500">({items.length})</span>
        </h3>
        {items.length ? (
          <ul className="mt-3 divide-y divide-slate-100 rounded-xl border border-slate-200">
            {items.map((item, index) => {
              const quantity = Number(item.quantity || 1);
              const unitPrice = lineUnitPrice(item);
              const lineTotal = typeof item.lineTotal === "number" ? item.lineTotal : unitPrice * quantity;
              return (
                <li key={`${lineName(item)}-${index}`} className="flex items-start gap-3 px-4 py-3">
                  <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-brand-50 text-brand-700">
                    <Package aria-hidden="true" className="h-4 w-4" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="break-words text-sm font-medium text-slate-900">{lineName(item)}</p>
                    {lineDetail(item) && <p className="text-xs text-slate-500">{lineDetail(item)}</p>}
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="text-sm font-medium tabular-nums text-slate-900">{formatCurrency(lineTotal)}</p>
                    <p className="text-xs tabular-nums text-slate-500">
                      {formatCurrency(unitPrice)} × {quantity}
                    </p>
                  </div>
                </li>
              );
            })}
            <li className="flex items-center justify-between gap-3 bg-slate-50 px-4 py-3">
              <span className="text-sm font-medium text-slate-700">Total</span>
              <span className="text-base font-bold tabular-nums text-slate-900">{formatCurrency(getOrderRevenue(order))}</span>
            </li>
          </ul>
        ) : (
          <p className="mt-2 text-sm text-slate-500">This order has no items.</p>
        )}
      </section>

      <OrderInstallation
        key={order.id}
        order={order}
        canUpdate={canUpdate}
        canAssignJobs={can("jobs:assign")}
        onChange={onChange}
        onReload={onReload}
      />

      {canUpdate ? (
        <OrderNote key={order.id} order={order} onChange={onChange} />
      ) : (
        order.note && (
          <section>
            <h3 className="text-sm font-semibold text-slate-900">Note</h3>
            <p className="mt-2 whitespace-pre-line text-sm text-slate-600">{order.note}</p>
          </section>
        )
      )}

      {onDelete && (
        <div className="border-t border-slate-200 pt-4">
          <Button variant="soft-danger" size="sm" icon={<Trash2 aria-hidden="true" />} onClick={onDelete}>
            Delete order
          </Button>
        </div>
      )}
    </>
  );
}

function OrderNote({ order, onChange }: { order: Order; onChange: (order: Order) => void }) {
  const [note, setNote] = useState(order.note || "");
  const { busy, run } = useOrderAction(onChange);
  const changed = note.trim() !== (order.note || "").trim();

  const save = () =>
    run(
      "note",
      async () => {
        const updated = await updateOrder(order, { note: note.trim() });
        return { ...order, ...(updated || {}), note: updated?.note ?? note.trim() };
      },
      "Note saved"
    );

  return (
    <section aria-labelledby="order-note-heading" className="space-y-2">
      <h3 id="order-note-heading" className="text-sm font-semibold text-slate-900">
        Note
      </h3>
      <Field label="Internal note" helper="Only admins see this.">
        {({ id, describedBy }) => (
          <Textarea
            id={id}
            aria-describedby={describedBy}
            rows={3}
            maxLength={LIMITS.orderNote}
            value={note}
            disabled={busy === "note"}
            onChange={(event) => setNote(event.target.value)}
          />
        )}
      </Field>
      <div className="flex justify-end">
        <Button size="sm" onClick={save} disabled={!changed} loading={busy === "note"} loadingText="Saving…">
          Save note
        </Button>
      </div>
    </section>
  );
}
