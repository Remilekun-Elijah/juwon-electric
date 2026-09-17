import Image from "next/image";
import Link from "next/link";
import { ArrowRight, BatteryCharging, Headphones, Phone, Wrench } from "lucide-react";
import BrandPanel from "@/components/storefront/BrandPanel";
import { buttonClasses } from "@/components/ui";
import { cn } from "@/lib/cn";
import { primaryPhone, storeRoutes, telHref } from "@/lib/storefront/routes";
import { storeContainer, storeFadeUp } from "@/lib/storefront/styles";

const trustPoints = [
  {
    icon: Wrench,
    title: "Professional installation",
    text: "Our own engineers size, wire and test every system at your home or business.",
  },
  {
    icon: BatteryCharging,
    title: "Quality inverters and batteries",
    text: "Tubular and lithium batteries, inverters and solar panels from brands we trust.",
  },
  {
    icon: Headphones,
    title: "After-sales support",
    text: "Call us for maintenance, checks and questions after your system is running.",
  },
];

/** Home hero on the brand panel: the page's h1, CTAs, trust points and an installation photo. Server component. */
export default function HomeHero({ phone }: { phone: string }) {
  const mainPhone = primaryPhone(phone);
  const whiteFocus = "focus-visible:ring-white focus-visible:ring-offset-brand-800";

  return (
    <div className={cn(storeContainer, "pt-4 sm:pt-6 lg:pt-8")}>
      <BrandPanel as="section" aria-labelledby="home-hero-heading" className={cn(storeFadeUp, "px-5 py-10 sm:px-10 sm:py-14 lg:px-14 lg:py-16")}>
        <div className="grid items-center gap-10 lg:grid-cols-[1.1fr_1fr] lg:gap-14">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-brand-100">Inverter, battery and solar systems in Lagos</p>
            <h1 id="home-hero-heading" className="mt-3 text-3xl font-semibold leading-[1.1] tracking-tight sm:text-4xl lg:text-5xl">
              Reliable power for homes and businesses in Lagos
            </h1>
            <p className="mt-4 max-w-xl text-base leading-relaxed text-brand-50/90 sm:text-lg">
              Complete inverter, battery and solar packages, delivered and installed by our engineers, so NEPA outages don’t
              stop your day.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link
                href={storeRoutes.packages}
                className={buttonClasses({ variant: "secondary", size: "lg", className: cn("bg-white text-brand-800 hover:bg-brand-50", whiteFocus) })}
              >
                Shop packages
                <ArrowRight aria-hidden="true" />
              </Link>
              <a
                href={mainPhone ? telHref(mainPhone) : storeRoutes.contact}
                className={buttonClasses({
                  variant: "outline",
                  size: "lg",
                  className: cn("border-white/40 bg-transparent text-white hover:bg-white/10 hover:text-white", whiteFocus),
                })}
              >
                <Phone aria-hidden="true" />
                Talk to an engineer
                {mainPhone && <span className="sr-only">, call {mainPhone}</span>}
              </a>
            </div>
            <ul className="mt-10 grid gap-5 sm:grid-cols-3 lg:grid-cols-1 xl:grid-cols-3">
              {trustPoints.map(({ icon: Icon, title, text }) => (
                <li key={title} className="flex gap-3">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/10">
                    <Icon aria-hidden="true" className="h-5 w-5" />
                  </span>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold">{title}</p>
                    <p className="mt-1 text-sm leading-relaxed text-brand-100/90">{text}</p>
                  </div>
                </li>
              ))}
            </ul>
          </div>
          <figure className="overflow-hidden rounded-xl border border-white/10 bg-white/5">
            <Image
              src="/panel-3.webp"
              alt="Solar panels installed by Juwon Electric on a flat commercial rooftop"
              width={2272}
              height={1563}
              priority
              sizes="(min-width: 1280px) 560px, (min-width: 1024px) 45vw, calc(100vw - 72px)"
              className="aspect-[4/3] w-full object-cover"
            />
            <figcaption className="px-4 py-3 text-xs text-white/70">A rooftop solar installation by our team.</figcaption>
          </figure>
        </div>
      </BrandPanel>
    </div>
  );
}
