import type { Metadata } from "next";
import { notFound } from "next/navigation";
import PageIntro from "@/components/storefront/PageIntro";
import StockBadge from "@/components/storefront/StockBadge";
import { productPath } from "@/lib/catalog";
import { getStoreProduct } from "@/lib/storefront/data";
import { storeRoutes } from "@/lib/storefront/routes";

// Placeholder from S0 (storefront foundation). S1 replaces the body; keep the metadata canonical.
export const revalidate = 60;

export async function generateMetadata({ params }: PageProps<"/storefront/products/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const product = await getStoreProduct(slug);
  if (!product) return { title: "Product not found", robots: { index: false } };
  return {
    title: product.name,
    description: [product.brand, product.name, product.category?.name].filter(Boolean).join(" · "),
    alternates: { canonical: productPath(product) },
  };
}

export default async function Page({ params }: PageProps<"/storefront/products/[slug]">) {
  const { slug } = await params;
  const product = await getStoreProduct(slug);
  if (!product) notFound();

  return (
    <PageIntro
      eyebrow={product.brand || product.category?.name || "Product"}
      title={product.name}
      description={product.sku ? `SKU ${product.sku}` : undefined}
      breadcrumbs={[{ label: "Products", href: storeRoutes.products }, { label: product.name, href: productPath(product) }]}
    >
      <StockBadge inStock={product.inStock} />
    </PageIntro>
  );
}
