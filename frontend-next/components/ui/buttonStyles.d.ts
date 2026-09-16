export declare const buttonVariants: {
  primary: string;
  secondary: string;
  outline: string;
  ghost: string;
  destructive: string;
  "soft-danger": string;
  link: string;
};

export declare const buttonSizes: {
  sm: string;
  md: string;
  lg: string;
  icon: string;
  "icon-sm": string;
};

export type ButtonVariant = keyof typeof buttonVariants;
export type ButtonSize = keyof typeof buttonSizes;

/**
 * Class string for button-looking elements that can't use <Button>.
 * buttonClasses({ variant?: keyof buttonVariants, size?: keyof buttonSizes, className? })
 */
export declare function buttonClasses(options?: {
  variant?: ButtonVariant;
  size?: ButtonSize;
  className?: import("clsx").ClassValue;
}): string;
