"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Calculator, MessageCircle } from "lucide-react";
import { cn } from "@/lib/cn";
import { enterDelay } from "@/lib/storefront/styles";
import { isActivePath, storeRoutes, whatsappHref } from "@/lib/storefront/routes";

export type FloatingActionsProps = {
  /** `settings.website.whatsappNumber`: the WhatsApp pill shows only with digits. */
  whatsappNumber: string | null | undefined;
  /** `settings.calculator` is enabled: the "Size your system" pill shows. */
  calculatorEnabled: boolean;
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
 * Floating actions (TEAM_AND_MOTION_V1 §7.4), bottom right above the safe area: "Size your system" (gold, when the
 * calculator is on and you're not on it) and "Chat on WhatsApp" (brand, when a number is set). No online status or
 * badges.
 *
 * - The pills slide in from the right about 1.2 s after load (CSS; none under reduced motion).
 * - On phones they are 56 px circles with an accessible name; from `sm` they show a label and sub-label.
 * - While the footer is on screen their background fades, so footer links underneath stay readable; hover or focus
 *   brings it back.
 * - Hidden on the cart and checkout.
 */
export default function FloatingActions({ whatsappNumber, calculatorEnabled }: FloatingActionsProps) {
  const pathname = usePathname();
  const [overFooter, setOverFooter] = useState(false);
  const whatsapp = whatsappHref(whatsappNumber);
  const hidden = HIDDEN_ON.some((path) => isActivePath(pathname, path));
  const showCalculator = calculatorEnabled && !isActivePath(pathname, storeRoutes.calculator);
  const hasActions = !hidden && (showCalculator || Boolean(whatsapp));

  useEffect(() => {
    const footer = document.querySelector("footer");
    if (!hasActions || !footer || typeof IntersectionObserver === "undefined") return;
    const observer = new IntersectionObserver(([entry]) => setOverFooter(Boolean(entry?.isIntersecting)));
    observer.observe(footer);
    return () => observer.disconnect();
  }, [hasActions]);

  if (!hasActions) return null;

  const faded = overFooter && "opacity-60 shadow-none hover:opacity-100 focus-visible:opacity-100";

  return (
    <div
      className={cn(
        "pointer-events-none fixed right-4 z-30 flex flex-col items-end gap-3 sm:right-6",
        "bottom-[calc(1rem+env(safe-area-inset-bottom))] sm:bottom-[calc(1.5rem+env(safe-area-inset-bottom))]"
      )}
    >
      {showCalculator && (
        <div style={enterDelay(1200)} className="je-fab-in">
          <Link
            href={storeRoutes.calculator}
            aria-label="Size your system with the load calculator"
            className={cn(pillBase, "bg-gold-400 text-slate-950 hover:bg-gold-300 focus-visible:ring-gold-500", faded)}
          >
            <span className={cn(iconCircle, "bg-slate-950 text-gold-400")}>
              <Calculator aria-hidden="true" className="h-5 w-5" />
            </span>
            <span aria-hidden="true" className="hidden text-left sm:block">
              <span className="block text-sm font-semibold leading-tight">Size your system</span>
              <span className="block text-xs leading-tight text-slate-800">Load calculator</span>
            </span>
          </Link>
        </div>
      )}
      {whatsapp && (
        <div style={enterDelay(showCalculator ? 1320 : 1200)} className="je-fab-in">
          <a
            href={whatsapp}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Chat with Juwon Electric on WhatsApp (opens in a new tab)"
            className={cn(pillBase, "bg-brand-700 text-white hover:bg-brand-800 focus-visible:ring-brand-500", faded)}
          >
            <span className={cn(iconCircle, "bg-brand-900 text-white")}>
              <MessageCircle aria-hidden="true" className="h-5 w-5" />
            </span>
            <span aria-hidden="true" className="hidden text-left sm:block">
              <span className="block text-sm font-semibold leading-tight">Chat on WhatsApp</span>
              <span className="block text-xs leading-tight text-brand-100">We reply during business hours</span>
            </span>
          </a>
        </div>
      )}
    </div>
  );
}
