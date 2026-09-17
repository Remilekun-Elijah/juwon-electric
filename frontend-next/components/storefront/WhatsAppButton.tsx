"use client";

import { usePathname } from "next/navigation";
import { MessageCircle } from "lucide-react";
import { cn } from "@/lib/cn";
import { isActivePath, storeRoutes, whatsappHref } from "@/lib/storefront/routes";

export type WhatsAppButtonProps = {
  /** `settings.website.whatsappNumber`. Nothing renders without digits. */
  number: string | null | undefined;
};

/** Pages whose order buttons sit at the bottom of the screen on mobile: the floating button stays off them. */
const HIDDEN_ON = [storeRoutes.cart, storeRoutes.checkout];

/**
 * Floating WhatsApp chat button (LANDING_V1 §7): bottom right, 56 px, clear of the iPhone home indicator through the
 * safe-area inset. Hidden on the cart and checkout so it never covers their buttons; those pages have call links.
 */
export default function WhatsAppButton({ number }: WhatsAppButtonProps) {
  const pathname = usePathname();
  const href = whatsappHref(number);
  if (!href || HIDDEN_ON.some((path) => isActivePath(pathname, path))) return null;

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Chat with Juwon Electric on WhatsApp (opens in a new tab)"
      className={cn(
        "fixed right-4 z-30 inline-flex h-14 w-14 items-center justify-center rounded-full bg-brand-700 text-white shadow-elev-4 transition-colors hover:bg-brand-800 sm:right-6",
        "bottom-[calc(1rem+env(safe-area-inset-bottom))] sm:bottom-[calc(1.5rem+env(safe-area-inset-bottom))]",
        "focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2"
      )}
    >
      <MessageCircle aria-hidden="true" className="h-7 w-7" />
    </a>
  );
}
