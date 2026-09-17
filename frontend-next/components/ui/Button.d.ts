import type { ElementType, ForwardRefExoticComponent, ReactNode, RefAttributes } from "react";
import type { ButtonSize, ButtonVariant } from "./buttonStyles";
import type { PolymorphicProps } from "./types";

export type ButtonProps = PolymorphicProps<{
  as?: ElementType;
  variant?: ButtonVariant;
  size?: ButtonSize;
  icon?: ReactNode;
  loading?: boolean;
  loadingText?: ReactNode;
  disabled?: boolean;
  type?: "button" | "submit" | "reset";
}>;

/**
 * Button. Props: variant (primary|secondary|outline|ghost|destructive|soft-danger|link), size (sm|md|lg|icon|icon-sm),
 * as (element/component, e.g. Link or "a"), icon (leading icon node, swapped for a spinner while loading),
 * loading, loadingText, disabled, type (defaults to "button" for <button>), className, ...rest.
 */
export declare const Button: ForwardRefExoticComponent<ButtonProps & RefAttributes<HTMLElement>>;
export default Button;
