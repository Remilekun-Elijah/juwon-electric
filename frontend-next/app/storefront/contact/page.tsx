import type { Metadata } from "next";
import { Suspense } from "react";
import PageIntro from "@/components/storefront/PageIntro";
import BusinessDetails from "@/components/storefront/content/BusinessDetails";
import ContactForm from "@/components/storefront/content/ContactForm";
import ContactFormWithTopic from "@/components/storefront/content/ContactFormWithTopic";
import { cn } from "@/lib/cn";
import { socials } from "@/lib/site";
import { getStoreSettings } from "@/lib/storefront/data";
import { storeCard, storeContainer, storeFocus, storeSection } from "@/lib/storefront/styles";

export const revalidate = 60;

export const metadata: Metadata = {
  title: "Contact us",
  description: "Tell us what you need to power. Our engineers will recommend the right inverter, battery and solar setup.",
  alternates: { canonical: "/contact" },
};

const socialLinks = [
  { label: "Facebook", href: socials.fb },
  { label: "Instagram", href: socials.insta },
  { label: "TikTok", href: socials.tt },
  { label: "X", href: socials.x },
];

/**
 * Contact (docs/agents/fe-storefront.md §4 `/contact`): the message form (prefilled from `?topic=` on the client, so
 * the page stays static) and business details from settings. No opening hours: they aren't in settings.
 */
export default async function ContactPage() {
  const settings = await getStoreSettings();

  return (
    <>
      <PageIntro
        eyebrow="Get in touch"
        title="Contact us"
        description="Tell us what you need to power. Our engineers will recommend the right inverter, battery and solar setup."
      />

      <div className={storeSection}>
        <div className={cn(storeContainer, "grid gap-6 lg:grid-cols-[minmax(0,1fr)_400px] lg:items-start lg:gap-8")}>
          <div className={cn(storeCard, "min-w-0 p-5 sm:p-8")}>
            <Suspense fallback={<ContactForm />}>
              <ContactFormWithTopic />
            </Suspense>
          </div>

          <aside aria-labelledby="contact-details-heading" className="space-y-6">
            <div className={cn(storeCard, "p-5 sm:p-6")}>
              <h2 id="contact-details-heading" className="text-lg font-semibold tracking-tight text-slate-900">
                Contact details
              </h2>
              <p className="mt-1 text-sm text-slate-500">For quick questions about a package or an order, calling is fastest.</p>
              <BusinessDetails business={settings.business} className="mt-6" />
            </div>

            <div className={cn(storeCard, "p-5 sm:p-6")}>
              <h2 className="text-lg font-semibold tracking-tight text-slate-900">Follow our work</h2>
              <p className="mt-1 text-sm text-slate-500">Photos and videos of recent installations.</p>
              <ul className="mt-4 flex flex-wrap gap-2">
                {socialLinks.map((social) => (
                  <li key={social.label}>
                    <a
                      href={social.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={cn(
                        "inline-flex min-h-11 items-center rounded-full border border-slate-200 px-4 text-sm font-medium text-slate-600 transition-colors hover:border-brand-200 hover:bg-brand-50 hover:text-brand-700 md:min-h-9",
                        storeFocus
                      )}
                    >
                      {social.label}
                      <span className="sr-only"> (opens in a new tab)</span>
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          </aside>
        </div>
      </div>
    </>
  );
}
