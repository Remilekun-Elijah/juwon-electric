import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, MessageSquare, Phone } from "lucide-react";
import PageIntro, { INTRO_IMAGES } from "@/components/storefront/PageIntro";
import Section from "@/components/storefront/Section";
import LoadCalculator, { type CalculatorPackage } from "@/components/storefront/calculator/LoadCalculator";
import { availablePackages, kvaValue, lowestPrice, packageCategoryLabel } from "@/components/storefront/catalog/packageMeta";
import SampleBadge from "@/components/storefront/SampleBadge";
import { buttonClasses } from "@/components/ui";
import { cn } from "@/lib/cn";
import { packagePath } from "@/lib/packages";
import { getStorePackages, getStoreSettings } from "@/lib/storefront/data";
import { contactTopicPath, primaryPhone, storeRoutes, telHref } from "@/lib/storefront/routes";
import { storeCard } from "@/lib/storefront/styles";

export const revalidate = 60;

export const metadata: Metadata = {
  title: "Solar and inverter load calculator",
  description:
    "Add the appliances you want to keep running during NEPA outages and get a suggested inverter, battery and solar panel size, with packages that fit.",
  alternates: { canonical: "/calculator" },
};

/**
 * Load calculator (LANDING_V1 §7). The client island gets the calculator settings and a slim list of available packages.
 * When the calculator is off, the page stays useful: a short "Talk to an engineer" page.
 */
export default async function CalculatorPage() {
  const settings = await getStoreSettings();
  const phone = primaryPhone(settings.business.phone);
  const { calculator } = settings;

  if (!calculator) {
    return (
      <>
        <PageIntro
          eyebrow="Size your system"
          title="Talk to an engineer"
          description="Tell us the appliances you want to keep running during outages and an engineer will work out the right inverter, battery and solar size for you."
          image={INTRO_IMAGES.panels}
        />
        <Section>
          <div className={cn(storeCard, "mx-auto max-w-2xl p-6 text-center sm:p-10")}>
            <h2 className="text-xl font-semibold tracking-tight text-slate-900 sm:text-2xl">Get a free sizing from our team</h2>
            <p className="mt-3 text-slate-600">
              Have a list of your appliances ready: fans, lights, TV, fridge, pumping machine or air conditioner. We’ll recommend a
              package that fits your load and budget.
            </p>
            <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
              {phone && (
                <a href={telHref(phone)} className={buttonClasses({ size: "lg" })}>
                  <Phone aria-hidden="true" />
                  <span className="tabular-nums">Call {phone}</span>
                </a>
              )}
              <Link href={contactTopicPath("Help sizing a system")} className={buttonClasses({ variant: "outline", size: "lg" })}>
                <MessageSquare aria-hidden="true" />
                Send a message
              </Link>
            </div>
            <Link href={storeRoutes.packages} className="mt-6 inline-flex min-h-11 items-center gap-1.5 text-sm font-medium text-brand-700 hover:text-brand-800">
              Or browse all packages
              <ArrowRight aria-hidden="true" className="h-4 w-4" />
            </Link>
          </div>
        </Section>
      </>
    );
  }

  const packages: CalculatorPackage[] = availablePackages(await getStorePackages())
    .map((pkg) => ({
      id: String(pkg.id),
      name: pkg.name,
      kva: kvaValue(pkg),
      price: lowestPrice(pkg),
      href: packagePath(pkg),
      categoryLabel: packageCategoryLabel(pkg),
    }))
    .filter((pkg) => pkg.kva > 0 && pkg.price > 0);

  return (
    <>
      <PageIntro
        eyebrow="Size your system"
        title="Load calculator"
        description="Choose the appliances you want to keep running during outages. We’ll suggest an inverter, battery and solar panel size, and show packages that fit."
        image={INTRO_IMAGES.panels}
      >
        <SampleBadge show={calculator.sample} tone="brand" />
      </PageIntro>
      <Section className="pt-8 sm:pt-10">
        <LoadCalculator settings={calculator} packages={packages} phone={phone} />
      </Section>
    </>
  );
}
