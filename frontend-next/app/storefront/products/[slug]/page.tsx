import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight, MessageSquare, Package as PackageIcon, Wrench } from "lucide-react";
import RichText from "@/components/public/RichText";
import CatalogHelpBand from "@/components/storefront/catalog/CatalogHelpBand";
import PackageGrid from "@/components/storefront/catalog/PackageGrid";
import { packageIncludesProduct } from "@/components/storefront/catalog/packageMeta";
import ProductGallery from "@/components/storefront/catalog/ProductGallery";
import SpecsTable from "@/components/storefront/catalog/SpecsTable";
import JsonLd from "@/components/storefront/JsonLd";
import PageIntro from "@/components/storefront/PageIntro";
import PriceTag from "@/components/storefront/PriceTag";
import Section from "@/components/storefront/Section";
import StockBadge from "@/components/storefront/StockBadge";
import { buttonClasses } from "@/components/ui";
import type { Package, PublicProduct } from "@/lib/api/types";
import { attributeRows, categoryPath, categoryTrail, formatPrice, productPath } from "@/lib/catalog";
import { cn } from "@/lib/cn";
import { richTextToPlain, sanitizeRichText } from "@/lib/sanitize";
import { SITE_NAME, SITE_URL } from "@/lib/site";
import { getStoreCategories, getStorePackages, getStoreProduct, getStoreProducts } from "@/lib/storefront/data";
import { contactTopicPath, storeRoutes } from "@/lib/storefront/routes";
import { storeCard, storeCardPadding, storeContainer, storeH3, storeLink, storeMeta } from "@/lib/storefront/styles";

export const revalidate = 60;
export const dynamicParams = true;

/** Pre-render the first page of products; the rest render on first request and are then cached. */
export async function generateStaticParams() {
  const { items } = await getStoreProducts({ page: 1 });
  return items.map((product) => ({ slug: product.slug || product.id }));
}

const productDescription = (product: PublicProduct) =>
  richTextToPlain(product.descriptionHtml, 160) ||
  `${product.name}${product.brand ? ` by ${product.brand}` : ""}, ${formatPrice(product.price)}. Specifications and stock status from ${SITE_NAME}.`;

export async function generateMetadata({ params }: PageProps<"/storefront/products/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const product = await getStoreProduct(slug);
  if (!product) return { title: "Product not found", robots: { index: false } };
  const description = productDescription(product);
  return {
    title: product.name,
    description,
    alternates: { canonical: productPath(product) },
    openGraph: {
      url: productPath(product),
      title: `${product.name} | ${SITE_NAME}`,
      description,
      images: product.images?.[0] ? [{ url: product.images[0] }] : undefined,
    },
  };
}

const absoluteUrl = (url: string) => (url.startsWith("/") ? `${SITE_URL}${url}` : url);

function productJsonLd(product: PublicProduct) {
  return {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    sku: product.sku || undefined,
    description: richTextToPlain(product.descriptionHtml, 5000) || undefined,
    brand: product.brand ? { "@type": "Brand", name: product.brand } : undefined,
    category: product.category?.name,
    image: product.images?.length ? product.images.map(absoluteUrl) : undefined,
    url: `${SITE_URL}${productPath(product)}`,
    offers:
      Number(product.price) > 0
        ? {
            "@type": "Offer",
            price: product.price,
            priceCurrency: product.currency || "NGN",
            availability: product.inStock ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
            url: `${SITE_URL}${productPath(product)}`,
            seller: { "@type": "Organization", name: SITE_NAME },
          }
        : undefined,
  };
}

/** Packages with an available option listing this product (plus the deprecated top-level `items`, if still sent). */
const packagesIncluding = (packages: Package[], product: PublicProduct) =>
  packages.filter((pkg) => packageIncludesProduct(pkg, product.id));

export default async function ProductPage({ params }: PageProps<"/storefront/products/[slug]">) {
  const { slug } = await params;
  const product = await getStoreProduct(slug);
  if (!product) notFound();

  const [categories, packages] = await Promise.all([getStoreCategories(), getStorePackages()]);
  const categoryId = product.categoryId ?? product.category?.id ?? null;
  const category = categoryId ? categories.find((item) => item.id === categoryId) : undefined;
  const trail = categoryTrail(categories, categoryId);
  const hasSpecs = attributeRows(product.attributes ?? {}, category?.attributes).length > 0;
  const hasDescription = Boolean(sanitizeRichText(product.descriptionHtml));
  const including = packagesIncluding(packages, product);

  return (
    <>
      <JsonLd data={productJsonLd(product)} />
      <PageIntro
        eyebrow={product.brand || product.category?.name || "Product"}
        title={product.name}
        breadcrumbs={[
          { label: "Products", href: storeRoutes.products },
          ...(trail.length
            ? trail.map((item) => ({ label: item.name, href: categoryPath(item) }))
            : product.category
              ? [{ label: product.category.name, href: categoryPath(product.category) }]
              : []),
          { label: product.name, href: productPath(product) },
        ]}
      >
        <p className={storeMeta}>
          {product.sku && <span className="tabular-nums">SKU {product.sku}</span>}
          {product.sku && product.category && <span aria-hidden="true"> · </span>}
          {product.category && (
            <Link href={categoryPath(product.category)} className={storeLink}>
              {product.category.name}
            </Link>
          )}
        </p>
      </PageIntro>

      <div className={cn(storeContainer, "py-10 sm:py-14")}>
        <div className="grid gap-6 md:grid-cols-2 lg:gap-10">
          <ProductGallery images={product.images} name={product.name} className="md:sticky md:top-24 md:self-start" />

          <div className="space-y-6">
            <section aria-labelledby="product-price" className={cn(storeCard, storeCardPadding)}>
              <h2 id="product-price" className="sr-only">
                Price and availability
              </h2>
              {product.brand && (
                <p className="text-sm text-slate-500">
                  Brand: <span className="font-medium text-slate-900">{product.brand}</span>
                </p>
              )}
              <div className="mt-2 flex flex-wrap items-center gap-3">
                <PriceTag amount={product.price} size="lg" />
                <StockBadge inStock={product.inStock} />
              </div>
              <p className="mt-4 text-sm leading-relaxed text-slate-600">
                We supply this item as part of an installed system or on request. Ask us about price, availability and
                installation for your home or business.
              </p>
              <div className="mt-5 flex flex-col gap-3 sm:flex-row md:flex-col xl:flex-row">
                <Link href={contactTopicPath(product.name)} className={buttonClasses({ size: "lg", className: "w-full sm:flex-1" })}>
                  <MessageSquare aria-hidden="true" />
                  Ask about this product
                </Link>
                <Link href={storeRoutes.packages} className={buttonClasses({ variant: "outline", size: "lg", className: "w-full sm:flex-1" })}>
                  <PackageIcon aria-hidden="true" />
                  Browse packages
                </Link>
              </div>
            </section>

            {hasSpecs && (
              <section aria-labelledby="product-specs" className={cn(storeCard, storeCardPadding)}>
                <h2 id="product-specs" className={storeH3}>
                  Specifications
                </h2>
                <SpecsTable attributes={product.attributes} schema={category?.attributes} className="mt-4" />
              </section>
            )}

            {hasDescription && (
              <section aria-labelledby="product-description" className={cn(storeCard, storeCardPadding)}>
                <h2 id="product-description" className={storeH3}>
                  Description
                </h2>
                <RichText html={product.descriptionHtml} className="mt-3 text-slate-600" />
              </section>
            )}

            {!hasSpecs && !hasDescription && (
              <section aria-labelledby="product-details" className={cn(storeCard, storeCardPadding)}>
                <h2 id="product-details" className={storeH3}>
                  Details
                </h2>
                <p className="mt-3 flex gap-2.5 text-sm leading-relaxed text-slate-600">
                  <Wrench aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-brand-700" />
                  Full specifications for this item are being added. Our engineers can send you the datasheet on request.
                </p>
              </section>
            )}
          </div>
        </div>
      </div>

      {including.length > 0 && (
        <Section
          tone="white"
          eyebrow="Complete systems"
          title="Included in these packages"
          description={`Get the ${product.name} delivered and installed as part of a complete inverter system.`}
          actions={
            <Link href={storeRoutes.packages} className={cn(storeLink, "inline-flex min-h-11 items-center gap-1.5")}>
              All packages
              <ArrowRight aria-hidden="true" className="h-4 w-4" />
            </Link>
          }
        >
          <PackageGrid packages={including.slice(0, 6)} compact className="sm:grid-cols-2" />
        </Section>
      )}

      <div className={cn(storeContainer, "py-10 sm:py-14")}>
        <CatalogHelpBand
          title="Need help choosing parts?"
          description="Tell us what you want to power and our engineers will recommend matching inverters, batteries and panels."
          topic={product.name}
          secondary={{ label: "Browse packages", href: storeRoutes.packages }}
        />
      </div>
    </>
  );
}
