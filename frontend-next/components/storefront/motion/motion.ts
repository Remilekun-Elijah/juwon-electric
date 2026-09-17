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

/**
 * Shakes an element sideways once (a form field with an error, TEAM_AND_MOTION_V1 §8.2 Contact): 4px, 300ms, with the
 * Web Animations API so no class or reflow is needed. Does nothing under reduced motion.
 */
export function shake(element: Element | null | undefined) {
  if (!element || typeof element.animate !== "function") return;
  if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;
  element.animate(
    [
      { transform: "translateX(0)" },
      { transform: "translateX(-4px)" },
      { transform: "translateX(4px)" },
      { transform: "translateX(-3px)" },
      { transform: "translateX(2px)" },
      { transform: "translateX(0)" },
    ],
    { duration: 300, easing: "ease-in-out" }
  );
}
