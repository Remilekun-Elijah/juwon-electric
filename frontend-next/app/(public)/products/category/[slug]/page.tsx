import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import CatalogShell from "@/components/public/catalog/CatalogShell";
import { CATEGORY_PRODUCT_LIMIT, buildCategoryTree, categoryPath, categoryTrail, findCategory } from "@/lib/catalog";
import { loadCategories, loadProductPage } from "@/lib/catalog-data";
import { routes } from "@/lib/site";

export const revalidate = 300;
export const dynamicParams = true;

export async function generateStaticParams() {
  const categories = await loadCategories();
  return categories.map((category) => ({ slug: category.slug || category.id }));
}

export async function generateMetadata({ params }: PageProps<"/products/category/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const category = findCategory(await loadCategories(), slug);
  if (!category) return { title: "Category not found", robots: { index: false } };
  const description = category.description || `${category.name} from Juwon Electric, with prices in naira.`;
  return {
    title: `${category.name} — Products`,
    description,
    alternates: { canonical: categoryPath(category) },
    openGraph: { url: categoryPath(category), title: `${category.name} | Juwon Electric`, description },
  };
}

/** Products in a category, including subcategories (contract §4.2 `category` filter). */
export default async function CategoryPage({ params }: PageProps<"/products/category/[slug]">) {
  const { slug } = await params;
  const categories = await loadCategories();
  const category = findCategory(categories, slug);
  if (!category) notFound();

  const products = await loadProductPage({ category: category.id, limit: CATEGORY_PRODUCT_LIMIT });
  const trail = categoryTrail(categories, category.parentId);
  const { items, total } = products.data;

  return (
    <CatalogShell
      title={category.name}
      intro={
        <>
          {category.description && <p>{category.description}</p>}
          {total > items.length && (
            <p className="mt-2 text-sm">
              Showing {items.length} of {total} products. Contact us for the full range.
            </p>
          )}
        </>
      }
      breadcrumb={
        <nav aria-label="Breadcrumb" className="mb-6">
          <ol className="inter-medium flex flex-wrap items-center gap-1 text-sm text-faint">
            <li>
              <Link href={routes.products} className="inline-flex items-center gap-1 rounded-sm hover:underline focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-brand-500">
                <ChevronLeft aria-hidden="true" className="h-4 w-4" />
                All products
              </Link>
            </li>
            {trail.map((parent) => (
              <li key={parent.id} className="flex items-center gap-1">
                <span aria-hidden="true">/</span>
                <Link href={categoryPath(parent)} className="rounded-sm hover:underline focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-brand-500">
                  {parent.name}
                </Link>
              </li>
            ))}
          </ol>
        </nav>
      }
      categories={buildCategoryTree(categories)}
      activeCategory={trail[0]?.slug ?? category.slug}
      products={items}
      unavailable={products.fromFallback}
    />
  );
}
