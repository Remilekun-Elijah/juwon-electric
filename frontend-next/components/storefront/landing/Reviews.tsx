import type { CSSProperties } from "react";
import { Quote, Star } from "lucide-react";
import SampleBadge from "@/components/storefront/SampleBadge";
import Section from "@/components/storefront/Section";
import HorizontalScrollList from "@/components/storefront/motion/HorizontalScrollList";
import { Badge } from "@/components/ui";
import type { Testimonial } from "@/lib/api/types";
import { cn } from "@/lib/cn";
import { TESTIMONIAL_SOURCE_LABELS } from "@/lib/storefront/content";
import { storeCard } from "@/lib/storefront/styles";

/** Up to this many reviews on the home page. */
const HOME_REVIEWS = 6;

/** Five stars: grey outlines with the earned ones filled in amber. The fills pop in one by one when the card reveals. */
function Rating({ rating }: { rating: number }) {
  return (
    <p className="flex items-center gap-0.5">
      <span className="sr-only">Rated {rating} out of 5</span>
      {Array.from({ length: 5 }, (_, index) => (
        <span key={index} aria-hidden="true" className="relative block h-4 w-4">
          <Star className="absolute inset-0 h-4 w-4 fill-slate-200 text-slate-200" />
          {index < rating && (
            <Star style={{ "--star": index } as CSSProperties} className="je-star absolute inset-0 h-4 w-4 fill-amber-400 text-amber-400" />
          )}
        </span>
      ))}
    </p>
  );
}

/**
 * Customer reviews (LANDING_V1 §7.9) on a brand-50 band (TEAM_AND_MOTION_V1 §7.5): up to six cards in a row that slides
 * sideways as the visitor scrolls (three fit on desktop, two on tablets, one on phones); scrolling down brings the rest
 * in from the right and scrolling up takes them back out (HorizontalScrollList). Nothing moves on its own.
 * Returns nothing without reviews. Server component; the list is a client island.
 */
export default function Reviews({ testimonials }: { testimonials: Testimonial[] }) {
  const reviews = testimonials.filter((review) => review.quote?.trim()).slice(0, HOME_REVIEWS);
  if (!reviews.length) return null;

  return (
    <Section
      tone="tint"
      eyebrow="Reviews"
      title="Trusted by homes and businesses across Nigeria"
      description="Real experiences from customers who chose Juwon Electric for reliable solar solutions."
    >
      <HorizontalScrollList aria-label="Customer reviews">
        {reviews.map((review) => {
          const rating = typeof review.rating === "number" ? Math.min(5, Math.max(1, Math.round(review.rating))) : null;
          return (
            <li key={review.id} className="relative min-w-0">
              <figure className={cn(storeCard, "flex h-full flex-col border-brand-100 p-5 shadow-elev-2 sm:p-6")}>
                <div className="flex items-center justify-between gap-3">
                  {rating ? <Rating rating={rating} /> : <Quote aria-hidden="true" className="h-5 w-5 text-brand-300" />}
                  <SampleBadge show={review.sample} />
                </div>
                <blockquote className="mt-4 flex-1 text-sm leading-relaxed text-slate-700 sm:text-base">
                  <p className="whitespace-pre-line">{review.quote}</p>
                </blockquote>
                <figcaption className="mt-5 flex flex-wrap items-end justify-between gap-2 border-t border-slate-100 pt-4">
                  <div className="min-w-0">
                    <p className="font-semibold text-slate-900">{review.name}</p>
                    {review.context && <p className="mt-0.5 text-sm text-slate-500">{review.context}</p>}
                  </div>
                  {review.source && (
                    <Badge tone="neutral">
                      <span className="sr-only">Source: </span>
                      {TESTIMONIAL_SOURCE_LABELS[review.source] ?? review.source}
                    </Badge>
                  )}
                </figcaption>
              </figure>
            </li>
          );
        })}
      </HorizontalScrollList>
    </Section>
  );
}
