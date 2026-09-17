import type { Metadata } from "next";
import Link from "next/link";
import { CircleHelp } from "lucide-react";
import JsonLd from "@/components/storefront/JsonLd";
import PageIntro from "@/components/storefront/PageIntro";
import Section from "@/components/storefront/Section";
import ContactBand from "@/components/storefront/content/ContactBand";
import FaqList from "@/components/storefront/landing/FaqList";
import Reveal from "@/components/storefront/motion/Reveal";
import { EmptyState, buttonClasses } from "@/components/ui";
import { cn } from "@/lib/cn";
import { slugify } from "@/lib/format";
import { SITE_URL } from "@/lib/site";
import { groupFaqs } from "@/lib/storefront/content";
import { getStoreFaqs, getStoreSettings } from "@/lib/storefront/data";
import { storeRoutes } from "@/lib/storefront/routes";
import { storeFocus, storeH2 } from "@/lib/storefront/styles";

export const revalidate = 60;

export const metadata: Metadata = {
  title: "Frequently asked questions",
  description: "Answers about ordering, payment, delivery, installation and choosing an inverter, battery or solar package from Juwon Electric.",
  alternates: { canonical: "/faq" },
};

/** FAQ (LANDING_V1 §7): every question grouped by category, as `<details>` accordions, with FAQPage structured data. */
export default async function FaqPage() {
  const [faqs, settings] = await Promise.all([getStoreFaqs(), getStoreSettings()]);
  const groups = groupFaqs(faqs);
  const withIds = groups.map((group, index) => ({ ...group, id: `faq-${slugify(group.category) || index}` }));

  return (
    <>
      {faqs.length > 0 && (
        <JsonLd
          data={{
            "@context": "https://schema.org",
            "@type": "FAQPage",
            url: `${SITE_URL}${storeRoutes.faq}`,
            mainEntity: faqs.map((faq) => ({
              "@type": "Question",
              name: faq.question,
              acceptedAnswer: { "@type": "Answer", text: faq.answer },
            })),
          }}
        />
      )}

      <PageIntro
        eyebrow="Help"
        title="Frequently asked questions"
        description="How ordering, payment, delivery and installation work, and how to choose the right system."
      >
        {withIds.length > 1 && (
          <nav aria-label="Question topics">
            <ul className="flex flex-wrap gap-2">
              {withIds.map((group) => (
                <li key={group.id}>
                  <a
                    href={`#${group.id}`}
                    className={cn(
                      "inline-flex min-h-11 items-center rounded-full border border-slate-200 bg-white px-4 text-sm font-medium text-slate-700 transition-colors hover:border-brand-200 hover:bg-brand-50 hover:text-brand-700 md:min-h-10",
                      storeFocus
                    )}
                  >
                    {group.category}
                  </a>
                </li>
              ))}
            </ul>
          </nav>
        )}
      </PageIntro>

      <Section>
        {withIds.length > 0 ? (
          <div className="mx-auto max-w-3xl space-y-12">
            {withIds.map((group) => (
              <section key={group.id} id={group.id} aria-labelledby={`${group.id}-heading`} className="scroll-mt-24">
                <Reveal>
                  <h2 id={`${group.id}-heading`} className={cn(storeH2, "mb-5 text-xl sm:text-2xl")}>
                    {group.category}
                  </h2>
                  <FaqList faqs={group.items} />
                </Reveal>
              </section>
            ))}
          </div>
        ) : (
          <EmptyState
            standalone
            icon={CircleHelp}
            title="Questions are being added"
            description="Call or message us and we’ll answer anything about our packages, delivery or installation."
            action={
              <Link href={storeRoutes.contact} className={buttonClasses()}>
                Ask a question
              </Link>
            }
          />
        )}
      </Section>

      <ContactBand
        business={settings.business}
        title="Still have a question?"
        description="Talk to an engineer about your home or business. We’ll explain the options and recommend a system that fits."
        topic="Question from the FAQ page"
      />
    </>
  );
}
