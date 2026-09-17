import type { Metadata } from "next";
import PageIntro from "@/components/storefront/PageIntro";

// Placeholder from S0 (storefront foundation). The owning agent replaces the body; keep the metadata canonical.
export const revalidate = 60;

export const metadata: Metadata = {
  title: "Checkout",
  description: "Enter your delivery details and place your order. We’ll call you to confirm it.",
  alternates: { canonical: "/checkout" },
  robots: { index: false, follow: true },
};

export default function Page() {
  return (
    <PageIntro
      eyebrow="Checkout"
      title="Checkout"
      description="Enter your delivery details and place your order. We’ll call you to confirm it."
    />
  );
}
