import type { Metadata } from "next";
import { notFound } from "next/navigation";
import PageIntro from "@/components/storefront/PageIntro";
import { categoryPath, categoryTrail, findCategory } from "@/lib/catalog";
import { getStoreCategories } from "@/lib/storefront/data";
import { storeRoutes } from "@/lib/storefront/routes";

// Placeholder from S0 (storefront foundation). S1 replaces the body; keep the metadata canonical.
export const revalidate = 60;

export async function generateMetadata({ params }: PageProps<"/storefront/products/category/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const category = findCategory(await getStoreCategories(), slug);
  if (!category) return { title: "Category not found", robots: { index: false } };
  return {
    title: category.name,
    description: category.description || `${category.name} from Juwon Electric, with specifications and stock status.`,
    alternates: { canonical: categoryPath(category) },
  };
}

export default async function Page({ params }: PageProps<"/storefront/products/category/[slug]">) {
  const { slug } = await params;
  const categories = await getStoreCategories();
  const category = findCategory(categories, slug);
  if (!category) notFound();

  return (
    <PageIntro
      eyebrow="Category"
      title={category.name}
      description={category.description || undefined}
      breadcrumbs={[
        { label: "Products", href: storeRoutes.products },
        ...categoryTrail(categories, category.id).map((item) => ({ label: item.name, href: categoryPath(item) })),
      ]}
    />
  );
}
