// Shared browser checks for the storefront motion components (TEAM_AND_MOTION_V1 §5). Call only from effects.

/** True when the visitor asked for reduced motion, or the browser can't observe visibility (then nothing animates). */
export function motionDisabled(): boolean {
  if (typeof window === "undefined" || typeof IntersectionObserver === "undefined") return true;
  return window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
}

/** True when the element starts below the visible area, so hiding it before it animates can't flash or shift anything. */
export const isBelowFold = (element: Element) => element.getBoundingClientRect().top >= window.innerHeight;

/** Reveal once the top of an element is inside the lower 15% of the viewport, whatever the element's height. */
export const REVEAL_ROOT_MARGIN = "0px 0px -15% 0px";
