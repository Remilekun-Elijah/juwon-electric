import type { Metadata } from "next";
import PageIntro from "@/components/storefront/PageIntro";

// Placeholder from S0 (storefront foundation). The owning agent replaces the body; keep the metadata canonical.
export const revalidate = 60;

export const metadata: Metadata = {
  title: "Contact us",
  description: "Tell us what you need to power. Our engineers will recommend the right inverter, battery and solar setup.",
  alternates: { canonical: "/contact" },
};

export default function Page() {
  return (
    <PageIntro
      eyebrow="Get in touch"
      title="Contact us"
      description="Tell us what you need to power. Our engineers will recommend the right inverter, battery and solar setup."
    />
  );
}
