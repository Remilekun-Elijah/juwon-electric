import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import Section from "@/components/storefront/Section";
import { PACKAGE_TYPE_FILTERS, availablePackages, lowestPrice, packageTypeKey } from "@/components/storefront/catalog/packageMeta";
import OrganizationJsonLd from "@/components/storefront/content/OrganizationJsonLd";
import PortfolioGrid, { featuredFirst } from "@/components/storefront/content/PortfolioGrid";
import HomeHero from "@/components/storefront/home/HomeHero";
import HowItWorks from "@/components/storefront/home/HowItWorks";
import PackageFinder from "@/components/storefront/home/PackageFinder";
import CalculatorTeaser from "@/components/storefront/landing/CalculatorTeaser";
import ClientLogos from "@/components/storefront/landing/ClientLogos";
import FaqPreview from "@/components/storefront/landing/FaqPreview";
import Financing from "@/components/storefront/landing/Financing";
import FinalCta from "@/components/storefront/landing/FinalCta";
import Reviews from "@/components/storefront/landing/Reviews";
import Solutions from "@/components/storefront/landing/Solutions";
import StatsBand from "@/components/storefront/landing/StatsBand";
import WhyChooseUs from "@/components/storefront/landing/WhyChooseUs";
import { cn } from "@/lib/cn";
import { caseStudies, segmentTitles } from "@/lib/storefront/content";
import {
  getStoreClients,
  getStoreFaqs,
  getStorePackages,
  getStorePortfolio,
  getStoreServices,
  getStoreSettings,
  getStoreTestimonials,
} from "@/lib/storefront/data";
import { storeRoutes } from "@/lib/storefront/routes";
import { storeLink } from "@/lib/storefront/styles";

export const revalidate = 60;

export const metadata: Metadata = {
  title: { absolute: "Juwon Electric | Inverter, battery and solar packages in Lagos" },
  description: "Inverter, battery and solar packages designed, delivered and installed by our engineers, so NEPA outages don’t stop your day.",
  alternates: { canonical: "/" },
};

const HOME_CASE_STUDIES = 3;

const seeAll = (href: string, label: string) => (
  <Link href={href} className={cn(storeLink, "inline-flex min-h-11 items-center gap-1.5 text-sm md:min-h-0")}>
    {label}
    <ArrowRight aria-hidden="true" className="h-4 w-4" />
  </Link>
);

/**
 * Storefront home in the LANDING_V1 §7 order: hero, stats, client logos, why choose us, solutions, packages, calculator
 * teaser, case studies, reviews, how it works, financing, FAQ and the final call to action. Every section after the
 * hero hides itself when it has no data (the static "Why choose us" and "How it works" always show).
 */
export default async function HomePage() {
  const [allPackages, services, portfolio, settings, testimonials, clients, faqs] = await Promise.all([
    getStorePackages(),
    getStoreServices(),
    getStorePortfolio(),
    getStoreSettings(),
    getStoreTestimonials(),
    getStoreClients(),
    getStoreFaqs(),
  ]);

  // Commerce v2 §4: packages with no available option stay out of the home page.
  const packages = availablePackages(allPackages);
  const prices = packages.map(lowestPrice).filter((price) => price > 0);
  const heroFromPrice = prices.length ? Math.min(...prices) : null;
  const heroPackageTypes = PACKAGE_TYPE_FILTERS.filter((type) => type.value !== "all")
    .map((type) => ({ ...type, count: packages.filter((pkg) => packageTypeKey(pkg) === type.value).length }))
    .filter((type) => type.count > 0);

  const segments = services.customerSegments;
  const studies = caseStudies(featuredFirst(portfolio)).slice(0, HOME_CASE_STUDIES);

  // Financing worked example: the cheapest available package.
  const cheapestPackage = packages.filter((pkg) => lowestPrice(pkg) > 0).sort((a, b) => lowestPrice(a) - lowestPrice(b))[0] ?? null;
  const { website, financing, calculator } = settings;

  return (
    <>
      <OrganizationJsonLd settings={settings} />
      <HomeHero phone={settings.business.phone} fromPrice={heroFromPrice} packageTypes={heroPackageTypes} />

      {website.stats.length > 0 && <StatsBand stats={website.stats} sample={website.sample} />}

      <ClientLogos clients={clients} />

      <WhyChooseUs />

      <Solutions segments={segments} />

      {packages.length > 0 && (
        <Section
          id="packages"
          tone="white"
          eyebrow="Packages"
          title="Find your package"
          description="Complete systems with the inverter, batteries and installation included. Choose a battery type to see options from entry level to premium."
          actions={seeAll(storeRoutes.packages, "All packages")}
        >
          <PackageFinder packages={packages} />
        </Section>
      )}

      {calculator && <CalculatorTeaser />}

      {studies.length > 0 && (
        <Section
          tone="white"
          eyebrow="Case studies"
          title="Systems we have installed"
          description="Real installations: where they are, what we fitted and what they now keep running."
          actions={seeAll(storeRoutes.portfolio, "See all our work")}
        >
          <PortfolioGrid items={studies} categoryTitles={segmentTitles(segments)} linkToCategory />
        </Section>
      )}

      <Reviews testimonials={testimonials} />

      <Section
        tone="white"
        eyebrow="How it works"
        title="From your first call to after-sales support"
        description="Every order is confirmed by phone before anything is delivered, and our own engineers do the installation."
      >
        <HowItWorks gatewayEnabled={settings.payments.gatewayEnabled} />
      </Section>

      {financing && <Financing financing={financing} examplePackage={cheapestPackage} examplePrice={cheapestPackage ? lowestPrice(cheapestPackage) : 0} />}

      <FaqPreview faqs={faqs} />

      <FinalCta phone={settings.business.phone} whatsappNumber={website.whatsappNumber} businessHours={website.businessHours} />
    </>
  );
}
