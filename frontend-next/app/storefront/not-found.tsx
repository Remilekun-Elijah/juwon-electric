import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Package, Phone, PlugZap, Search, Wrench } from "lucide-react";
import PageIntro, { INTRO_IMAGES } from "@/components/storefront/PageIntro";
import { cn } from "@/lib/cn";
import { storeProductsEnabled } from "@/lib/storefront/data";
import { storeRoutes } from "@/lib/storefront/routes";
import {
  enterDelay,
  staggerDelay,
  storeArrowNudge,
  storeCard,
  storeContainer,
  storeGlassButton,
  storeGoldButton,
  storeHoverLift,
  storeLink,
} from "@/lib/storefront/styles";

export const metadata: Metadata = {
  title: "Page not found",
  robots: { index: false },
};

const suggestions = [
  { icon: Package, title: "Inverter and solar packages", body: "Complete systems for homes and businesses, installed.", href: storeRoutes.packages },
  { icon: Search, title: "Products", body: "Inverters, batteries, panels and accessories.", href: storeRoutes.products },
  { icon: Wrench, title: "Our services", body: "Design, installation, maintenance and support.", href: storeRoutes.services },
  { icon: Phone, title: "Contact us", body: "Tell us what you need to power and we’ll advise.", href: storeRoutes.contact },
];

/**
 * Storefront 404, rendered inside the storefront chrome (unknown paths reach it through app/storefront/[...missing]).
 * Dark intro like every other page (so the header stays transparent over it), then an unplugged illustration that
 * floats in and keeps drifting gently, and the suggestions rising in a stagger (TEAM_AND_MOTION_V1 §8.2).
 */
export default async function StorefrontNotFound() {
  const productsEnabled = await storeProductsEnabled();
  const shown = suggestions.filter((item) => productsEnabled || item.href !== storeRoutes.products);

  return (
    <>
      <PageIntro
        eyebrow="Error 404"
        title="We can’t find that page"
        description="The link may be old, or the item may no longer be listed. Here are some good places to start."
        image={INTRO_IMAGES.sunset}
        actions={
          <>
            <Link href={storeRoutes.home} className={storeGoldButton}>
              Go to the home page
            </Link>
            <Link href={storeRoutes.packages} className={storeGlassButton}>
              View Packages
            </Link>
          </>
        }
      />

      <div className={cn(storeContainer, "py-14 sm:py-20")}>
        <div aria-hidden="true" style={enterDelay(300)} className="je-in je-in-zoom flex justify-center">
          <div className="je-float relative grid h-28 w-28 place-items-center rounded-full bg-brand-50 text-brand-700 ring-8 ring-brand-50/60">
            <PlugZap className="h-12 w-12" strokeWidth={1.5} />
            <span className="absolute -right-1 top-3 h-3 w-3 rounded-full bg-gold-400" />
          </div>
        </div>

        <ul className="mx-auto mt-12 grid max-w-5xl gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {shown.map(({ icon: Icon, title, body, href }, index) => (
            <li key={href} style={staggerDelay(index, 80, 450)} className="je-in">
              <div className={cn(storeCard, storeHoverLift, "group h-full p-5")}>
                <span className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-brand-50 text-brand-700">
                  <Icon aria-hidden="true" className="h-5 w-5" />
                </span>
                <h2 className="mt-4 font-semibold text-slate-900">{title}</h2>
                <p className="mt-1 text-sm text-slate-600">{body}</p>
                <Link href={href} className={cn(storeLink, "mt-3 inline-flex min-h-11 items-center gap-1 text-sm md:min-h-0")}>
                  Open <span className="sr-only">{title}</span>
                  <ArrowRight aria-hidden="true" className={cn("h-4 w-4", storeArrowNudge)} />
                </Link>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </>
  );
}
