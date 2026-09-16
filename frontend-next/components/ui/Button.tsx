import { forwardRef, type ComponentPropsWithoutRef, type ElementType, type ReactNode } from "react";
import { buttonClasses, type ButtonSize, type ButtonVariant } from "./buttonStyles";
import { Spinner } from "./Spinner";

export type ButtonProps = Omit<ComponentPropsWithoutRef<"button">, "type"> & {
  as?: ElementType;
  variant?: ButtonVariant;
  size?: ButtonSize;
  icon?: ReactNode;
  loading?: boolean;
  loadingText?: ReactNode;
  type?: "button" | "submit" | "reset";
  /** Forwarded to `as` components such as next/link or <a>. */
  href?: string;
  target?: string;
  rel?: string;
  prefetch?: boolean;
};

/**
 * Button. Props: variant (primary|secondary|outline|ghost|destructive|soft-danger|link), size (sm|md|lg|icon|icon-sm),
 * as (element/component, e.g. Link or "a"), icon (leading icon node, swapped for a spinner while loading),
 * loading, loadingText, disabled, type (defaults to "button" for <button>), className, ...rest.
 * No hooks, so it renders in server components (pass `as={Link}` with `href`).
 */
export const Button = forwardRef<HTMLElement, ButtonProps>(function Button(
  {
    as: Comp = "button" as ElementType,
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
