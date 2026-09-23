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
    title: "Order",
    text: "Choose a package online or contact our team. We’ll assess your energy requirements and recommend the most suitable solution.",
  },
  {
    icon: PhoneCall,
    title: "System Confirmation",
    text: "We confirm your selected system, installation requirements, payment terms and delivery details before proceeding.",
  },
  {
    icon: Settings2,
    title: "Processing & Scheduling",
    text: "Your equipment and materials are prepared, and where required, a site inspection is completed before scheduling installation.",
  },
  {
    icon: Truck,
    title: "Delivery",
    text: "Your complete system and installation materials are delivered to the project location as scheduled.",
  },
  {
    icon: Wrench,
    title: "Installation & Handover",
    text: "Our engineers professionally install, configure and test your system, then guide you through its operation and monitoring.",
  },
  {
    icon: Headphones,
    title: "After-Sales Support",
    text: "Our support continues after installation with technical assistance, maintenance and applicable warranty support.",
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
