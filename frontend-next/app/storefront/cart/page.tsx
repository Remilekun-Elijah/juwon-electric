import type { Metadata } from "next";
import PageIntro from "@/components/storefront/PageIntro";

// Placeholder from S0 (storefront foundation). The owning agent replaces the body; keep the metadata canonical.
export const revalidate = 60;

export const metadata: Metadata = {
  title: "Your cart",
  description: "Review your packages, choose with or without solar, and check out.",
  alternates: { canonical: "/cart" },
  robots: { index: false, follow: true },
};

export default function Page() {
  return (
    <PageIntro
      eyebrow="Cart"
      title="Your cart"
      description="Review your packages, choose with or without solar, and check out."
    />
  );
}
