import type { Metadata } from "next";
import PageIntro from "@/components/storefront/PageIntro";

// Placeholder from S0 (storefront foundation). The owning agent replaces the body; keep the metadata canonical.
export const revalidate = 60;

export const metadata: Metadata = {
  title: "Our work",
  description: "Inverter, battery and solar installations we have completed for homes and businesses.",
  alternates: { canonical: "/portfolio" },
};

export default function Page() {
  return (
    <PageIntro
      eyebrow="Portfolio"
      title="Our work"
      description="Inverter, battery and solar installations we have completed for homes and businesses."
    />
  );
}
