import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import PackageGrid from "@/components/storefront/catalog/PackageGrid";
import { availablePackages } from "@/components/storefront/catalog/packageMeta";
import ProductListing, { readListingParams } from "@/components/storefront/catalog/ProductListing";
import PageIntro, { INTRO_IMAGES } from "@/components/storefront/PageIntro";
import Reveal from "@/components/storefront/motion/Reveal";
import { categoryPath, categoryTrail, findCategory } from "@/lib/catalog";
import { cn } from "@/lib/cn";
import { SITE_NAME } from "@/lib/site";
import { getStoreCategories, getStorePackages, getStoreProducts, storeProductsEnabled } from "@/lib/storefront/data";
import { storeRoutes } from "@/lib/storefront/routes";
import { storeArrowNudge, storeContainer, storeH2, storeLink, storeMeta } from "@/lib/storefront/styles";

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

/**
 * Products in one category, including its subcategories (the API's `category` filter includes descendants). On the
 * first page, packages in the category (Commerce v3 §4, `GET /packages?category=`) are listed above the products when
 * there are any.
 */
export default async function CategoryPage({ params, searchParams }: PageProps<"/storefront/products/category/[slug]">) {
  if (!(await storeProductsEnabled())) notFound();
  const [{ slug }, query] = await Promise.all([params, searchParams]);
  const categories = await getStoreCategories();
  const category = findCategory(categories, slug);
  if (!category) notFound();

  const { q, page } = readListingParams(query);
  const [result, categoryPackages] = await Promise.all([
    getStoreProducts({ category: category.id, q, page }),
    page === 1 ? getStorePackages({ category: category.id }) : Promise.resolve([]),
  ]);
  const packages = availablePackages(categoryPackages);

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
        image={INTRO_IMAGES.array}
      />
      {packages.length > 0 && (
        <section aria-labelledby="category-packages-heading" className={cn(storeContainer, "pt-10 sm:pt-14")}>
          <Reveal className="flex flex-wrap items-end justify-between gap-x-6 gap-y-2">
            <div className="min-w-0">
              <h2 id="category-packages-heading" className={storeH2}>
                Packages in {category.name}
              </h2>
              <p className={cn(storeMeta, "mt-1")}>Complete systems, delivered and installed by our engineers.</p>
            </div>
            <Link href={storeRoutes.packages} className={cn(storeLink, "group inline-flex min-h-11 items-center gap-1.5 text-sm")}>
              All packages
              <ArrowRight aria-hidden="true" className={cn("h-4 w-4", storeArrowNudge)} />
            </Link>
          </Reveal>
          <PackageGrid packages={packages.slice(0, 6)} showCategory={false} enter enterDelay={300} className="mt-6" />
        </section>
      )}
      <div className={cn(storeContainer, "py-10 sm:py-14")}>
        <ProductListing categories={categories} category={category} result={result} q={q} page={page} basePath={categoryPath(category)} />
      </div>
    </>
  );
}
