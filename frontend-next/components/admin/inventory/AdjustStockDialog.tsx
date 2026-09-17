"use client";

import { useState, type FormEvent } from "react";
import { ArrowRight } from "lucide-react";
import { toast } from "sonner";
import { Alert, Button, Dialog, Field, Input, Select, Textarea } from "@/components/ui";
import { adjustStock } from "@/lib/api/admin";
import type { InventoryItem, InventoryMovement, ManualMovementReason, Product } from "@/lib/api/types";
import { errorMessage } from "@/lib/admin/format";
import { cn } from "@/lib/cn";
import { LIMITS } from "@/lib/validation";
import { movementReasonLabels } from "./movementReasons";

const reasonOptions: { value: ManualMovementReason; label: string }[] = (
  ["restock", "adjustment", "damage", "return", "correction"] as const
).map((value) => ({ value, label: movementReasonLabels[value] }));

const directionOptions = [
  { value: "add", label: "Add stock" },
  { value: "remove", label: "Remove stock" },
];

type AdjustStockDialogProps = {
  open: boolean;
  item: InventoryItem;
  onClose: () => void;
  onAdjusted: (result: { movement: InventoryMovement; product: Product }) => void;
};

/** Manual stock adjustment (contract §5). Mount with a fresh `key` per open so the form starts empty. */
export function AdjustStockDialog({ open, item, onClose, onAdjusted }: AdjustStockDialogProps) {
  const [direction, setDirection] = useState<"add" | "remove">("add");
  const [quantity, setQuantity] = useState("");
  const [reason, setReason] = useState<ManualMovementReason>("restock");
  const [note, setNote] = useState("");
  const [errors, setErrors] = useState<{ quantity?: string; note?: string }>({});
  const [formError, setFormError] = useState("");
  const [saving, setSaving] = useState(false);
  const formId = "adjust-stock-form";

  const amount = Number(quantity);
  const validAmount = quantity.trim() !== "" && Number.isInteger(amount) && amount > 0 && amount <= LIMITS.stockMax;
  const change = validAmount ? (direction === "add" ? amount : -amount) : 0;
  const resulting = item.stockQuantity + change;

  const close = () => {
    if (!saving) onClose();
  };

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const nextErrors: typeof errors = {};
    // Below-zero results are left to the server (409): the stock shown here may be out of date.
    if (!validAmount) nextErrors.quantity = "Enter a whole number from 1 to 1,000,000.";
    if (note.trim().length > LIMITS.movementNote)
      nextErrors.note = `Note must be ${LIMITS.movementNote} characters or fewer.`;
    setErrors(nextErrors);
    setFormError("");
    if (Object.keys(nextErrors).length) return;

    setSaving(true);
    try {
      const result = await adjustStock({
        productId: item.productId,
        change,
        reason,
        ...(note.trim() ? { note: note.trim() } : {}),
      });
      toast.success("Stock adjusted.");
      onAdjusted(result);
    } catch (error) {
      setFormError(errorMessage(error, "The stock couldn’t be adjusted."));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog
      open={open}
      onClose={close}
      title="Adjust stock"
      description={`${item.name} · ${item.sku}`}
      footer={
        <>
          <Button variant="outline" onClick={close} disabled={saving}>
            Cancel
          </Button>
          <Button type="submit" form={formId} loading={saving} loadingText="Saving…">
            Save adjustment
          </Button>
        </>
      }
    >
      <form id={formId} onSubmit={submit} className="space-y-4" noValidate>
        {formError && (
          <Alert tone="danger" title="Couldn’t adjust the stock">
            {formError}
          </Alert>
        )}

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Change">
            <Select
              value={direction}
              options={directionOptions}
              onChange={(event) => setDirection(event.target.value as "add" | "remove")}
            />
          </Field>
          <Field label="Quantity" required error={errors.quantity}>
            <Input
              type="number"
              inputMode="numeric"
              min={1}
              max={LIMITS.stockMax}
              step={1}
              value={quantity}
              onChange={(event) => setQuantity(event.target.value)}
            />
          </Field>
        </div>

        <Field label="Reason" required>
          <Select
            value={reason}
            options={reasonOptions}
            onChange={(event) => setReason(event.target.value as ManualMovementReason)}
          />
        </Field>

        <Field label="Note" helper={`${note.length}/${LIMITS.movementNote} characters`} error={errors.note}>
          <Textarea
            rows={3}
            value={note}
            maxLength={LIMITS.movementNote}
            onChange={(event) => setNote(event.target.value)}
          />
        </Field>

        <div
          className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm"
          aria-live="polite"
        >
          <span className="text-slate-600">Resulting stock</span>
          <span className="flex items-center gap-2 font-medium tabular-nums">
            <span className="text-slate-500">{item.stockQuantity}</span>
            <ArrowRight aria-label="becomes" className="h-4 w-4 text-slate-400" />
            <span
              className={cn(
                resulting < 0 ? "text-red-700" : resulting <= item.reorderLevel ? "text-amber-700" : "text-slate-900"
              )}
            >
              {resulting}
            </span>
          </span>
        </div>
        {resulting < 0 && (
          <p className="text-xs text-red-700">Stock cannot go below zero. Only {item.stockQuantity} are in stock.</p>
        )}
        {resulting >= 0 && validAmount && resulting <= item.reorderLevel && (
          <p className="text-xs text-amber-700">This is at or below the reorder level ({item.reorderLevel}).</p>
        )}
      </form>
    </Dialog>
  );
}
