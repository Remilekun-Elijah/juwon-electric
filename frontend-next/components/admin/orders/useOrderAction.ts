"use client";

import { useState } from "react";
import { toast } from "sonner";
import { errorMessage } from "@/lib/admin/format";
import { ApiError, errorDetails } from "@/lib/api/admin";
import type { Order } from "@/lib/api/types";

/** A 409 without stock `details`: the order changed underneath us (another admin, or a stale step). */
const isStaleConflict = (error: unknown) => {
  if (!(error instanceof ApiError) || error.status !== 409) return false;
  const details = errorDetails<unknown[]>(error);
  return !(Array.isArray(details) && details.length);
};

/**
 * Runs one order mutation at a time: tracks which action is busy, hands the updated order to `onChange` and toasts
 * the result. `onError` may handle an error itself (return true to skip the default toast). On a conflict that isn't
 * a stock shortage, `onReload` refetches the order so the screen stops offering the step that just failed.
 */
export function useOrderAction(onChange: (order: Order) => void, onReload?: () => Promise<void>) {
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
      if (onReload && isStaleConflict(error)) void onReload();
      return false;
    } finally {
      setBusy(null);
    }
  };

  return { busy, run };
}
