import { cn } from "@/lib/cn";

const base =
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0";

export const buttonVariants = {
  primary: "bg-brand-600 text-white shadow-sm hover:bg-brand-700 active:bg-brand-800",
  secondary: "bg-slate-100 text-slate-900 hover:bg-slate-200",
  outline:
    "border border-slate-200 bg-white text-slate-700 shadow-sm hover:bg-slate-50 hover:text-slate-900",
  ghost: "text-slate-600 hover:bg-slate-100 hover:text-slate-900",
  destructive: "bg-red-600 text-white shadow-sm hover:bg-red-700",
  "soft-danger": "bg-red-50 text-red-700 hover:bg-red-100",
  link: "h-auto px-0 text-brand-600 underline-offset-4 hover:underline",
};

export const buttonSizes = {
  sm: "h-8 px-3 text-xs",
  md: "h-9 px-4",
  lg: "h-11 px-5",
  icon: "h-9 w-9",
  "icon-sm": "h-8 w-8",
};

/**
 * Class string for button-looking elements that can't use <Button>.
 * buttonClasses({ variant?: keyof buttonVariants, size?: keyof buttonSizes, className? })
 */
export function buttonClasses({ variant = "primary", size = "md", className } = {}) {
  return cn(
    base,
    buttonVariants[variant] ?? buttonVariants.primary,
    variant === "link" ? "h-auto px-0" : buttonSizes[size] ?? buttonSizes.md,
    className
  );
}
