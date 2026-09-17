import { Clock } from "lucide-react";
import { Badge } from "@/components/ui";

/**
 * Commerce v2 §4: "In stock" when every product in the option is on hand, otherwise "Available to order".
 * Renders nothing when the API didn't send `inStock` (older responses and build fallbacks). Server and client safe.
 */
export default function OptionStockHint({ inStock, className }: { inStock: boolean | null | undefined; className?: string }) {
  if (inStock === null || inStock === undefined) return null;
  return inStock ? (
    <Badge tone="success" dot className={className}>
      In stock
    </Badge>
  ) : (
    <Badge tone="neutral" className={className}>
      <Clock aria-hidden="true" className="h-3.5 w-3.5" />
      Available to order
    </Badge>
  );
}
