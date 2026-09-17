import Link from "next/link";
import { ArrowRight, CheckCircle2, MessageCircle, Phone } from "lucide-react";
import SampleBadge from "@/components/storefront/SampleBadge";
import CountUp from "@/components/storefront/motion/CountUp";
import type { WebsiteStat } from "@/lib/api/types";
import { formatPrice } from "@/lib/catalog";
import { cn } from "@/lib/cn";
import { primaryPhone, storeRoutes, telHref, whatsappHref } from "@/lib/storefront/routes";
import { enterDelay, storeContainer, storePress } from "@/lib/storefront/styles";
import HeroSlideshow, { type HeroSlide } from "./HeroSlideshow";
import ScrollCue from "./ScrollCue";

/** Our own installation photos (public/panel-*.webp). The first is the eagerly loaded, server-rendered background. */
const HERO_SLIDES: HeroSlide[] = [
  { src: "/panel-3.webp", alt: "Solar panels installed by Juwon Electric on a flat commercial rooftop" },
  { src: "/panel-1.webp", alt: "Rows of solar panels on a rooftop at sunset" },
  { src: "/panel-5.webp", alt: "Solar panels fitted along the roof of a family home" },
  { src: "/panel-2.webp", alt: "Solar panels installed on the roof of a commercial building" },
];

const reassurances = ["No payment to place an order", "We call to confirm", "Installation included"];

/** Headline lines; the last word gets the gold gradient. */
const HEADLINE = ["Reliable power for", "Nigerian homes and"];
const HEADLINE_ACCENT = "businesses";

const onDarkFocus = "focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-gold-400 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950";
const pill = "inline-flex h-14 items-center justify-center gap-2 rounded-full px-7 text-base font-semibold transition-[background-color,translate,box-shadow] duration-200 ease-out motion-safe:hover:-translate-y-0.5";

export type HomeHeroProps = {
  phone: string;
  /** `settings.website.whatsappNumber`: the secondary button chats on WhatsApp when set, otherwise it calls. */
  whatsappNumber?: string | null;
  /** Lowest available package price for the floating card. Hidden when there are no priced packages. */
  fromPrice?: number | null;
  /** `settings.website.stats` (up to 4). Without stats the reassurance ticks show instead. */
  stats?: WebsiteStat[];
  statsSample?: boolean;
};

/**
 * Full-bleed home hero (TEAM_AND_MOTION_V1 §7.3) under the transparent header: a photo slideshow with dark gradients,
 * a glass status pill, a three-line headline with the last word in gold, the lead, a gold "Shop packages" and a glass
 * WhatsApp or call button, the website stats with gold count-up numbers, a glass price card and a scroll cue. The price
 * card shows from xl, above the floating actions: at lg it would cover the stats row.
 *
 * Entrance is CSS only, so the content is in the HTML and runs before hydration: the pill, headline lines (rising out of
 * a clipped mask), lead, buttons, stats and price card follow each other in about 100 ms steps. Reduced motion turns
 * it all off.
 */
export default function HomeHero({ phone, whatsappNumber, fromPrice, stats = [], statsSample = false }: HomeHeroProps) {
  const mainPhone = primaryPhone(phone);
  const whatsapp = whatsappHref(whatsappNumber);
  const shownStats = stats.slice(0, 4);

  return (
    <section
      id="home-hero"
      aria-labelledby="home-hero-heading"
      data-store-hero=""
      className="relative isolate -mt-[65px] flex min-h-[max(640px,min(100svh,920px))] flex-col overflow-hidden bg-slate-950 text-white md:-mt-[73px]"
    >
      <HeroSlideshow slides={HERO_SLIDES} />
      {/* Overlays: left-to-right for the text column, bottom for the stats and controls. */}
      <div aria-hidden="true" className="absolute inset-0 -z-10 bg-gradient-to-r from-slate-950/90 via-slate-950/70 to-slate-950/40" />
      <div aria-hidden="true" className="absolute inset-x-0 bottom-0 -z-10 h-2/3 bg-gradient-to-t from-slate-950/80 to-transparent" />

      <div className={cn(storeContainer, "flex flex-1 flex-col justify-center pb-24 pt-28 sm:pb-28 md:pt-36")}>
        <div className="max-w-3xl">
          <p className="je-enter inline-flex items-center gap-2.5 rounded-full border border-white/20 bg-white/10 px-3.5 py-1.5 text-xs font-medium text-white backdrop-blur-md sm:text-sm">
            <span aria-hidden="true" className="relative flex h-2 w-2">
              <span className="je-ping absolute inset-0 rounded-full bg-emerald-400" />
              <span className="relative h-2 w-2 rounded-full bg-emerald-400" />
            </span>
            Inverter, battery &amp; solar systems across Nigeria
          </p>

          <h1 id="home-hero-heading" className="mt-6 text-4xl font-semibold leading-[1.05] tracking-tight sm:text-6xl lg:text-7xl">
            {HEADLINE.map((line, index) => (
              <span key={line} className="-mb-[0.12em] block overflow-hidden pb-[0.12em]">
                <span style={enterDelay(120 + index * 100)} className="je-line block">
                  {line}
                </span>{" "}
              </span>
            ))}
            <span className="-mb-[0.12em] block overflow-hidden pb-[0.12em]">
              <span
                style={enterDelay(120 + HEADLINE.length * 100)}
                className="je-line block bg-gradient-to-r from-gold-300 via-gold-400 to-gold-500 bg-clip-text text-transparent"
              >
                {HEADLINE_ACCENT}
              </span>
            </span>
          </h1>

          <p style={enterDelay(520)} className="je-enter mt-6 max-w-2xl text-lg leading-relaxed text-white/80 sm:text-xl">
            Complete inverter, battery and solar packages, delivered and installed by our engineers, so NEPA outages don’t
            stop your day.
          </p>

          <div style={enterDelay(620)} className="je-enter mt-8 flex flex-col gap-3 sm:flex-row">
            <Link href={storeRoutes.packages} className={cn(pill, "group bg-gold-400 text-slate-950 shadow-elev-4 hover:bg-gold-300", onDarkFocus, storePress)}>
              Shop packages
              <ArrowRight aria-hidden="true" className="h-5 w-5 transition-transform duration-200 motion-safe:group-hover:translate-x-0.5" />
            </Link>
            {whatsapp ? (
              <a
                href={whatsapp}
                target="_blank"
                rel="noopener noreferrer"
                className={cn(pill, "border border-white/25 bg-white/10 text-white backdrop-blur-md hover:bg-white/15", onDarkFocus, storePress)}
              >
                <MessageCircle aria-hidden="true" className="h-5 w-5" />
                Chat on WhatsApp
                <span className="sr-only"> (opens in a new tab)</span>
              </a>
            ) : (
              <a
                href={mainPhone ? telHref(mainPhone) : storeRoutes.contact}
                className={cn(pill, "border border-white/25 bg-white/10 text-white backdrop-blur-md hover:bg-white/15", onDarkFocus, storePress)}
              >
                <Phone aria-hidden="true" className="h-5 w-5" />
                Talk to an engineer
                {mainPhone && <span className="sr-only">, call {mainPhone}</span>}
              </a>
            )}
          </div>

          <div style={enterDelay(720)} className="je-enter mt-10 border-t border-white/15 pt-8">
            {shownStats.length > 0 ? (
              <>
                <h2 className="sr-only">Juwon Electric in numbers</h2>
                <dl className={cn("grid grid-cols-2 gap-x-6 gap-y-6", shownStats.length >= 3 && "sm:grid-cols-3", shownStats.length >= 4 && "sm:grid-cols-4")}>
                  {shownStats.map((stat) => (
                    <div key={`${stat.label}-${stat.value}`} className="flex min-w-0 flex-col-reverse gap-1.5">
                      <dt className="text-xs font-medium uppercase leading-snug tracking-[0.14em] text-white/70">{stat.label}</dt>
                      <dd className="break-words text-4xl font-semibold tabular-nums tracking-tight text-gold-400 sm:text-5xl">
                        <CountUp value={stat.value} delay={600} />
                      </dd>
                    </div>
                  ))}
                </dl>
                {statsSample && <SampleBadge tone="brand" className="mt-5" />}
              </>
            ) : (
              <ul className="flex flex-wrap gap-x-6 gap-y-3 text-sm text-white/85 sm:text-base">
                {reassurances.map((item) => (
                  <li key={item} className="flex items-center gap-2">
                    <CheckCircle2 aria-hidden="true" className="h-5 w-5 shrink-0 text-gold-400" />
                    {item}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>

      {typeof fromPrice === "number" && fromPrice > 0 && (
        <div className="pointer-events-none absolute inset-x-0 bottom-44 hidden xl:block">
          <div className={cn(storeContainer, "flex justify-end")}>
            <div
              style={enterDelay(950)}
              className="je-enter pointer-events-auto flex min-w-[280px] items-center justify-between gap-4 rounded-2xl border border-white/20 bg-white/10 p-5 shadow-elev-5 backdrop-blur-md"
            >
              <div className="min-w-0">
                <p className="text-sm text-white/75">Complete packages from</p>
                <p className="mt-0.5 text-2xl font-semibold tabular-nums tracking-tight text-gold-400">{formatPrice(fromPrice)}</p>
              </div>
              <Link
                href={storeRoutes.packages}
                aria-label="Compare all packages"
                className={cn(
                  "group flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-gold-400 text-slate-950 transition-colors hover:bg-gold-300",
                  onDarkFocus,
                  storePress
                )}
              >
                <ArrowRight aria-hidden="true" className="h-5 w-5 transition-transform duration-200 motion-safe:group-hover:translate-x-0.5" />
              </Link>
            </div>
          </div>
        </div>
      )}

      <div className="pointer-events-none absolute inset-x-0 bottom-4 hidden sm:block">
        <div className={storeContainer}>
          <ScrollCue className="pointer-events-auto motion-reduce:hidden" />
        </div>
      </div>
    </section>
  );
}
