import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Building2, Factory, Home } from "lucide-react";
import Reveal from "@/components/storefront/motion/Reveal";
import { cn } from "@/lib/cn";
import { storeRoutes } from "@/lib/storefront/routes";
import { storeArrowNudge, storeContainer, storeGlassButton, storeGoldButton, storeSection } from "@/lib/storefront/styles";

/** Who we serve, from the owner's copy (2026-10-17). */
const SECTORS = [
  { icon: Home, label: "Residential" },
  { icon: Building2, label: "Commercial" },
  { icon: Factory, label: "Industrial" },
];


/**
 * Home "About us" band, spotlight design (2026-10-17): a dark brand band with the owner's heading and copy beside a
 * tall engineer photo carrying a sectors card (above the text, in a shorter 5:4 frame with a slimmer sectors card, below 1024 px). Not in use since 2026-10-17 (the classic
 * design, AboutUsClassic.tsx, is back); app/storefront/(home)/page.tsx picks one. Server component.
 */
export default function AboutUsSpotlight() {
  return (
    <section
      id="about"
      aria-labelledby="about-heading"
      className={cn(storeSection, "relative isolate scroll-mt-20 overflow-hidden bg-brand-950 text-white")}
    >
      <div aria-hidden="true" className="absolute inset-0 -z-10 opacity-15">
        <Image src="/panel-4.webp" alt="" fill sizes="100vw" className="object-cover" />
      </div>
      <div aria-hidden="true" className="absolute inset-0 -z-10 bg-linear-to-br from-brand-950 via-brand-950/95 to-brand-900/90" />
      <div aria-hidden="true" className="pointer-events-none absolute -right-32 -top-32 -z-10 h-96 w-96 rounded-full bg-gold-400/10 blur-3xl" />

      <div className={storeContainer}>
        <div className="grid items-center gap-10 lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)] lg:gap-16">
          <Reveal>
            <p className="flex items-center gap-3 text-xs font-semibold uppercase tracking-[0.14em] text-gold-400">
              <span aria-hidden="true" className="h-0.5 w-8 rounded-full bg-gold-400" />
              About us
            </p>
            <h2 id="about-heading" className="mt-3 text-balance text-3xl font-semibold leading-tight tracking-tight sm:text-4xl lg:text-5xl">
              Reliable Power, <span className="text-gold-400">Engineered for Your Peace of Mind.</span>
            </h2>
            <p className="mt-6 text-base leading-relaxed text-white/80 sm:text-lg">
              Juwon Electric is a leading Nigerian renewable energy company specializing in the design, supply, installation,
              and maintenance of advanced solar, inverter, and battery storage solutions for residential, commercial, and
              industrial applications.
            </p>
            <p className="mt-4 text-base leading-relaxed text-white/70 sm:text-lg">
              From initial energy assessments and system design to professional installation and comprehensive after-sales
              support, we deliver customized energy solutions tailored to your specific power needs.
            </p>
            <div className="mt-8 flex flex-col gap-3 min-[420px]:flex-row">
              <Link href={storeRoutes.team} className={cn(storeGoldButton, "group")}>
                Meet our team
                <ArrowRight aria-hidden="true" className={cn("h-4 w-4", storeArrowNudge)} />
              </Link>
              <Link href={storeRoutes.contact} className={storeGlassButton}>
                Talk to an engineer
              </Link>
            </div>
          </Reveal>

          <Reveal from="right" className="relative order-first mx-auto w-full max-w-xl lg:order-none lg:max-w-none">
            <div
              aria-hidden="true"
              className="absolute -right-3 -top-3 h-24 w-24 rounded-2xl bg-[radial-gradient(var(--color-brand-300)_1.5px,transparent_1.5px)] [background-size:12px_12px] sm:-right-5 sm:-top-5 sm:h-32 sm:w-32"
            />
            <div className="relative aspect-5/4 overflow-hidden sm:aspect-16/11 lg:aspect-4/5 rounded-3xl shadow-elev-4 ring-1 ring-white/15">
              <Image
                src="/engineer.jpg"
                alt="Juwon Electric engineer commissioning an inverter"
                fill
                sizes="(min-width: 1024px) 460px, (min-width: 640px) 448px, 90vw"
                className="object-cover object-[50%_25%]"
              />
              <div aria-hidden="true" className="absolute inset-x-0 bottom-0 h-1/2 bg-linear-to-t from-brand-950/90 to-transparent" />
              <div className="absolute inset-x-3 bottom-3 rounded-2xl border border-white/15 bg-white/10 p-2 backdrop-blur-md sm:inset-x-5 sm:bottom-5 sm:p-4">
                <p className="hidden text-sm font-semibold sm:block">
                  Powering Nigeria, <span className="text-gold-400">end to end</span>
                </p>
                <ul className="grid grid-cols-3 gap-1.5 sm:mt-3 sm:gap-2">
                  {SECTORS.map(({ icon: Icon, label }) => (
                    <li key={label} className="flex items-center justify-center gap-1.5 rounded-xl bg-brand-950/60 px-1.5 py-2 text-center text-[11px] sm:flex-col sm:px-2 sm:py-2.5 sm:text-xs font-medium text-white/85">
                      <Icon aria-hidden="true" className="h-4 w-4 text-gold-400" strokeWidth={1.75} />
                      {label}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </Reveal>
        </div>

      </div>
    </section>
  );
}
