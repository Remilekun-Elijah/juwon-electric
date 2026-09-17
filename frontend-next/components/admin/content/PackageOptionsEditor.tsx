"use client";

import { useMemo, useState, type Dispatch, type SetStateAction } from "react";
import { Minus, PackagePlus, Plus, Trash2, X } from "lucide-react";
import { ProductPicker } from "@/components/admin/catalog/ProductPicker";
import { ProductStatusBadge } from "@/components/admin/catalog/productBadges";
import { QuantityStepper } from "@/components/admin/QuantityStepper";
import { Alert, Badge, Button, Field, Input, Textarea } from "@/components/ui";
import { formatCurrency } from "@/lib/admin/format";
import {
  OPTION_LIMITS,
  emptyOptionDraft,
  itemDraftFor,
  priceOption,
  type ItemDraft,
  type OptionDraft,
  type OptionErrors,
} from "@/lib/admin/packageOptions";
import { cn } from "@/lib/cn";

export type PackageOptionsState = {
  drafts: OptionDraft[];
  setDrafts: Dispatch<SetStateAction<OptionDraft[]>>;
  errors: Record<string, OptionErrors>;
  /** Section-level message (client check or a server product error). */
  generalError: string;
  /** True while current product prices and stock are being loaded for an existing package. */
  checkingProducts: boolean;
};

/** Price options for a package (Commerce v2 §1): each option lists products, or keeps a legacy manual price. */
export function PackageOptionsEditor({ drafts, setDrafts, errors, generalError, checkingProducts }: PackageOptionsState) {
  const update = (rowId: string, change: (draft: OptionDraft) => OptionDraft) =>
    setDrafts((current) => current.map((draft) => (draft.rowId === rowId ? change(draft) : draft)));

  return (
    <section aria-labelledby="package-options-heading" className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h3 id="package-options-heading" className="text-sm font-medium text-slate-900">
            Price options <span className="text-red-600">*</span>
          </h3>
          <p className="text-xs text-slate-500">
            Customers pick one option. Add products to an option to price it from those products.
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          icon={<Plus aria-hidden="true" />}
          disabled={drafts.length >= OPTION_LIMITS.options}
          onClick={() => setDrafts((current) => [...current, emptyOptionDraft()])}
        >
          Add option
        </Button>
      </div>

      {generalError && (
        <Alert tone="danger" title="Check the price options">
          {generalError}
        </Alert>
      )}

      <ol className="space-y-4">
        {drafts.map((draft, index) => (
          <OptionCard
            key={draft.rowId}
            draft={draft}
            index={index}
            errors={errors[draft.rowId] ?? {}}
            canRemove={drafts.length > 1}
            checkingProducts={checkingProducts}
            onChange={(change) => update(draft.rowId, change)}
            onRemove={() => setDrafts((current) => current.filter((item) => item.rowId !== draft.rowId))}
          />
        ))}
      </ol>
    </section>
  );
}

type OptionCardProps = {
  draft: OptionDraft;
  index: number;
  errors: OptionErrors;
  canRemove: boolean;
  checkingProducts: boolean;
  onChange: (change: (draft: OptionDraft) => OptionDraft) => void;
  onRemove: () => void;
};

function OptionCard({ draft, index, errors, canRemove, checkingProducts, onChange, onRemove }: OptionCardProps) {
  const [picking, setPicking] = useState(false);
  const pricing = priceOption(draft);
  const selectedIds = useMemo(() => new Set(draft.items.map((item) => item.productId)), [draft.items]);
  const title = draft.name.trim() || `Option ${index + 1}`;
  const headingId = `${draft.rowId}-heading`;

  const setItem = (rowId: string, change: Partial<ItemDraft>) =>
    onChange((current) => ({
      ...current,
      items: current.items.map((item) => (item.rowId === rowId ? { ...item, ...change } : item)),
    }));

  return (
    <li aria-labelledby={headingId} className="rounded-xl border border-slate-200 bg-white">
      <div className="flex items-start gap-3 border-b border-slate-100 p-4">
        <div className="min-w-0 flex-1 space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <h4 id={headingId} className="truncate text-sm font-semibold text-slate-900">
              {title}
            </h4>
            {pricing.composed ? <Badge tone="info">Composed</Badge> : <Badge tone="neutral">Manual price</Badge>}
          </div>
          <Field label="Option name" required error={errors.name}>
            <Input
              value={draft.name}
              maxLength={OPTION_LIMITS.name}
              placeholder="With solar"
              onChange={(event) => onChange((current) => ({ ...current, name: event.target.value }))}
            />
          </Field>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="hover:bg-red-50 hover:text-red-700"
          aria-label={`Remove option ${title}`}
          title={canRemove ? "Remove option" : "A package needs at least one option"}
          disabled={!canRemove}
          onClick={onRemove}
        >
          <Trash2 aria-hidden="true" />
        </Button>
      </div>

      <div className="space-y-4 p-4">
        <div className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm font-medium text-slate-700">
              Products{" "}
              <span className="font-normal text-slate-500">
                ({draft.items.length}/{OPTION_LIMITS.items})
              </span>
            </p>
            {!picking && (
              <Button
                variant="outline"
                size="sm"
                icon={<PackagePlus aria-hidden="true" />}
                disabled={draft.items.length >= OPTION_LIMITS.items}
                onClick={() => setPicking(true)}
              >
                Add product
              </Button>
            )}
          </div>

          {errors.items && <p className="text-sm text-red-600">{errors.items}</p>}

          {draft.items.length > 0 && (
            <ul className="divide-y divide-slate-100 rounded-lg border border-slate-200">
              {draft.items.map((item) => (
                <ItemRow
                  key={item.rowId}
                  item={item}
                  checkingProducts={checkingProducts}
                  onQuantity={(quantity) => setItem(item.rowId, { quantity })}
                  onNote={(note) => setItem(item.rowId, { note })}
                  onRemove={() =>
                    onChange((current) => ({ ...current, items: current.items.filter((row) => row.rowId !== item.rowId) }))
                  }
                />
              ))}
            </ul>
          )}

          {picking && (
            <div className="space-y-2 rounded-lg border border-slate-200 bg-slate-50 p-3">
              <div className="flex items-center justify-between gap-2">
                <p className="text-xs font-medium text-slate-600">Add products to {title}</p>
                <Button variant="ghost" size="sm" icon={<X aria-hidden="true" />} onClick={() => setPicking(false)}>
                  Done
                </Button>
              </div>
              <ProductPicker
                autoFocus
                label={`Search products to add to ${title}`}
                selectedIds={selectedIds}
                archivedReason="Archived: can’t be added"
                onPick={(product) =>
                  onChange((current) =>
                    current.items.some((row) => row.productId === product.id) || current.items.length >= OPTION_LIMITS.items
                      ? current
                      : { ...current, items: [...current.items, itemDraftFor(product)] }
                  )
                }
              />
            </div>
          )}
        </div>

        {pricing.composed ? (
          <ComposedPricing draft={draft} errors={errors} checkingProducts={checkingProducts} onChange={onChange} />
        ) : (
          <div className="space-y-4">
            <p className="text-sm text-slate-500">Add products to calculate the price automatically.</p>
            <Field label="Price (₦)" required error={errors.price}>
              <Input
                type="number"
                inputMode="decimal"
                min={0}
                step="any"
                value={draft.price}
                onChange={(event) => onChange((current) => ({ ...current, price: event.target.value }))}
              />
            </Field>
            <Field label="What’s included" required helper="Shown to customers, e.g. 1 × 5kVA inverter, 4 × 200Ah battery." error={errors.kits}>
              <Textarea
                rows={3}
                className="min-h-[80px]"
                maxLength={OPTION_LIMITS.kits}
                value={draft.kits}
                onChange={(event) => onChange((current) => ({ ...current, kits: event.target.value }))}
              />
            </Field>
          </div>
        )}
      </div>
    </li>
  );
}

function ItemRow({
  item,
  checkingProducts,
  onQuantity,
  onNote,
  onRemove,
}: {
  item: ItemDraft;
  checkingProducts: boolean;
  onQuantity: (quantity: number) => void;
  onNote: (note: string) => void;
  onRemove: () => void;
}) {
  const { product } = item;
  const short = product.stockQuantity !== null && product.stockQuantity < item.quantity;
  return (
    <li className="space-y-2 p-3">
      <div className="flex items-start gap-2">
        <div className="min-w-0 flex-1">
          <p className="flex min-w-0 flex-wrap items-center gap-2">
            <span className="truncate text-sm font-medium text-slate-900">{product.name}</span>
            {product.status && product.status !== "active" && <ProductStatusBadge status={product.status} />}
          </p>
          <p className="mt-0.5 flex flex-wrap gap-x-2 text-xs text-slate-500">
            {product.sku && <span className="font-mono">{product.sku}</span>}
            <span className="tabular-nums">{formatCurrency(product.price)} each</span>
            <span className={cn("tabular-nums", short && "text-amber-700")}>
              {product.stockQuantity === null
                ? checkingProducts
                  ? "Checking stock…"
                  : "Stock unknown"
                : `${product.stockQuantity} in stock`}
            </span>
          </p>
        </div>
        <Button
          variant="ghost"
          size="icon-sm"
          className="hover:bg-red-50 hover:text-red-700"
          aria-label={`Remove ${product.name}`}
          title="Remove"
          onClick={onRemove}
        >
          <X aria-hidden="true" />
        </Button>
      </div>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <QuantityStepper
          label={`Quantity of ${product.name}`}
          value={item.quantity}
          min={OPTION_LIMITS.quantityMin}
          max={OPTION_LIMITS.quantityMax}
          onChange={onQuantity}
        />
        <Input
          aria-label={`Note for ${product.name}`}
          placeholder="Note (optional)"
          maxLength={OPTION_LIMITS.note}
          value={item.note}
          className="sm:flex-1"
          onChange={(event) => onNote(event.target.value)}
        />
        <p className="text-sm font-medium tabular-nums text-slate-900 sm:w-28 sm:text-right">
          {formatCurrency(product.price * item.quantity)}
        </p>
      </div>
    </li>
  );
}

function ComposedPricing({
  draft,
  errors,
  checkingProducts,
  onChange,
}: {
  draft: OptionDraft;
  errors: OptionErrors;
  checkingProducts: boolean;
  onChange: (change: (draft: OptionDraft) => OptionDraft) => void;
}) {
  const pricing = priceOption(draft);
  const adjustmentId = `${draft.rowId}-adjustment`;
  const signLabel = draft.adjustmentSign === 1 ? "Add" : "Subtract";

  const stockHint = pricing.archived.length ? (
    <Badge tone="danger">Unavailable: {pricing.archived.join(", ")} archived</Badge>
  ) : pricing.stockUnknown ? (
    <Badge tone="neutral">{checkingProducts ? "Checking stock…" : "Stock not checked"}</Badge>
  ) : pricing.short.length ? (
    <Badge tone="warning">Short: {pricing.short.join(", ")}</Badge>
  ) : (
    <Badge tone="success">In stock</Badge>
  );

  return (
    <div className="space-y-3 rounded-lg bg-slate-50 p-3">
      <dl className="space-y-3 text-sm">
        <div className="flex items-center justify-between gap-3">
          <dt className="text-slate-600">Products total</dt>
          <dd className="font-medium tabular-nums text-slate-900">{formatCurrency(pricing.productsTotal)}</dd>
        </div>
        <div className="space-y-2">
          <dt>
            <label htmlFor={adjustmentId} className="text-slate-600">
              Price adjustment (₦)
            </label>
          </dt>
          <dd className="space-y-1.5">
            <div className="flex items-stretch gap-2">
              <div role="group" aria-label="Adjustment direction" className="inline-flex rounded-lg border border-slate-200 bg-white p-0.5">
                {([1, -1] as const).map((sign) => {
                  const active = draft.adjustmentSign === sign;
                  const Icon = sign === 1 ? Plus : Minus;
                  return (
                    <button
                      key={sign}
                      type="button"
                      aria-pressed={active}
                      aria-label={sign === 1 ? "Add to the products total" : "Subtract from the products total"}
                      onClick={() => onChange((current) => ({ ...current, adjustmentSign: sign }))}
                      className={cn(
                        "inline-flex h-9 w-10 items-center justify-center rounded-md transition-colors focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-brand-500",
                        active ? (sign === 1 ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700") : "text-slate-500 hover:bg-slate-50"
                      )}
                    >
                      <Icon aria-hidden="true" className="h-4 w-4" />
                    </button>
                  );
                })}
              </div>
              <Input
                id={adjustmentId}
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                placeholder="0"
                invalid={Boolean(errors.adjustment)}
                aria-describedby={`${adjustmentId}-help`}
                className="flex-1 tabular-nums"
                value={draft.adjustmentAmount}
                onChange={(event) =>
                  onChange((current) => ({ ...current, adjustmentAmount: event.target.value.replace(/[^\d]/g, "") }))
                }
              />
            </div>
            <p id={`${adjustmentId}-help`} className={cn("text-xs", errors.adjustment ? "text-red-600" : "text-slate-500")}>
              {errors.adjustment ||
                `${signLabel} ${formatCurrency(Math.abs(pricing.adjustment))} ${draft.adjustmentSign === 1 ? "to" : "from"} the products total. Use + for installation or margin, − for a bundle discount.`}
            </p>
          </dd>
        </div>
        <div className="flex items-center justify-between gap-3 border-t border-slate-200 pt-3">
          <dt className="font-medium text-slate-900">Public price</dt>
          <dd className={cn("text-base font-bold tabular-nums", pricing.publicPrice > 0 ? "text-slate-900" : "text-red-600")}>
            {formatCurrency(pricing.publicPrice)}
          </dd>
        </div>
      </dl>
      <div className="flex flex-wrap items-center justify-between gap-2">
        {stockHint}
        <p className="text-xs text-slate-500">Preview from current product prices. Saved prices always follow them.</p>
      </div>
    </div>
  );
}
