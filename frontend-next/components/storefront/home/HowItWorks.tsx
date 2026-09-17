import { ClipboardCheck, Headphones, PhoneCall, Settings2, Truck, Wrench } from "lucide-react";
import Reveal from "@/components/storefront/motion/Reveal";
import { cn } from "@/lib/cn";
import { storeCard } from "@/lib/storefront/styles";

/**
 * Customer journey, in the order of the backend fulfilment statuses (LANDING_V1 §7.10): the order is placed (`pending`),
 * confirmed by phone, prepared (`processing`), delivered (`out_for_delivery` → `delivered`), installed (`installed`),
 * then supported after installation.
 */
const stepsFor = (gatewayEnabled: boolean) => [
  {
    icon: ClipboardCheck,
    title: "Order or call",
    text: gatewayEnabled
      ? "Choose a package and place your order online, or call us and we’ll size one for you. You pay through a secure link once we confirm."
      : "Choose a package and place your order online, or call us and we’ll size one for you. You don’t pay anything online.",
  },
  {
    icon: PhoneCall,
    title: "Confirmation call",
    text: "We call to confirm your order and the details of your site, then agree payment and a delivery date.",
  },
  {
    icon: Settings2,
    title: "Processing",
    text: "We prepare your inverter, batteries and panels and book the installation team.",
  },
  {
    icon: Truck,
    title: "Delivery",
    text: "Your equipment is delivered to your address on the agreed date.",
  },
  {
    icon: Wrench,
    title: "Installation",
    text: "Our engineers install and test the system, then show you how to use and look after it.",
  },
  {
    icon: Headphones,
    title: "After-sales support",
    text: "Call or message us for checks, maintenance and answers whenever you need them.",
  },
];

/**
 * "How it works": six numbered steps (payment copy follows `settings.payments.gatewayEnabled`). Steps reveal one after
 * another and the line along the top of each card draws across as it appears (TEAM_AND_MOTION_V1 §5.7). Server component.
 */
export default function HowItWorks({ gatewayEnabled }: { gatewayEnabled: boolean }) {
  return (
    <Reveal as="ol" stagger staggerStep={120} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 lg:gap-5">
      {stepsFor(gatewayEnabled).map(({ icon: Icon, title, text }, index) => (
        <li key={title} className={cn(storeCard, "relative flex gap-4 overflow-hidden p-5")}>
          <span aria-hidden="true" className="je-draw absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-brand-700 via-brand-500 to-brand-200" />
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
    </Reveal>
  );
}
