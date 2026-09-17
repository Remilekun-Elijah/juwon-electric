import type { Metadata } from "next";
import { notFound } from "next/navigation";
import AddToCartButton from "@/components/storefront/cart/AddToCartButton";
import PageIntro from "@/components/storefront/PageIntro";
import { getStorePackage } from "@/lib/storefront/data";
import { packagePath, packageTitle } from "@/lib/packages";
import { storeRoutes } from "@/lib/storefront/routes";

// Placeholder from S0 (storefront foundation). S1 replaces the body; keep the metadata canonical.
export const revalidate = 60;

export async function generateMetadata({ params }: PageProps<"/storefront/packages/[id]">): Promise<Metadata> {
  const { id } = await params;
  const pkg = await getStorePackage(id);
  if (!pkg) return { title: "Package not found", robots: { index: false } };
  return {
    title: packageTitle(pkg),
    description: `Powers ${pkg.load}. Available with or without solar panels, delivered and installed.`,
    alternates: { canonical: packagePath(pkg) },
  };
}

export default async function Page({ params }: PageProps<"/storefront/packages/[id]">) {
  const { id } = await params;
  const pkg = await getStorePackage(id);
  if (!pkg) notFound();

  return (
    <PageIntro
      eyebrow={`${pkg.kva}kVA ${pkg.type}`}
      title={packageTitle(pkg)}
      description={`Powers ${pkg.load}.`}
      breadcrumbs={[{ label: "Packages", href: storeRoutes.packages }, { label: pkg.name, href: packagePath(pkg) }]}
      actions={<AddToCartButton pkg={pkg} size="lg" />}
    />
  );
}
