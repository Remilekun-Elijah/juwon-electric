"use client";

import { useRef, useState, type ChangeEvent, type FormEvent, type ReactNode } from "react";
import { ShoppingCart } from "lucide-react";
import TurnstileWidget from "@/components/public/TurnstileWidget";
import { Alert, Button, Field, Input, Textarea } from "@/components/ui";
import { ApiError } from "@/lib/api/client";
import { placeOrder } from "@/lib/api/public";
import type { ProductCartItem } from "@/lib/cart/productStore";
import type { CartItem } from "@/lib/cart/store";
import type { CartQuoteState } from "@/lib/cart/useCartQuote";
import { useTurnstile } from "@/lib/turnstile/useTurnstile";
import { LIMITS, PHONE_MESSAGE, isValidEmail, isValidPhone } from "@/lib/validation";
import { UNAVAILABLE_MESSAGE } from "./OrderSummary";
import {
  buildOrderPayload,
  readOrderTotal,
  resolveOrderTotal,
  toLastOrder,
  type CheckoutValues,
  type LastOrder,
} from "./orderPayload";

export type CheckoutFormProps = {
  cart: CartItem[];
  /** Catalogue product lines (Commerce v3), sent after the package items. */
  products?: ProductCartItem[];
  quote: CartQuoteState;
  /** Called once the order is accepted, with the summary for /checkout/success. */
  onPlaced: (order: LastOrder) => void;
  /** Shown above the submit button (the payment note). */
  beforeSubmit?: ReactNode;
};

type FieldName = keyof CheckoutValues;
type Errors = Partial<Record<FieldName, string>>;

const EMPTY: CheckoutValues = { name: "", phoneNumber: "", emailAddress: "", deliveryAddress: "" };
const FIELD_ORDER: FieldName[] = ["name", "phoneNumber", "emailAddress", "deliveryAddress"];
const fieldId = (name: FieldName) => `checkout-${name}`;
const NO_PRODUCTS: ProductCartItem[] = [];

/**
 * Same rules as the classic checkout (components/public/cart/CheckoutForm.tsx): name, phone and address required,
 * phone must pass `isValidPhone`, email optional but valid when given. Limits come from `LIMITS`. Errors show inline.
 */
const validate = (values: CheckoutValues): Errors => {
  const errors: Errors = {};
  if (!values.name.trim()) errors.name = "Enter your full name.";
  if (!values.phoneNumber.trim()) errors.phoneNumber = "Enter a phone number we can call to confirm your order.";
  else if (!isValidPhone(values.phoneNumber)) errors.phoneNumber = PHONE_MESSAGE;
  if (values.emailAddress && !isValidEmail(values.emailAddress)) errors.emailAddress = "Enter a valid email address, or leave it blank.";
  if (!values.deliveryAddress.trim()) errors.deliveryAddress = "Enter the address we should deliver to.";
  return errors;
};

const errorMessage = (error: unknown) => {
  if (error instanceof ApiError && error.status === 0) {
    return "We couldn’t reach our server. Check your internet connection and try again.";
  }
  if (error instanceof Error && error.message) return error.message;
  return "Something went wrong while placing your order. Please try again.";
};

/**
 * Delivery details and "Place order". Sends the same `/order` body as the classic checkout (built by
 * `buildOrderPayload`), with Turnstile action `order`. Guards against double submits, shows field errors inline and
 * request errors in an alert, and refreshes the quote after a failure because prices or stock may have changed.
 */
export default function CheckoutForm({ cart, products = NO_PRODUCTS, quote, onPlaced, beforeSubmit }: CheckoutFormProps) {
  const [values, setValues] = useState<CheckoutValues>(EMPTY);
  const [errors, setErrors] = useState<Errors>({});
  const [formError, setFormError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const inFlight = useRef(false);
  const turnstile = useTurnstile({ action: "order" });

  const onChange = (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const name = event.target.name as FieldName;
    const value = event.target.value;
    setValues((current) => ({ ...current, [name]: value }));
    if (errors[name]) setErrors((current) => ({ ...current, [name]: undefined }));
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (inFlight.current) return;
    setFormError("");

    const fieldErrors = validate(values);
    setErrors(fieldErrors);
    const firstInvalid = FIELD_ORDER.find((name) => fieldErrors[name]);
    if (firstInvalid) {
      document.getElementById(fieldId(firstInvalid))?.focus();
      return;
    }

    if (cart.length + products.length > LIMITS.cartItems) {
      setFormError(`An order can include up to ${LIMITS.cartItems} items. Remove some and try again.`);
      return;
    }
    if (quote.unavailableKeys.length) {
      setFormError(UNAVAILABLE_MESSAGE);
      return;
    }
    if (quote.blocked) {
      setFormError("We’re still checking current prices. Please try again in a moment.");
      return;
    }
    if (!turnstile.ready) {
      setFormError("Please complete the security check and try again.");
      return;
    }

    const payload = buildOrderPayload(values, cart, resolveOrderTotal(cart, quote, products), products);

    inFlight.current = true;
    setSubmitting(true);
    try {
      const response = await placeOrder(turnstile.withToken(payload));
      onPlaced(
        toLastOrder(
          cart,
          {
            total: readOrderTotal(response.data) || payload.total,
            name: payload.name.trim(),
            placedAt: new Date().toISOString(),
          },
          products
        )
      );
    } catch (error) {
      setFormError(errorMessage(error));
      // Prices or availability may have changed since the quote.
      quote.refresh();
    } finally {
      inFlight.current = false;
      setSubmitting(false);
      turnstile.reset();
    }
  };

  const busy = submitting;
  const waitingForPrices = quote.status === "loading";

  return (
    <form onSubmit={handleSubmit} noValidate aria-labelledby="checkout-details-heading" aria-busy={busy || undefined} className="space-y-5">
      <div>
        <h2 id="checkout-details-heading" className="text-base font-semibold text-slate-900">
          Delivery details
        </h2>
        <p className="mt-1 text-sm text-slate-500">We use these to confirm your order and arrange delivery and installation.</p>
      </div>

      <Field id={fieldId("name")} label="Full name" required error={errors.name}>
        <Input
          size="lg"
          name="name"
          autoComplete="name"
          maxLength={LIMITS.personName}
          value={values.name}
          onChange={onChange}
          disabled={busy}
        />
      </Field>

      <div className="grid gap-5 sm:grid-cols-2">
        <Field
          id={fieldId("phoneNumber")}
          label="Phone number"
          required
          error={errors.phoneNumber}
          helper="We’ll call this number to confirm your order."
        >
          <Input
            size="lg"
            type="tel"
            name="phoneNumber"
            inputMode="tel"
            autoComplete="tel"
            placeholder="0803 123 4567"
            maxLength={LIMITS.phoneNumber}
            value={values.phoneNumber}
            onChange={onChange}
            disabled={busy}
          />
        </Field>

        <Field id={fieldId("emailAddress")} label="Email address (optional)" error={errors.emailAddress} helper="For order updates.">
          <Input
            size="lg"
            type="email"
            name="emailAddress"
            autoComplete="email"
            maxLength={LIMITS.email}
            value={values.emailAddress}
            onChange={onChange}
            disabled={busy}
          />
        </Field>
      </div>

      <Field
        id={fieldId("deliveryAddress")}
        label="Delivery address"
        required
        error={errors.deliveryAddress}
        helper="House number, street, area and a landmark, for example 12 Admiralty Way, Lekki Phase 1."
      >
        <Textarea
          name="deliveryAddress"
          rows={3}
          autoComplete="street-address"
          maxLength={LIMITS.deliveryAddress}
          value={values.deliveryAddress}
          onChange={onChange}
          disabled={busy}
        />
      </Field>

      {beforeSubmit}

      <TurnstileWidget
        enabled={turnstile.enabled}
        error={turnstile.error}
        bindContainer={turnstile.bindContainer}
        errorClassName="text-sm text-red-600"
      />

      {formError && (
        <Alert tone="danger" title="We couldn’t place your order">
          {formError}
        </Alert>
      )}

      <div>
        <Button
          type="submit"
          size="lg"
          className="w-full"
          loading={busy}
          loadingText="Placing your order…"
          disabled={busy || quote.blocked || !turnstile.ready}
          aria-describedby={waitingForPrices || !turnstile.ready ? "checkout-submit-hint" : undefined}
          icon={<ShoppingCart aria-hidden="true" />}
        >
          Place order
        </Button>
        {(waitingForPrices || (turnstile.enabled && !turnstile.ready)) && (
          <p id="checkout-submit-hint" className="mt-2 text-center text-xs text-slate-500">
            {waitingForPrices ? "Checking current prices…" : "Completing the security check…"}
          </p>
        )}
      </div>
    </form>
  );
}
