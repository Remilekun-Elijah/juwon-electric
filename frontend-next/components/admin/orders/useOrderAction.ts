"use client";

import { useState } from "react";
import { toast } from "sonner";
import { errorMessage } from "@/lib/admin/format";
import type { Order } from "@/lib/api/types";

/**
 * Runs one order mutation at a time: tracks which action is busy, hands the updated order to `onChange` and toasts
 * the result. `onError` may handle an error itself (return true to skip the default toast).
 */
export function useOrderAction(onChange: (order: Order) => void) {
  const [busy, setBusy] = useState<string | null>(null);

  const run = async (
    key: string,
    action: () => Promise<Order>,
    success: string | ((order: Order) => string),
    onError?: (error: unknown) => boolean | void
  ) => {
    setBusy(key);
    try {
      const updated = await action();
      onChange(updated);
      toast.success(typeof success === "function" ? success(updated) : success);
      return true;
    } catch (error) {
      if (!onError?.(error)) toast.error(errorMessage(error));
      return false;
    } finally {
      setBusy(null);
    }
  };

  return { busy, run };
}
