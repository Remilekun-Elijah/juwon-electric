import type { Metadata } from "next";
import { notFound } from "next/navigation";
import ProductListing, { readListingParams } from "@/components/storefront/catalog/ProductListing";
import PageIntro from "@/components/storefront/PageIntro";
import { categoryPath, categoryTrail, findCategory } from "@/lib/catalog";
import { cn } from "@/lib/cn";
import { SITE_NAME } from "@/lib/site";
import { getStoreCategories, getStoreProducts } from "@/lib/storefront/data";
import { storeRoutes } from "@/lib/storefront/routes";
import { storeContainer } from "@/lib/storefront/styles";

export const revalidate = 60;
export const dynamicParams = true;

/** Pre-render every active category; new ones render on first request and are then cached. */
export async function generateStaticParams() {
  const categories = await getStoreCategories();
  return categories.map((category) => ({ slug: category.slug || category.id }));
}

const categoryDescription = (category: { name: string; description: string | null }) =>
  category.description || `${category.name} from ${SITE_NAME}, with specifications, prices in naira and stock status.`;

export async function generateMetadata({ params, searchParams }: PageProps<"/storefront/products/category/[slug]">): Promise<Metadata> {
  const [{ slug }, query] = await Promise.all([params, searchParams]);
  const category = findCategory(await getStoreCategories(), slug);
  if (!category) return { title: "Category not found", robots: { index: false } };
  const { q } = readListingParams(query);
  const description = categoryDescription(category);
  return {
    title: `${category.name} | Products`,
    description,
    alternates: { canonical: categoryPath(category) },
    openGraph: { url: categoryPath(category), title: `${category.name} | ${SITE_NAME}`, description },
    robots: q ? { index: false, follow: true } : undefined,
  };
}

/** Products in one category, including its subcategories (the API's `category` filter includes descendants). */
export default async function CategoryPage({ params, searchParams }: PageProps<"/storefront/products/category/[slug]">) {
  const [{ slug }, query] = await Promise.all([params, searchParams]);
  const categories = await getStoreCategories();
  const category = findCategory(categories, slug);
  if (!category) notFound();

  const { q, page } = readListingParams(query);
  const result = await getStoreProducts({ category: category.id, q, page });

  return (
    <>
      <PageIntro
        eyebrow="Category"
        title={category.name}
        description={categoryDescription(category)}
        breadcrumbs={[
          { label: "Products", href: storeRoutes.products },
          ...categoryTrail(categories, category.id).map((item) => ({ label: item.name, href: categoryPath(item) })),
        ]}
      />
      <div className={cn(storeContainer, "py-10 sm:py-14")}>
        <ProductListing categories={categories} category={category} result={result} q={q} page={page} basePath={categoryPath(category)} />
      </div>
    </>
  );
}
