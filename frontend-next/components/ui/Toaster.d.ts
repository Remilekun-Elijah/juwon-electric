import type { ComponentProps, ReactElement } from "react";
import type { Toaster as SonnerToaster } from "sonner";

/**
 * Toaster. Mount once near the app root. Sonner configured per spec: top-right, rich colors, close button, 4s.
 * Props: any sonner <Toaster> props to override. Use `toast.success(msg)` / `toast.error(msg)` from the ui barrel.
 */
export declare function Toaster(props?: ComponentProps<typeof SonnerToaster>): ReactElement;

export default Toaster;
