import { ArrowRight, ExternalLink, MapPin } from "lucide-react";
import NairaIcon from "@/components/storefront/NairaIcon";
import SampleBadge from "@/components/storefront/SampleBadge";
import Reveal from "@/components/storefront/motion/Reveal";
import type { PortfolioItem } from "@/lib/api/types";
import { cn } from "@/lib/cn";
import { hasCaseStudyDetails } from "@/lib/storefront/content";
import { storeCard, storeFocus, storeHoverLift, storeImageZoom, storeLink } from "@/lib/storefront/styles";
import { isAllowedUrl } from "@/lib/validation";
import ContentImage from "./ContentImage";
import PortfolioExpander from "./PortfolioExpander";

/** Featured installations first, keeping the API order otherwise. */
export const featuredFirst = (items: PortfolioItem[]) =>
  items
    .map((item, index) => ({ item, index }))
    .sort((a, b) => Number(Boolean(b.item.featured)) - Number(Boolean(a.item.featured)) || a.index - b.index)
    .map(({ item }) => item);

const portfolioKey = (item: PortfolioItem, index: number) => item.id || item.slug || `${item.name}-${index}`;

/** A project shows on phones unless its **Show on mobile** switch is off (older records have no flag and show). */
const onPhone = (item: PortfolioItem) => item.mobile !== false;

/**
 * How many projects the phone layout holds back. Nothing is held back unless at least one project is set to show
 * there, so a list with the switch off everywhere renders in full rather than as an empty grid behind a button.
 */
const phoneHiddenCount = (items: PortfolioItem[]) =>
  items.some(onPhone) ? items.filter((item) => !onPhone(item)).length : 0;

export type PortfolioGridProps = {
  items: PortfolioItem[];
  /** Heading level for tile titles. */
  headingAs?: "h2" | "h3";
  /** Load the first images eagerly (top of the page). */
  priorityCount?: number;
  /** `id` on the list, so the phone "show more" button can point `aria-controls` at it. */
  id?: string;
};

/**
 * Responsive installation grid: 1 column at 375 px, 2 from `sm`, 3 from `lg`. Each tile is a full-width block with an
 * aspect-ratio image frame, so tiles always have real width and height (FP-01). Case-study fields (location, price,
 * summary) show when present, with a Sample label on seeded details. The Sample badge sits on the photo, which zooms on
 * hover while the price line slides up over it (TEAM_AND_MOTION_V1 §7.5, §7.6). Tiles reveal in a stagger. Projects
 * with **Show on mobile** off are collapsed behind a button on phones only (`PortfolioExpander`). Server component.
 */
export default function PortfolioGrid({ items, headingAs: Heading = "h3", priorityCount = 0, id = "projects-grid" }: PortfolioGridProps) {
  const hiddenCount = phoneHiddenCount(items);

  return (
    <PortfolioExpander hiddenCount={hiddenCount} gridId={id}>
      <Reveal as="ul" id={id} stagger className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 lg:gap-6">
        {items.map((item, index) => {
          const link = (item.link || "").trim();
          const href = link && isAllowedUrl(link) ? link : "";
          const external = /^https:\/\//i.test(href);
          const location = item.location?.trim() || "";
          const system = item.system?.trim() || "";
          const summary = item.summary?.trim() || "";
          const details = hasCaseStudyDetails(item);

          return (
            <li key={portfolioKey(item, index)} className={cn("min-w-0", hiddenCount > 0 && !onPhone(item) && "max-sm:group-data-[expanded=false]/projects:hidden")}>
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
                  {details && item.sample === true && (
                    <div className="absolute inset-x-3 top-3 flex flex-wrap items-center gap-2">
                      <SampleBadge show className="bg-white/90 backdrop-blur-sm" />
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
                      <NairaIcon className="mb-0.5 h-4 w-4 shrink-0 text-gold-400" />
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
                            <NairaIcon className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
                            <span className="sr-only">Price</span>
                          </dt>
                          <dd className="min-w-0 break-words font-medium text-slate-700">{system}</dd>
                        </div>
                      )}
                    </dl>
                  )}

                  {summary && <p className="mt-3 line-clamp-4 text-sm leading-relaxed text-slate-600">{summary}</p>}

                  {href && (
                    <div className="mt-auto pt-4">
                      <a
                        href={href}
                        {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
                        className={cn(storeLink, "group/view relative z-10 inline-flex min-h-11 items-center gap-1.5 text-sm md:min-h-0")}
                      >
                        View Project
                        <span className="sr-only">: {item.name}</span>
                        <ArrowRight aria-hidden="true" className="h-4 w-4 transition-transform duration-200 motion-safe:group-hover/view:translate-x-0.5" />
                      </a>
                    </div>
                  )}

                </div>
              </article>
            </li>
          );
        })}
      </Reveal>
    </PortfolioExpander>
  );
}
