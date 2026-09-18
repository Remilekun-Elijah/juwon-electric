import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { Package as PackageIcon, Phone } from "lucide-react";
import CatalogHelpBand from "@/components/storefront/catalog/CatalogHelpBand";
import PackageFilters from "@/components/storefront/catalog/PackageFilters";
import PackageFiltersFallback from "@/components/storefront/catalog/PackageFiltersFallback";
import { availablePackages } from "@/components/storefront/catalog/packageMeta";
import PageIntro, { INTRO_IMAGES } from "@/components/storefront/PageIntro";
import Reveal from "@/components/storefront/motion/Reveal";
import { EmptyState, buttonClasses } from "@/components/ui";
import { cn } from "@/lib/cn";
import { getStoreChromeSettings, getStorePackages } from "@/lib/storefront/data";
import { storeRoutes } from "@/lib/storefront/routes";
import { enterDelay, storeContainer } from "@/lib/storefront/styles";

export const revalidate = 60;

const description =
  "Complete inverter and battery systems from 1kVA, with or without solar panels, delivered and installed by our team.";

export const metadata: Metadata = {
  title: "Inverter and solar packages",
  description,
  alternates: { canonical: storeRoutes.packages },
  openGraph: { url: storeRoutes.packages, title: "Inverter and solar packages | Juwon Electric", description },
};

/**
 * Packages (spec §4): server data, filtered on the client with the state in the URL. Packages with no available option
 * are left out (Commerce v2 §4).
 */
export default async function PackagesPage() {
  const [allPackages, settings] = await Promise.all([getStorePackages(), getStoreChromeSettings()]);
  const packages = availablePackages(allPackages);
  const productsEnabled = settings.website.productsEnabled;

  return (
    <>
      <PageIntro eyebrow="Packages" title="Inverter and solar packages" description={description} image={INTRO_IMAGES.home} />

      <div className={cn(storeContainer, "py-10 sm:py-14")}>
        <h2 className="sr-only">Browse packages</h2>
        {packages.length ? (
          <Suspense fallback={<PackageFiltersFallback packages={packages} />}>
            <PackageFilters packages={packages} />
          </Suspense>
        ) : (
          <div style={enterDelay(300)} className="je-in">
            <EmptyState
              standalone
              icon={PackageIcon}
              title="Packages are being updated"
              description="We’re refreshing our package prices. Call or message us and an engineer will quote a system for your home or business."
              action={
                <Link href={storeRoutes.contact} className={buttonClasses({ size: "lg" })}>
                  <Phone aria-hidden="true" />
                  Talk to an engineer
                </Link>
              }
            />
          </div>
        )}

        <Reveal className="mt-12 sm:mt-16">
          <CatalogHelpBand secondary={productsEnabled ? { label: "Browse products", href: storeRoutes.products } : undefined} />
        </Reveal>
      </div>
    </>
  );
}
