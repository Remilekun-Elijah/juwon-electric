import Link from "next/link";
import { ArrowRight } from "lucide-react";
import Section from "@/components/storefront/Section";
import ContentImage from "@/components/storefront/content/ContentImage";
import { contentKey, paragraphsOf } from "@/components/storefront/content/ServiceCards";
import Reveal from "@/components/storefront/motion/Reveal";
import type { PublicCustomerSegment } from "@/lib/api/types";
import { cn } from "@/lib/cn";
import { segmentSlug } from "@/lib/storefront/content";
import { portfolioCategoryPath } from "@/lib/storefront/routes";
import { storeArrowNudge, storeFocus, storeImageZoom } from "@/lib/storefront/styles";

/**
 * "Solutions": the customer segments ("Who we power") as image-led cards that open the portfolio filtered to that
 * segment (LANDING_V1 §7.5, TEAM_AND_MOTION_V1 §7.5). The title sits on the photo over a dark gradient; on devices that
 * can hover, the summary and "See our work" slide up on hover or focus while the photo zooms. Touch screens show them
 * all the time. Returns nothing without segments. Server component.
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
              <article
                className={cn(
                  "group relative isolate flex aspect-[4/3] h-full min-h-64 flex-col justify-end overflow-hidden rounded-2xl bg-slate-900 text-white shadow-elev-2",
                  "transition-[translate,box-shadow] duration-300 ease-out hover:shadow-elev-4 focus-within:shadow-elev-4 motion-safe:hover:-translate-y-0.5"
                )}
              >
                <ContentImage
                  src={segment.image}
                  alt=""
                  sizes="(min-width: 1024px) 400px, (min-width: 640px) 50vw, 100vw"
                  className="!absolute inset-0 -z-10 h-full bg-slate-800"
                  imageClassName={storeImageZoom}
                />
                <div aria-hidden="true" className="absolute inset-0 -z-10 bg-gradient-to-t from-slate-950/95 via-slate-950/55 to-slate-950/10" />
                <div className="p-5 sm:p-6">
                  <h3 className="text-xl font-semibold tracking-tight">
                    <Link
                      href={portfolioCategoryPath(segmentSlug(segment))}
                      className={cn(
                        "rounded-sm after:absolute after:inset-0 after:rounded-2xl after:content-['']",
                        storeFocus,
                        "focus-visible:ring-gold-400 focus-visible:ring-offset-slate-950"
                      )}
                    >
                      {segment.title}
                    </Link>
                  </h3>
                  <div
                    className={cn(
                      "transition-[opacity,translate] duration-300 ease-out",
                      "[@media(hover:hover)]:translate-y-2 [@media(hover:hover)]:opacity-0 [@media(hover:hover)]:group-hover:translate-y-0 [@media(hover:hover)]:group-hover:opacity-100",
                      "[@media(hover:hover)]:group-focus-within:translate-y-0 [@media(hover:hover)]:group-focus-within:opacity-100"
                    )}
                  >
                    {summary && <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-white/80">{summary}</p>}
                    <span aria-hidden="true" className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-gold-400">
                      See our work
                      <ArrowRight className={cn("h-4 w-4", storeArrowNudge)} />
                    </span>
                  </div>
                </div>
              </article>
            </li>
          );
        })}
      </Reveal>
    </Section>
  );
}
