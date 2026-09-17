import type { Metadata } from "next";
import PageIntro from "@/components/storefront/PageIntro";

// Placeholder from S0 (storefront foundation). The owning agent replaces the body; keep the metadata canonical.
export const revalidate = 60;

export const metadata: Metadata = {
  title: "Services",
  description: "System design, energy audits, installation, maintenance and after-sales support for homes, businesses and institutions.",
  alternates: { canonical: "/services" },
};

export default function Page() {
  return (
    <PageIntro
      eyebrow="What we do"
      title="Services"
      description="System design, energy audits, installation, maintenance and after-sales support for homes, businesses and institutions."
    />
  );
}
