"use client";

import { useState } from "react";
import { CalendarDays, ChevronDown, Mail, MapPin, Package, PackageSearch, Phone, Store, Trash2, UserRound } from "lucide-react";
import { useAdmin } from "@/components/admin/AdminContext";
import { DetailList } from "@/components/admin/DetailList";
import { Alert, Button, Field, LoadingState, Textarea } from "@/components/ui";
import { formatCurrency, formatDateTime, getOrderRevenue, getRecordDate, parseMoney } from "@/lib/admin/format";
import { updateOrder } from "@/lib/api/admin";
import type { Order, OrderLine } from "@/lib/api/types";
import { LIMITS } from "@/lib/validation";
import { OrderInstallation } from "./OrderInstallation";
import { OrderStatusPanel } from "./OrderStatusPanel";
import { ChannelBadge, orderChannel } from "./orderStatus";
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
/** Commerce v2 §1.3: lines without `type` are package lines. */
const isProductLine = (line: OrderLine) => line.type === "product";

function OrderLineItem({ line }: { line: OrderLine }) {
  const quantity = Number(line.quantity || 1);
  const unitPrice = lineUnitPrice(line);
  const lineTotal = typeof line.lineTotal === "number" ? line.lineTotal : unitPrice * quantity;
  const product = isProductLine(line);
  const components = Array.isArray(line.components) ? line.components : [];
  const Icon = product ? PackageSearch : Package;

  return (
    <li className="px-4 py-3">
      <div className="flex items-start gap-3">
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-brand-50 text-brand-700">
          <Icon aria-hidden="true" className="h-4 w-4" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="break-words text-sm font-medium text-slate-900">{lineName(line)}</p>
          {product ? (
            line.sku && <p className="font-mono text-xs text-slate-500">{line.sku}</p>
          ) : (
            lineDetail(line) && <p className="text-xs text-slate-500">{lineDetail(line)}</p>
          )}
        </div>
        <div className="shrink-0 text-right">
          <p className="text-sm font-medium tabular-nums text-slate-900">{formatCurrency(lineTotal)}</p>
          <p className="text-xs tabular-nums text-slate-500">
            {formatCurrency(unitPrice)} × {quantity}
          </p>
        </div>
      </div>
      {!product && components.length > 0 && (
        <details className="group mt-2 pl-12">
          <summary className="flex min-h-8 cursor-pointer list-none items-center gap-1 text-xs font-medium text-brand-700 hover:underline focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-brand-500 [&::-webkit-details-marker]:hidden">
            <ChevronDown aria-hidden="true" className="h-3.5 w-3.5 transition-transform group-open:rotate-180" />
            Products in this package ({components.length})
          </summary>
          <ul className="mt-1 space-y-1 rounded-lg bg-slate-50 px-3 py-2">
            {components.map((component, index) => (
              <li key={`${component.productId}-${index}`} className="flex items-start justify-between gap-3 text-xs">
                <span className="min-w-0">
                  <span className="text-slate-700">
                    {component.quantity} × {component.name}
                  </span>{" "}
                  <span className="font-mono text-slate-500">{component.sku}</span>
                </span>
                <span className="shrink-0 tabular-nums text-slate-500">{formatCurrency(component.unitPrice)} each</span>
              </li>
            ))}
            <li className="pt-1 text-[11px] text-slate-500">Per package, as priced when the order was placed.</li>
          </ul>
        </details>
      )}
    </li>
  );
}

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
      <OrderStatusPanel key={order.id} order={order} canUpdate={canUpdate} onChange={onChange} onReload={onReload} />

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
            { label: "Channel", icon: Store, value: <ChannelBadge channel={orderChannel(order)} /> },
            ...(order.createdBy
              ? [{ label: "Recorded by", icon: UserRound, value: order.createdBy.email || "Staff member" }]
              : []),
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
            {items.map((item, index) => (
              <OrderLineItem key={`${lineName(item)}-${index}`} line={item} />
            ))}
            {(typeof order.subtotal === "number" || order.discount) && (
              <li className="space-y-1.5 px-4 py-3 text-sm">
                {typeof order.subtotal === "number" && (
                  <p className="flex items-center justify-between gap-3">
                    <span className="text-slate-600">Subtotal</span>
                    <span className="tabular-nums text-slate-900">{formatCurrency(order.subtotal)}</span>
                  </p>
                )}
                {order.discount && order.discount.amount > 0 && (
                  <div className="flex items-start justify-between gap-3">
                    <span className="min-w-0 text-slate-600">
                      Discount
                      {order.discount.reason && (
                        <span className="block break-words text-xs text-slate-500">{order.discount.reason}</span>
                      )}
                    </span>
                    <span className="shrink-0 tabular-nums text-red-700">−{formatCurrency(order.discount.amount)}</span>
                  </div>
                )}
              </li>
            )}
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
        <OrderNote key={order.id} order={order} onChange={onChange} onReload={onReload} />
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

function OrderNote({
  order,
  onChange,
  onReload,
}: {
  order: Order;
  onChange: (order: Order) => void;
  onReload: () => Promise<void>;
}) {
  const [note, setNote] = useState(order.note || "");
  const { busy, run } = useOrderAction(onChange, onReload);
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
