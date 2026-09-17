import type { Metadata } from "next";
import PageIntro from "@/components/storefront/PageIntro";

// Placeholder from S0 (storefront foundation). The owning agent replaces the body; keep the metadata canonical.
export const revalidate = 60;

export const metadata: Metadata = {
  title: "Products",
  description: "Inverters, batteries, solar panels and accessories, with specifications and stock status.",
  alternates: { canonical: "/products" },
};

export default function Page() {
  return (
    <PageIntro
      eyebrow="Catalogue"
      title="Products"
      description="Inverters, batteries, solar panels and accessories, with specifications and stock status."
    />
  );
}
