import { Badge, type Tone } from "@/components/ui";
import type { ProductStatus } from "@/lib/api/types";

const statusTones: Record<ProductStatus, Tone> = {
  active: "success",
  hidden: "neutral",
  archived: "warning",
};

export const productStatusLabels: Record<ProductStatus, string> = {
  active: "Active",
  hidden: "Hidden",
  archived: "Archived",
};

export const productStatusOptions = (Object.keys(productStatusLabels) as ProductStatus[]).map((value) => ({
  value,
  label: productStatusLabels[value],
}));

export function ProductStatusBadge({ status }: { status: ProductStatus }) {
  return <Badge tone={statusTones[status] ?? "neutral"}>{productStatusLabels[status] ?? status}</Badge>;
}

/** "Out of stock" at zero, "Low stock" at or below the reorder level, nothing otherwise. */
export function StockBadge({ stock, lowStock }: { stock: number; lowStock: boolean }) {
  if (stock <= 0) return <Badge tone="danger">Out of stock</Badge>;
  if (lowStock) return <Badge tone="warning">Low stock</Badge>;
  return null;
}
