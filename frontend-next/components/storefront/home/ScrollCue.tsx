"use client";

import { useRef } from "react";
import { cn } from "@/lib/cn";

/**
 * "Scroll" cue at the bottom left of the hero (TEAM_AND_MOTION_V1 §7.3): a vertical line with a gold dot sliding down.
 * A button that scrolls to the section after the hero, clear of the sticky header. Reduced motion: the dot stays still
 * and the jump is instant.
 */
export default function ScrollCue({ className }: { className?: string }) {
  const ref = useRef<HTMLButtonElement>(null);

  const scrollOn = () => {
    const next = ref.current?.closest("section")?.nextElementSibling;
    if (!next) return;
    const header = document.querySelector("header");
    const offset = header ? header.getBoundingClientRect().height : 0;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    window.scrollTo({ top: next.getBoundingClientRect().top + window.scrollY - offset, behavior: reduced ? "auto" : "smooth" });
  };

  return (
    <button
      ref={ref}
      type="button"
      onClick={scrollOn}
      className={cn(
        "group flex items-center gap-3 rounded-md p-1 text-[11px] font-semibold uppercase tracking-[0.3em] text-white/70 transition-colors hover:text-white",
        "focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-gold-400 focus-visible:ring-offset-2 focus-visible:ring-offset-brand-950",
        className
      )}
    >
      <span aria-hidden="true" className="relative block h-12 w-px overflow-hidden bg-white/25">
        <span className="je-scroll-dot absolute -left-[2.5px] top-0 block h-1.5 w-1.5 rounded-full bg-gold-400" />
      </span>
      Scroll
      <span className="sr-only"> to the next section</span>
    </button>
  );
}
