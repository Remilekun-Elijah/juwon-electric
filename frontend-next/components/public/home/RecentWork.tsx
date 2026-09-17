import CustomChip from "@/components/public/CustomChip";
import PortfolioTiles from "@/components/public/PortfolioTiles";
import type { PortfolioTile } from "@/lib/fallbacks";
import { cn } from "@/lib/cn";
import { sectionTitle, siteContainer } from "@/lib/publicStyles";

/** "Our latest projects". Port of frontend/src/pages/Home/Portfolio.jsx; data is fetched by the page. */
export default function RecentWork({ items }: { items: PortfolioTile[] }) {
  return (
    <section aria-labelledby="recent-work-title" className="mt-20">
      <CustomChip text="Portfolio" className="flex justify-center" />

      <h2 id="recent-work-title" className={cn("mb-10 mt-8 text-center text-deep_red lg:mb-14 lg:mt-10", sectionTitle)}>
        Our latest projects
      </h2>

      <div className={siteContainer}>
        <PortfolioTiles items={items} variant="home" />
      </div>
    </section>
  );
}
