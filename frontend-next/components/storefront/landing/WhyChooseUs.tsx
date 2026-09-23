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
    title: "Professionally Installed & Commissioned",
    text: "Every system is installed, tested and commissioned by our trained engineering team to ensure safety, performance and reliability.",
  },
  {
    icon: "clipboard",
    title: "Quality Equipment. Clear Specifications.",
    text: "We use carefully selected inverters, batteries and solar panels from trusted manufacturers, with system specifications clearly stated.",
  },
  {
    icon: "phone",
    title: "Flexible & Secure Order Process",
    text: "Place your order or request a consultation without immediate payment. Our team will confirm your requirements and installation details before payment is required.",
  },
  {
    icon: "badge",
    title: "Transparent Pricing & Availability",
    text: "Our prices and product availability are regularly updated, giving you clear and accurate information when making your decision.",
  },
];

/**
 * "Why customers choose us" (TEAM_AND_MOTION_V1 §7.5): the cards managed in Settings ~~four fixed cards~~ (2026-09-18,
 * admin → Website → Why choose us), on a dark surface band with glass cards, gold icon circles and a soft gold glow
 * on hover. With no reasons saved it falls back to the four built-in ones. Server component.
 */
export default function WhyChooseUs({ reasons = [] }: { reasons?: Reason[] }) {
  const cards: ReasonCard[] = reasons.length ? reasons : BUILT_IN;

  return (
    <Section
      tone="dark"
      eyebrow="Why Juwon Electric"
      title="Why Customers Choose Us"
      description="Professional solar and energy solutions designed around your needs, delivered with quality equipment, expert installation and dependable support."
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
                  "hover:border-gold-400/40 hover:bg-white/[0.08] hover:shadow-[0_0_48px_-12px_rgba(232,197,87,0.35)] motion-safe:hover:-translate-y-0.5"
                )}
              >
                <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-gold-400/15 text-gold-400 ring-1 ring-gold-400/30 transition-colors duration-300 group-hover:bg-gold-400 group-hover:text-slate-950">
                  <Icon aria-hidden="true" className="h-5 w-5" />
                </span>
                <div className="min-w-0">
                  <h3 className="font-semibold tracking-tight text-white">{card.title}</h3>
                  <p className="mt-1.5 text-sm leading-relaxed text-white">{card.text}</p>
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
