import type { Metadata } from "next";
import { notFound, permanentRedirect } from "next/navigation";
import CatalogShell from "@/components/public/catalog/CatalogShell";
import Pager from "@/components/public/catalog/Pager";
import { PRERENDERED_PRODUCT_PAGES, buildCategoryTree, productsPagePath, totalPages } from "@/lib/catalog";
import { loadCategories, loadProductPage } from "@/lib/catalog-data";

export const revalidate = 300;
export const dynamicParams = true;

export async function generateStaticParams() {
  const first = await loadProductPage({ page: 1 });
  const pages = Math.min(totalPages(first.data), PRERENDERED_PRODUCT_PAGES);
  return Array.from({ length: Math.max(0, pages - 1) }, (_, i) => ({ page: String(i + 2) }));
}

const parsePage = (value: string) => (/^[1-9]\d{0,5}$/.test(value) ? Number(value) : null);

export async function generateMetadata({ params }: PageProps<"/products/page/[page]">): Promise<Metadata> {
  const { page } = await params;
  const number = parsePage(page);
  if (!number) return { title: "Page not found", robots: { index: false } };
  return {
    title: `Products — page ${number}`,
    description: `Solar panels, inverters, batteries and accessories from Juwon Electric (page ${number}).`,
    alternates: { canonical: productsPagePath(number) },
  };
}

/** Product catalogue, page 2+. */
export default async function ProductsPagedPage({ params }: PageProps<"/products/page/[page]">) {
  const { page } = await params;
  const number = parsePage(page);
  if (!number) notFound();
  if (number === 1) permanentRedirect(productsPagePath(1));

  const [categories, products] = await Promise.all([loadCategories(), loadProductPage({ page: number })]);
  const pages = totalPages(products.data);
  if (products.fromFallback || number > pages) notFound();

  return (
    <CatalogShell
      title="Our products"
      intro={`Page ${number} of ${pages}`}
      categories={buildCategoryTree(categories)}
      products={products.data.items}
      footer={<Pager page={number} pages={pages} />}
    />
  );
}
