import type { Metadata } from "next";
import Link from "next/link";
import PageIntro, { INTRO_IMAGES } from "@/components/storefront/PageIntro";
import Section from "@/components/storefront/Section";
import ContactBand from "@/components/storefront/content/ContactBand";
import PortfolioGrid, { featuredFirst } from "@/components/storefront/content/PortfolioGrid";
import { EmptyState, buttonClasses } from "@/components/ui";
import { getStorePortfolio, getStoreSettings } from "@/lib/storefront/data";
import { storeRoutes } from "@/lib/storefront/routes";

export const revalidate = 60;

export const metadata: Metadata = {
  title: "Our work",
  description: "Inverter, battery and solar installations we have completed for homes and businesses.",
  alternates: { canonical: "/portfolio" },
};

/**
 * Portfolio (fe-storefront.md §4): every completed installation, featured projects first. Shown as one gallery — our
 * work is no longer grouped or filtered by industry (2026-09-20).
 */
export default async function PortfolioPage() {
  const [portfolio, settings] = await Promise.all([getStorePortfolio(), getStoreSettings()]);
  const items = featuredFirst(portfolio);

  return (
    <>
      <PageIntro
        eyebrow="Portfolio"
        title="Our work"
        description="Inverter, battery and solar installations we have completed for homes and businesses."
        image={INTRO_IMAGES.sunset}
      />

      <Section>
        <p role="status" className="sr-only">
          {items.length} {items.length === 1 ? "project" : "projects"}
        </p>
        {items.length > 0 ? (
          <PortfolioGrid items={items} headingAs="h2" priorityCount={3} />
        ) : (
          <EmptyState
            standalone
            title="No projects to show yet"
            description="We’re adding photos of recent installations. Ask us for examples of systems like the one you need."
            action={
              <Link href={storeRoutes.contact} className={buttonClasses()}>
                Contact us
              </Link>
            }
          />
        )}
      </Section>

      <ContactBand
        business={settings.business}
        title="Want a system like these?"
        description="Tell us about your home or business and what you need to power. We’ll recommend a setup."
      />
    </>
  );
}
