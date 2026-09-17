import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CheckCircle2, ClipboardList, Package as PackageIcon, Phone, ShieldCheck, Truck, Wrench } from "lucide-react";
import CatalogHelpBand from "@/components/storefront/catalog/CatalogHelpBand";
import PackageGrid from "@/components/storefront/catalog/PackageGrid";
import PackageOptionPicker from "@/components/storefront/catalog/PackageOptionPicker";
import {
  hasSolarOption,
  highestPrice,
  kvaValue,
  lowestPrice,
  packageRating,
  packageTypeKey,
  packageTypeLabel,
  pricedOptions,
} from "@/components/storefront/catalog/packageMeta";
import JsonLd from "@/components/storefront/JsonLd";
import PageIntro from "@/components/storefront/PageIntro";
import PriceTag from "@/components/storefront/PriceTag";
import Section from "@/components/storefront/Section";
import { Badge } from "@/components/ui";
import type { Package } from "@/lib/api/types";
import { formatPrice } from "@/lib/catalog";
import { cn } from "@/lib/cn";
import { packagePath, packageTitle } from "@/lib/packages";
import { SITE_NAME, SITE_URL } from "@/lib/site";
import { getStorePackage, getStorePackages } from "@/lib/storefront/data";
import { contactTopicPath, storeRoutes } from "@/lib/storefront/routes";
import { storeCard, storeCardPadding, storeContainer, storeH3, storeLink } from "@/lib/storefront/styles";

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

/** Same-type packages, closest in size first. */
const relatedPackages = (all: Package[], pkg: Package) =>
  all
    .filter((other) => String(other.id) !== String(pkg.id) && packageTypeKey(other) === packageTypeKey(pkg))
    .sort((a, b) => Math.abs(kvaValue(a) - kvaValue(pkg)) - Math.abs(kvaValue(b) - kvaValue(pkg)))
    .slice(0, 3);

export default async function PackageDetailPage({ params }: PageProps<"/storefront/packages/[id]">) {
  const { id } = await params;
  const [pkg, all] = await Promise.all([getStorePackage(id), getStorePackages()]);
  if (!pkg) notFound();

  const items = pkg.items ?? [];
  const related = relatedPackages(all, pkg);
  const kitsOptions = pricedOptions(pkg).filter((option) => option.kits);

  return (
    <>
      <JsonLd data={packageJsonLd(pkg)} />
      <PageIntro
        eyebrow={`${packageTypeLabel(pkg)} package`}
        title={packageTitle(pkg)}
        breadcrumbs={[
          { label: "Packages", href: storeRoutes.packages },
          { label: `${pkg.name} ${pkg.kva}kVA`, href: packagePath(pkg) },
        ]}
      >
        <div className="flex flex-wrap items-center gap-2">
          <Badge tone="brand">{packageRating(pkg)}</Badge>
          {hasSolarOption(pkg) && <Badge tone="warning">Available with solar</Badge>}
          {items.length > 0 && (
            <Badge tone="neutral">
              {items.length} {items.length === 1 ? "part" : "parts"} listed
            </Badge>
          )}
        </div>
      </PageIntro>

      <div className={cn(storeContainer, "py-10 sm:py-14")}>
        <div className="grid gap-6 lg:grid-cols-3 lg:items-start lg:gap-8">
          <aside aria-labelledby="package-buy" className={cn(storeCard, storeCardPadding, "lg:sticky lg:top-24 lg:order-last")}>
            <h2 id="package-buy" className={storeH3}>
              Price and options
            </h2>
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
          </aside>

          <div className="space-y-6 lg:col-span-2">
            <section aria-labelledby="package-powers" className={cn(storeCard, storeCardPadding)}>
              <h2 id="package-powers" className={storeH3}>
                What it powers
              </h2>
              <p className="mt-3 leading-relaxed text-slate-600">{pkg.load}</p>
              <p className="mt-3 text-sm text-slate-500">
                A typical load for a {pkg.kva}kVA system. Every home is different, so we check your appliances before installation.
              </p>
            </section>

            <section aria-labelledby="package-included" className={cn(storeCard, storeCardPadding)}>
              <h2 id="package-included" className={storeH3}>
                What’s included
              </h2>
              {items.length > 0 ? (
                <ul className="mt-4 divide-y divide-slate-100 border-y border-slate-100">
                  {items.map((line) => (
                    <li key={`${line.productId}-${line.note ?? ""}`} className="flex gap-3 py-3 sm:gap-4">
                      <span className="inline-flex h-8 min-w-10 shrink-0 items-center justify-center rounded-lg bg-slate-100 px-2 text-sm font-semibold tabular-nums text-slate-700">
                        {line.quantity}
                        <span aria-hidden="true">&times;</span>
                        <span className="sr-only"> of</span>
                      </span>
                      <div className="min-w-0 flex-1">
                        {line.slug ? (
                          <Link href={`${storeRoutes.products}/${encodeURIComponent(line.slug)}`} className={cn(storeLink, "break-words")}>
                            {line.name}
                          </Link>
                        ) : (
                          <span className="font-medium text-slate-900">{line.name}</span>
                        )}
                        <p className="mt-0.5 text-sm text-slate-500">
                          {line.sku && <span className="tabular-nums">SKU {line.sku}</span>}
                          {line.sku && line.note && <span aria-hidden="true"> · </span>}
                          {line.note}
                        </p>
                      </div>
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="mt-4">
                  {kitsOptions.length > 0 && (
                    <ul className="space-y-3">
                      {kitsOptions.map((option) => (
                        <li key={option.index} className="flex gap-2.5 text-slate-600">
                          <CheckCircle2 aria-hidden="true" className="mt-0.5 h-5 w-5 shrink-0 text-green-600" />
                          <p>
                            <span className="font-medium text-slate-900">{option.name}: </span>
                            {option.kits}
                          </p>
                        </li>
                      ))}
                    </ul>
                  )}
                  <p className="mt-4 flex items-center gap-2 rounded-xl bg-slate-50 p-4 text-sm text-slate-500">
                    <ClipboardList aria-hidden="true" className="h-4 w-4 shrink-0 text-slate-400" />
                    Detailed parts list coming soon.
                  </p>
                </div>
              )}
            </section>

            <section aria-labelledby="package-install" className={cn(storeCard, storeCardPadding)}>
              <h2 id="package-install" className={storeH3}>
                Delivery and installation
              </h2>
              <ul className="mt-4 grid gap-5 sm:grid-cols-2">
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
              </ul>
            </section>
          </div>
        </div>
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

      <div className={cn(storeContainer, "py-10 sm:py-14")}>
        <CatalogHelpBand topic={packageTitle(pkg)} secondary={{ label: "All packages", href: storeRoutes.packages }} />
      </div>
    </>
  );
}
