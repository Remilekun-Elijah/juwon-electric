import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft, ImageOff } from "lucide-react";
import RichText from "@/components/public/RichText";
import SiteImage from "@/components/public/SiteImage";
import { getCategory, getProduct, getProducts } from "@/lib/api/public";
import { isr, readOr } from "@/lib/api/server";
import type { Category, PublicProduct } from "@/lib/api/types";
import { attributeRows, categoryPath, formatPrice, productPath } from "@/lib/catalog";
import { cn } from "@/lib/cn";
import { buttonBase, buttonHover, siteContainer } from "@/lib/publicStyles";
import { richTextToPlain, sanitizeRichText } from "@/lib/sanitize";
import { SITE_NAME, SITE_URL, routes } from "@/lib/site";

export const revalidate = 300;
export const dynamicParams = true;

/** Pre-render the first 100 active products (the contract's page cap); the rest render on first request. */
export async function generateStaticParams() {
  const result = await readOr("GET /products (static params)", () => getProducts({ page: 1, limit: 100 }, isr(["products"])), null);
  return (result.data?.items ?? []).map((product) => ({ slug: product.slug || product.id }));
}

/** 404 (not active or unknown) → notFound(); other failures throw so a 404 isn't cached during an outage. */
async function loadProduct(slug: string): Promise<PublicProduct | null> {
  const result = await readOr<PublicProduct | null>(`GET /products/${slug}`, () => getProduct(slug, isr(["products", `product:${slug}`])), null);
  if (result.notFound) return null;
  if (!result.data) throw new Error("Product could not be loaded. Please try again shortly.");
  return result.data;
}

export async function generateMetadata({ params }: PageProps<"/products/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const product = await loadProduct(slug).catch(() => null);
  if (!product) return { title: "Product not found", robots: { index: false } };
  const description =
    richTextToPlain(product.descriptionHtml, 160) || `${product.name}${product.brand ? ` by ${product.brand}` : ""} — ${formatPrice(product.price)}.`;
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

function productJsonLd(product: PublicProduct) {
  const data = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    sku: product.sku,
    description: richTextToPlain(product.descriptionHtml, 5000) || undefined,
    brand: product.brand ? { "@type": "Brand", name: product.brand } : undefined,
    category: product.category?.name,
    image: product.images?.map((image) => (image.startsWith("/") ? `${SITE_URL}${image}` : image)),
    url: `${SITE_URL}${productPath(product)}`,
    offers: {
      "@type": "Offer",
      price: product.price,
      priceCurrency: product.currency || "NGN",
      availability: product.inStock ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
      seller: { "@type": "Organization", name: SITE_NAME },
    },
  };
  return JSON.stringify(data).replace(/</g, "\\u003c");
}

export default async function ProductPage({ params }: PageProps<"/products/[slug]">) {
  const { slug } = await params;
  const product = await loadProduct(slug);
  if (!product) notFound();

  // Attribute labels and units come from the category's schema (contract §4.1).
  const category = product.categoryId
    ? (await readOr<Category | null>(`GET /categories/${product.categoryId}`, () => getCategory(product.categoryId as string, isr(["categories"])), null)).data
    : null;
  const rows = attributeRows(product.attributes ?? {}, category?.attributes);
  const images = product.images ?? [];
  const hasDescription = Boolean(sanitizeRichText(product.descriptionHtml));

  return (
    <div className="energyBackground pb-24 pt-32">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: productJsonLd(product) }} />
      <div className={siteContainer}>
        <nav aria-label="Breadcrumb" className="mb-6">
          <ol className="inter-medium flex flex-wrap items-center gap-1 text-sm text-faint">
            <li>
              <Link href={routes.products} className="inline-flex items-center gap-1 rounded-sm hover:underline focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-brand-500">
                <ChevronLeft aria-hidden="true" className="h-4 w-4" />
                All products
              </Link>
            </li>
            {product.category && (
              <li className="flex items-center gap-1">
                <span aria-hidden="true">/</span>
                <Link href={categoryPath(product.category)} className="rounded-sm hover:underline focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-brand-500">
                  {product.category.name}
                </Link>
              </li>
            )}
          </ol>
        </nav>

        <article className="grid gap-8 rounded-xl bg-white p-6 shadow-sm md:grid-cols-2 md:p-10">
          <div>
            <div className="relative aspect-square overflow-hidden rounded-lg bg-offWhite">
              {images[0] ? (
                <SiteImage src={images[0]} alt={product.name} fill priority sizes="(min-width: 768px) 45vw, 90vw" className="object-contain p-6" />
              ) : (
                <ImageOff aria-hidden="true" className="absolute inset-0 m-auto h-12 w-12 text-faint/50" />
              )}
            </div>
            {images.length > 1 && (
              <ul className="mt-3 grid grid-cols-4 gap-3" aria-label="More images">
                {images.slice(1, 9).map((image, index) => (
                  <li key={image} className="relative aspect-square overflow-hidden rounded-md bg-offWhite">
                    <SiteImage src={image} alt={`${product.name}, image ${index + 2}`} fill sizes="120px" className="object-contain p-2" />
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div>
            {product.brand && <p className="inter-medium text-sm uppercase tracking-wide text-faint">{product.brand}</p>}
            <h1 className="sora-bold mt-1 text-2xl leading-tight text-deep_red md:text-4xl">{product.name}</h1>
            <p className="inter-regular mt-1 text-sm text-slate-500">SKU {product.sku}</p>

            <div className="mt-6 flex flex-wrap items-center gap-3">
              <p className="inter-bold text-3xl text-slate-900">{formatPrice(product.price)}</p>
              <span
                className={cn(
                  "inter-semibold rounded-full px-3 py-1 text-sm",
                  product.inStock ? "bg-green-50 text-green-700" : "bg-slate-100 text-slate-600"
                )}
              >
                {product.inStock ? "In stock" : "Out of stock"}
              </span>
            </div>

            <div className="mt-6 flex flex-wrap gap-3">
              <Link href={routes.contact} className={cn(buttonBase, buttonHover, "bg-brand-500 text-white")}>
                Request a quote
              </Link>
              <Link
                href={routes.packages}
                className={cn(buttonBase, "border-2 border-brand-500 text-brand-500 transition-colors hover:bg-brand-500 hover:text-white")}
              >
                See packages
              </Link>
            </div>

            {hasDescription && (
              <section aria-labelledby="product-description" className="mt-8">
                <h2 id="product-description" className="sora-semibold mb-3 text-xl text-deep_red">
                  Description
                </h2>
                <RichText html={product.descriptionHtml} />
              </section>
            )}

            {rows.length > 0 && (
              <section aria-labelledby="product-specs" className="mt-8">
                <h2 id="product-specs" className="sora-semibold mb-3 text-xl text-deep_red">
                  Specifications
                </h2>
                <dl className="divide-y divide-slate-100 rounded-lg border border-slate-200">
                  {rows.map((row) => (
                    <div key={row.key} className="grid grid-cols-2 gap-4 px-4 py-2.5 text-sm">
                      <dt className="inter-medium text-slate-600">{row.label}</dt>
                      <dd className="inter-regular text-slate-900">{row.value}</dd>
                    </div>
                  ))}
                </dl>
              </section>
            )}

            {product.tags?.length > 0 && (
              <ul aria-label="Tags" className="mt-6 flex flex-wrap gap-2">
                {product.tags.map((tag) => (
                  <li key={tag} className="inter-medium rounded-full bg-offWhite px-3 py-1 text-xs text-faint">
                    {tag}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </article>
      </div>
    </div>
  );
}
