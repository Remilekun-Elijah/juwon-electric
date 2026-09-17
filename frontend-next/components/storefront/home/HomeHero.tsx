import Image from "next/image";
import Link from "next/link";
import { ArrowRight, BatteryCharging, CheckCircle2, Headphones, Phone, Wrench } from "lucide-react";
import BrandPanel from "@/components/storefront/BrandPanel";
import { buttonClasses } from "@/components/ui";
import { formatPrice } from "@/lib/catalog";
import { cn } from "@/lib/cn";
import { primaryPhone, storeRoutes, telHref } from "@/lib/storefront/routes";
import { enterDelay, storeArrowNudge, storeContainer, storePress } from "@/lib/storefront/styles";

const trustPoints = [
  { icon: Wrench, title: "Installed by our engineers", text: "Sized, wired and tested at your home or business." },
  { icon: BatteryCharging, title: "Quality equipment", text: "Inverters, tubular and lithium batteries, solar panels." },
  { icon: Headphones, title: "Support after installation", text: "Maintenance, checks and answers when you need them." },
];

const reassurances = ["No payment to place an order", "We call to confirm", "Installation included"];

export type HeroPackageType = { value: string; label: string; count: number };

export type HomeHeroProps = {
  phone: string;
  /** Lowest available package price, shown on the photo. Hidden when there are no priced packages. */
  fromPrice?: number | null;
  /** Battery types with at least one available package, for the quick links. */
  packageTypes?: HeroPackageType[];
};

/**
 * Home hero on the brand panel: the page's h1, CTAs, battery-type shortcuts, a photo with the starting price, and trust
 * points. Entrance (TEAM_AND_MOTION_V1 §5.5): eyebrow, h1, text, buttons, chips and photo rise in a CSS stagger over
 * about half a second, then the price card floats in. CSS only, so it runs before hydration and is off for reduced motion.
 */
export default function HomeHero({ phone, fromPrice, packageTypes = [] }: HomeHeroProps) {
  const mainPhone = primaryPhone(phone);
  const whiteFocus = "focus-visible:ring-white focus-visible:ring-offset-brand-800";

  return (
    <div className={cn(storeContainer, "pt-4 sm:pt-6 lg:pt-8")}>
      <BrandPanel as="section" aria-labelledby="home-hero-heading" className="px-5 py-10 sm:px-10 sm:py-12 lg:px-14">
        <div className="grid items-center gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,0.9fr)] lg:gap-14">
          <div className="min-w-0">
            <p className="je-enter text-xs font-semibold uppercase tracking-[0.14em] text-brand-100">Inverter, battery and solar systems</p>
            <h1
              id="home-hero-heading"
              style={enterDelay(60)}
              className="je-enter mt-3 text-3xl font-semibold leading-[1.08] tracking-tight text-balance sm:text-4xl lg:text-[3.25rem]"
            >
              Reliable power for Lagos homes and businesses
            </h1>
            <p style={enterDelay(120)} className="je-enter mt-4 max-w-xl text-base leading-relaxed text-brand-50/90 sm:text-lg">
              Complete inverter, battery and solar packages, delivered and installed by our engineers, so NEPA outages don’t
              stop your day.
            </p>

            <div style={enterDelay(180)} className="je-enter mt-8 flex flex-col gap-3 sm:flex-row">
              <Link
                href={storeRoutes.packages}
                className={buttonClasses({ variant: "secondary", size: "lg", className: cn("group bg-white text-brand-800 hover:bg-brand-50", whiteFocus, storePress) })}
              >
                Shop packages
                <ArrowRight aria-hidden="true" className={storeArrowNudge} />
              </Link>
              <a
                href={mainPhone ? telHref(mainPhone) : storeRoutes.contact}
                className={buttonClasses({
                  variant: "outline",
                  size: "lg",
                  className: cn("border-white/40 bg-transparent text-white hover:bg-white/10 hover:text-white", whiteFocus, storePress),
                })}
              >
                <Phone aria-hidden="true" />
                Talk to an engineer
                {mainPhone && <span className="sr-only">, call {mainPhone}</span>}
              </a>
            </div>

            <ul style={enterDelay(240)} className="je-enter mt-6 flex flex-wrap gap-x-5 gap-y-2 text-sm text-brand-50/90">
              {reassurances.map((item) => (
                <li key={item} className="flex items-center gap-1.5">
                  <CheckCircle2 aria-hidden="true" className="h-4 w-4 shrink-0 text-white" />
                  {item}
                </li>
              ))}
            </ul>

            {packageTypes.length > 0 && (
              <nav aria-label="Shop packages by battery type" style={enterDelay(300)} className="je-enter mt-8 border-t border-white/10 pt-6">
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-brand-100">Shop by battery type</p>
                <ul className="mt-3 flex flex-wrap gap-2">
                  {packageTypes.map((type) => (
                    <li key={type.value}>
                      <Link
                        href={`${storeRoutes.packages}?type=${type.value}`}
                        className={cn(
                          "inline-flex min-h-11 items-center gap-2 rounded-full border border-white/20 bg-white/5 px-4 text-sm font-medium text-white transition hover:border-white/40 hover:bg-white/10 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-offset-2 sm:min-h-10",
                          whiteFocus
                        )}
                      >
                        {type.label}
                        <span className="rounded-full bg-white/15 px-2 py-0.5 text-xs tabular-nums text-brand-50">{type.count}</span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </nav>
            )}
          </div>

          <div className="relative min-w-0">
            <div style={enterDelay(150)} className="je-enter overflow-hidden rounded-2xl border border-white/10 bg-white/5 shadow-elev-5">
              <Image
                src="/panel-3.webp"
                alt="Solar panels installed by Juwon Electric on a flat commercial rooftop in Lagos"
                width={2272}
                height={1563}
                priority
                sizes="(min-width: 1280px) 540px, (min-width: 1024px) 42vw, calc(100vw - 72px)"
                className="aspect-[4/3] w-full object-cover lg:aspect-[5/6]"
              />
            </div>
            {typeof fromPrice === "number" && fromPrice > 0 && (
              <div
                style={enterDelay(450)}
                className="je-enter mt-3 flex items-center justify-between gap-3 rounded-xl bg-white p-4 text-slate-900 shadow-elev-4 sm:absolute sm:bottom-6 sm:left-6 sm:mt-0 sm:min-w-[260px]"
              >
                <div className="min-w-0">
                  <p className="text-xs font-medium text-slate-500">Complete packages from</p>
                  <p className="mt-0.5 text-xl font-semibold tabular-nums tracking-tight">{formatPrice(fromPrice)}</p>
                </div>
                <Link
                  href={storeRoutes.packages}
                  aria-label="Compare all packages"
                  className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-brand-50 text-brand-700 transition hover:bg-brand-100 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-brand-500"
                >
                  <ArrowRight aria-hidden="true" className="h-5 w-5" />
                </Link>
              </div>
            )}
          </div>
        </div>

        <ul className="mt-10 grid gap-6 border-t border-white/10 pt-8 sm:grid-cols-3 sm:gap-8">
          {trustPoints.map(({ icon: Icon, title, text }, index) => (
            <li key={title} style={enterDelay(360 + index * 60)} className="je-enter flex gap-3">
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
      </BrandPanel>
    </div>
  );
}
