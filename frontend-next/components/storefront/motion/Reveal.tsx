"use client";

import { useEffect, useRef, type ElementType, type HTMLAttributes, type ReactNode } from "react";
import { REVEAL_ROOT_MARGIN, isBelowFold, motionDisabled } from "./motion";

/** Delay between list items that come into view together. */
const STAGGER_STEP_MS = 60;
/** Items after this many in one batch share the last delay, so long lists never wait. */
const STAGGER_CAP = 8;

export type RevealProps = Omit<HTMLAttributes<HTMLElement>, "children"> & {
  /** Element to render (default `div`). Use `ul` or `ol` with `stagger` for lists. */
  as?: ElementType;
  /** Extra delay in ms before the element (or the first item of a batch) appears. */
  delay?: number;
  /**
   * Animate each direct child instead of the wrapper. Children that enter the viewport together get delays 60 ms apart
   * (capped at 8 steps); children further down wait until they are scrolled to.
   */
  stagger?: boolean;
  children?: ReactNode;
};

/**
 * Scroll reveal (TEAM_AND_MOTION_V1 §5.1): fade in and rise 16px over 500 ms, once.
 *
 * - The server HTML is fully visible, so content works without JavaScript and for crawlers.
 * - After mount, only elements that start below the fold are hidden (`data-reveal="hidden"`), so nothing on screen
 *   flashes. Opacity and transform don't move layout, so there is no layout shift.
 * - One IntersectionObserver per instance, disconnected once everything has appeared. No scroll listeners.
 * - Reduced motion: nothing is hidden or animated.
 */
export default function Reveal({ as: Component = "div", delay = 0, stagger = false, children, ...rest }: RevealProps) {
  const ref = useRef<HTMLElement>(null);

  useEffect(() => {
    const root = ref.current;
    if (!root || motionDisabled()) return;

    const targets = (stagger ? Array.from(root.children) : [root]).filter(
      (element): element is HTMLElement => element instanceof HTMLElement && isBelowFold(element)
    );
    if (!targets.length) return;

    const waiting = new Set(targets);
    for (const element of targets) element.dataset.reveal = "hidden";

    const observer = new IntersectionObserver(
      (entries) => {
        let step = 0;
        // Entries arrive in the order the targets were observed, which is document order.
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          const element = entry.target as HTMLElement;
          const wait = delay + (stagger ? Math.min(step, STAGGER_CAP - 1) * STAGGER_STEP_MS : 0);
          element.style.setProperty("--reveal-delay", `${wait}ms`);
          element.dataset.reveal = "shown";
          observer.unobserve(element);
          waiting.delete(element);
          step += 1;
        }
        if (!waiting.size) observer.disconnect();
      },
      { rootMargin: REVEAL_ROOT_MARGIN, threshold: 0 }
    );
    for (const element of targets) observer.observe(element);

    return () => {
      observer.disconnect();
      // Anything still hidden (unmount or re-run) becomes visible immediately rather than staying invisible.
      for (const element of waiting) delete element.dataset.reveal;
    };
  }, [delay, stagger]);

  return (
    <Component ref={ref} {...rest}>
      {children}
    </Component>
  );
}
