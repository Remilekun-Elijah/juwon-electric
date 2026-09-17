"use client";

import { useEffect, useRef, type ElementType, type HTMLAttributes, type ReactNode } from "react";
import { REVEAL_ROOT_MARGIN, isBelowFold, motionDisabled } from "./motion";

/** Delay between list items that come into view together. */
const STAGGER_STEP_MS = 60;
/** Items after this many in one batch share the last delay, so long lists never wait. */
const STAGGER_CAP = 8;
/** Phones and small tablets, where every section is a single column. */
const MOBILE_QUERY = "(max-width: 767px)";

type RevealFrom = "below" | "left" | "right" | "fade" | "zoom";

/** Single reveals without `from` take turns on phones, so neighbouring sections don't all enter the same way. */
const MOBILE_TURNS: RevealFrom[] = ["below", "left", "right"];
let mobileTurn = 0;

/**
 * The direction an element waits in. An explicit `from` always wins. Without one, desktop rises from below; phones
 * alternate staggered items left and right and rotate single reveals through below, left and right.
 */
function directionFor(from: RevealFrom | undefined, mobile: boolean, stagger: boolean, index: number, turn: number): RevealFrom {
  if (from) return from;
  if (!mobile) return "below";
  if (stagger) return index % 2 === 0 ? "left" : "right";
  return MOBILE_TURNS[turn % MOBILE_TURNS.length];
}

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
  /** Delay between staggered items in ms (default 60). Longer steps suit short sequences such as How it works. */
  staggerStep?: number;
  /**
   * Where hidden items wait before they appear (TEAM_AND_MOTION_V1 §8): `below` rises 16px, `left` and `right` slide
   * in from that side (24px, 40px on phones), `fade` doesn't move and `zoom` grows from 97%. Leave it unset for the
   * default: rise on desktop, and on phones a mix of left, right and below (see `directionFor`). Reduced motion never
   * moves.
   */
  from?: RevealFrom;
  children?: ReactNode;
};

/**
 * Scroll reveal (TEAM_AND_MOTION_V1 §5.1): fade in and rise 16px over 500 ms, once. On phones, reveals without an
 * explicit `from` mix directions: staggered items alternate left and right, single reveals take turns.
 *
 * - The server HTML is fully visible, so content works without JavaScript and for crawlers.
 * - After mount, only elements that start below the fold are hidden (`data-reveal="hidden"`), so nothing on screen
 *   flashes. Opacity and transform don't move layout, so there is no layout shift.
 * - One IntersectionObserver per instance, disconnected once everything has appeared. No scroll listeners.
 * - Reduced motion: nothing is hidden or animated.
 */
export default function Reveal({
  as: Component = "div",
  delay = 0,
  stagger = false,
  staggerStep = STAGGER_STEP_MS,
  from,
  children,
  ...rest
}: RevealProps) {
  const ref = useRef<HTMLElement>(null);

  useEffect(() => {
    const root = ref.current;
    if (!root || motionDisabled()) return;

    const targets = (stagger ? Array.from(root.children) : [root]).filter(
      (element): element is HTMLElement => element instanceof HTMLElement && isBelowFold(element)
    );
    if (!targets.length) return;

    const mobile = window.matchMedia?.(MOBILE_QUERY).matches ?? false;
    const turn = mobileTurn++;
    const waiting = new Set(targets);
    targets.forEach((element, index) => {
      const direction = directionFor(from, mobile, stagger, index, turn);
      if (direction !== "below") element.dataset.revealFrom = direction;
      element.dataset.reveal = "hidden";
    });

    const observer = new IntersectionObserver(
      (entries) => {
        let step = 0;
        // Entries arrive in the order the targets were observed, which is document order.
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          const element = entry.target as HTMLElement;
          const wait = delay + (stagger ? Math.min(step, STAGGER_CAP - 1) * staggerStep : 0);
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
  }, [delay, stagger, staggerStep, from]);

  return (
    <Component ref={ref} {...rest}>
      {children}
    </Component>
  );
}
