import Link from "next/link";
import { ArrowRight, ExternalLink } from "lucide-react";
import type { PublicCustomerSegment, ServiceOffering } from "@/lib/api/types";
import { cn } from "@/lib/cn";
import { contactTopicPath } from "@/lib/storefront/routes";
import { storeCard, storeH3, storeLink } from "@/lib/storefront/styles";
import { isAllowedUrl } from "@/lib/validation";
import ContentImage from "./ContentImage";

/** Paragraphs of an admin-entered subtitle (legacy copy has stray indentation and blank lines). */
export const paragraphsOf = (text: string | null | undefined) =>
  (text || "")
    .split(/\n\s*\n/)
    .map((paragraph) => paragraph.replace(/\s+/g, " ").trim())
    .filter(Boolean);

/** Stable key for services content: the JSON store may omit `id`. */
export const contentKey = (item: { id?: string; slug?: string; title: string }, index: number) =>
  item.id || item.slug || `${item.title}-${index}`;

/** CTA for an offering: the admin's label and URL when the URL is safe, otherwise "Ask about this service". */
function offeringCta(offering: ServiceOffering) {
  const url = (offering.ctaUrl || "").trim();
  if (url && isAllowedUrl(url)) {
    return { label: offering.ctaLabel?.trim() || "Learn more", href: url, external: /^https:\/\//i.test(url) };
  }
  return {
    label: "Ask about this service",
    href: contactTopicPath(offering.title),
    external: false,
  };
}

export type OfferingCardProps = {
  offering: ServiceOffering;
  /** Heading level inside the page outline. */
  headingAs?: "h2" | "h3";
  /** Shorten the copy to the first paragraph (home page). */
  compact?: boolean;
};

/** Service offering: image, title, subtitle and CTA. Server component. */
export function OfferingCard({ offering, headingAs: Heading = "h3", compact = false }: OfferingCardProps) {
  const paragraphs = paragraphsOf(offering.subtitle);
  const shown = compact ? paragraphs.slice(0, 1) : paragraphs;
  const cta = offeringCta(offering);

  return (
    <article className={cn(storeCard, "flex h-full flex-col overflow-hidden")}>
      <ContentImage
        src={offering.image}
        alt=""
        sizes="(min-width: 1024px) 400px, (min-width: 640px) 50vw, 100vw"
        className="aspect-[16/10] border-b border-slate-200"
      />
      <div className="flex flex-1 flex-col p-5 sm:p-6">
        <Heading className={storeH3}>{offering.title}</Heading>
        <div className="mt-2 space-y-3 text-sm leading-relaxed text-slate-600">
          {shown.map((paragraph, index) => (
            <p key={index} className={cn(compact && "line-clamp-4")}>
              {paragraph}
            </p>
          ))}
        </div>
        <div className="mt-auto pt-5">
          {cta.external ? (
            <a href={cta.href} target="_blank" rel="noopener noreferrer" className={cn(storeLink, "inline-flex min-h-11 items-center gap-1.5 text-sm md:min-h-0")}>
              {cta.label}
              <ExternalLink aria-hidden="true" className="h-4 w-4" />
              <span className="sr-only"> (opens in a new tab)</span>
            </a>
          ) : (
            <Link href={cta.href} className={cn(storeLink, "inline-flex min-h-11 items-center gap-1.5 text-sm md:min-h-0")}>
              {cta.label}
              <ArrowRight aria-hidden="true" className="h-4 w-4" />
            </Link>
          )}
        </div>
      </div>
    </article>
  );
}

export type SegmentCardProps = {
  segment: PublicCustomerSegment;
  headingAs?: "h2" | "h3";
};

/** Customer segment ("Who we power"): image, title and subtitle. Server component. */
export function SegmentCard({ segment, headingAs: Heading = "h3" }: SegmentCardProps) {
  return (
    <article className={cn(storeCard, "flex h-full flex-col overflow-hidden")}>
      <ContentImage
        src={segment.image}
        alt=""
        sizes="(min-width: 1024px) 300px, (min-width: 640px) 50vw, 100vw"
        className="aspect-[4/3] border-b border-slate-200"
      />
      <div className="p-5">
        <Heading className="text-base font-semibold tracking-tight text-slate-900">{segment.title}</Heading>
        {paragraphsOf(segment.subtitle).map((paragraph, index) => (
          <p key={index} className="mt-2 text-sm leading-relaxed text-slate-600">
            {paragraph}
          </p>
        ))}
      </div>
    </article>
  );
}
