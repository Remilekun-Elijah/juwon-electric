import { ClipboardCheck, Headphones, PhoneCall, Settings2, Truck, Wrench } from "lucide-react";
import Reveal from "@/components/storefront/motion/Reveal";

/**
 * Customer journey, in the order of the backend fulfilment statuses (LANDING_V1 §7.10): the order is placed (`pending`),
 * confirmed by phone, prepared (`processing`), delivered (`out_for_delivery` → `delivered`), installed (`installed`),
 * then supported after installation.
 */
const steps = [
  {
    icon: ClipboardCheck,
    title: "Order or call",
    text: "Order a complete package or individual products online, or call us and we’ll recommend what you need. You don’t pay anything online.",
  },
  {
    icon: PhoneCall,
    title: "Confirmation call",
    text: "We call to confirm your order and delivery details, then agree how you’d like to pay and when to deliver.",
  },
  {
    icon: Settings2,
    title: "Processing",
    text: "We get the items in your order ready from stock and, if you need installation, book our engineers.",
  },
  {
    icon: Truck,
    title: "Delivery",
    text: "Your order is delivered to your address on the agreed date.",
  },
  {
    icon: Wrench,
    title: "Installation",
    text: "If your order includes installation, our engineers install and test it, then show you how to use and look after it.",
  },
  {
    icon: Headphones,
    title: "After-sales support",
    text: "Call or message us for checks, maintenance and answers whenever you need them.",
  },
];

/**
 * "How it works": six numbered steps (nothing is paid online; payment is agreed on the confirmation call) for a dark section
 * (TEAM_AND_MOTION_V1 §7.5): glass cards with large gold step numbers. Steps reveal one after another and the gold line
 * along the top of each card draws across as it appears (§5.7). Server component.
 */
export default function HowItWorks() {
  return (
    <Reveal as="ol" stagger staggerStep={120} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 lg:gap-5">
      {steps.map(({ icon: Icon, title, text }, index) => (
        <li key={title} className="flex">
          <div className="relative flex w-full gap-4 overflow-hidden rounded-2xl border border-white/10 bg-white/5 p-5 transition-colors duration-300 hover:border-white/20 hover:bg-white/[0.08] sm:p-6">
            <span aria-hidden="true" className="je-draw absolute inset-x-0 top-0 h-0.5 bg-gradient-to-r from-gold-500 via-gold-400 to-gold-300/0" />
            <div className="flex shrink-0 flex-col items-center gap-3">
              <span aria-hidden="true" className="text-4xl font-semibold leading-none tabular-nums tracking-tight text-gold-400">
                {String(index + 1).padStart(2, "0")}
              </span>
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white">
                <Icon aria-hidden="true" className="h-5 w-5" />
              </span>
            </div>
            <div className="min-w-0">
              <p className="sr-only">Step {index + 1}</p>
              <h3 className="font-semibold tracking-tight text-white">{title}</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-white/70">{text}</p>
            </div>
          </div>
        </li>
      ))}
    </Reveal>
  );
}
