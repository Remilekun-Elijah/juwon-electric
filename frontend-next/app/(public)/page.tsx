import type { Metadata } from "next";
import About from "@/components/public/home/About";
import Benefits from "@/components/public/home/Benefits";
import HomeHero from "@/components/public/home/HomeHero";
import RecentWork from "@/components/public/home/RecentWork";
import Testimonials from "@/components/public/home/Testimonials";
import { getPortfolio } from "@/lib/api/public";
import { isr, readOr } from "@/lib/api/server";
import { fallbackRecentWork } from "@/lib/fallbacks";
import { SITE_DESCRIPTION, SITE_NAME } from "@/lib/site";

export const revalidate = 300;

export const metadata: Metadata = {
  title: { absolute: `${SITE_NAME} | Solar, inverter and battery installation in Nigeria` },
  description: SITE_DESCRIPTION,
  alternates: { canonical: "/" },
  openGraph: { url: "/" },
};

/** Landing page. Port of frontend/src/pages/Home/LandingPage.jsx. */
export default async function HomePage() {
  const recentWork = await readOr(
    "GET /portfolio?featured=true",
    () => getPortfolio({ featured: true }, isr(["portfolio"])),
    fallbackRecentWork,
    (items) => items.length === 0
  );

  return (
    <>
      <div className="bg-white pb-10 pt-40">
        <HomeHero />
        <Benefits />
      </div>

      <About />
      <RecentWork items={recentWork.data} />
      <Testimonials />
    </>
  );
}
