import type { ReactNode } from "react";
import Image from "next/image";
import { cn } from "@/lib/cn";
import { enterDelay, storeContainer } from "@/lib/storefront/styles";
import Breadcrumbs, { type Crumb } from "./Breadcrumbs";

/** Our own installation photos (public/panel-*.webp) for page intros. */
export const INTRO_IMAGES = {
  rooftop: "/panel-3.webp",
  sunset: "/panel-1.webp",
  commercial: "/panel-2.webp",
  panels: "/panel-4.webp",
  home: "/panel-5.webp",
  array: "/panel-6.webp",
} as const;

export type PageIntroProps = {
  eyebrow?: ReactNode;
  /** The page's only `h1`. */
  title: ReactNode;
  description?: ReactNode;
  /** Trail below Home, ending with the current page. Leave out on top-level pages. */
  breadcrumbs?: Crumb[];
  /** Buttons or links under the description. Style them for dark (`storeGoldButton`, `storeGlassButton`). */
  actions?: ReactNode;
  /** Extra content under the header row (filters, meta, badges), styled for dark. */
  children?: ReactNode;
  className?: string;
  /** Loading placeholders pass "p" so a streamed fallback never adds a second `h1`. */
  headingAs?: "h1" | "p";
  /** Background photo (a site path). Defaults to a rooftop installation. */
  image?: string;
  /** Shorter band (`pt-24 pb-8`) for checkout and order success, so the form stays near the top. */
  compact?: boolean;
  /** Small mark above the eyebrow (the order success check). */
  icon?: ReactNode;
  /** The heading scales in instead of rising from its mask (order success). */
  celebrate?: boolean;
};

/**
 * Dark page intro (TEAM_AND_MOTION_V1 §8.1), the inner-page version of the home hero. Server component.
 *
 * - slate-950 with one of our installation photos at low opacity under the home hero's left-to-right dark gradient.
 *   Body text is white/75, breadcrumbs white/60 and the eyebrow gold-400. Measured on every page's photo at full zoom, the
 *   brightest backdrop pixel anywhere in the band stays under 4% luminance, so the weakest of these (white/60) still
 *   has 5.6:1.
 * - `data-store-hero` lets StoreHeader sit transparent over it; the band pulls itself up under the header by the header's
 *   height, so nothing shifts when the header turns solid.
 * - Entrance is CSS only (it runs before hydration and without JavaScript): breadcrumbs, eyebrow, the heading rising out
 *   of a clipped mask, description, actions, extra content, 80ms apart. The photo zooms slowly. Reduced motion
 *   turns all of it off.
 */
export default function PageIntro({
  eyebrow,
  title,
  description,
  breadcrumbs,
  actions,
  children,
  className,
  headingAs = "h1",
  image = INTRO_IMAGES.rooftop,
  compact = false,
  icon,
  celebrate = false,
}: PageIntroProps) {
  const Heading = headingAs;
  const hasTrail = Boolean(breadcrumbs?.length);
  let step = hasTrail ? 1 : 0;
  const next = () => enterDelay(80 * step++);

  return (
    <header
      data-store-hero=""
      className={cn("relative isolate -mt-[65px] overflow-hidden bg-slate-950 text-white md:-mt-[73px]", className)}
    >
      <div aria-hidden="true" className="absolute inset-0 -z-20 overflow-hidden">
        <Image src={image} alt="" fill sizes="100vw" loading="eager" className="je-kenburns object-cover opacity-40" />
      </div>
      <div aria-hidden="true" className="absolute inset-0 -z-10 bg-gradient-to-r from-slate-950/95 via-slate-950/80 to-slate-950/55" />
      <div aria-hidden="true" className="absolute inset-x-0 bottom-0 -z-10 h-2/3 bg-gradient-to-t from-slate-950/80 to-transparent" />

      <div className={cn(storeContainer, compact ? "pb-8 pt-24" : "pb-12 pt-28 sm:pb-16 sm:pt-32")}>
        {hasTrail && breadcrumbs && <Breadcrumbs items={breadcrumbs} tone="dark" className={cn("je-enter", compact ? "mb-4" : "mb-6")} />}
        <div className="max-w-3xl">
          {icon && (
            <div style={next()} className="je-in je-in-pop mb-4">
              {icon}
            </div>
          )}
          {eyebrow && (
            <p style={next()} className="je-enter text-xs font-semibold uppercase tracking-[0.14em] text-gold-400">
              {eyebrow}
            </p>
          )}
          <Heading
            className={cn(
              "text-3xl font-semibold leading-tight tracking-tight text-white sm:text-4xl lg:text-5xl",
              eyebrow && "mt-3",
              celebrate && "je-in je-in-pop"
            )}
            style={celebrate ? next() : undefined}
          >
            {celebrate ? (
              title
            ) : (
              <span className="-mb-[0.15em] block overflow-hidden pb-[0.15em]">
                <span style={next()} className="je-line block">
                  {title}
                </span>
              </span>
            )}
          </Heading>
          {description && (
            <p style={next()} className="je-enter mt-4 text-base leading-relaxed text-white/75 sm:text-lg">
              {description}
            </p>
          )}
        </div>
        {actions && (
          <div style={next()} className="je-enter mt-6 flex flex-wrap items-center gap-3">
            {actions}
          </div>
        )}
        {children && (
          <div style={next()} className="je-enter mt-6">
            {children}
          </div>
        )}
      </div>
    </header>
  );
}
