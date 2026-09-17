import type { CategoryAttribute, PublicProduct } from "@/lib/api/types";
import { attributeRows } from "@/lib/catalog";
import { cn } from "@/lib/cn";

export type SpecsTableProps = {
  attributes: PublicProduct["attributes"] | null | undefined;
  /** The product category's `attributes` schema (labels, units, order). */
  schema?: CategoryAttribute[];
  className?: string;
};

/** Specification rows from `attributeRows`, as a description list styled like an admin table. Server component. */
export default function SpecsTable({ attributes, schema, className }: SpecsTableProps) {
  const rows = attributeRows(attributes ?? {}, schema ?? []);
  if (!rows.length) return null;

  return (
    <dl className={cn("divide-y divide-slate-100 overflow-hidden rounded-xl border border-slate-200", className)}>
      {rows.map((row, index) => (
        <div key={row.key} className={cn("grid gap-1 px-4 py-3 text-sm sm:grid-cols-5 sm:gap-4", index % 2 === 1 && "bg-slate-50/60")}>
          <dt className="font-medium text-slate-500 sm:col-span-2">{row.label}</dt>
          <dd className="break-words text-slate-900 sm:col-span-3">{row.value}</dd>
        </div>
      ))}
    </dl>
  );
}
