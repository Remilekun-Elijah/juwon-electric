import { ExternalLink } from "lucide-react";
import type { PortfolioItem } from "@/lib/api/types";
import { cn } from "@/lib/cn";
import { storeCard, storeFocus } from "@/lib/storefront/styles";
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
};

/**
 * Responsive installation grid: 1 column at 375 px, 2 from `sm`, 3 from `lg`. Each tile is a full-width block with an
 * aspect-ratio image frame, so tiles always have real width and height (FP-01). Server component.
 */
export default function PortfolioGrid({ items, headingAs: Heading = "h3", priorityCount = 0 }: PortfolioGridProps) {
  return (
    <ul className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 lg:gap-6">
      {items.map((item, index) => {
        const link = (item.link || "").trim();
        const href = link && isAllowedUrl(link) ? link : "";
        const external = /^https:\/\//i.test(href);
        return (
          <li key={portfolioKey(item, index)} className="min-w-0">
            <article className={cn(storeCard, "group relative flex h-full flex-col overflow-hidden")}>
              <ContentImage
                src={item.image}
                alt={item.name}
                sizes="(min-width: 1024px) 400px, (min-width: 640px) 50vw, 100vw"
                className="aspect-[4/3]"
                imageClassName="transition-transform duration-300 motion-safe:group-hover:scale-[1.02]"
                priority={index < priorityCount}
              />
              <div className="flex flex-1 items-start justify-between gap-3 p-4 sm:p-5">
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
            </article>
          </li>
        );
      })}
    </ul>
  );
}
