"use client";

import { useMemo, useRef, useState, type FormEvent, type ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, PackageSearch, ReceiptText, X } from "lucide-react";
import { toast } from "sonner";
import { AdminPage } from "@/components/admin/AdminPage";
import { ProductPicker } from "@/components/admin/catalog/ProductPicker";
import { ProductStatusBadge } from "@/components/admin/catalog/productBadges";
import { QuantityStepper } from "@/components/admin/QuantityStepper";
import { Alert, Button, Card, Field, Input, Select, Switch, Textarea } from "@/components/ui";
import { formatCurrency } from "@/lib/admin/format";
import { ApiError, createInStoreOrder, errorDetails } from "@/lib/api/admin";
import type { InStoreOrderInput, InsufficientStockDetail, Product } from "@/lib/api/types";
import { cn } from "@/lib/cn";
import { LIMITS, PHONE_MESSAGE, isValidEmail, isValidPhone } from "@/lib/validation";

/** Commerce v2 §2.2 limits. */
const SALE_LIMITS = {
  lines: 50,
  quantityMin: 1,
  quantityMax: 1000,
  reasonMin: 3,
  reasonMax: 200,
  note: 500,
  address: LIMITS.deliveryAddress,
} as const;

type Fulfilment = InStoreOrderInput["fulfilment"];
type SalePaymentStatus = InStoreOrderInput["paymentStatus"];
type Line = { product: Product; quantity: number };

type ErrorKey = "name" | "phone" | "email" | "lines" | "discount" | "reason" | "address" | "paymentStatus" | "note";
type Errors = Partial<Record<ErrorKey, string>>;

const paymentOptions: { value: SalePaymentStatus; label: string }[] = [
  { value: "pending", label: "Unpaid" },
  { value: "partial", label: "Part-paid" },
  { value: "paid", label: "Paid" },
];

const fulfilmentOptions: { value: Fulfilment; title: string; description: string }[] = [
  {
    value: "collected",
    title: "Collected now",
    description: "Stock is deducted now and the order is marked delivered.",
  },
  {
    value: "later",
    title: "Deliver or install later",
    description: "Saved as a pending order. Stock is deducted when it moves to processing.",
  },
];

/** Where a server 400 message belongs on this form. */
const serverFieldFor = (message: string): ErrorKey | null => {
  if (/delivery address/i.test(message)) return "address";
  if (/discount|reason/i.test(message)) return /reason/i.test(message) ? "reason" : "discount";
  if (/phone/i.test(message)) return "phone";
  if (/email/i.test(message)) return "email";
  if (/name/i.test(message)) return "name";
  if (/payment/i.test(message)) return "paymentStatus";
  if (/note/i.test(message)) return "note";
  if (/product|line|quantit/i.test(message)) return "lines";
  return null;
};

function Section({ id, title, description, children }: { id: string; title: string; description?: string; children: ReactNode }) {
  return (
    <Card as="section" aria-labelledby={`${id}-heading`} className="p-4 sm:p-6">
      <div className="mb-4 space-y-1">
        <h2 id={`${id}-heading`} className="text-base font-semibold text-slate-900">
          {title}
        </h2>
        {description && <p className="text-sm text-slate-500">{description}</p>}
      </div>
      <div className="space-y-4">{children}</div>
    </Card>
  );
}

/** `/admin/orders/new`: a sales rep records a sale made in the store (Commerce v2 §2). */
export function InStoreSale() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [lines, setLines] = useState<Line[]>([]);
  const [discountText, setDiscountText] = useState("");
  const [reason, setReason] = useState("");
  const [fulfilment, setFulfilment] = useState<Fulfilment>("collected");
  const [address, setAddress] = useState("");
  const [requiresInstallation, setRequiresInstallation] = useState(false);
  const [paymentStatus, setPaymentStatus] = useState<SalePaymentStatus | "">("");
  const [note, setNote] = useState("");

  const [errors, setErrors] = useState<Errors>({});
  const [formError, setFormError] = useState("");
  const [shortages, setShortages] = useState<Map<string, InsufficientStockDetail>>(() => new Map());
  const [submitting, setSubmitting] = useState(false);
  const submittingRef = useRef(false);
  const alertRef = useRef<HTMLDivElement>(null);

  const selectedIds = useMemo(() => new Set(lines.map((line) => line.product.id)), [lines]);
  const subtotal = lines.reduce((sum, line) => sum + line.product.price * line.quantity, 0);
  const units = lines.reduce((sum, line) => sum + line.quantity, 0);
  const discount = /^\d+$/.test(discountText) ? Number(discountText) : 0;
  const total = Math.max(0, subtotal - discount);
  const later = fulfilment === "later";

  const clearError = (key: ErrorKey) => setErrors((current) => (current[key] ? { ...current, [key]: undefined } : current));

  const addProduct = (product: Product) => {
    if (selectedIds.has(product.id) || lines.length >= SALE_LIMITS.lines) return;
    setLines((current) => [...current, { product, quantity: 1 }]);
    clearError("lines");
  };

  const setQuantity = (productId: string, quantity: number) => {
    setLines((current) => current.map((line) => (line.product.id === productId ? { ...line, quantity } : line)));
    setShortages((current) => {
      if (!current.has(productId)) return current;
      const next = new Map(current);
      next.delete(productId);
      return next;
    });
  };

  const removeLine = (productId: string) => {
    setLines((current) => current.filter((line) => line.product.id !== productId));
    setShortages((current) => {
      const next = new Map(current);
      next.delete(productId);
      return next;
    });
  };

  const validate = (): Errors => {
    const next: Errors = {};
    // Commerce v3 §2: name and phone are optional (walk-in customers); when given they follow the usual rules.
    if (name.trim().length > LIMITS.personName) next.name = `Name must be ${LIMITS.personName} characters or fewer.`;
    if (phone.trim() && !isValidPhone(phone)) next.phone = PHONE_MESSAGE;
    if (email.trim() && !isValidEmail(email)) next.email = "Enter a valid email address.";

    if (!lines.length) next.lines = "Add at least one product.";
    else if (lines.length > SALE_LIMITS.lines) next.lines = `A sale can have up to ${SALE_LIMITS.lines} products.`;
    else if (lines.some((line) => line.product.status === "archived")) next.lines = "Archived products can’t be sold. Remove them first.";

    if (discountText && !/^\d+$/.test(discountText)) next.discount = "Enter a whole number of naira.";
    else if (discount > subtotal) next.discount = `The discount can’t be more than the subtotal (${formatCurrency(subtotal)}).`;
    if (discount > 0) {
      const trimmedReason = reason.trim();
      if (trimmedReason.length < SALE_LIMITS.reasonMin) next.reason = "Give a reason for the discount (at least 3 characters).";
      else if (trimmedReason.length > SALE_LIMITS.reasonMax) next.reason = `Keep the reason to ${SALE_LIMITS.reasonMax} characters or fewer.`;
    }

    if (later) {
      if (!address.trim()) next.address = "Delivery address is required for later fulfilment.";
      else if (address.trim().length > SALE_LIMITS.address) next.address = `Address must be ${SALE_LIMITS.address} characters or fewer.`;
    }
    if (!paymentStatus) next.paymentStatus = "Choose the payment status.";
    if (note.trim().length > SALE_LIMITS.note) next.note = `Note must be ${SALE_LIMITS.note} characters or fewer.`;
    return next;
  };

  const showFormError = (message: string) => {
    setFormError(message);
    window.requestAnimationFrame(() => alertRef.current?.scrollIntoView({ block: "center", behavior: "smooth" }));
  };

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (submittingRef.current) return;
    const nextErrors = validate();
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length || !paymentStatus) {
      showFormError("Check the highlighted fields and try again.");
      return;
    }

    // Blank fields are left out rather than sent as empty strings.
    const customer: NonNullable<InStoreOrderInput["customer"]> = {};
    if (name.trim()) customer.name = name.trim();
    if (phone.trim()) customer.phoneNumber = phone.trim();
    if (email.trim()) customer.emailAddress = email.trim();
    if (later) customer.deliveryAddress = address.trim();

    const input: InStoreOrderInput = {
      ...(Object.keys(customer).length ? { customer } : {}),
      lines: lines.map((line) => ({ productId: line.product.id, quantity: line.quantity })),
      discount: discount > 0 ? { amount: discount, reason: reason.trim() } : null,
      fulfilment,
      paymentStatus,
      ...(later ? { requiresInstallation } : {}),
      note: note.trim() || null,
    };

    submittingRef.current = true;
    setSubmitting(true);
    setFormError("");
    setShortages(new Map());
    try {
      const response = await createInStoreOrder(input);
      toast.success(response.message || "Order created.");
      const orderId = response.data?.id;
      router.push(orderId ? `/admin/orders?order=${encodeURIComponent(orderId)}` : "/admin/orders");
      // Stay locked while navigating so a second tap can't create a duplicate order.
      return;
    } catch (error) {
      submittingRef.current = false;
      setSubmitting(false);
      if (error instanceof ApiError && error.status === 409) {
        const details = errorDetails<InsufficientStockDetail[]>(error);
        if (Array.isArray(details) && details.length) {
          setShortages(new Map(details.map((detail) => [detail.productId, detail])));
          showFormError(
            "There isn’t enough stock to complete this sale now. Lower the quantities marked below, or choose Deliver or install later."
          );
          return;
        }
      }
      const message = error instanceof Error && error.message ? error.message : "The sale couldn’t be recorded.";
      const field = error instanceof ApiError && error.status === 400 ? serverFieldFor(message) : null;
      if (field) setErrors((current) => ({ ...current, [field]: message }));
      showFormError(field ? "Check the highlighted fields and try again." : message);
    }
  };

  return (
    <AdminPage
      module="new-sale"
      actions={
        <Button as={Link} href="/admin/orders" variant="outline" icon={<ArrowLeft aria-hidden="true" />}>
          Back to orders
        </Button>
      }
    >
      <form
        onSubmit={submit}
        noValidate
        aria-label="New in-store sale"
        className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px] lg:items-start"
      >
        <div className="min-w-0 space-y-6">
          {formError && (
            <div ref={alertRef}>
              <Alert tone="danger" title="Couldn’t record the sale" onDismiss={() => setFormError("")}>
                {formError}
              </Alert>
            </div>
          )}

          <Section id="sale-customer" title="Customer">
            <Field label="Name" helper="Leave blank for walk-in customers." error={errors.name}>
              <Input
                size="lg"
                autoComplete="off"
                maxLength={LIMITS.personName}
                value={name}
                onChange={(event) => {
                  setName(event.target.value);
                  clearError("name");
                }}
              />
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Phone number" helper="Leave blank for walk-in customers." error={errors.phone}>
                <Input
                  size="lg"
                  type="tel"
                  inputMode="tel"
                  autoComplete="off"
                  maxLength={LIMITS.phoneNumber}
                  value={phone}
                  onChange={(event) => {
                    setPhone(event.target.value);
                    clearError("phone");
                  }}
                />
              </Field>
              <Field label="Email" helper="Optional. For the receipt and updates." error={errors.email}>
                <Input
                  size="lg"
                  type="email"
                  inputMode="email"
                  autoComplete="off"
                  maxLength={LIMITS.email}
                  value={email}
                  onChange={(event) => {
                    setEmail(event.target.value);
                    clearError("email");
                  }}
                />
              </Field>
            </div>
          </Section>

          <Section id="sale-products" title="Products" description="Prices come from the product. Hidden products can be sold.">
            <ProductPicker
              size="lg"
              label="Search products to add to the sale"
              selectedIds={selectedIds}
              archivedReason="Archived: can’t be sold"
              onPick={addProduct}
            />
            {errors.lines && <p className="text-sm text-red-600">{errors.lines}</p>}

            {lines.length ? (
              <ul aria-label="Products in this sale" className="divide-y divide-slate-100 rounded-xl border border-slate-200">
                {lines.map((line) => (
                  <SaleLineRow
                    key={line.product.id}
                    line={line}
                    later={later}
                    shortage={shortages.get(line.product.id)}
                    onQuantity={(quantity) => setQuantity(line.product.id, quantity)}
                    onRemove={() => removeLine(line.product.id)}
                  />
                ))}
                <li className="flex items-center justify-between gap-3 bg-slate-50 px-4 py-3">
                  <span className="text-sm font-medium text-slate-700">Subtotal</span>
                  <span className="text-base font-semibold tabular-nums text-slate-900">{formatCurrency(subtotal)}</span>
                </li>
              </ul>
            ) : (
              <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-slate-200 px-4 py-8 text-center">
                <PackageSearch aria-hidden="true" className="h-6 w-6 text-slate-400" />
                <p className="text-sm font-medium text-slate-700">No products added yet</p>
                <p className="text-sm text-slate-500">Search above and tap a product to add it.</p>
              </div>
            )}
          </Section>

          <Section id="sale-discount" title="Discount" description="Optional. The reason is saved on the order and in the activity log.">
            <div className="grid gap-4 sm:grid-cols-[200px_minmax(0,1fr)]">
              <Field
                label="Amount (₦)"
                error={errors.discount}
                helper={subtotal ? `Up to ${formatCurrency(subtotal)}` : undefined}
              >
                <Input
                  size="lg"
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  placeholder="0"
                  className="tabular-nums"
                  value={discountText}
                  onChange={(event) => {
                    setDiscountText(event.target.value.replace(/[^\d]/g, ""));
                    clearError("discount");
                    clearError("reason");
                  }}
                />
              </Field>
              <Field label="Reason" required={discount > 0} error={errors.reason}>
                <Input
                  size="lg"
                  maxLength={SALE_LIMITS.reasonMax}
                  placeholder="e.g. Loyal customer, price match"
                  value={reason}
                  onChange={(event) => {
                    setReason(event.target.value);
                    clearError("reason");
                  }}
                />
              </Field>
            </div>
          </Section>

          <Section id="sale-fulfilment" title="Fulfilment and payment">
            <fieldset className="space-y-3">
              <legend className="mb-2 text-sm font-medium text-slate-700">How does the customer get it?</legend>
              <div className="grid gap-3 sm:grid-cols-2">
                {fulfilmentOptions.map((option) => {
                  const checked = fulfilment === option.value;
                  return (
                    <label
                      key={option.value}
                      className={cn(
                        "flex min-h-11 cursor-pointer items-start gap-3 rounded-lg border p-3 transition-colors has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-brand-500",
                        checked ? "border-brand-500 bg-brand-50" : "border-slate-200 hover:bg-slate-50"
                      )}
                    >
                      <input
                        type="radio"
                        name="fulfilment"
                        value={option.value}
                        checked={checked}
                        onChange={() => {
                          setFulfilment(option.value);
                          setShortages(new Map());
                        }}
                        className="mt-0.5 h-5 w-5 shrink-0 cursor-pointer accent-brand-600 focus-visible:outline-hidden"
                      />
                      <span className="min-w-0">
                        <span className="block text-sm font-medium text-slate-900">{option.title}</span>
                        <span className="block text-xs text-slate-500">{option.description}</span>
                      </span>
                    </label>
                  );
                })}
              </div>
            </fieldset>

            {later && (
              <div className="space-y-4 rounded-lg border border-slate-200 p-4">
                <Field label="Delivery address" required error={errors.address}>
                  <Textarea
                    rows={3}
                    className="min-h-[88px]"
                    maxLength={SALE_LIMITS.address}
                    value={address}
                    onChange={(event) => {
                      setAddress(event.target.value);
                      clearError("address");
                    }}
                  />
                </Field>
                <Switch
                  label="Requires installation"
                  description="An engineer installs the system on site. Assign one from the order afterwards."
                  checked={requiresInstallation}
                  onChange={setRequiresInstallation}
                />
              </div>
            )}

            <Field label="Payment status" required error={errors.paymentStatus} className="sm:max-w-xs">
              <Select
                size="lg"
                placeholder="Choose payment status"
                value={paymentStatus}
                options={paymentOptions}
                onChange={(event) => {
                  setPaymentStatus(event.target.value as SalePaymentStatus);
                  clearError("paymentStatus");
                }}
              />
            </Field>
          </Section>

          <Section id="sale-note" title="Note">
            <Field label="Internal note" helper="Optional. Only admins see this." error={errors.note}>
              <Textarea
                rows={3}
                className="min-h-[88px]"
                maxLength={SALE_LIMITS.note}
                value={note}
                onChange={(event) => {
                  setNote(event.target.value);
                  clearError("note");
                }}
              />
            </Field>
          </Section>
        </div>

        <aside
          aria-label="Sale summary"
          className="sticky bottom-0 z-20 -mx-4 border-t border-slate-200 bg-white px-4 py-3 shadow-elev-4 md:-mx-6 md:px-6 lg:top-24 lg:bottom-auto lg:mx-0 lg:rounded-xl lg:border lg:p-6 lg:shadow-elev-1"
        >
          <h2 className="hidden text-base font-semibold text-slate-900 lg:block">Summary</h2>
          <dl className="hidden space-y-2 text-sm lg:mt-4 lg:block">
            <div className="flex justify-between gap-3">
              <dt className="text-slate-600">Customer</dt>
              <dd className={cn("min-w-0 truncate text-right", name.trim() ? "text-slate-900" : "text-slate-500")}>
                {name.trim() || "Walk-in customer"}
              </dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-slate-600">Items</dt>
              <dd className="tabular-nums text-slate-900">{units}</dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-slate-600">Subtotal</dt>
              <dd className="tabular-nums text-slate-900">{formatCurrency(subtotal)}</dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-slate-600">Discount</dt>
              <dd className={cn("tabular-nums", discount ? "text-red-700" : "text-slate-900")}>
                {discount ? `−${formatCurrency(discount)}` : formatCurrency(0)}
              </dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-slate-600">Fulfilment</dt>
              <dd className="text-right text-slate-900">{later ? "Deliver or install later" : "Collected now"}</dd>
            </div>
          </dl>
          <div className="flex items-center justify-between gap-3 lg:mt-4 lg:block lg:space-y-4 lg:border-t lg:border-slate-200 lg:pt-4">
            <div className="min-w-0 lg:flex lg:items-baseline lg:justify-between">
              <p className="text-xs text-slate-500 lg:text-sm lg:font-medium lg:text-slate-900">Total</p>
              <p className="text-lg font-bold tabular-nums text-slate-900 lg:text-xl" aria-live="polite">
                {formatCurrency(total)}
              </p>
              <p className="truncate text-xs text-slate-500 lg:hidden">
                {name.trim() || "Walk-in customer"} · {units} item{units === 1 ? "" : "s"}
                {discount ? ` · −${formatCurrency(discount)}` : ""}
              </p>
            </div>
            <Button
              type="submit"
              size="lg"
              className="shrink-0 lg:w-full"
              loading={submitting}
              loadingText="Recording sale…"
              icon={<ReceiptText aria-hidden="true" />}
            >
              Record sale
            </Button>
          </div>
        </aside>
      </form>
    </AdminPage>
  );
}

function SaleLineRow({
  line,
  later,
  shortage,
  onQuantity,
  onRemove,
}: {
  line: Line;
  later: boolean;
  shortage?: InsufficientStockDetail;
  onQuantity: (quantity: number) => void;
  onRemove: () => void;
}) {
  const { product, quantity } = line;
  const stock = product.stockQuantity;
  const overStock = quantity > stock;
  const stockNote = overStock
    ? later
      ? `${stock} in stock now. Stock is checked when the order moves to processing.`
      : `Only ${stock} in stock.`
    : `${stock} in stock`;

  return (
    <li className="space-y-3 px-4 py-3">
      <div className="flex items-start gap-3">
        <div className="min-w-0 flex-1">
          <p className="flex min-w-0 flex-wrap items-center gap-2">
            <span className="break-words text-sm font-medium text-slate-900">{product.name}</span>
            {product.status !== "active" && <ProductStatusBadge status={product.status} />}
          </p>
          <p className="mt-0.5 flex flex-wrap gap-x-2 text-xs text-slate-500">
            <span className="font-mono">{product.sku}</span>
            <span className="tabular-nums">{formatCurrency(product.price)} each</span>
          </p>
          <p
            className={cn(
              "mt-0.5 text-xs tabular-nums",
              overStock ? (later ? "text-amber-700" : "text-red-600") : "text-slate-500"
            )}
          >
            {stockNote}
          </p>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="h-11 w-11 shrink-0 hover:bg-red-50 hover:text-red-700"
          aria-label={`Remove ${product.name}`}
          title="Remove"
          onClick={onRemove}
        >
          <X aria-hidden="true" />
        </Button>
      </div>
      <div className="flex items-center justify-between gap-3">
        <QuantityStepper
          size="lg"
          label={`Quantity of ${product.name}`}
          value={quantity}
          min={SALE_LIMITS.quantityMin}
          max={SALE_LIMITS.quantityMax}
          invalid={Boolean(shortage)}
          onChange={onQuantity}
        />
        <p className="text-right text-base font-semibold tabular-nums text-slate-900">{formatCurrency(product.price * quantity)}</p>
      </div>
      {shortage && (
        <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
          Not enough stock for {shortage.sku || product.sku}: this sale needs {shortage.required}, {shortage.available} available.
        </p>
      )}
    </li>
  );
}
