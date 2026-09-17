import { useId, type ReactNode } from "react";
import { cn } from "@/lib/cn";
import { storeBody, storeContainer, storeEyebrow, storeH2, storeSection } from "@/lib/storefront/styles";
import Reveal from "./motion/Reveal";

export type SectionProps = {
  /** Anchor id for in-page links. */
  id?: string;
  eyebrow?: ReactNode;
  /** Section heading (an h2 by default). Leave out for an untitled band. */
  title?: ReactNode;
  titleAs?: "h2" | "h3";
  description?: ReactNode;
  /** Right-aligned slot next to the heading, e.g. a "See all" link. */
  actions?: ReactNode;
  /**
   * Surface (TEAM_AND_MOTION_V1 §7.5): `slate` (default) sits on the page background; `white` is a white band with top
   * and bottom borders; `dark` is a slate-950 band with white text and a gold eyebrow; `tint` is a brand-50 band.
   */
  tone?: "slate" | "white" | "dark" | "tint";
  className?: string;
  containerClassName?: string;
  children?: ReactNode;
};

/**
 * Page section: `py-14 sm:py-20`, max-w-7xl container, optional eyebrow, heading, description and actions.
 * The heading labels the `<section>` landmark. The header reveals as it scrolls into view (TEAM_AND_MOTION_V1 §5.6);
 * children animate themselves (usually a staggered `Reveal` list). Server component.
 */
export default function Section({
  id,
  eyebrow,
  title,
  titleAs: Title = "h2",
  description,
  actions,
  tone = "slate",
  className,
  containerClassName,
  children,
}: SectionProps) {
  const headingId = useId();
  const hasHeader = Boolean(eyebrow || title || description || actions);
  const dark = tone === "dark";

  return (
    <section
      id={id}
      aria-labelledby={title ? headingId : undefined}
      className={cn(
        storeSection,
        tone === "white" && "border-y border-slate-200 bg-white",
        tone === "dark" && "bg-slate-950 text-white",
        tone === "tint" && "border-y border-brand-100 bg-brand-50",
        className
      )}
    >
      <div className={cn(storeContainer, containerClassName)}>
        {hasHeader && (
          <Reveal className="mb-8 flex flex-col gap-4 sm:mb-10 md:flex-row md:items-end md:justify-between">
            <div className="max-w-3xl">
              {eyebrow && <p className={cn(storeEyebrow, dark && "text-gold-400")}>{eyebrow}</p>}
              {title && (
                <Title
                  id={headingId}
                  className={cn(Title === "h2" ? storeH2 : "text-xl font-semibold tracking-tight text-slate-900", dark && "text-white", eyebrow && "mt-2")}
                >
                  {title}
                </Title>
              )}
              {description && <p className={cn(storeBody, "mt-3 text-base leading-relaxed", dark && "text-white/70")}>{description}</p>}
            </div>
            {actions && <div className="flex shrink-0 flex-wrap items-center gap-3">{actions}</div>}
          </Reveal>
        )}
        {children}
      </div>
    </section>
  );
}
