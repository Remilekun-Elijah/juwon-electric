import { Badge } from "@/components/ui";

export type StockBadgeProps = {
  /** `PublicProduct.inStock`. `undefined`/`null` (older API without the field) renders nothing. */
  inStock: boolean | null | undefined;
  className?: string;
};

/** "In stock" (green) or "Out of stock" (slate). Low stock is never shown publicly. Server component. */
export default function StockBadge({ inStock, className }: StockBadgeProps) {
  if (inStock === null || inStock === undefined) return null;
  return inStock ? (
    <Badge tone="success" dot className={className}>
      In stock
    </Badge>
  ) : (
    <Badge tone="neutral" dot className={className}>
      Out of stock
    </Badge>
  );
}
