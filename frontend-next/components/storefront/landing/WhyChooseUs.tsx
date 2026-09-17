import { BadgeCheck, ClipboardList, PhoneCall, Wrench } from "lucide-react";
import Section from "@/components/storefront/Section";
import Reveal from "@/components/storefront/motion/Reveal";
import { cn } from "@/lib/cn";
import { storeCard } from "@/lib/storefront/styles";

/**
 * Only what the platform already guarantees (LANDING_V1 §0 and §7.4): no warranties, years or counts. The order flow
 * never takes payment up front, products carry specs and stock status, and prices come live from the catalogue.
 */
const reasons = [
  {
    icon: Wrench,
    title: "Installed and tested by our engineers",
    text: "Our own team fits your system, tests it on site and shows you how to use it.",
  },
  {
    icon: ClipboardList,
    title: "Quality equipment, specs shown",
    text: "Inverters, batteries and panels with the specifications listed on every product page.",
  },
  {
    icon: PhoneCall,
    title: "No payment to place an order",
    text: "Place your order online and we call you to confirm the details before anything is paid.",
  },
  {
    icon: BadgeCheck,
    title: "Live stock and prices",
    text: "What you see on the website is what we have and what it costs today.",
  },
];

/** "Why choose us": four static cards with verifiable claims. Server component. */
export default function WhyChooseUs() {
  return (
    <Section
      tone="white"
      eyebrow="Why Juwon Electric"
      title="Why customers choose us"
      description="A simple, honest way to buy backup power for your home or business."
    >
      <Reveal as="ul" stagger className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 lg:gap-5">
        {reasons.map(({ icon: Icon, title, text }) => (
          <li key={title} className={cn(storeCard, "flex gap-4 p-5 sm:flex-col sm:p-6")}>
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-700">
              <Icon aria-hidden="true" className="h-5 w-5" />
            </span>
            <div className="min-w-0">
              <h3 className="font-semibold tracking-tight text-slate-900">{title}</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-slate-600">{text}</p>
            </div>
          </li>
        ))}
      </Reveal>
    </Section>
  );
}
