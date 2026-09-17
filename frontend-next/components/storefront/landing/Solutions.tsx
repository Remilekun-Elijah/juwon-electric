import Link from "next/link";
import { ArrowRight } from "lucide-react";
import Section from "@/components/storefront/Section";
import ContentImage from "@/components/storefront/content/ContentImage";
import Reveal from "@/components/storefront/motion/Reveal";
import { contentKey, paragraphsOf } from "@/components/storefront/content/ServiceCards";
import type { PublicCustomerSegment } from "@/lib/api/types";
import { cn } from "@/lib/cn";
import { segmentSlug } from "@/lib/storefront/content";
import { portfolioCategoryPath } from "@/lib/storefront/routes";
import { storeArrowNudge, storeCard, storeFocus, storeHoverLift, storeImageZoom } from "@/lib/storefront/styles";

/**
 * "Solutions": the customer segments ("Who we power") as cards that open the portfolio filtered to that segment
 * (LANDING_V1 §7.5). Returns nothing without segments. Server component.
 */
export default function Solutions({ segments }: { segments: PublicCustomerSegment[] }) {
  if (!segments.length) return null;

  return (
    <Section
      eyebrow="Solutions"
      title="Who we power"
      description="Backup power and solar systems sized for the way you use electricity. See the work we have done for customers like you."
    >
      <Reveal as="ul" stagger className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 lg:gap-5">
        {segments.map((segment, index) => {
          const summary = paragraphsOf(segment.subtitle)[0];
          return (
            <li key={contentKey(segment, index)} className="min-w-0">
              <article className={cn(storeCard, storeHoverLift, "group relative flex h-full overflow-hidden")}>
                <ContentImage
                  src={segment.image}
                  alt=""
                  sizes="(min-width: 640px) 140px, 112px"
                  className="w-28 shrink-0 self-stretch border-r border-slate-200 sm:w-36"
                  imageClassName={storeImageZoom}
                />
                <div className="flex min-w-0 flex-1 flex-col p-4 sm:p-5">
                  <h3 className="font-semibold tracking-tight text-slate-900 group-hover:text-brand-700">
                    <Link
                      href={portfolioCategoryPath(segmentSlug(segment))}
                      className={cn("rounded-sm after:absolute after:inset-0 after:rounded-2xl after:content-['']", storeFocus)}
                    >
                      {segment.title}
                    </Link>
                  </h3>
                  {summary && <p className="mt-1.5 line-clamp-3 text-sm leading-relaxed text-slate-600">{summary}</p>}
                  <span aria-hidden="true" className="mt-auto inline-flex items-center gap-1 pt-3 text-sm font-medium text-brand-700">
                    See our work
                    <ArrowRight className={cn("h-4 w-4", storeArrowNudge)} />
                  </span>
                </div>
              </article>
            </li>
          );
        })}
      </Reveal>
    </Section>
  );
}
