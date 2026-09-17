import type { MovementReason } from "@/lib/api/types";

export const movementReasonLabels: Record<MovementReason, string> = {
  initial: "Opening stock",
  restock: "Restock",
  adjustment: "Adjustment",
  damage: "Damage",
  return: "Return",
  correction: "Correction",
  sale: "Sale",
  sale_reversal: "Sale reversed",
};
