import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Package, Phone, Search } from "lucide-react";
import { buttonClasses } from "@/components/ui";
import { cn } from "@/lib/cn";
import { storeRoutes } from "@/lib/storefront/routes";
import { storeCard, storeContainer, storeEyebrow, storeH1, storeLink } from "@/lib/storefront/styles";

export const metadata: Metadata = {
  title: "Page not found",
  robots: { index: false },
};

const suggestions = [
  { icon: Package, title: "Inverter and solar packages", body: "Complete systems for homes and businesses, installed.", href: storeRoutes.packages },
  { icon: Search, title: "Products", body: "Inverters, batteries, panels and accessories.", href: storeRoutes.products },
  { icon: Phone, title: "Contact us", body: "Tell us what you need to power and we’ll advise.", href: storeRoutes.contact },
];

/** Storefront 404, rendered inside the storefront chrome (unknown paths reach it through app/storefront/[...missing]). */
export default function StorefrontNotFound() {
  return (
    <div className={cn(storeContainer, "py-16 sm:py-24")}>
      <div className="mx-auto max-w-2xl text-center">
        <p className={storeEyebrow}>Error 404</p>
        <h1 className={cn(storeH1, "mt-3")}>We can’t find that page</h1>
        <p className="mt-4 text-base text-slate-600 sm:text-lg">
          The link may be old, or the item may no longer be listed. Here are some good places to start.
        </p>
        <div className="mt-8 flex justify-center">
          <Link href={storeRoutes.home} className={buttonClasses({ size: "lg" })}>
            Go to the home page
          </Link>
        </div>
      </div>
      <ul className="mx-auto mt-12 grid max-w-4xl gap-4 sm:grid-cols-3">
        {suggestions.map(({ icon: Icon, title, body, href }) => (
          <li key={href} className={cn(storeCard, "p-5")}>
            <span className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-brand-50 text-brand-700">
              <Icon aria-hidden="true" className="h-5 w-5" />
            </span>
            <h2 className="mt-4 font-semibold text-slate-900">{title}</h2>
            <p className="mt-1 text-sm text-slate-600">{body}</p>
            <Link href={href} className={cn(storeLink, "mt-3 inline-flex min-h-11 items-center gap-1 text-sm md:min-h-0")}>
              Open <span className="sr-only">{title}</span>
              <ArrowRight aria-hidden="true" className="h-4 w-4" />
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
