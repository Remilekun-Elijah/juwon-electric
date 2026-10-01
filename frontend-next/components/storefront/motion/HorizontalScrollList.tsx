"use client";

import { Children, useRef, type HTMLAttributes, type ReactNode } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";
import { cn } from "@/lib/cn";

gsap.registerPlugin(ScrollTrigger, useGSAP);

/**
 * Card width per breakpoint, from the row's own width (`cqw`, the frame is a size container): most of the screen on
 * phones with the next card peeking, two cards on tablets and three from `lg`. The subtractions are the gaps between
 * them (gap-4 = 1rem, gap-5 = 1.25rem). Written out in full so Tailwind finds the classes.
 */
const itemWidth =
  "[&>li]:w-[85cqw] [&>li]:shrink-0 [&>li]:snap-start sm:[&>li]:w-[calc((100cqw-1rem)/2)] lg:[&>li]:w-[calc((100cqw-2.5rem)/3)]";

export type HorizontalScrollListProps = Omit<HTMLAttributes<HTMLUListElement>, "children"> & {
  /** `<li>` elements. They are given the card width; put their layout on the element inside. */
  children: ReactNode;
};

/**
 * A row of cards that scrolls sideways as the page scrolls down (TEAM_AND_MOTION_V1 §5). The section holds still in
 * the middle of the screen (nothing above or below moves) and the vertical scroll drives the row: scrolling down slides
 * the hidden cards in from the right, scrolling back up slides them out again. Three cards fit on desktop, two on tablets and one (with the next peeking) on phones,
 * so every screen size has cards to bring in. Used by the home page packages and reviews.
 *
 * - GSAP ScrollTrigger, `pin` + `scrub`: the row takes one pixel of page scroll per pixel it moves, and follows the
 *   scroll position exactly in both directions.
 * - Without JavaScript, or with reduced motion, it is a plain swipeable row (`overflow-x-auto`, snap), so every card is
 *   reachable. Nothing pins or moves when all the cards already fit.
 * - The first cards fade up once when the row comes into view; review stars fill one by one as each card appears.
 * - When the visitor stops scrolling, the row settles with a whole card at the left gutter (snap), and the slide ends
 *   with the last card fully in view, so on phones no card is left cut off at the edge.
 * - Positions and the distance are measured again when the row changes size (web fonts, tabs, resizing, rotating).
 */
export default function HorizontalScrollList({ className, children, ...rest }: HorizontalScrollListProps) {
  const viewport = useRef<HTMLDivElement>(null);
  const track = useRef<HTMLUListElement>(null);
  const count = Children.count(children);

  useGSAP(
    () => {
      const frame = viewport.current;
      const row = track.current;
      if (!frame || !row) return;
      const media = gsap.matchMedia();

      media.add("(prefers-reduced-motion: no-preference)", () => {
        const items = Array.from(row.children) as HTMLElement[];
        // The row's visible width: the frame without its side padding (the 16px phone gutter).
        const inner = () => {
          const style = getComputedStyle(frame);
          return frame.clientWidth - parseFloat(style.paddingLeft) - parseFloat(style.paddingRight);
        };
        // How far the row travels so its last card ends at the right edge of the gutter, fully in view.
        const distance = () => Math.max(0, row.scrollWidth - inner());

        // Review stars wait hidden until their card appears, then fill one by one (globals.css `.je-star`).
        const starred = items.filter((item) => item.querySelector(".je-star"));
        const stars = (item: HTMLElement, state: "hidden" | "shown") => {
          if (starred.includes(item)) item.dataset.stars = state;
        };
        starred.forEach((item) => stars(item, "hidden"));
        // Cards in view before the row moves: they fade up once, in a stagger, when the row comes into view.
        const onScreen = items.filter((item) => item.offsetLeft < inner() - 1);
        onScreen.forEach((item, index) => item.style.setProperty("--reveal-delay", `${index * 80}ms`));

        gsap.from(onScreen, {
          y: 24,
          opacity: 0,
          duration: 0.6,
          ease: "power2.out",
          stagger: 0.08,
          scrollTrigger: {
            trigger: frame,
            start: "top 85%",
            once: true,
            onEnter: () => onScreen.forEach((item) => stars(item, "shown")),
          },
        });

        const cleanup = () => {
          frame.style.overflowX = "";
          items.forEach((item) => {
            delete item.dataset.stars;
            item.style.removeProperty("--reveal-delay");
          });
        };
        if (distance() <= 0) return cleanup;
        // The row is driven by the scroll from here on: clip it instead of letting the visitor swipe it.
        frame.style.overflowX = "hidden";

        // Hold the whole section still while the cards slide (title, tabs, cards and button), so the cards are the only
        // thing moving. That is the section's content block when it fits below the sticky header, otherwise just the
        // row (e.g. a short phone screen). Measured before pinning adds its spacer.
        const header = () => document.querySelector<HTMLElement>("header")?.offsetHeight ?? 72;
        const block = frame.closest("section")?.firstElementChild as HTMLElement | null;
        const pinned = block && block.offsetHeight <= window.innerHeight - header() - 16 ? block : frame;

        // Where each card sits flush with the left gutter, as a share of the travel: the row settles on one of these
        // when the visitor stops scrolling, so a card is never left cut in half.
        const stops = () => items.map((item) => Math.min(1, item.offsetLeft / distance()));

        const slide = gsap.to(row, {
          x: () => -distance(),
          ease: "none",
          scrollTrigger: {
            trigger: pinned,
            pin: pinned,
            // Centred in the space under the sticky header; taller than that, it pins just under the header.
            start: () =>
              pinned.offsetHeight <= window.innerHeight - header() - 16
                ? `center ${Math.round((window.innerHeight + header()) / 2)}px`
                : `top ${header() + 16}px`,
            end: () => `+=${distance()}`,
            scrub: 0.5,
            snap: { snapTo: (value) => gsap.utils.snap(stops(), value), duration: { min: 0.2, max: 0.5 }, delay: 0.08, ease: "power1.inOut" },
            anticipatePin: 1,
            invalidateOnRefresh: true,
          },
        });

        // Cards that start off to the right: stars fill as the card slides in, and reset when it slides back out.
        items
          .filter((item) => !onScreen.includes(item) && starred.includes(item))
          .forEach((item) =>
            ScrollTrigger.create({
              trigger: item,
              containerAnimation: slide,
              start: "left 85%",
              onEnter: () => stars(item, "shown"),
              onLeaveBack: () => stars(item, "hidden"),
            })
          );

        return cleanup;
      });

      // Only a width change moves the cards (pinning changes the frame's box, which must not start a refresh loop).
      let pending = 0;
      let width = frame.clientWidth;
      const observer = new ResizeObserver(() => {
        if (frame.clientWidth === width) return;
        width = frame.clientWidth;
        cancelAnimationFrame(pending);
        pending = requestAnimationFrame(() => ScrollTrigger.refresh());
      });
      observer.observe(frame);

      return () => {
        cancelAnimationFrame(pending);
        observer.disconnect();
        media.revert();
      };
    },
    { scope: viewport, dependencies: [count], revertOnUpdate: true }
  );

  return (
    <div
      ref={viewport}
      className="-mx-4 overflow-x-auto overscroll-x-contain px-4 py-2 [container-type:inline-size] [scrollbar-width:none] sm:mx-0 sm:px-0 [&::-webkit-scrollbar]:hidden"
    >
      <ul ref={track} className={cn("relative flex snap-x snap-mandatory gap-4 lg:gap-5", itemWidth, className)} {...rest}>
        {children}
      </ul>
    </div>
  );
}
