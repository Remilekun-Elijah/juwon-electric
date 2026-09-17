"use client";

import { useEffect, useRef } from "react";
import { cn } from "@/lib/cn";
import { motionDisabled } from "./motion";

export type AnimatedNumberProps = {
  value: number;
  /** Formats a (possibly in-between) number for display, for example watts with no decimals and a "W" suffix. */
  format: (value: number) => string;
  /** Transition length in ms (TEAM_AND_MOTION_V1 §5.9: 250 ms). */
  duration?: number;
  className?: string;
};

/**
 * A number that counts briefly from its previous value to the new one when it changes (calculator results).
 *
 * The formatted final value is always rendered by React, so live regions announce only the result. During the short
 * count it is transparent and an `aria-hidden` twin in the same grid cell shows the moving figure. The first render
 * and reduced motion show the value straight away.
 */
export default function AnimatedNumber({ value, format, duration = 250, className }: AnimatedNumberProps) {
  const valueRef = useRef<HTMLSpanElement>(null);
  const counterRef = useRef<HTMLSpanElement>(null);
  const previous = useRef(value);
  // Latest formatter without restarting the effect when the parent passes a new inline function.
  const formatRef = useRef(format);

  useEffect(() => {
    formatRef.current = format;
  });

  useEffect(() => {
    const from = previous.current;
    previous.current = value;
    const real = valueRef.current;
    const counter = counterRef.current;
    if (!real || !counter || from === value || !Number.isFinite(from) || motionDisabled()) return;

    let frame = 0;
    const start = performance.now();
    const finish = () => {
      counter.textContent = "";
      real.style.opacity = "";
    };
    real.style.opacity = "0";
    const tick = (now: number) => {
      const progress = Math.min(1, (now - start) / duration);
      if (progress >= 1) return finish();
      const eased = 1 - Math.pow(1 - progress, 2);
      counter.textContent = formatRef.current(from + (value - from) * eased);
      frame = requestAnimationFrame(tick);
    };
    counter.textContent = formatRef.current(from);
    frame = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(frame);
      finish();
    };
  }, [value, duration]);

  return (
    <span className={cn("inline-grid", className)}>
      <span ref={valueRef} className="[grid-area:1/1]">
        {format(value)}
      </span>
      <span ref={counterRef} aria-hidden="true" className="pointer-events-none [grid-area:1/1]" />
    </span>
  );
}
