"use client";

import { ChevronDown } from "lucide-react";
import { useState, type ReactNode } from "react";
import { buttonClasses } from "@/components/ui";
import { cn } from "@/lib/cn";

export type PortfolioExpanderProps = {
  /** Projects held back on phones. The button and the collapse both go away at 0. */
  hiddenCount: number;
  /** `id` of the grid the button controls, for `aria-controls`. */
  gridId: string;
  children: ReactNode;
};

/**
 * Phone-only "show all" disclosure for the projects grid. Projects whose **Show on mobile** switch is off are held
 * back below `sm` and revealed by the button; from `sm` up every project shows and the button is not rendered, so
 * this only ever affects the single-column layout.
 *
 * The collapse is CSS (`max-sm:` + `group-data-[expanded=false]`), so the server HTML is correct before JavaScript
 * loads and the grid itself stays a server component. Held-back tiles are `display: none`, so they are out of the
 * tab order until the button reveals them — and, because a `display: none` element reports a zero rect, `Reveal`
 * leaves them alone rather than marking them hidden, so they appear immediately on expand.
 *
 * The button stays mounted once expanded and flips to "Show fewer", so keyboard focus is never dropped on a removed
 * element and the disclosure is reversible.
 */
export default function PortfolioExpander({
  hiddenCount,
  gridId,
  children,
}: PortfolioExpanderProps) {
  const [expanded, setExpanded] = useState(false);

  if (hiddenCount < 1) return <>{children}</>;

  return (
    <div className="group/projects" data-expanded={expanded ? "true" : "false"}>
      {children}
      <div className="mt-6 flex justify-center sm:hidden">
        <button
          type="button"
          onClick={() => setExpanded((open) => !open)}
          aria-expanded={expanded}
          aria-controls={gridId}
          className={buttonClasses({ variant: "outline", size: "lg" })}
        >
          {expanded ? "Show fewer projects" : `Show ${hiddenCount} more ${hiddenCount === 1 ? "project" : "projects"}`}
          <ChevronDown aria-hidden="true" className={cn("transition-transform duration-200", expanded && "rotate-180")} />
        </button>
      </div>
    </div>
  );
}
