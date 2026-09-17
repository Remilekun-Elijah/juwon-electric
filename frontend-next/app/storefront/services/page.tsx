import type { Metadata } from "next";
import Link from "next/link";
import { Phone } from "lucide-react";
import PageIntro from "@/components/storefront/PageIntro";
import Section from "@/components/storefront/Section";
import ContactBand from "@/components/storefront/content/ContactBand";
import { OfferingCard, SegmentCard, contentKey } from "@/components/storefront/content/ServiceCards";
import { EmptyState, buttonClasses } from "@/components/ui";
import { getStoreServices, getStoreSettings } from "@/lib/storefront/data";
import { primaryPhone, storeRoutes, telHref } from "@/lib/storefront/routes";

export const revalidate = 60;

export const metadata: Metadata = {
  title: "Services",
  description: "System design, energy audits, installation, maintenance and after-sales support for homes, businesses and institutions.",
  alternates: { canonical: "/services" },
};

/** Services (docs/agents/fe-storefront.md §4 `/services`): offerings, customer segments and a contact CTA. */
export default async function ServicesPage() {
  const [services, settings] = await Promise.all([getStoreServices(), getStoreSettings()]);
  const { offerings, customerSegments } = services;
  const phone = primaryPhone(settings.business.phone);

  return (
    <>
      <PageIntro
        eyebrow="What we do"
        title="Services"
        description="System design, energy audits, installation, maintenance and after-sales support for homes, businesses and institutions."
        actions={
          <>
            <Link href={storeRoutes.contact} className={buttonClasses({ size: "lg" })}>
              Talk to an engineer
            </Link>
            {phone && (
              <a href={telHref(phone)} className={buttonClasses({ variant: "outline", size: "lg" })}>
                <Phone aria-hidden="true" />
                <span className="tabular-nums">{phone}</span>
              </a>
            )}
          </>
        }
      />

      <Section eyebrow="Offerings" title="How we can help">
        {offerings.length > 0 ? (
          <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {offerings.map((offering, index) => (
              <li key={contentKey(offering, index)} className="min-w-0">
                <OfferingCard offering={offering} />
              </li>
            ))}
          </ul>
        ) : (
          <EmptyState
            standalone
            title="Our service list is being updated"
            description="Tell us what you need and an engineer will get back to you."
            action={
              <Link href={storeRoutes.contact} className={buttonClasses()}>
                Contact us
              </Link>
            }
          />
        )}
      </Section>

      {customerSegments.length > 0 && (
        <Section
          tone="white"
          eyebrow="Customers"
          title="Who we power"
          description="Homes, businesses and institutions that need power they can rely on."
        >
          <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {customerSegments.map((segment, index) => (
              <li key={contentKey(segment, index)} className="min-w-0">
                <SegmentCard segment={segment} />
              </li>
            ))}
          </ul>
        </Section>
      )}

      <ContactBand business={settings.business} />
    </>
  );
}
