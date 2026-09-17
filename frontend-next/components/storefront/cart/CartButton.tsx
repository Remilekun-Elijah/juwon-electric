"use client";

import Link from "next/link";
import { ShoppingCart } from "lucide-react";
import { useCart } from "@/lib/cart/store";
import { cn } from "@/lib/cn";
import { storeRoutes } from "@/lib/storefront/routes";
import { storeFocus } from "@/lib/storefront/styles";

const itemsLabel = (count: number) => `${count} ${count === 1 ? "item" : "items"}`;

/**
 * Header cart link with a live count badge (cart lines, as the classic Navbar counts them). The count is announced
 * politely when it changes. The server render and hydration show 0 until the stored cart loads.
 */
export default function CartButton({ className, onNavigate }: { className?: string; onNavigate?: () => void }) {
  const cart = useCart();
  const count = cart.length;

  return (
    <>
      <Link
        href={storeRoutes.cart}
        onClick={onNavigate}
        aria-label={`Cart, ${itemsLabel(count)}`}
        className={cn(
          "relative inline-flex h-11 w-11 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-700 shadow-xs transition-colors hover:bg-slate-50 hover:text-slate-900 md:h-10 md:w-10",
          storeFocus,
          className
        )}
      >
        <ShoppingCart aria-hidden="true" className="h-5 w-5" />
        {count > 0 && (
          <span
            aria-hidden="true"
            className="absolute -right-1.5 -top-1.5 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-brand-600 px-1 text-[11px] font-semibold tabular-nums text-white ring-2 ring-white"
          >
            {count > 99 ? "99+" : count}
          </span>
        )}
      </Link>
      <span className="sr-only" aria-live="polite" aria-atomic="true">
        {count > 0 ? `Cart has ${itemsLabel(count)}` : ""}
      </span>
    </>
  );
}
