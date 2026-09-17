import { BadgeCheck, ClipboardList, PhoneCall, Wrench } from "lucide-react";
import Section from "@/components/storefront/Section";
import Reveal from "@/components/storefront/motion/Reveal";
import { cn } from "@/lib/cn";

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

/**
 * "Why choose us": four static cards with verifiable claims on a dark slate-950 band (TEAM_AND_MOTION_V1 §7.5): glass
 * cards, gold icon circles and a soft gold glow on hover. Server component.
 */
export default function WhyChooseUs() {
  return (
    <Section
      tone="dark"
      eyebrow="Why Juwon Electric"
      title="Why customers choose us"
      description="A simple, honest way to buy backup power for your home or business."
    >
      <Reveal as="ul" stagger className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 lg:gap-5">
        {reasons.map(({ icon: Icon, title, text }) => (
          <li key={title}>
            <div
              className={cn(
                "group flex h-full gap-4 rounded-2xl border border-white/10 bg-white/5 p-5 sm:flex-col sm:p-6",
                "transition-[translate,background-color,border-color,box-shadow] duration-300 ease-out",
                "hover:border-gold-400/40 hover:bg-white/[0.08] hover:shadow-[0_0_48px_-12px_rgba(223,198,56,0.35)] motion-safe:hover:-translate-y-0.5"
              )}
            >
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-gold-400/15 text-gold-400 ring-1 ring-gold-400/30 transition-colors duration-300 group-hover:bg-gold-400 group-hover:text-slate-950">
                <Icon aria-hidden="true" className="h-5 w-5" />
              </span>
              <div className="min-w-0">
                <h3 className="font-semibold tracking-tight text-white">{title}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-white/70">{text}</p>
              </div>
            </div>
          </li>
        ))}
      </Reveal>
    </Section>
  );
}
