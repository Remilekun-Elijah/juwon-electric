import type { Metadata } from "next";
import PageIntro from "@/components/storefront/PageIntro";

// Placeholder from S0 (storefront foundation). The owning agent replaces the body; keep the metadata canonical.
export const revalidate = 60;

export const metadata: Metadata = {
  title: "Inverter and solar packages",
  description: "Complete tubular, lithium and hybrid lithium systems from 1kVA, with or without solar panels, installed by our team.",
  alternates: { canonical: "/packages" },
};

export default function Page() {
  return (
    <PageIntro
      eyebrow="Packages"
      title="Inverter and solar packages"
      description="Complete tubular, lithium and hybrid lithium systems from 1kVA, with or without solar panels, installed by our team."
    />
  );
}
