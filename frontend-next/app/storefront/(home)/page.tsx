import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import Section from "@/components/storefront/Section";
import ContactBand from "@/components/storefront/content/ContactBand";
import OrganizationJsonLd from "@/components/storefront/content/OrganizationJsonLd";
import PortfolioGrid, { featuredFirst } from "@/components/storefront/content/PortfolioGrid";
import { OfferingCard, SegmentCard, contentKey } from "@/components/storefront/content/ServiceCards";
import CareersTeaser from "@/components/storefront/home/CareersTeaser";
import CategoryGrid from "@/components/storefront/home/CategoryGrid";
import HomeHero from "@/components/storefront/home/HomeHero";
import HomeProductCard from "@/components/storefront/home/HomeProductCard";
import HowItWorks from "@/components/storefront/home/HowItWorks";
import PackageFinder from "@/components/storefront/home/PackageFinder";
import { EmptyState, buttonClasses } from "@/components/ui";
import { buildCategoryTree } from "@/lib/catalog";
import { cn } from "@/lib/cn";
import {
  getStoreCategories,
  getStorePackages,
  getStorePortfolio,
  getStoreProducts,
  getStoreServices,
  getStoreSettings,
  getStoreVacancies,
} from "@/lib/storefront/data";
import { storeRoutes } from "@/lib/storefront/routes";
import { storeLink } from "@/lib/storefront/styles";

export const revalidate = 60;

export const metadata: Metadata = {
  title: { absolute: "Juwon Electric | Inverter, battery and solar packages in Lagos" },
  description: "Inverter, battery and solar packages designed, delivered and installed by our engineers, so NEPA outages don’t stop your day.",
  alternates: { canonical: "/" },
};

const POPULAR_PRODUCTS = 8;
const HOME_PORTFOLIO = 6;
const HOME_OFFERINGS = 3;
const HOME_SEGMENTS = 6;

const seeAll = (href: string, label: string) => (
  <Link href={href} className={cn(storeLink, "inline-flex min-h-11 items-center gap-1.5 text-sm md:min-h-0")}>
    {label}
    <ArrowRight aria-hidden="true" className="h-4 w-4" />
  </Link>
);

/** Storefront home (docs/agents/fe-storefront.md §4 `/`). Every section below the hero hides itself when its data is empty. */
export default async function HomePage() {
  const [packages, categories, products, services, portfolio, vacancies, settings] = await Promise.all([
    getStorePackages(),
    getStoreCategories(),
    getStoreProducts({ page: 1 }),
    getStoreServices(),
    getStorePortfolio(),
    getStoreVacancies(),
    getStoreSettings(),
  ]);

  const topCategories = buildCategoryTree(categories);
  const popularProducts = products.items.filter((product) => product.inStock).slice(0, POPULAR_PRODUCTS);
  const recentWork = featuredFirst(portfolio).slice(0, HOME_PORTFOLIO);
  const offerings = services.offerings.slice(0, HOME_OFFERINGS);
  const segments = services.customerSegments.slice(0, HOME_SEGMENTS);

  return (
    <>
      <OrganizationJsonLd settings={settings} />
      <HomeHero phone={settings.business.phone} />

      <Section
        id="packages"
        eyebrow="Packages"
        title="Find your package"
        description="Complete systems with the inverter, batteries and installation included. Choose a battery type to see options from entry level to premium."
        actions={packages.length > 0 ? seeAll(storeRoutes.packages, "All packages") : undefined}
      >
        {packages.length > 0 ? (
          <PackageFinder packages={packages} />
        ) : (
          <EmptyState
            standalone
            title="Packages are being updated"
            description="Call or message us and an engineer will recommend the right system for your home or business."
            action={
              <Link href={storeRoutes.contact} className={buttonClasses({ size: "lg" })}>
                Talk to an engineer
              </Link>
            }
          />
        )}
      </Section>

      {topCategories.length > 0 && (
        <Section
          tone="white"
          eyebrow="Products"
          title="Shop by category"
          description="Inverters, batteries, solar panels and accessories, with specifications and stock status."
          actions={seeAll(storeRoutes.products, "All products")}
        >
          <CategoryGrid categories={topCategories} />
        </Section>
      )}

      {popularProducts.length > 0 && (
        <Section eyebrow="In stock" title="Popular products" actions={seeAll(storeRoutes.products, "Browse all products")}>
          <ul className="grid grid-cols-1 gap-4 min-[420px]:grid-cols-2 lg:grid-cols-4 lg:gap-5">
            {popularProducts.map((product) => (
              <li key={product.id} className="min-w-0">
                <HomeProductCard product={product} />
              </li>
            ))}
          </ul>
        </Section>
      )}

      <Section
        tone="white"
        eyebrow="How it works"
        title="From choosing a system to switching it on"
        description="Every order is confirmed by phone before anything is delivered, and our own engineers do the installation."
      >
        <HowItWorks gatewayEnabled={settings.payments.gatewayEnabled} />
      </Section>

      {offerings.length > 0 && (
        <Section
          eyebrow="Services"
          title="What we do"
          description="Beyond packages, we design, audit, install and maintain power systems."
          actions={seeAll(storeRoutes.services, "All services")}
        >
          <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {offerings.map((offering, index) => (
              <li key={contentKey(offering, index)} className="min-w-0">
                <OfferingCard offering={offering} compact />
              </li>
            ))}
          </ul>
        </Section>
      )}

      {segments.length > 0 && (
        <Section tone="white" eyebrow="Customers" title="Who we power">
          <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {segments.map((segment, index) => (
              <li key={contentKey(segment, index)} className="min-w-0">
                <SegmentCard segment={segment} />
              </li>
            ))}
          </ul>
        </Section>
      )}

      {recentWork.length > 0 && (
        <Section eyebrow="Our work" title="Recent installations" actions={seeAll(storeRoutes.portfolio, "See all our work")}>
          <PortfolioGrid items={recentWork} />
        </Section>
      )}

      {vacancies.length > 0 && <CareersTeaser vacancies={vacancies} />}

      <ContactBand
        business={settings.business}
        showDetails
        title="Talk to an engineer"
        description="Tell us what you want to keep running during outages. We’ll recommend a system that fits your load and budget, and answer any questions about our packages."
      />
    </>
  );
}
