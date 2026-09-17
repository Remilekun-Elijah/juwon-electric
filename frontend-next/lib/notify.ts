"use client";

import { toast } from "sonner";

/**
 * Replacement for the Vite SweetAlert2 `Alert({ type, message, cb })` toast helper.
 * Backend messages may be arrays; the first entry is shown.
 */
export function notify({
  type = "success",
  message,
}: {
  type?: "success" | "error" | "info" | "warning";
  message: string | string[] | undefined | null;
}) {
  const text = (Array.isArray(message) ? message[0] : message) || (type === "error" ? "Something went wrong" : "");
  if (!text) return;
  toast[type](text);
}
