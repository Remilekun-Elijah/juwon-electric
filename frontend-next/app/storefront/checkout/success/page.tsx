import type { Metadata } from "next";
import PageIntro from "@/components/storefront/PageIntro";

// Placeholder from S0 (storefront foundation). The owning agent replaces the body; keep the metadata canonical.
export const revalidate = 60;

export const metadata: Metadata = {
  title: "Order received",
  description: "Thank you. We’ll call you to confirm your order, then arrange delivery and installation.",
  alternates: { canonical: "/checkout/success" },
  robots: { index: false, follow: true },
};

export default function Page() {
  return (
    <PageIntro
      eyebrow="Checkout"
      title="Order received"
      description="Thank you. We’ll call you to confirm your order, then arrange delivery and installation."
    />
  );
}
