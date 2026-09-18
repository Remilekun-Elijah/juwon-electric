import type { Metadata } from "next";
import CustomChip from "@/components/public/CustomChip";
import Header from "@/components/public/Header";
import PackagesBrowser from "@/components/public/packages/PackagesBrowser";
import { getPackages } from "@/lib/api/public";
import { isr, readOr } from "@/lib/api/server";
import { cn } from "@/lib/cn";
import { fallbackPackages } from "@/lib/fallbacks";
import { sectionTitle, siteContainer } from "@/lib/publicStyles";
import { routes } from "@/lib/site";

export const revalidate = 300;

export const metadata: Metadata = {
  title: "Packages and pricing",
  description:
    "Tubular, lithium and hybrid lithium inverter packages with or without solar panels, with prices in naira.",
  alternates: { canonical: routes.packages },
  openGraph: { url: routes.packages, title: "Packages and pricing | Juwon Electric" },
};

/** Port of frontend/src/pages/Packages/Packages.jsx. */
export default async function PackagesPage() {
  const packages = await readOr(
    "GET /packages",
    () => getPackages(isr(["packages"])),
    fallbackPackages,
    (items) => items.length === 0
  );

  return (
    <>
      <Header text="PACKAGES" />

      <div className="bg-cover bg-center pb-20 pt-10" style={{ backgroundImage: "url('/contactBackground.jpg')" }}>
        <div className={siteContainer}>
          <CustomChip text="Our Packages" className="my-10 flex justify-center" />
          <h2 className={cn("mb-6 mt-8 text-center text-deep_red lg:mt-10", sectionTitle)}>
            <span className="mb-1 block">Select the package</span>
            <span className="block">that suits you best</span>
          </h2>

          <p className="inter-medium text-center text-base leading-relaxed text-faint">
            Select the plan that fits your needs best, and don&apos;t hesitate to reach out to us.
          </p>

          <PackagesBrowser packages={packages.data} />
        </div>
      </div>
    </>
  );
}
