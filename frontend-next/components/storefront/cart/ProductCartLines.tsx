"use client";

import Link from "next/link";
import { useEffect, useRef, type RefObject } from "react";
import { Trash2 } from "lucide-react";
import { Alert, Button, toast } from "@/components/ui";
import ProductImage from "@/components/storefront/catalog/ProductImage";
import {
  addProductToCart,
  getProductCartKey,
  getProductCartItems,
  isCombinedCartFull,
  removeProductFromCart,
  setProductQuantity,
  type ProductCartItem,
} from "@/lib/cart/productStore";
import { MAX_QUANTITY, MIN_QUANTITY, getCartItems } from "@/lib/cart/store";
import type { CartQuoteState } from "@/lib/cart/useCartQuote";
import { formatPrice, productPath } from "@/lib/catalog";
import { cn } from "@/lib/cn";
import { storeFocus } from "@/lib/storefront/styles";
import QuantityStepper from "./QuantityStepper";

export type ProductCartLinesProps = {
  products: ProductCartItem[];
  quote: CartQuoteState;
  /** Receives focus after a line is removed. */
  focusAfterRemoveRef?: RefObject<HTMLElement | null>;
  className?: string;
};

/**
 * Catalogue product lines on the cart page: image, name (links to the product), brand and SKU, quantity stepper,
 * remove with an undo toast, and the line total from the server quote. Lines the quote can't price are flagged.
 */
export default function ProductCartLines({ products, quote, focusAfterRemoveRef, className }: ProductCartLinesProps) {
  const latest = useRef(products);
  useEffect(() => {
    latest.current = products;
  }, [products]);

  const restore = (item: ProductCartItem) => {
    if (latest.current.some((line) => line.productId === item.productId)) return;
    if (isCombinedCartFull(getCartItems().length, getProductCartItems().length)) {
      toast.error("Your cart is full, so we couldn’t put that product back. Remove another item first.");
      return;
    }
    const { quantity, ...rest } = item;
    addProductToCart(rest, quantity);
  };

  const remove = (item: ProductCartItem) => {
    removeProductFromCart(item.productId);
    focusAfterRemoveRef?.current?.focus();
    toast(`${item.name} removed from your cart`, {
      action: { label: "Undo", onClick: () => restore(item) },
    });
  };

  return (
    <ul className={cn("divide-y divide-slate-100", className)}>
      {products.map((item) => {
        const cartKey = getProductCartKey(item.productId);
        const domId = `line-${cartKey.replace(/[^a-zA-Z0-9]/g, "-")}`;
        const line = quote.status === "ok" ? quote.lines[cartKey] : undefined;
        const unavailable = line?.available === false;
        const unitPrice = line?.available ? line.price : Number(item.price);
        const lineTotal = line?.available ? line.lineTotal : Number(item.price) * Number(item.quantity);
        const href = productPath({ slug: item.slug, id: item.productId });

        return (
          <li key={cartKey} className="py-5 first:pt-0 last:pb-0">
            <div className="flex items-start gap-3 sm:gap-4">
              <Link
                href={href}
                tabIndex={-1}
                aria-hidden="true"
                className="block w-16 shrink-0 overflow-hidden rounded-lg border border-slate-200 sm:w-20"
              >
                <ProductImage src={item.image} alt="" sizes="80px" imageClassName="p-1.5" />
              </Link>

              <div className="min-w-0 flex-1">
                <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
                  <div className="min-w-0">
                    <h3 id={`${domId}-title`} className="break-words text-base font-semibold text-slate-900">
                      <Link href={href} className={cn("rounded-sm transition-colors hover:text-brand-700", storeFocus)}>
                        {item.name}
                      </Link>
                    </h3>
                    <p className="text-sm text-slate-600">
                      {item.brand ? `${item.brand} · ` : ""}Product
                    </p>
                    {item.sku && <p className="mt-0.5 text-xs tabular-nums text-slate-500">SKU {item.sku}</p>}
                  </div>
                  <div className="shrink-0 sm:text-right">
                    <p className="text-base font-semibold tabular-nums text-slate-900">
                      {unavailable ? <span className="text-red-700">Unavailable</span> : formatPrice(lineTotal)}
                    </p>
                    {!unavailable && (
                      <p className="text-xs tabular-nums text-slate-500">
                        {formatPrice(unitPrice)} × {item.quantity}
                      </p>
                    )}
                  </div>
                </div>

                {unavailable && (
                  <Alert tone="danger" className="mt-3">
                    This product is out of stock or can’t be ordered in this quantity right now. Lower the quantity or
                    remove it to check out.
                  </Alert>
                )}

                <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-3">
                  <QuantityStepper
                    label={`Quantity for ${item.name}`}
                    value={item.quantity}
                    min={MIN_QUANTITY}
                    max={MAX_QUANTITY}
                    onChange={(value) => setProductQuantity(item.productId, value)}
                    maxHintId={`${domId}-max`}
                  />
                  {item.quantity >= MAX_QUANTITY && (
                    <p id={`${domId}-max`} className="text-xs text-slate-500">
                      Up to {MAX_QUANTITY} of each product per order.
                    </p>
                  )}

                  <Button
                    variant={unavailable ? "soft-danger" : "ghost"}
                    size="md"
                    className="ml-auto h-11"
                    icon={<Trash2 aria-hidden="true" />}
                    onClick={() => remove(item)}
                  >
                    Remove<span className="sr-only"> {item.name}</span>
                  </Button>
                </div>
              </div>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
