"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import WhatsAppIcon from "@/components/storefront/WhatsAppIcon";
import { cn } from "@/lib/cn";
import { enterDelay } from "@/lib/storefront/styles";
import { isActivePath, publicPathname, storeRoutes, whatsappHref } from "@/lib/storefront/routes";

export type FloatingActionsProps = {
  /** `settings.website.whatsappNumber`: the WhatsApp pill shows only with digits. */
  whatsappNumber: string | null | undefined;
};

/** Pages whose order buttons sit at the bottom of the screen on mobile: the stack stays off them. */
const HIDDEN_ON = [storeRoutes.cart, storeRoutes.checkout];

const pillBase = cn(
  "group pointer-events-auto flex items-center rounded-full shadow-elev-4 transition-[background-color,opacity,translate,box-shadow] duration-300 ease-out",
  "h-14 w-14 justify-center sm:h-auto sm:w-auto sm:justify-start sm:gap-3 sm:py-2 sm:pl-2 sm:pr-5",
  "motion-safe:hover:-translate-y-0.5 motion-safe:active:scale-[0.98]",
  "focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-offset-2"
);
const iconCircle = "flex h-10 w-10 shrink-0 items-center justify-center rounded-full";

/**
 * Floating action (TEAM_AND_MOTION_V1 §7.4), bottom right above the safe area: "Chat on WhatsApp" in WhatsApp green
 * with the WhatsApp mark on a white circle (2026-09-18; was a brand-red pill with a generic chat bubble), when a number
 * is set. No online status or badges. The load calculator moved to the header button (2026-09-17).
 *
 * - The pill slides in from the right about 1.2 s after load (CSS; none under reduced motion).
 * - On phones it is a 56 px circle with an accessible name; from `sm` it shows a label and sub-label.
 * - While the footer is on screen its background fades, so footer links underneath stay readable; hover or focus
 *   brings it back.
 * - Hidden on the cart and checkout. On phones on the home page, hidden while the hero is on screen so it does not
 *   cover the hero stats.
 */
export default function FloatingActions({ whatsappNumber }: FloatingActionsProps) {
  const pathname = usePathname();
  const [overFooter, setOverFooter] = useState(false);
  const [overHero, setOverHero] = useState(false);
  const whatsapp = whatsappHref(whatsappNumber);
  const hidden = HIDDEN_ON.some((path) => isActivePath(pathname, path));
  const onHome = publicPathname(pathname) === "/";
  const hasActions = !hidden && Boolean(whatsapp);

  useEffect(() => {
    const footer = document.querySelector("footer");
    if (!hasActions || !footer || typeof IntersectionObserver === "undefined") return;
    const observer = new IntersectionObserver(([entry]) => setOverFooter(Boolean(entry?.isIntersecting)));
    observer.observe(footer);
    return () => observer.disconnect();
  }, [hasActions]);

  // On phones the stack would cover the home hero's stats, so it waits until that hero has scrolled out of view. Inner
  // pages also start with a `[data-store-hero]` intro (§8.1), but it is short, so the stack stays visible there.
  useEffect(() => {
    const hero = onHome ? document.querySelector("#store-main [data-store-hero]") : null;
    if (!hasActions || !hero || typeof IntersectionObserver === "undefined") return;
    const observer = new IntersectionObserver(([entry]) => setOverHero(Boolean(entry?.isIntersecting)), { threshold: 0.15 });
    observer.observe(hero);
    return () => observer.disconnect();
  }, [hasActions, onHome, pathname]);

  if (!hasActions) return null;

  const faded = overFooter && "opacity-60 shadow-none hover:opacity-100 focus-visible:opacity-100";

  return (
    <div
      className={cn(
        "pointer-events-none fixed right-4 z-30 flex flex-col items-end gap-3 sm:right-6",
        "transition-[opacity,translate] duration-300 ease-out",
        overHero && onHome && "max-sm:invisible max-sm:translate-y-4 max-sm:opacity-0",
        "bottom-[calc(1rem+env(safe-area-inset-bottom))] sm:bottom-[calc(1.5rem+env(safe-area-inset-bottom))]"
      )}
    >
      {whatsapp && (
        <div style={enterDelay(1200)} className="je-fab-in">
          <a
            href={whatsapp}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Chat with Juwon Electric on WhatsApp (opens in a new tab)"
            className={cn(pillBase, "bg-whatsapp text-whatsapp-deep hover:bg-whatsapp-dark focus-visible:ring-whatsapp-deep", faded)}
          >
            <span className={cn(iconCircle, "bg-white text-whatsapp")}>
              <WhatsAppIcon className="h-5 w-5" />
            </span>
            <span aria-hidden="true" className="hidden text-left sm:block">
              <span className="block text-sm font-semibold leading-tight">Chat on WhatsApp</span>
              <span className="block text-xs leading-tight text-whatsapp-deep/80">We are available</span>
            </span>
          </a>
        </div>
      )}
    </div>
  );
}
