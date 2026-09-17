"use client";

import { useEffect, useRef } from "react";
import { cn } from "@/lib/cn";
import { REVEAL_ROOT_MARGIN, motionDisabled } from "./motion";

type ParsedFigure = { prefix: string; number: number; decimals: number; grouped: boolean; suffix: string };

/** The first number in a display string: "500+" → 500 with suffix "+", "₦1,200" → 1200 with prefix "₦". */
export function parseFigure(value: string): ParsedFigure | null {
  const match = /^(\D*?)(\d[\d,]*(?:\.\d+)?)([\s\S]*)$/.exec(value);
  if (!match) return null;
  const [, prefix, digits, suffix] = match;
  const number = Number(digits.replace(/,/g, ""));
  if (!Number.isFinite(number) || number <= 0) return null;
  return { prefix, number, decimals: digits.split(".")[1]?.length ?? 0, grouped: digits.includes(","), suffix };
}

function formatFigure(figure: ParsedFigure, current: number, done: boolean) {
  const digits = figure.grouped
    ? current.toLocaleString("en-US", { minimumFractionDigits: figure.decimals, maximumFractionDigits: figure.decimals })
    : current.toFixed(figure.decimals);
  // "500+" counts 0→500 and then shows the "+"; word units ("8 yrs") stay on while counting.
  const suffix = !done && /^\s*\+/.test(figure.suffix) ? "" : figure.suffix;
  return `${figure.prefix}${digits}${suffix}`;
}

export type CountUpProps = {
  /** Display value such as "500+", "8 yrs" or "24–48 hours". Values without a number render as they are. */
  value: string;
  /** Count duration in ms. */
  duration?: number;
  className?: string;
};

/**
 * Counts the number in `value` up from 0 when it scrolls into view (TEAM_AND_MOTION_V1 §5.2), about 1.2 s, once.
 *
 * - The real value is always in the markup (server HTML, screen readers, crawlers). While counting it is transparent
 *   and an `aria-hidden` twin in the same grid cell shows the moving figure, so the width never changes.
 * - `data-count="pending"` in the server HTML lets app/globals.css hold back the digits only when scripting is on and
 *   motion is allowed, so a figure already on screen counts from 0 instead of flashing its final value first. Without
 *   JavaScript the value shows as normal, and if hydration never happens a CSS fallback shows it after 3 s.
 * - Reduced motion and values without a number show the final value straight away.
 */
export default function CountUp({ value, duration = 1200, className }: CountUpProps) {
  const valueRef = useRef<HTMLSpanElement>(null);
  const counterRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const real = valueRef.current;
    const counter = counterRef.current;
    if (!real || !counter) return;
    const figure = parseFigure(value);
    if (!figure || motionDisabled()) {
      real.dataset.count = "done";
      return;
    }

    let frame = 0;
    const finish = () => {
      counter.textContent = "";
      real.style.opacity = "";
      real.dataset.count = "done";
    };
    real.dataset.count = "running";
    real.style.opacity = "0";
    counter.textContent = formatFigure(figure, 0, false);

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry?.isIntersecting) return;
        observer.disconnect();
        const start = performance.now();
        const tick = (now: number) => {
          const progress = Math.min(1, (now - start) / duration);
          if (progress >= 1) return finish();
          const eased = 1 - Math.pow(1 - progress, 3);
          const current = figure.decimals ? figure.number * eased : Math.floor(figure.number * eased);
          counter.textContent = formatFigure(figure, current, false);
          frame = requestAnimationFrame(tick);
        };
        frame = requestAnimationFrame(tick);
      },
      { rootMargin: REVEAL_ROOT_MARGIN, threshold: 0 }
    );
    observer.observe(real);

    return () => {
      observer.disconnect();
      cancelAnimationFrame(frame);
      finish();
    };
  }, [value, duration]);

  return (
    <span className={cn("inline-grid", className)}>
      <span ref={valueRef} data-count="pending" className="[grid-area:1/1]">
        {value}
      </span>
      <span ref={counterRef} aria-hidden="true" className="pointer-events-none [grid-area:1/1]" />
    </span>
  );
}
