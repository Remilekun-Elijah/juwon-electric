/* eslint-disable react/prop-types */
import { forwardRef } from "react";
import { buttonClasses } from "./buttonStyles";
import { Spinner } from "./Spinner";

/**
 * Button. Props: variant (primary|secondary|outline|ghost|destructive|soft-danger|link), size (sm|md|lg|icon|icon-sm),
 * as (element/component, e.g. Link or "a"), icon (leading icon node, swapped for a spinner while loading),
 * loading, loadingText, disabled, type (defaults to "button" for <button>), className, ...rest.
 */
export const Button = forwardRef(function Button(
  {
    as: Comp = "button",
    variant = "primary",
    size = "md",
    icon,
    loading = false,
    loadingText,
    disabled,
    type,
    className,
    children,
    ...props
  },
  ref
) {
  const isNativeButton = Comp === "button";
  const isDisabled = disabled || loading;

  return (
    <Comp
      ref={ref}
      type={isNativeButton ? type ?? "button" : type}
      disabled={isNativeButton ? isDisabled : undefined}
      aria-disabled={!isNativeButton && isDisabled ? true : undefined}
      aria-busy={loading || undefined}
      className={buttonClasses({
        variant,
        size,
        className: [!isNativeButton && isDisabled && "pointer-events-none opacity-50", className],
      })}
      {...props}
    >
      {loading ? <Spinner /> : icon}
      {loading && loadingText ? loadingText : children}
    </Comp>
  );
});

export default Button;
