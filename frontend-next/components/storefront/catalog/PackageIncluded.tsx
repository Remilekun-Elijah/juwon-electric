import Link from "next/link";
import { CheckCircle2, ClipboardList } from "lucide-react";
import type { Category, ComposedItem, Package, PackageItem } from "@/lib/api/types";
import { attributeRows, productPath } from "@/lib/catalog";
import { cn } from "@/lib/cn";
import { storeLink } from "@/lib/storefront/styles";
import OptionStockHint from "./OptionStockHint";
import { PackageOptionPanel } from "./PackageOptionScope";
import { cartOptions, defaultCartOptionIndex, optionItems, type PricedOption } from "./packageMeta";

/** Key specs shown per product line. */
const MAX_SPECS = 4;

function QuantityChip({ quantity }: { quantity: number }) {
  return (
    <span className="inline-flex h-8 min-w-10 shrink-0 items-center justify-center rounded-lg bg-slate-100 px-2 text-sm font-semibold tabular-nums text-slate-700">
      {quantity}
      <span aria-hidden="true">&times;</span>
      <span className="sr-only"> of</span>
    </span>
  );
}

function ProductName({ name, slug, productId }: { name: string; slug: string | null | undefined; productId: string }) {
  const href = slug || productId ? productPath({ slug: slug ?? "", id: productId }) : null;
  return href ? (
    <Link href={href} className={cn(storeLink, "break-words")}>
      {name}
    </Link>
  ) : (
    <span className="font-medium text-slate-900">{name}</span>
  );
}

function ComposedLine({ line, categories }: { line: ComposedItem; categories: Map<string, Category> }) {
  const schema = line.categoryId ? categories.get(line.categoryId)?.attributes : undefined;
  const specs = attributeRows(line.attributes ?? {}, schema).slice(0, MAX_SPECS);
  return (
    <li className="flex gap-3 py-4 sm:gap-4">
      <QuantityChip quantity={line.quantity} />
      <div className="min-w-0 flex-1">
        <ProductName name={line.name} slug={line.slug} productId={line.productId} />
        {(line.brand || line.note) && (
          <p className="mt-0.5 text-sm text-slate-500">
            {line.brand}
            {line.brand && line.note && <span aria-hidden="true"> · </span>}
            {line.note}
          </p>
        )}
        {specs.length > 0 && (
          <dl className="mt-2 flex flex-wrap gap-1.5">
            {specs.map((spec) => (
              <div key={spec.key} className="inline-flex max-w-full items-baseline gap-1 rounded-md bg-slate-50 px-2 py-1 text-xs ring-1 ring-slate-200 ring-inset">
                <dt className="text-slate-500">{spec.label}</dt>
                <dd className="break-words font-medium text-slate-700">{spec.value}</dd>
              </div>
            ))}
          </dl>
        )}
      </div>
    </li>
  );
}

/** Deprecated package-level items (contract §4.3), shown only for a legacy option when an older API still sends them. */
function LegacyLine({ line }: { line: PackageItem }) {
  return (
    <li className="flex gap-3 py-3 sm:gap-4">
      <QuantityChip quantity={line.quantity} />
      <div className="min-w-0 flex-1">
        <ProductName name={line.name} slug={line.slug} productId={line.productId} />
        {(line.sku || line.note) && (
          <p className="mt-0.5 text-sm text-slate-500">
            {line.sku && <span className="tabular-nums">SKU {line.sku}</span>}
            {line.sku && line.note && <span aria-hidden="true"> · </span>}
            {line.note}
          </p>
        )}
      </div>
    </li>
  );
}

function OptionContents({ pkg, option, categories }: { pkg: Package; option: PricedOption; categories: Map<string, Category> }) {
  const items = optionItems(option);
  const legacyItems = pkg.items ?? [];
  return (
    <>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <p className="text-sm font-medium text-slate-900">{option.name}</p>
        <OptionStockHint inStock={option.inStock} />
      </div>
      {items.length > 0 ? (
        <ul className="mt-3 divide-y divide-slate-100 border-y border-slate-100">
          {items.map((line) => (
            <ComposedLine key={line.productId} line={line} categories={categories} />
          ))}
        </ul>
      ) : legacyItems.length > 0 ? (
        <ul className="mt-3 divide-y divide-slate-100 border-y border-slate-100">
          {legacyItems.map((line) => (
            <LegacyLine key={`${line.productId}-${line.note ?? ""}`} line={line} />
          ))}
        </ul>
      ) : (
        <div className="mt-3">
          {option.kits && (
            <p className="flex gap-2.5 text-slate-600">
              <CheckCircle2 aria-hidden="true" className="mt-0.5 h-5 w-5 shrink-0 text-green-600" />
              <span>{option.kits}</span>
            </p>
          )}
          <p className="mt-4 flex items-center gap-2 rounded-xl bg-slate-50 p-4 text-sm text-slate-500">
            <ClipboardList aria-hidden="true" className="h-4 w-4 shrink-0 text-slate-400" />
            Detailed parts list coming soon.
          </p>
        </div>
      )}
    </>
  );
}

export type PackageIncludedProps = {
  pkg: Package;
  /** Active categories (`getStoreCategories`) for spec labels and units. */
  categories: Category[];
};

/**
 * "What's included" body for the package page (Commerce v2 §4). Renders every buyable option's contents on the server
 * and shows the one selected in the PackageOptionPicker (the cheapest by default). Server component.
 */
export default function PackageIncluded({ pkg, categories }: PackageIncludedProps) {
  const options = cartOptions(pkg);
  const defaultIndex = defaultCartOptionIndex(pkg);
  const byId = new Map(categories.map((category) => [category.id, category]));

  if (!options.length) {
    return (
      <p className="mt-4 flex items-center gap-2 rounded-xl bg-slate-50 p-4 text-sm text-slate-500">
        <ClipboardList aria-hidden="true" className="h-4 w-4 shrink-0 text-slate-400" />
        This package can’t be ordered right now. Contact us and we’ll recommend a similar system.
      </p>
    );
  }

  return (
    <div>
      {options.map((option) => (
        <PackageOptionPanel key={option.index} index={option.index} defaultIndex={defaultIndex}>
          <OptionContents pkg={pkg} option={option} categories={byId} />
        </PackageOptionPanel>
      ))}
    </div>
  );
}
