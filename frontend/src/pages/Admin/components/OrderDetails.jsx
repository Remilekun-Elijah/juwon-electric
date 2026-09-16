/* eslint-disable react/prop-types */
import { CalendarDays, Mail, MapPin, Package, Phone } from "lucide-react";
import { Alert, Field, LoadingState, Select, StatusBadge } from "../../../components/ui";
import { orderStatusOptions } from "../constants/adminConstants";
import { formatCurrency, formatDateTime, getOrderRevenue, getRecordDate, parseMoney } from "../utils/adminFormatters";
import DetailList from "./DetailList";

const linkClasses = "text-brand-600 hover:text-brand-700 hover:underline underline-offset-4";

export const OrderDetails = ({ order, loading, error, updating, onStatusChange }) => {
  if (loading) {
    return <LoadingState title="Loading order" className="min-h-[320px]" />;
  }

  if (error) {
    return <Alert tone="danger" title="Couldn’t load this order">{error}</Alert>;
  }

  if (!order) return null;

  const items = order.order || [];
  const status = order.status || "pending";

  return (
    <>
      <div className="flex flex-wrap items-center gap-2">
        <StatusBadge type="order" status={status} dot />
        <StatusBadge type="payment" status={order.paymentStatus} />
      </div>

      <Field label="Order status" helper="The customer isn’t notified when you change this.">
        <Select
          value={status}
          options={orderStatusOptions}
          disabled={updating}
          onChange={(event) => onStatusChange(order, event.target.value)}
        />
      </Field>

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
              const unitPrice = parseMoney(item.price);
              return (
                <li key={`${item.package}-${index}`} className="flex items-start gap-3 px-4 py-3">
                  <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-brand-50 text-brand-700">
                    <Package aria-hidden="true" className="h-4 w-4" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="break-words text-sm font-medium text-slate-900">{item.package}</p>
                    <p className="text-xs text-slate-500">{item.type || item.kva}</p>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="text-sm font-medium tabular-nums text-slate-900">{formatCurrency(unitPrice * quantity)}</p>
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

      {order.note && (
        <section>
          <h3 className="text-sm font-semibold text-slate-900">Note</h3>
          <p className="mt-2 whitespace-pre-line text-sm text-slate-600">{order.note}</p>
        </section>
      )}
    </>
  );
};

export default OrderDetails;
