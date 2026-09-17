"use client";

import { Children, useCallback, useEffect, useId, useState, type ReactNode } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/cn";

type CarouselProps = {
  children: ReactNode;
  /** Accessible name for the carousel region. */
  label: string;
  autoPlay?: boolean;
  /** Milliseconds between slides (react-responsive-carousel default: 3000). */
  interval?: number;
  className?: string;
};

/**
 * Replacement for react-responsive-carousel as used by the Vite site (`autoPlay infiniteLoop showThumbs={false}`):
 * side arrows, dots, "n of m" status, infinite loop, pause on hover/focus. Autoplay is off when the user prefers
 * reduced motion, and can be paused with a button (WCAG 2.2.2).
 */
export default function Carousel({ children, label, autoPlay = true, interval = 3000, className }: CarouselProps) {
  const slides = Children.toArray(children);
  const count = slides.length;
  const [index, setIndex] = useState(0);
  const [hovered, setHovered] = useState(false);
  const [paused, setPaused] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);
  const id = useId();

  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReducedMotion(query.matches);
    update();
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, []);

  const go = useCallback((next: number) => setIndex(((next % count) + count) % count), [count]);

  const playing = autoPlay && !paused && !hovered && !reducedMotion && count > 1;

  useEffect(() => {
    if (!playing) return undefined;
    const timer = window.setInterval(() => setIndex((current) => (current + 1) % count), interval);
    return () => window.clearInterval(timer);
  }, [playing, interval, count]);

  if (count === 0) return null;

  const arrow =
    "absolute top-0 bottom-0 z-10 flex w-12 items-center justify-center bg-transparent text-white opacity-40 transition hover:bg-black/20 hover:opacity-100 focus-visible:opacity-100 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand-500";

  return (
    <section
      aria-roledescription="carousel"
      aria-label={label}
      className={cn("relative overflow-hidden", className)}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onFocusCapture={() => setHovered(true)}
      onBlurCapture={() => setHovered(false)}
    >
      <div
        className="flex transition-transform duration-[350ms] ease-in-out motion-reduce:transition-none"
        style={{ transform: `translateX(-${index * 100}%)` }}
        aria-live={playing ? "off" : "polite"}
      >
        {slides.map((slide, slideIndex) => (
          <div
            key={slideIndex}
            id={`${id}-slide-${slideIndex}`}
            role="group"
            aria-roledescription="slide"
            aria-label={`${slideIndex + 1} of ${count}`}
            aria-hidden={slideIndex !== index}
            inert={slideIndex !== index}
            className="w-full shrink-0"
          >
            {slide}
          </div>
        ))}
      </div>

      {count > 1 && (
        <>
          <button type="button" className={cn(arrow, "left-0")} onClick={() => go(index - 1)} aria-label="Previous slide">
            <ChevronLeft aria-hidden="true" className="h-8 w-8 drop-shadow-sm" />
          </button>
          <button type="button" className={cn(arrow, "right-0")} onClick={() => go(index + 1)} aria-label="Next slide">
            <ChevronRight aria-hidden="true" className="h-8 w-8 drop-shadow-sm" />
          </button>

          <p className="absolute right-0 top-0 z-10 p-1.5 text-[10px] text-white [text-shadow:1px_1px_1px_rgba(0,0,0,0.9)]">
            {index + 1} of {count}
          </p>

          <div className="absolute bottom-0 left-0 right-0 z-10 flex items-center justify-center gap-1 pb-2">
            {autoPlay && !reducedMotion && (
              <button
                type="button"
                onClick={() => setPaused((value) => !value)}
                className="mr-2 rounded-full bg-black/30 px-2 py-0.5 text-[11px] text-white focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-brand-500"
              >
                {paused ? "Play" : "Pause"}
              </button>
            )}
            {slides.map((_, dot) => (
              <button
                key={dot}
                type="button"
                onClick={() => go(dot)}
                aria-label={`Go to slide ${dot + 1}`}
                aria-controls={`${id}-slide-${dot}`}
                aria-current={dot === index ? "true" : undefined}
                className="flex h-6 w-6 items-center justify-center rounded-full focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-brand-500"
              >
                <span
                  aria-hidden="true"
                  className={cn(
                    "block h-2 w-2 rounded-full bg-white shadow-[1px_1px_2px_rgba(0,0,0,0.9)] transition-opacity",
                    dot === index ? "opacity-100" : "opacity-30 hover:opacity-100"
                  )}
                />
              </button>
            ))}
          </div>
        </>
      )}
    </section>
  );
}
