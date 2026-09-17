import type { ReactElement, ReactNode } from "react";

/**
 * Switch (Headless UI). Props: checked, onChange(boolean), label, description, disabled, name, className,
 * aria-label (required when there is no label).
 */
export declare function Switch(props: {
  checked?: boolean;
  onChange?: (checked: boolean) => void;
  label?: ReactNode;
  description?: ReactNode;
  disabled?: boolean;
  name?: string;
  className?: string;
  "aria-label"?: string;
  [attribute: `aria-${string}` | `data-${string}`]: unknown;
}): ReactElement;

export default Switch;
