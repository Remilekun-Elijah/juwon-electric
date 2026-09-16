"use client";

import type { ComponentProps } from "react";
import { Toaster as SonnerToaster } from "sonner";

/**
 * Toaster. Mount once near the app root. Sonner configured per spec: top-right, rich colors, close button, 4s.
 * Props: any sonner <Toaster> props to override. Use `toast.success(msg)` / `toast.error(msg)` from the ui barrel.
 */
export function Toaster(props: ComponentProps<typeof SonnerToaster>) {
  return (
    <SonnerToaster
      position="top-right"
      richColors
      closeButton
      toastOptions={{ duration: 4000, style: { fontFamily: "inherit" } }}
      {...props}
    />
  );
}

export default Toaster;
