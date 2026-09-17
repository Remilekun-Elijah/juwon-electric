import type { Metadata } from "next";
import Header from "@/components/public/Header";
import PortfolioTiles from "@/components/public/PortfolioTiles";
import { getPortfolio } from "@/lib/api/public";
import { isr, readOr } from "@/lib/api/server";
import { cn } from "@/lib/cn";
import { fallbackPortfolio } from "@/lib/fallbacks";
import { siteContainer } from "@/lib/publicStyles";
import { routes } from "@/lib/site";

export const revalidate = 300;

export const metadata: Metadata = {
  title: "Portfolio",
  description: "Solar panel, lithium and tubular battery installations completed by Juwon Electric across Nigeria.",
  alternates: { canonical: routes.portfolio },
  openGraph: { url: routes.portfolio, title: "Portfolio | Juwon Electric" },
};

/** Port of frontend/src/pages/Portfolio.jsx. */
export default async function PortfolioPage() {
  const portfolio = await readOr(
    "GET /portfolio",
    () => getPortfolio({}, isr(["portfolio"])),
    fallbackPortfolio,
    (items) => items.length === 0
  );

  return (
    <>
      <Header text="PORTFOLIO" />
      <section aria-label="Our projects" className={cn(siteContainer, "my-20 lg:my-28")}>
        <PortfolioTiles items={portfolio.data} variant="page" />
      </section>
    </>
  );
}
