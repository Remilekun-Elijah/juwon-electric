import JsonLd from "@/components/storefront/JsonLd";
import { SITE_NAME, SITE_URL, socials } from "@/lib/site";
import type { StoreSettings } from "@/lib/storefront/data";
import { phoneNumbers } from "@/lib/storefront/routes";
import { isAllowedUrl } from "@/lib/validation";

/** schema.org `LocalBusiness` (an `Organization` subtype) for the home page, built from public settings. Server component. */
export default function OrganizationJsonLd({ settings }: { settings: StoreSettings }) {
  const { business } = settings;
  const phones = phoneNumbers(business.phone);
  const website = business.website && isAllowedUrl(business.website) && /^https:\/\//i.test(business.website) ? business.website : SITE_URL;

  return (
    <JsonLd
      data={{
        "@context": "https://schema.org",
        "@type": "LocalBusiness",
        "@id": `${SITE_URL}/#organization`,
        name: business.name || SITE_NAME,
        url: website,
        logo: `${SITE_URL}/logo.svg`,
        image: `${SITE_URL}/panel-3.webp`,
        telephone: phones[0] || undefined,
        email: business.email || undefined,
        address: business.address
          ? { "@type": "PostalAddress", streetAddress: business.address, addressCountry: "NG" }
          : undefined,
        contactPoint: phones.map((telephone) => ({
          "@type": "ContactPoint",
          telephone,
          contactType: "customer service",
          areaServed: "NG",
        })),
        sameAs: Object.values(socials),
      }}
    />
  );
}
