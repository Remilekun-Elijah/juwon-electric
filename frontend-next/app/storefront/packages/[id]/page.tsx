import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { MessageSquare, Package as PackageIcon, Phone, ShieldCheck, Truck, Wrench } from "lucide-react";
import CatalogHelpBand from "@/components/storefront/catalog/CatalogHelpBand";
import PackageGrid from "@/components/storefront/catalog/PackageGrid";
import PackageIncluded from "@/components/storefront/catalog/PackageIncluded";
import PackageOptionPicker from "@/components/storefront/catalog/PackageOptionPicker";
import { PackageOptionScope } from "@/components/storefront/catalog/PackageOptionScope";
import {
  availablePackages,
  defaultCartOptionIndex,
  hasSolarOption,
  highestPrice,
  includedProductCount,
  isPackageAvailable,
  kvaValue,
  lowestPrice,
  packageRating,
  packageTypeKey,
  packageTypeLabel,
  pricedOptions,
} from "@/components/storefront/catalog/packageMeta";
import JsonLd from "@/components/storefront/JsonLd";
import PageIntro, { INTRO_IMAGES } from "@/components/storefront/PageIntro";
import PriceTag from "@/components/storefront/PriceTag";
import Section from "@/components/storefront/Section";
import Reveal from "@/components/storefront/motion/Reveal";
import { buttonClasses } from "@/components/ui";
import type { Package } from "@/lib/api/types";
import { categoryPath, formatPrice } from "@/lib/catalog";
import { cn } from "@/lib/cn";
import { packagePath, packageTitle } from "@/lib/packages";
import { SITE_NAME, SITE_URL } from "@/lib/site";
import { getStoreCategories, getStorePackage, getStorePackages } from "@/lib/storefront/data";
import { contactTopicPath, storeRoutes } from "@/lib/storefront/routes";
import { enterDelay, storeCard, storeCardPadding, storeContainer, storeDarkBadge, storeH3, storeLink } from "@/lib/storefront/styles";

export const revalidate = 60;
export const dynamicParams = true;

/** Pre-render every known package; new ones render on first request and are then cached. */
export async function generateStaticParams() {
  const packages = await getStorePackages();
  return packages.map((pkg) => ({ id: String(pkg.id) }));
}

const metaDescription = (pkg: Package) => {
  const prices = pricedOptions(pkg)
    .map((option) => `${option.name}: ${formatPrice(option.amount)}`)
    .join("; ");
  return [`Powers ${pkg.load}.`, prices ? `${prices}.` : "", "Delivered and installed by our engineers."].filter(Boolean).join(" ");
};

export async function generateMetadata({ params }: PageProps<"/storefront/packages/[id]">): Promise<Metadata> {
  const { id } = await params;
  const pkg = await getStorePackage(id);
  if (!pkg) return { title: "Package not found", robots: { index: false } };
  const title = packageTitle(pkg);
  const description = metaDescription(pkg);
  return {
    title,
    description,
    alternates: { canonical: packagePath(pkg) },
    openGraph: { url: packagePath(pkg), title: `${title} | ${SITE_NAME}`, description },
  };
}

/** JSON-LD `Product`; the `AggregateOffer` counts available options only (Commerce v2 §4). */
function packageJsonLd(pkg: Package) {
  const low = lowestPrice(pkg);
  const offers = pricedOptions(pkg);
  return {
    "@context": "https://schema.org",
    "@type": "Product",
    name: packageTitle(pkg),
    description: metaDescription(pkg),
    category: `${packageTypeLabel(pkg)} inverter package`,
    brand: { "@type": "Brand", name: SITE_NAME },
    url: `${SITE_URL}${packagePath(pkg)}`,
    offers: low
      ? {
          "@type": "AggregateOffer",
          priceCurrency: "NGN",
          lowPrice: low,
          highPrice: highestPrice(pkg),
          offerCount: offers.length,
          seller: { "@type": "Organization", name: SITE_NAME },
        }
      : undefined,
  };
}

const reassurance = [
  {
    icon: Phone,
    title: "We call to confirm",
    body: "After you order, our team calls to confirm the package, your address and a delivery date that suits you.",
  },
  {
    icon: Truck,
    title: "Delivered to your site",
    body: "We bring the inverter, batteries and any panels to your home or business.",
  },
  {
    icon: Wrench,
    title: "Installed by our engineers",
    body: "Our own engineers wire the system, set it up for your load and test it before they leave.",
  },
  {
    icon: ShieldCheck,
    title: "Support after installation",
    body: "We show you how to use and care for the system, and we’re a call away for maintenance or questions.",
  },
];

/** Available same-type packages, closest in size first. */
const relatedPackages = (all: Package[], pkg: Package) =>
  availablePackages(all)
    .filter((other) => String(other.id) !== String(pkg.id) && packageTypeKey(other) === packageTypeKey(pkg))
    .sort((a, b) => Math.abs(kvaValue(a) - kvaValue(pkg)) - Math.abs(kvaValue(b) - kvaValue(pkg)))
    .slice(0, 3);

export default async function PackageDetailPage({ params }: PageProps<"/storefront/packages/[id]">) {
  const { id } = await params;
  const [pkg, all, categories] = await Promise.all([getStorePackage(id), getStorePackages(), getStoreCategories()]);
  if (!pkg) notFound();

  const available = isPackageAvailable(pkg);
  const productCount = includedProductCount(pkg);
  const related = relatedPackages(all, pkg);
  // Commerce v3 §4: the catalogue category, when set and active.
  const categoryRef = pkg.categoryRef ?? null;

  return (
    <>
      <JsonLd data={packageJsonLd(pkg)} />
      <PageIntro
        eyebrow={categoryRef ? `${categoryRef.name} · ${packageTypeLabel(pkg)} package` : `${packageTypeLabel(pkg)} package`}
        title={packageTitle(pkg)}
        breadcrumbs={[
          { label: "Packages", href: storeRoutes.packages },
          ...(categoryRef ? [{ label: categoryRef.name, href: categoryPath(categoryRef) }] : []),
          { label: `${pkg.name} ${pkg.kva}kVA`, href: packagePath(pkg) },
        ]}
        image={hasSolarOption(pkg) ? INTRO_IMAGES.home : INTRO_IMAGES.commercial}
      >
        <div className="flex flex-wrap items-center gap-2">
          <span className={storeDarkBadge}>{packageRating(pkg)}</span>
          {hasSolarOption(pkg) && <span className={`${storeDarkBadge} border-gold-400/40 text-gold-300`}>Available with solar</span>}
          {productCount > 0 && (
            <span className={storeDarkBadge}>
              Includes {productCount} {productCount === 1 ? "product" : "products"}
            </span>
          )}
        </div>
      </PageIntro>

      <div className={cn(storeContainer, "py-10 sm:py-14")}>
        <PackageOptionScope defaultIndex={defaultCartOptionIndex(pkg)}>
          <div className="grid gap-6 lg:grid-cols-3 lg:items-start lg:gap-8">
            <aside
              aria-labelledby="package-buy"
              style={enterDelay(250)}
              className={cn(storeCard, storeCardPadding, "je-in je-in-right lg:sticky lg:top-24 lg:order-last")}
            >
              <h2 id="package-buy" className={storeH3}>
                Price and options
              </h2>
              {available ? (
                <>
                  <div className="mt-2">
                    <PriceTag amount={lowestPrice(pkg)} prefix="From" size="lg" />
                  </div>
                  <div className="mt-5">
                    <PackageOptionPicker pkg={pkg} />
                  </div>
                  <p className="mt-4 text-sm text-slate-500">
                    Questions first?{" "}
                    <Link href={contactTopicPath(packageTitle(pkg))} className={storeLink}>
                      Ask about this package
                    </Link>
                  </p>
                </>
              ) : (
                <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-4">
                  <p className="font-semibold text-slate-900">Currently unavailable — contact us</p>
                  <p className="mt-1 text-sm leading-relaxed text-slate-600">
                    This package can’t be ordered online right now. Tell us what you want to power and an engineer will quote
                    this system or a close match.
                  </p>
                  <Link href={contactTopicPath(packageTitle(pkg))} className={buttonClasses({ size: "lg", className: "mt-4 w-full" })}>
                    <MessageSquare aria-hidden="true" />
                    Contact us about this package
                  </Link>
                </div>
              )}
            </aside>

            <div className="space-y-6 lg:col-span-2">
              <Reveal as="section" aria-labelledby="package-powers" style={enterDelay(320)} className={cn(storeCard, storeCardPadding, "je-in")}>
                <h2 id="package-powers" className={storeH3}>
                  What it powers
                </h2>
                <p className="mt-3 leading-relaxed text-slate-600">{pkg.load}</p>
                <p className="mt-3 text-sm text-slate-500">
                  A typical load for a {pkg.kva}kVA system. Every home is different, so we check your appliances before installation.
                </p>
              </Reveal>

              <Reveal as="section" aria-labelledby="package-included" style={enterDelay(400)} className={cn(storeCard, storeCardPadding, "je-in")}>
                <h2 id="package-included" className={storeH3}>
                  What’s included
                </h2>
                <PackageIncluded pkg={pkg} categories={categories} />
              </Reveal>

              <Reveal as="section" aria-labelledby="package-install" style={enterDelay(480)} className={cn(storeCard, storeCardPadding, "je-in")}>
                <h2 id="package-install" className={storeH3}>
                  Delivery and installation
                </h2>
                <Reveal as="ul" stagger className="mt-4 grid gap-5 sm:grid-cols-2">
                  {reassurance.map(({ icon: Icon, title, body }) => (
                    <li key={title} className="flex gap-3">
                      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-brand-50 text-brand-700">
                        <Icon aria-hidden="true" className="h-5 w-5" />
                      </span>
                      <div>
                        <h3 className="text-sm font-semibold text-slate-900">{title}</h3>
                        <p className="mt-1 text-sm leading-relaxed text-slate-600">{body}</p>
                      </div>
                    </li>
                  ))}
                </Reveal>
              </Reveal>
            </div>
          </div>
        </PackageOptionScope>
      </div>

      {related.length > 0 && (
        <Section
          tone="white"
          eyebrow={`More ${packageTypeLabel(pkg).toLowerCase()} packages`}
          title="Compare similar packages"
          actions={
            <Link href={`${storeRoutes.packages}?type=${packageTypeKey(pkg)}`} className={cn(storeLink, "inline-flex min-h-11 items-center gap-1.5")}>
              <PackageIcon aria-hidden="true" className="h-4 w-4" />
              See all {packageTypeLabel(pkg).toLowerCase()} packages
            </Link>
          }
        >
          <PackageGrid packages={related} />
        </Section>
      )}

      <Reveal className={cn(storeContainer, "py-10 sm:py-14")}>
        <CatalogHelpBand topic={packageTitle(pkg)} secondary={{ label: "All packages", href: storeRoutes.packages }} />
      </Reveal>
    </>
  );
}
