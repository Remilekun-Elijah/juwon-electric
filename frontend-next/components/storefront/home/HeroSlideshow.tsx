"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";
import Image from "next/image";
import { Pause, Play } from "lucide-react";
import { usePrefersReducedMotion } from "@/components/storefront/motion/usePrefersReducedMotion";
import { cn } from "@/lib/cn";

export type HeroSlide = { src: string; alt: string };

export type HeroSlideshowProps = {
  /** Up to 4 photos; the first is the server-rendered, eagerly loaded image. */
  slides: HeroSlide[];
  /** Time on each photo in ms (TEAM_AND_MOTION_V1 §7.3: 7 s). */
  interval?: number;
};

const indicatorFocus = "focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-gold-400 focus-visible:ring-offset-2 focus-visible:ring-offset-brand-950";

/**
 * Hero background (§7.3): photos crossfade (opacity, 1 s) with a slow zoom on the visible one, and gold progress bars
 * at the bottom centre that also jump to a photo. Place it inside the hero `<section>` (it fills it).
 *
 * - The active bar's CSS fill animation drives autoplay: when it ends, the next photo shows. Pausing stops the
 *   animation, so timing always matches the bar. No timers and no scroll listeners.
 * - Autoplay pauses while a mouse is over the hero, while focus is inside it, or after the pause button is pressed.
 * - Reduced motion: no autoplay and no zoom (the bars still switch photos; the active bar shows full).
 * - Without JavaScript the first photo shows on its own.
 */
export default function HeroSlideshow({ slides: allSlides, interval = 7000 }: HeroSlideshowProps) {
  const slides = allSlides.slice(0, 4);
  const rootRef = useRef<HTMLDivElement>(null);
  const [[active, previous], setSlide] = useState<[number, number | null]>([0, null]);
  const [userPaused, setUserPaused] = useState(false);
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const reducedMotion = usePrefersReducedMotion();

  const paused = userPaused || hovered || focused;
  const autoplay = slides.length > 1 && !reducedMotion;

  const show = (index: number) => setSlide(([current]) => (index === current ? [current, null] : [index, current]));
  const next = () => setSlide(([current]) => [(current + 1) % slides.length, current]);

  // Pause on mouse hover and keyboard focus anywhere in the hero section (content and controls).
  useEffect(() => {
    const hero = rootRef.current?.closest("section");
    if (!hero) return;
    const enter = (event: PointerEvent) => event.pointerType === "mouse" && setHovered(true);
    const leave = (event: PointerEvent) => event.pointerType === "mouse" && setHovered(false);
    const focusIn = () => setFocused(true);
    const focusOut = (event: FocusEvent) => {
      if (!hero.contains(event.relatedTarget as Node | null)) setFocused(false);
    };
    hero.addEventListener("pointerenter", enter);
    hero.addEventListener("pointerleave", leave);
    hero.addEventListener("focusin", focusIn);
    hero.addEventListener("focusout", focusOut);
    return () => {
      hero.removeEventListener("pointerenter", enter);
      hero.removeEventListener("pointerleave", leave);
      hero.removeEventListener("focusin", focusIn);
      hero.removeEventListener("focusout", focusOut);
    };
  }, []);

  if (!slides.length) return null;

  return (
    <div ref={rootRef} data-paused={paused ? "true" : "false"} style={{ "--slide-duration": `${interval}ms` } as CSSProperties}>
      <div className="absolute inset-0 -z-20 overflow-hidden">
        {slides.map((slide, index) => {
          const visible = index === active;
          return (
            <div
              key={slide.src}
              aria-hidden={visible ? undefined : true}
              className={cn("absolute inset-0 transition-opacity duration-1000 ease-in-out", visible ? "opacity-100" : "opacity-0")}
            >
              <Image
                src={slide.src}
                alt={slide.alt}
                fill
                priority={index === 0}
                sizes="100vw"
                className={cn("object-cover", (visible || index === previous) && autoplay && "je-kenburns")}
              />
            </div>
          );
        })}
      </div>

      {slides.length > 1 && (
        <div className="absolute inset-x-0 bottom-5 z-10 flex justify-center sm:bottom-7">
          <div className="flex items-center gap-1 rounded-full border border-white/10 bg-brand-950/40 py-1 pl-2 pr-1 backdrop-blur-md">
            <ul className="flex items-center" aria-label="Background photos">
              {slides.map((slide, index) => {
                const current = index === active;
                return (
                  <li key={slide.src}>
                    <button
                      type="button"
                      onClick={() => show(index)}
                      aria-label={`Show photo ${index + 1} of ${slides.length}`}
                      aria-current={current ? "true" : undefined}
                      className={cn("group flex h-8 w-9 items-center justify-center rounded-full sm:w-11", indicatorFocus)}
                    >
                      <span className="block h-1 w-full overflow-hidden rounded-full bg-white/30 transition-colors group-hover:bg-white/50">
                        {current && (
                          <span
                            key={`${active}-${autoplay}`}
                            onAnimationEnd={autoplay ? next : undefined}
                            className={cn("block h-full rounded-full bg-gold-400", autoplay && "je-progress")}
                          />
                        )}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
            {autoplay && (
              <button
                type="button"
                onClick={() => setUserPaused((value) => !value)}
                aria-label={userPaused ? "Play the photo slideshow" : "Pause the photo slideshow"}
                className={cn("flex h-8 w-8 items-center justify-center rounded-full text-white/90 transition-colors hover:bg-white/10 hover:text-white", indicatorFocus)}
              >
                {userPaused ? <Play aria-hidden="true" className="h-3.5 w-3.5 fill-current" /> : <Pause aria-hidden="true" className="h-3.5 w-3.5 fill-current" />}
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
