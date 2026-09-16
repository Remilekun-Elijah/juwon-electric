import type { ReactElement } from "react";

/**
 * Spinner. Props: variant ("inline" = 16px Loader2 | "ring" = 32px block ring), label (sr-only text), className.
 */
export declare function Spinner(props: {
  variant?: "inline" | "ring";
  label?: string;
  className?: string;
}): ReactElement;

export default Spinner;
