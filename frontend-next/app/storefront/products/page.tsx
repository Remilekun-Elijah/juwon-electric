import type { Metadata } from "next";
import { notFound } from "next/navigation";
import ProductListing, { readListingParams } from "@/components/storefront/catalog/ProductListing";
import PageIntro, { INTRO_IMAGES } from "@/components/storefront/PageIntro";
import { findCategory } from "@/lib/catalog";
import { SITE_NAME } from "@/lib/site";
import { getStoreCategories, getStoreProducts, storeProductsEnabled } from "@/lib/storefront/data";
import { storeRoutes } from "@/lib/storefront/routes";
import { storeContainer } from "@/lib/storefront/styles";

export const revalidate = 60;

const description = "Inverters, batteries, solar panels and accessories, with specifications, prices in naira and stock status.";

export async function generateMetadata({ searchParams }: PageProps<"/storefront/products">): Promise<Metadata> {
  const { q, page, category } = readListingParams(await searchParams);
  const filtered = Boolean(q || category);
  return {
    title: page > 1 ? `Products, page ${page}` : "Products",
    description,
    alternates: { canonical: page > 1 && !filtered ? `${storeRoutes.products}?page=${page}` : storeRoutes.products },
    openGraph: { url: storeRoutes.products, title: `Products | ${SITE_NAME}`, description },
    // Search results and ad-hoc filters shouldn't be indexed; the links on them still should be followed.
    robots: filtered ? { index: false, follow: true } : undefined,
  };
}

/** Product catalogue (spec §4): category sidebar, `?q=` search, `?category=` scope and `?page=` pagination. */
export default async function ProductsPage({ searchParams }: PageProps<"/storefront/products">) {
  if (!(await storeProductsEnabled())) notFound();
  const { q, page, category: categoryParam } = readListingParams(await searchParams);
  const categories = await getStoreCategories();
  const category = categoryParam ? (findCategory(categories, categoryParam) ?? null) : null;
  const result = await getStoreProducts({ q, page, category: category?.id });

  return (
    <>
      <PageIntro eyebrow="Catalogue" title="Products" description={description} image={INTRO_IMAGES.panels} />
      <div className={`${storeContainer} py-10 sm:py-14`}>
        <ProductListing
          categories={categories}
          category={category}
          result={result}
          q={q}
          page={page}
          basePath={storeRoutes.products}
          keep={{ category: category ? category.slug || category.id : undefined }}
        />
      </div>
    </>
  );
}
