import type { Metadata } from "next";
import PageIntro from "@/components/storefront/PageIntro";

// Placeholder from S0 (storefront foundation). The owning agent replaces the body; keep the metadata canonical.
export const revalidate = 60;

export const metadata: Metadata = {
  title: "Careers",
  description: "Open roles at Juwon Electric for engineers, installers and support staff.",
  alternates: { canonical: "/vacancies" },
};

export default function Page() {
  return (
    <PageIntro
      eyebrow="Join our team"
      title="Careers"
      description="Open roles at Juwon Electric for engineers, installers and support staff."
    />
  );
}
