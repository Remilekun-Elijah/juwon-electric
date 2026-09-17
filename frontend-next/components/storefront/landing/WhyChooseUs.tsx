import Section from "@/components/storefront/Section";
import Reveal from "@/components/storefront/motion/Reveal";
import SampleBadge from "@/components/storefront/SampleBadge";
import { reasonIcon } from "@/components/admin/website/reasonIcons";
import { cn } from "@/lib/cn";
import type { Reason } from "@/lib/api/types";

/**
 * Shown when the admin has no active reasons yet: only what the platform already guarantees (LANDING_V1 §0 and §7.4),
 * with no warranties, years or counts.
 */
type ReasonCard = { id?: string; icon: string; title: string; text: string; sample?: boolean };

const BUILT_IN: ReasonCard[] = [
  {
    icon: "wrench",
    title: "Installed and tested by our engineers",
    text: "Our own team fits your system, tests it on site and shows you how to use it.",
  },
  {
    icon: "clipboard",
    title: "Quality equipment, specs shown",
    text: "Inverters, batteries and panels with the specifications listed on every product page.",
  },
  {
    icon: "phone",
    title: "No payment to place an order",
    text: "Place your order online and we call you to confirm the details before anything is paid.",
  },
  {
    icon: "badge",
    title: "Live stock and prices",
    text: "What you see on the website is what we have and what it costs today.",
  },
];

/**
 * "Why customers choose us" (TEAM_AND_MOTION_V1 §7.5): the cards managed in Settings ~~four fixed cards~~ (2026-09-18,
 * admin → Website → Why choose us), on a dark brand-950 band with glass cards, gold icon circles and a soft gold glow
 * on hover. With no reasons saved it falls back to the four built-in ones. Server component.
 */
export default function WhyChooseUs({ reasons = [] }: { reasons?: Reason[] }) {
  const cards: ReasonCard[] = reasons.length ? reasons : BUILT_IN;

  return (
    <Section
      tone="dark"
      eyebrow="Why Juwon Electric"
      title="Why customers choose us"
      description="A simple, honest way to buy backup power for your home or business."
    >
      <Reveal as="ul" stagger className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 lg:gap-5">
        {cards.map((card) => {
          const Icon = reasonIcon(card.icon);
          return (
            <li key={card.id ?? card.title}>
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
                  <h3 className="font-semibold tracking-tight text-white">{card.title}</h3>
                  <p className="mt-1.5 text-sm leading-relaxed text-white/70">{card.text}</p>
                  {card.sample && <SampleBadge tone="brand" className="mt-3" />}
                </div>
              </div>
            </li>
          );
        })}
      </Reveal>
    </Section>
  );
}
