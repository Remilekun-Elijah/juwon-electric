import type { Metadata } from "next";
import CatalogShell from "@/components/public/catalog/CatalogShell";
import Pager from "@/components/public/catalog/Pager";
import { buildCategoryTree, totalPages } from "@/lib/catalog";
import { loadCategories, loadProductPage } from "@/lib/catalog-data";
import { routes } from "@/lib/site";

export const revalidate = 300;

export const metadata: Metadata = {
  title: "Products",
  description: "Solar panels, inverters, batteries and installation accessories from Juwon Electric, with prices in naira.",
  alternates: { canonical: routes.products },
  openGraph: { url: routes.products, title: "Products | Juwon Electric" },
};

/** Product catalogue, page 1 (contract §4.2 `GET /products`, paged). */
export default async function ProductsPage() {
  const [categories, products] = await Promise.all([loadCategories(), loadProductPage({ page: 1 })]);

  return (
    <CatalogShell
      title="Our products"
      intro="Quality solar panels, inverters, batteries and accessories, installed by our engineers."
      categories={buildCategoryTree(categories)}
      products={products.data.items}
      unavailable={products.fromFallback}
      footer={<Pager page={1} pages={totalPages(products.data)} />}
    />
  );
}
