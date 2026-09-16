"use client";

import { useState, type FormEvent } from "react";
import TurnstileWidget from "@/components/public/TurnstileWidget";
import { Spinner } from "@/components/ui/Spinner";
import { placeOrder } from "@/lib/api/public";
import type { PlacedOrder } from "@/lib/api/types";
import { toOrderItem } from "@/lib/cart/orderItems";
import { clearCart, type CartItem } from "@/lib/cart/store";
import type { CartQuoteState } from "@/lib/cart/useCartQuote";
import { cn } from "@/lib/cn";
import { getAmount } from "@/lib/format";
import { notify } from "@/lib/notify";
import { buttonBase, buttonHover, fieldBase } from "@/lib/publicStyles";
import { useTurnstile } from "@/lib/turnstile/useTurnstile";
import { LIMITS, PHONE_MESSAGE, PHONE_PATTERN, isValidEmail, isValidPhone } from "@/lib/validation";

/** The order total the server computed, as display text ("₦1,150,000"), or "" if absent. */
const readOrderTotal = (order: PlacedOrder | undefined) => {
  if (typeof order?.total === "string" && order.total.trim()) return order.total.trim();
  const amount = Number(order?.totalAmount ?? order?.total);
  return Number.isFinite(amount) && amount > 0 ? "₦" + getAmount(amount) : "";
};

type Props = {
  cart: CartItem[];
  total: number;
  quote: CartQuoteState;
  onPlaced: (result: { name: string; total: string }) => void;
};

const field = cn(fieldBase, "bg-transparent");

/** Customer details and "Place Order". Port of frontend/src/pages/Checkout/Form.jsx. The `/order` payload is unchanged. */
export default function CheckoutForm({ cart, total, quote, onPlaced }: Props) {
  const [loading, setLoading] = useState(false);
  const turnstile = useTurnstile({ action: "order" });

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (cart.length > LIMITS.cartItems) {
      notify({ type: "error", message: `An order can include up to ${LIMITS.cartItems} items. Remove some items and try again.` });
      return;
    }
    if (quote.unavailableKeys.length) {
      notify({ type: "error", message: "Some items are no longer available. Remove them to place your order." });
      return;
    }
    if (quote.blocked) {
      notify({ type: "error", message: "We’re still checking current prices. Please try again in a moment." });
      return;
    }

    const form = event.currentTarget;
    const data = new FormData(form);
    const payload = {
      name: String(data.get("name") ?? ""),
      phoneNumber: String(data.get("phoneNumber") ?? ""),
      emailAddress: String(data.get("emailAddress") ?? ""),
      deliveryAddress: String(data.get("deliveryAddress") ?? ""),
      order: cart.map(toOrderItem),
      total: "₦" + getAmount(total),
    };

    if (payload.emailAddress && !isValidEmail(payload.emailAddress)) {
      notify({ message: "Invalid email address", type: "error" });
      return;
    }
    if (!isValidPhone(payload.phoneNumber)) {
      notify({ message: PHONE_MESSAGE, type: "error" });
      return;
    }
    if (!turnstile.ready) {
      notify({ message: "Please complete the security check and try again.", type: "error" });
      return;
    }

    setLoading(true);
    try {
      const response = await placeOrder(turnstile.withToken(payload));
      form.reset();
      clearCart();
      onPlaced({ name: payload.name, total: readOrderTotal(response.data) });
    } catch (error) {
      notify({ type: "error", message: error instanceof Error ? error.message : undefined });
      // Prices or availability may have changed since the quote.
      quote.refresh();
    } finally {
      setLoading(false);
      turnstile.reset();
    }
  };

  return (
    <div className="mt-5 flex justify-center">
      <form onSubmit={handleSubmit} aria-labelledby="customer-details" className="flex w-full flex-col gap-5">
        <p id="customer-details" className="inter-regular text-center text-base text-[#0B0B0B] lg:text-left">
          Customer Details
        </p>
        <label htmlFor="checkout-name" className="sr-only">
          Name
        </label>
        <input type="text" name="name" required id="checkout-name" maxLength={LIMITS.personName} placeholder="Name" autoComplete="name" className={field} />
        <label htmlFor="checkout-phone" className="sr-only">
          Phone number
        </label>
        <input
          type="tel"
          name="phoneNumber"
          required
          maxLength={LIMITS.phoneNumber}
          pattern={PHONE_PATTERN}
          title={PHONE_MESSAGE}
          id="checkout-phone"
          placeholder="Phone Number"
          autoComplete="tel"
          className={field}
        />
        <label htmlFor="checkout-email" className="sr-only">
          Email address (optional)
        </label>
        <input
          type="email"
          name="emailAddress"
          id="checkout-email"
          maxLength={LIMITS.email}
          placeholder="Email Address"
          autoComplete="email"
          className={field}
        />
        <label htmlFor="checkout-address" className="sr-only">
          Delivery address
        </label>
        <textarea
          required
          className={cn(field, "resize-none")}
          placeholder="Delivery Address"
          name="deliveryAddress"
          id="checkout-address"
          maxLength={LIMITS.deliveryAddress}
          autoComplete="street-address"
        />

        <div className="flex flex-col">
          <TurnstileWidget
            enabled={turnstile.enabled}
            error={turnstile.error}
            bindContainer={turnstile.bindContainer}
            errorClassName="text-sm text-deep_red"
          />
          <button
            type="submit"
            disabled={loading || !turnstile.ready || quote.blocked}
            aria-busy={loading || undefined}
            className={cn(buttonBase, buttonHover, "mt-5 w-full bg-brand-500 text-white")}
          >
            {loading ? <Spinner label="Placing order" className="h-5 w-5" /> : "Place Order"}
          </button>
        </div>
      </form>
    </div>
  );
}
