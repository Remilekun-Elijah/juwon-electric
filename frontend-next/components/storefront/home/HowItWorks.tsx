import { ClipboardCheck, Package, PhoneCall, Truck, Wrench } from "lucide-react";
import { cn } from "@/lib/cn";
import { storeCard } from "@/lib/storefront/styles";

/**
 * Customer journey, in the order of the backend fulfilment statuses: the order is placed (`pending`), confirmed by
 * phone (`processing`), delivered (`out_for_delivery` → `delivered`) and installed (`installed`).
 */
const stepsFor = (gatewayEnabled: boolean) => [
  {
    icon: Package,
    title: "Choose",
    text: "Pick a package for your load, with or without solar panels, or ask us to size one for you.",
  },
  {
    icon: ClipboardCheck,
    title: "Order",
    text: gatewayEnabled
      ? "Add it to your cart and place your order with your delivery address. You pay through a secure link once we confirm."
      : "Add it to your cart and place your order with your delivery address. You don’t pay anything online.",
  },
  {
    icon: PhoneCall,
    title: "Confirmation call",
    text: "We call to confirm your order and the details of your site, then arrange payment and a delivery date.",
  },
  {
    icon: Truck,
    title: "Delivery",
    text: "Your inverter, batteries and panels are delivered to your address.",
  },
  {
    icon: Wrench,
    title: "Installation",
    text: "Our engineers install and test the system, then show you how to use and look after it.",
  },
];

/** "How it works": five numbered steps (payment copy follows `settings.payments.gatewayEnabled`); a vertical list on mobile and a row on large screens. Server component. */
export default function HowItWorks({ gatewayEnabled }: { gatewayEnabled: boolean }) {
  return (
    <ol className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
      {stepsFor(gatewayEnabled).map(({ icon: Icon, title, text }, index) => (
        <li key={title} className={cn(storeCard, "relative flex gap-4 p-5 lg:flex-col")}>
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-700">
            <Icon aria-hidden="true" className="h-5 w-5" />
          </span>
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Step {index + 1}</p>
            <h3 className="mt-1 font-semibold tracking-tight text-slate-900">{title}</h3>
            <p className="mt-1.5 text-sm leading-relaxed text-slate-600">{text}</p>
          </div>
        </li>
      ))}
    </ol>
  );
}
