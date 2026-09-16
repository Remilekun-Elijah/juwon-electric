"use client";

import { useState } from "react";
import SiteImage from "@/components/public/SiteImage";
import { InstagramIcon } from "@/components/public/icons";
import type { PortfolioTile } from "@/lib/fallbacks";
import { cn } from "@/lib/cn";

type Variant = "home" | "page";

/**
 * Portfolio grid with the Vite mobile "See All" / "Load More" expander.
 * `home` = frontend/src/pages/Home/Portfolio.jsx (square tiles, Instagram link, md breakpoint).
 * `page` = frontend/src/pages/Portfolio.jsx (tall tiles, lg breakpoint).
 * Records from the API have no `mobile` flag, so (as in Vite) only flagged fallback tiles show on small screens
 * until the visitor expands the grid.
 */
export default function PortfolioTiles({ items: rawItems, variant }: { items: PortfolioTile[]; variant: Variant }) {
  const [expanded, setExpanded] = useState(false);
  // Vite reads `image || img`; skip records with neither so next/image never gets an empty src.
  const items = rawItems
    .map((item) => ({ ...item, image: item.image || (item as { img?: string }).img || "" }))
    .filter((item) => item.image);
  const allVisible = expanded || items.every((item) => item.mobile);
  const home = variant === "home";

  return (
    <>
      <ul
        className={cn(
          "grid justify-center gap-10 md:grid-cols-2 lg:grid-cols-3",
          home && "justify-items-center"
        )}
      >
        {items.map((work, i) => {
          const hiddenOnMobile = !expanded && !work.mobile;
          return (
            <li
              key={work.id ?? work.image ?? i}
              className={cn(
                "group relative",
                hiddenOnMobile && (home ? "hidden md:block" : "hidden lg:block"),
                home && "h-[350px] w-full sm:h-[350px] sm:w-[350px] md:h-[285px] md:w-[285px]"
              )}
            >
              <div
                className={cn(
                  "overlay z-10 flex flex-col items-center justify-center opacity-0 transition-opacity hover:opacity-100",
                  home ? "rounded-2xl" : "rounded-lg px-4"
                )}
              >
                <p className="sora-bold text-center text-xl text-white">{work.name}</p>
                {home && work.link && (
                  <a
                    target="_blank"
                    rel="noopener noreferrer"
                    href={work.link}
                    className="mt-1 flex items-center gap-1 rounded-sm text-center text-white hover:underline focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-white"
                  >
                    <InstagramIcon />
                    <span className="manrope-semibold text-xl">Follow Us</span>
                    <span className="sr-only"> on Instagram (opens in a new tab)</span>
                  </a>
                )}
              </div>

              {home ? (
                <SiteImage
                  className="rounded-2xl object-cover"
                  src={work.image}
                  alt={work.name || `Work ${i + 1}`}
                  fill
                  sizes="(min-width: 768px) 285px, 350px"
                />
              ) : (
                <SiteImage
                  className="aspect-[380/525] w-full rounded-lg object-cover"
                  width={380}
                  height={525}
                  src={work.image}
                  alt={work.name || `Portfolio ${i + 1}`}
                  sizes="(min-width: 1024px) 380px, (min-width: 768px) 50vw, 100vw"
                />
              )}
            </li>
          );
        })}
      </ul>

      {!allVisible &&
        (home ? (
          <div className="mt-12 md:hidden">
            <button
              type="button"
              onClick={() => setExpanded(true)}
              className="inter-medium mx-auto block rounded-sm py-2 text-center text-xl text-deep_red underline underline-offset-4 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-brand-500"
            >
              See All
            </button>
          </div>
        ) : (
          <div className="mt-14 flex items-center justify-center lg:hidden">
            <button
              type="button"
              onClick={() => setExpanded(true)}
              className="inter-medium flex min-h-[52px] w-full items-center justify-center rounded-lg border-2 border-brand-500 py-3 text-center text-xl text-brand-500 transition-colors duration-150 hover:bg-brand-500 hover:text-white focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2 md:w-[400px]"
            >
              Load More
            </button>
          </div>
        ))}
    </>
  );
}
