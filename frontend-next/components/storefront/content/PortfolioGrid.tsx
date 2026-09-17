import Link from "next/link";
import { ArrowRight, ExternalLink, MapPin, Zap } from "lucide-react";
import SampleBadge from "@/components/storefront/SampleBadge";
import Reveal from "@/components/storefront/motion/Reveal";
import { Badge } from "@/components/ui";
import type { PortfolioItem } from "@/lib/api/types";
import { cn } from "@/lib/cn";
import { categoryLabel, hasCaseStudyDetails } from "@/lib/storefront/content";
import { portfolioCategoryPath } from "@/lib/storefront/routes";
import { storeCard, storeFocus, storeHoverLift, storeImageZoom, storeLink } from "@/lib/storefront/styles";
import { isAllowedUrl } from "@/lib/validation";
import ContentImage from "./ContentImage";

/** Featured installations first, keeping the API order otherwise. */
export const featuredFirst = (items: PortfolioItem[]) =>
  items
    .map((item, index) => ({ item, index }))
    .sort((a, b) => Number(Boolean(b.item.featured)) - Number(Boolean(a.item.featured)) || a.index - b.index)
    .map(({ item }) => item);

const portfolioKey = (item: PortfolioItem, index: number) => item.id || item.slug || `${item.name}-${index}`;

export type PortfolioGridProps = {
  items: PortfolioItem[];
  /** Heading level for tile titles. */
  headingAs?: "h2" | "h3";
  /** Load the first images eagerly (top of the page). */
  priorityCount?: number;
  /** Segment titles by slug for the category badge (Landing v1 §2). Without it the slug is shown in sentence case. */
  categoryTitles?: Map<string, string>;
  /** Show the category badge (off when the page is already filtered to one category). */
  showCategory?: boolean;
  /** Add "See similar projects" (the category filter) to case studies without their own link (home page). */
  linkToCategory?: boolean;
};

/**
 * Responsive installation grid: 1 column at 375 px, 2 from `sm`, 3 from `lg`. Each tile is a full-width block with an
 * aspect-ratio image frame, so tiles always have real width and height (FP-01). Case-study fields (category, location,
 * system, summary) show when present, with a Sample label on seeded details. The category and Sample badges sit on the
 * photo, which zooms on hover while the system line slides up over it (TEAM_AND_MOTION_V1 §7.5, §7.6). Tiles reveal in a
 * stagger. Server component.
 */
export default function PortfolioGrid({
  items,
  headingAs: Heading = "h3",
  priorityCount = 0,
  categoryTitles = new Map(),
  showCategory = true,
  linkToCategory = false,
}: PortfolioGridProps) {
  return (
    <Reveal as="ul" stagger className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 lg:gap-6">
      {items.map((item, index) => {
        const link = (item.link || "").trim();
        const href = link && isAllowedUrl(link) ? link : "";
        const external = /^https:\/\//i.test(href);
        const category = item.category?.trim() || "";
        const location = item.location?.trim() || "";
        const system = item.system?.trim() || "";
        const summary = item.summary?.trim() || "";
        const details = hasCaseStudyDetails(item);
        const similar = linkToCategory && !href && category;

        return (
          <li key={portfolioKey(item, index)} className="min-w-0">
            <article className={cn(storeCard, storeHoverLift, "group relative flex h-full flex-col overflow-hidden")}>
              <div className="relative">
                <ContentImage
                  src={item.image}
                  alt={item.name}
                  sizes="(min-width: 1024px) 400px, (min-width: 640px) 50vw, 100vw"
                  className="aspect-[4/3]"
                  imageClassName={storeImageZoom}
                  priority={index < priorityCount}
                />
                {((showCategory && category) || (details && item.sample)) && (
                  <div className="absolute inset-x-3 top-3 flex flex-wrap items-center gap-2">
                    {showCategory && category && (
                      <Badge tone="brand" className="bg-white/95 shadow-elev-2 backdrop-blur-sm">
                        {categoryLabel(category, categoryTitles)}
                      </Badge>
                    )}
                    {details && <SampleBadge show={item.sample === true} className="bg-white/90 backdrop-blur-sm" />}
                  </div>
                )}
                {system && (
                  <div
                    aria-hidden="true"
                    className={cn(
                      "absolute inset-x-0 bottom-0 hidden items-end gap-2 bg-gradient-to-t from-brand-950/85 to-transparent px-4 pb-3 pt-10 text-sm font-medium text-white",
                      "[@media(hover:hover)]:flex translate-y-2 opacity-0 transition-[opacity,translate] duration-300 ease-out group-hover:translate-y-0 group-hover:opacity-100 group-focus-within:translate-y-0 group-focus-within:opacity-100"
                    )}
                  >
                    <Zap className="mb-0.5 h-4 w-4 shrink-0 text-gold-400" />
                    <span className="line-clamp-2">{system}</span>
                  </div>
                )}
              </div>
              <div className="flex flex-1 flex-col p-4 sm:p-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <Heading className="text-base font-semibold tracking-tight text-slate-900">
                      {href ? (
                        <a
                          href={href}
                          {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
                          className={cn("rounded-sm after:absolute after:inset-0 after:content-['']", storeFocus)}
                        >
                          {item.name}
                          {external && <span className="sr-only"> (opens in a new tab)</span>}
                        </a>
                      ) : (
                        item.name
                      )}
                    </Heading>
                    {item.featured && <p className="mt-1 text-xs font-medium text-brand-700">Featured project</p>}
                  </div>
                  {external && <ExternalLink aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-slate-400 group-hover:text-brand-700" />}
                </div>

                {(location || system) && (
                  <dl className="mt-3 space-y-1.5 text-sm text-slate-600">
                    {location && (
                      <div className="flex gap-2">
                        <dt>
                          <MapPin aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
                          <span className="sr-only">Location</span>
                        </dt>
                        <dd className="min-w-0 break-words">{location}</dd>
                      </div>
                    )}
                    {system && (
                      <div className="flex gap-2">
                        <dt>
                          <Zap aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
                          <span className="sr-only">System</span>
                        </dt>
                        <dd className="min-w-0 break-words font-medium text-slate-700">{system}</dd>
                      </div>
                    )}
                  </dl>
                )}

                {summary && <p className="mt-3 line-clamp-4 text-sm leading-relaxed text-slate-600">{summary}</p>}

                {similar && (
                  <div className="mt-auto pt-4">
                    <Link href={portfolioCategoryPath(category)} className={cn(storeLink, "group/similar relative z-10 inline-flex min-h-11 items-center gap-1.5 text-sm md:min-h-0")}>
                      See similar projects
                      <span className="sr-only">: {categoryLabel(category, categoryTitles)}</span>
                      <ArrowRight aria-hidden="true" className="h-4 w-4 transition-transform duration-200 motion-safe:group-hover/similar:translate-x-0.5" />
                    </Link>
                  </div>
                )}
              </div>
            </article>
          </li>
        );
      })}
    </Reveal>
  );
}
