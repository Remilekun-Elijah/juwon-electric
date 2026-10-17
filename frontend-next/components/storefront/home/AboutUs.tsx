import Image from "next/image";
import Link from "next/link";
import { ArrowRight, BadgeCheck, Users, Wrench } from "lucide-react";
import { buttonClasses } from "@/components/ui";
import Reveal from "@/components/storefront/motion/Reveal";
import { cn } from "@/lib/cn";
import { storeRoutes } from "@/lib/storefront/routes";
import { storeArrowNudge, storeBody, storeContainer, storeEyebrow, storeH2, storeHoverLift, storeLink, storePress, storeSection } from "@/lib/storefront/styles";

/** Placeholder point copy (2026-10-12); the owner will replace it. */
const POINTS = [
  { icon: Wrench, title: "Designed and installed in-house", text: "Our own engineers size, supply and install every system." },
  { icon: BadgeCheck, title: "Quality equipment", text: "Inverters, batteries and panels from brands we trust and support." },
  { icon: Users, title: "Support after installation", text: "We stay on hand for maintenance, upgrades and advice." },
];

/** How a job runs, shown on the photo card. */
const STEPS = ["Assess", "Design", "Install", "Support"];

/**
 * Home "About us" band: a photo collage (installation plus an engineer on site, with a dark brand card naming the
 * four steps of a job) beside the company story, three point cards and two calls to action. Server component.
 */
export default function AboutUs() {
  return (
    <section
      id="about"
      aria-labelledby="about-heading"
      className={cn(storeSection, "relative scroll-mt-20 overflow-hidden border-y border-slate-200 bg-linear-to-b from-white to-slate-50")}
    >
      <div aria-hidden="true" className="pointer-events-none absolute -left-32 top-10 h-80 w-80 rounded-full bg-brand-100/60 blur-3xl" />
      <div aria-hidden="true" className="pointer-events-none absolute -right-24 bottom-0 h-72 w-72 rounded-full bg-gold-400/15 blur-3xl" />

      <div className={cn(storeContainer, "relative grid items-center gap-12 lg:grid-cols-2 lg:gap-16")}>
        <Reveal from="left" className="relative mx-auto w-full max-w-xl pb-10 pr-8 sm:pb-12 sm:pr-14 lg:max-w-none">
          <div
            aria-hidden="true"
            className="absolute -left-3 -top-3 h-24 w-24 rounded-2xl bg-[radial-gradient(var(--color-brand-300)_1.5px,transparent_1.5px)] [background-size:12px_12px] sm:-left-5 sm:-top-5 sm:h-32 sm:w-32"
          />
          <div className="relative aspect-4/3 overflow-hidden rounded-3xl bg-brand-950 shadow-elev-3">
            <Image src="/panel-2.webp" alt="Inverters and batteries installed by Juwon Electric" fill sizes="(min-width: 1024px) 560px, 90vw" className="object-cover" />
            <div aria-hidden="true" className="absolute inset-0 bg-linear-to-tr from-brand-950/60 via-transparent to-transparent" />
          </div>

          <div className="absolute bottom-0 right-0 aspect-3/4 w-[38%] overflow-hidden rounded-2xl bg-brand-950 shadow-elev-3 ring-4 ring-white sm:ring-[6px]">
            <Image src="/engineer.jpg" alt="Juwon Electric engineer commissioning an inverter" fill sizes="(min-width: 1024px) 220px, 35vw" className="object-cover" />
          </div>

          <div className="absolute bottom-3 left-3 max-w-[58%] rounded-2xl bg-brand-950/95 p-3.5 text-white shadow-elev-3 backdrop-blur sm:bottom-5 sm:left-5 sm:p-5">
            <p className="text-sm font-semibold sm:text-base">
              Powering homes and businesses <span className="text-gold-400">across Nigeria</span>
            </p>
            <ol className="mt-2.5 hidden flex-wrap items-center gap-x-1.5 gap-y-1 text-xs font-medium text-white/75 min-[420px]:flex">
              {STEPS.map((step, index) => (
                <li key={step} className="flex items-center gap-1.5">
                  {index > 0 && <span aria-hidden="true" className="h-1 w-1 rounded-full bg-gold-400" />}
                  {step}
                </li>
              ))}
            </ol>
          </div>
        </Reveal>

        <Reveal>
          <p className={cn(storeEyebrow, "flex items-center gap-3")}>
            <span aria-hidden="true" className="h-0.5 w-8 rounded-full bg-gold-400" />
            About us
          </p>
          <h2 id="about-heading" className={cn(storeH2, "mt-3 text-balance sm:text-4xl")}>
            Reliable Power, <span className="text-brand-700">Engineered for Your Peace of Mind.</span>
          </h2>
          <p className={cn(storeBody, "mt-5 text-base leading-relaxed sm:text-lg")}>
            Juwon Electric is a leading Nigerian renewable energy company specializing in the design, supply, installation,
            and maintenance of advanced solar, inverter, and battery storage solutions for residential, commercial, and
            industrial applications.
          </p>
          <p className={cn(storeBody, "mt-4 text-base leading-relaxed sm:text-lg")}>
            From initial energy assessments and system design to professional installation and comprehensive after-sales
            support, we deliver customized energy solutions tailored to your specific power needs.
          </p>

          <ul className="mt-8 grid gap-3">
            {POINTS.map(({ icon: Icon, title, text }) => (
              <li key={title} className={cn("flex gap-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-elev-1", storeHoverLift)}>
                <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brand-700 text-gold-400">
                  <Icon aria-hidden="true" className="h-5 w-5" strokeWidth={1.75} />
                </span>
                <div>
                  <p className="font-semibold tracking-tight text-slate-900">{title}</p>
                  <p className="mt-0.5 text-sm text-slate-600">{text}</p>
                </div>
              </li>
            ))}
          </ul>

          <div className="mt-8 flex flex-col gap-3 min-[420px]:flex-row min-[420px]:items-center sm:gap-6">
            <Link href={storeRoutes.team} className={buttonClasses({ size: "lg", className: cn("group", storePress) })}>
              Meet our team
              <ArrowRight aria-hidden="true" className={cn("h-4 w-4", storeArrowNudge)} />
            </Link>
            <Link href={storeRoutes.contact} className={cn(storeLink, "inline-flex min-h-11 items-center justify-center")}>
              Talk to an engineer
            </Link>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
