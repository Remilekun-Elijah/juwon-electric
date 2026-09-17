"use client";

import Link from "next/link";
import { useMemo, useSyncExternalStore } from "react";
import { Box, CheckCircle2, Mail, Package, Phone, ShoppingCart, Truck, Wrench, type LucideIcon } from "lucide-react";
import { Badge, Skeleton, buttonClasses } from "@/components/ui";
import PageIntro from "@/components/storefront/PageIntro";
import { cn } from "@/lib/cn";
import { LAST_ORDER_KEY, phoneNumbers, storeRoutes, telHref } from "@/lib/storefront/routes";
import { storeCard, storeCardPadding, storeContainer, storeLink } from "@/lib/storefront/styles";
import { parseLastOrder } from "./orderPayload";

export type OrderReceivedProps = {
  /** Business contact details from public settings. */
  phone: string;
  email: string;
  gatewayEnabled: boolean;
};

const noopSubscribe = () => () => {};
const readStored = () => {
  try {
    return window.sessionStorage.getItem(LAST_ORDER_KEY);
  } catch {
    return null;
  }
};
/** `undefined` on the server and during hydration, so the page can show a skeleton instead of a wrong empty state. */
const serverSnapshot = () => undefined;

type Step = { title: string; description: string; icon: LucideIcon };

/**
 * Mirrors the backend fulfilment statuses: pending (confirmation call) → processing → out_for_delivery → delivered →
 * installed. Orders without a package don't need installation (Commerce v3 §3.3), so that step is left out.
 */
const steps = (gatewayEnabled: boolean, installation: boolean): Step[] => [
  {
    title: "Confirmation call",
    description: gatewayEnabled
      ? "We call you to confirm your order and delivery address, then send a secure payment link."
      : "We call you to confirm your order and delivery address, and arrange payment.",
    icon: Phone,
  },
  { title: "Processing", description: "We prepare your inverter, batteries and any solar panels from stock.", icon: Package },
  { title: "Out for delivery", description: "Our team brings your order to your address. Delivery within Lagos is free.", icon: Truck },
  { title: "Delivered", description: "Your order arrives and we check that everything is complete.", icon: CheckCircle2 },
  ...(installation
    ? [{ title: "Installation", description: "Our engineers install and test the system, and show you how to use it.", icon: Wrench }]
    : []),
];

const formatPlacedAt = (value: string) => {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? ""
    : new Intl.DateTimeFormat("en-NG", { dateStyle: "medium", timeStyle: "short" }).format(date);
};

const firstName = (name: string) => name.trim().split(/\s+/)[0] || "";

/**
 * `/checkout/success` client island. Reads the summary checkout stored in `sessionStorage["je/last-order"]` and shows
 * the order, what happens next and how to reach us. Nothing stored (a new tab, or storage blocked) shows an empty state.
 */
export default function OrderReceived({ phone, email, gatewayEnabled }: OrderReceivedProps) {
  const raw = useSyncExternalStore(noopSubscribe, readStored, serverSnapshot);
  const order = useMemo(() => (raw === undefined ? undefined : parseLastOrder(raw)), [raw]);
  const numbers = phoneNumbers(phone);

  const contact = (
    <section aria-labelledby="order-contact-heading" className={cn(storeCard, storeCardPadding)}>
      <h2 id="order-contact-heading" className="text-base font-semibold text-slate-900">
        Questions about your order?
      </h2>
      <p className="mt-1 text-sm text-slate-500">Call or email us and mention the name you ordered with.</p>
      <ul className="mt-4 space-y-1 text-sm">
        {numbers.map((number) => (
          <li key={number}>
            <a href={telHref(number)} className={cn(storeLink, "inline-flex min-h-11 items-center gap-2 tabular-nums")}>
              <Phone aria-hidden="true" className="h-4 w-4" />
              {number}
            </a>
          </li>
        ))}
        {email && (
          <li>
            <a href={`mailto:${email}`} className={cn(storeLink, "inline-flex min-h-11 items-center gap-2 break-all")}>
              <Mail aria-hidden="true" className="h-4 w-4" />
              {email}
            </a>
          </li>
        )}
      </ul>
    </section>
  );

  if (order === undefined) {
    return (
      <>
        <PageIntro eyebrow="Checkout" title="Order confirmation" />
        <div className={cn(storeContainer, "py-8 sm:py-12")} aria-busy="true">
          <p className="sr-only" role="status">
            Loading your order
          </p>
          <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_380px]">
            <Skeleton className="h-80 w-full rounded-2xl" />
            <Skeleton className="h-56 w-full rounded-2xl" />
          </div>
        </div>
      </>
    );
  }

  if (order === null) {
    return (
      <>
        <PageIntro
          eyebrow="Checkout"
          title="No recent order to show"
          description="We couldn’t find an order placed in this browser tab. If you placed one, we’ve received it and will call you to confirm."
        />
        <div className={cn(storeContainer, "grid gap-6 py-8 sm:py-12 lg:grid-cols-[minmax(0,1fr)_380px] lg:items-start")}>
          <section aria-labelledby="order-empty-heading" className={cn(storeCard, "flex flex-col items-center px-6 py-12 text-center")}>
            <span className="grid h-12 w-12 place-items-center rounded-xl bg-brand-50 text-brand-700">
              <ShoppingCart aria-hidden="true" className="h-6 w-6" />
            </span>
            <h2 id="order-empty-heading" className="mt-4 text-xl font-semibold tracking-tight text-slate-900">
              Looking for a package?
            </h2>
            <p className="mt-2 max-w-md text-sm text-slate-600">Browse our inverter packages, or check your cart if you haven’t placed your order yet.</p>
            <div className="mt-6 flex w-full flex-col justify-center gap-3 sm:w-auto sm:flex-row">
              <Link href={storeRoutes.packages} className={buttonClasses({ size: "lg" })}>
                <Package aria-hidden="true" />
                Shop packages
              </Link>
              <Link href={storeRoutes.cart} className={buttonClasses({ variant: "outline", size: "lg" })}>
                Go to cart
              </Link>
            </div>
          </section>
          {contact}
        </div>
      </>
    );
  }

  const placedAt = formatPlacedAt(order.placedAt);
  const greeting = firstName(order.name);

  return (
    <>
      <PageIntro
        eyebrow="Checkout"
        title="Order received"
        description={`Thank you${greeting ? `, ${greeting}` : ""}. We’ve received your order and will call you shortly to confirm it.`}
      />
      <div className={cn(storeContainer, "grid gap-6 py-8 sm:py-12 lg:grid-cols-[minmax(0,1fr)_380px] lg:items-start")}>
        <div className="space-y-6">
          <section aria-labelledby="order-details-heading" className={cn(storeCard, storeCardPadding)}>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 id="order-details-heading" className="text-base font-semibold text-slate-900">
                  Your order
                </h2>
                {placedAt && <p className="mt-1 text-sm text-slate-500">Placed {placedAt}</p>}
              </div>
              <Badge tone="warning" dot>
                Awaiting confirmation
              </Badge>
            </div>

            <ul className="mt-4 divide-y divide-slate-100 rounded-xl border border-slate-200">
              {order.items.map(([label, quantity, kind], index) => (
                <li key={`${label}-${index}`} className="flex items-start gap-3 px-4 py-3">
                  <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-brand-50 text-brand-700">
                    {kind === "product" ? <Box aria-hidden="true" className="h-4 w-4" /> : <Package aria-hidden="true" className="h-4 w-4" />}
                  </span>
                  <p className="min-w-0 flex-1 break-words pt-2 text-sm font-medium text-slate-900">{label}</p>
                  <p className="shrink-0 pt-2 text-sm tabular-nums text-slate-500">× {quantity}</p>
                </li>
              ))}
              <li className="flex items-center justify-between gap-3 bg-slate-50 px-4 py-3">
                <span className="text-sm font-medium text-slate-700">Total</span>
                <span className="text-base font-bold tabular-nums text-slate-900">{order.total}</span>
              </li>
            </ul>
          </section>

          <section aria-labelledby="order-next-heading" className={cn(storeCard, storeCardPadding)}>
            <h2 id="order-next-heading" className="text-base font-semibold text-slate-900">
              What happens next
            </h2>
            <ol className="mt-5">
              {steps(gatewayEnabled, order.items.some((item) => item[2] !== "product")).map((step, index, all) => {
                const Icon = step.icon;
                const current = index === 0;
                const last = index === all.length - 1;
                return (
                  <li key={step.title} aria-current={current ? "step" : undefined} className="relative flex gap-4 pb-6 last:pb-0">
                    {!last && <span aria-hidden="true" className="absolute left-[19px] top-10 bottom-0 w-px bg-slate-200" />}
                    <span
                      className={cn(
                        "relative grid h-10 w-10 shrink-0 place-items-center rounded-full border",
                        current ? "border-brand-600 bg-brand-600 text-white" : "border-slate-200 bg-white text-slate-500"
                      )}
                    >
                      <Icon aria-hidden="true" className="h-4 w-4" />
                    </span>
                    <div className="min-w-0 pt-1.5">
                      <p className="flex flex-wrap items-center gap-2 text-sm font-semibold text-slate-900">
                        <span>
                          <span className="sr-only">Step {index + 1}: </span>
                          {step.title}
                        </span>
                        {current && <Badge tone="brand">Next</Badge>}
                      </p>
                      <p className="mt-1 text-sm leading-relaxed text-slate-600">{step.description}</p>
                    </div>
                  </li>
                );
              })}
            </ol>
          </section>
        </div>

        <div className="space-y-6 lg:sticky lg:top-24">
          {contact}
          <div className="flex flex-col gap-3">
            <Link href={storeRoutes.packages} className={buttonClasses({ variant: "outline", size: "lg", className: "w-full" })}>
              Continue shopping
            </Link>
            <Link href={storeRoutes.home} className={buttonClasses({ variant: "ghost", size: "lg", className: "w-full" })}>
              Back to the home page
            </Link>
          </div>
        </div>
      </div>
    </>
  );
}
