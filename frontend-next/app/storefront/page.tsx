import type { Metadata } from "next";
import PageIntro from "@/components/storefront/PageIntro";
import Link from "next/link";
import { buttonClasses } from "@/components/ui";

// Placeholder from S0 (storefront foundation). The owning agent replaces the body; keep the metadata canonical.
export const revalidate = 60;

export const metadata: Metadata = {
  title: { absolute: "Juwon Electric | Inverter, battery and solar packages in Lagos" },
  description: "Inverter, battery and solar packages designed, delivered and installed by our engineers, so NEPA outages don’t stop your day.",
  alternates: { canonical: "/" },
};

export default function Page() {
  return (
    <PageIntro
      eyebrow="Juwon Electric"
      title="Reliable power for homes and businesses"
      description="Inverter, battery and solar packages designed, delivered and installed by our engineers, so NEPA outages don’t stop your day."
      actions={
        <>
          <Link href="/packages" className={buttonClasses({ size: "lg" })}>
            Shop packages
          </Link>
          <Link href="/contact" className={buttonClasses({ size: "lg", variant: "outline" })}>
            Talk to an engineer
          </Link>
        </>
      }
    />
  );
}
