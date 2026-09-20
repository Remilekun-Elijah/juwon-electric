import type { Metadata } from "next";
import Link from "next/link";
import { Phone } from "lucide-react";
import PageIntro, { INTRO_IMAGES } from "@/components/storefront/PageIntro";
import Section from "@/components/storefront/Section";
import ContactBand from "@/components/storefront/content/ContactBand";
import { OfferingCard, contentKey } from "@/components/storefront/content/ServiceCards";
import Industries from "@/components/storefront/landing/Industries";
import Reveal from "@/components/storefront/motion/Reveal";
import { EmptyState, buttonClasses } from "@/components/ui";
import { staggerDelay, storeGlassButton, storeGoldButton } from "@/lib/storefront/styles";
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
  const { offerings } = services;
  const phone = primaryPhone(settings.business.phone);

  return (
    <>
      <PageIntro
        eyebrow="Our services"
        title="Our Services"
        description="System design, energy audits, installation, maintenance and after-sales support for homes, businesses and institutions."
        actions={
          <>
            <Link href={storeRoutes.contact} className={storeGoldButton}>
              Talk to an engineer
            </Link>
            {phone && (
              <a href={telHref(phone)} className={storeGlassButton}>
                <Phone aria-hidden="true" />
                <span className="tabular-nums">{phone}</span>
              </a>
            )}
          </>
        }
        image={INTRO_IMAGES.commercial}
      />

      <Section eyebrow="Our services" title="How We Can Help">
        {offerings.length > 0 ? (
          <Reveal as="ul" stagger className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {offerings.map((offering, index) => (
              <li key={contentKey(offering, index)} style={staggerDelay(index, 60, 350, 6)} className="je-in min-w-0">
                <OfferingCard offering={offering} />
              </li>
            ))}
          </Reveal>
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

      <Industries />

      <ContactBand
        business={settings.business}
        title="Not Sure Which Solar System Is Right for You?"
        description="Tell us what you want to power and your expected usage. Our team will recommend a suitable inverter, battery and solar configuration based on your energy requirements and budget."
      />
    </>
  );
}
