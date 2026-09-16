/* eslint-disable react/prop-types */
import { forwardRef } from "react";
import { ChevronDown, Search } from "lucide-react";
import { cn } from "../../lib/cn";
import { useFieldControl } from "./fieldContext";

export const fieldClasses =
  "flex h-10 w-full rounded-lg border border-slate-200 bg-white px-3.5 text-sm text-slate-900 shadow-sm transition-colors placeholder:text-slate-400 hover:border-slate-300 focus:outline-none focus:border-brand-300 focus:ring-4 focus:ring-brand-500/10 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:opacity-60";

const invalidClasses = "border-red-300 hover:border-red-300 focus:border-red-400 focus:ring-red-500/10";

/**
 * Input. Props: size ("md" = h-10 | "lg" = h-11 for login/public forms), invalid, className, ...native input props.
 * Picks up id/aria wiring from a parent <Field>.
 */
export const Input = forwardRef(function Input({ size = "md", className, type = "text", ...rest }, ref) {
  const { invalid, ...props } = useFieldControl(rest);
  return (
    <input
      ref={ref}
      type={type}
      className={cn(fieldClasses, size === "lg" && "h-11", invalid && invalidClasses, className)}
      {...props}
    />
  );
});

/**
 * SearchInput. Input with a leading Search icon. Props: wrapperClassName, plus all Input props.
 * Pass an aria-label when there is no visible label.
 */
export const SearchInput = forwardRef(function SearchInput({ wrapperClassName, className, ...props }, ref) {
  return (
    <div className={cn("relative w-full", wrapperClassName)}>
      <Search
        aria-hidden="true"
        className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
      />
      <Input ref={ref} type="search" className={cn("pl-9", className)} {...props} />
    </div>
  );
});

/**
 * Textarea. Props: invalid, rows, className, ...native textarea props. Min height 110px, vertical resize.
 */
export const Textarea = forwardRef(function Textarea({ className, ...rest }, ref) {
  const { invalid, ...props } = useFieldControl(rest);
  return (
    <textarea
      ref={ref}
      className={cn(fieldClasses, "h-auto min-h-[110px] resize-y py-2.5", invalid && invalidClasses, className)}
      {...props}
    />
  );
});

/**
 * Select (native). Props: options ([{ value, label, disabled? }] or strings), placeholder (disabled empty first option),
 * size ("md" | "lg"), invalid, className (applies to the wrapper, e.g. widths), selectClassName, children (extra <option>s),
 * ...native select props (value, onChange, name…).
 */
export const Select = forwardRef(function Select(
  { options, placeholder, size = "md", className, selectClassName, children, ...rest },
  ref
) {
  const { invalid, ...props } = useFieldControl(rest);
  return (
    <div className={cn("relative w-full", className)}>
      <select
        ref={ref}
        className={cn(
          fieldClasses,
          "cursor-pointer appearance-none pr-9",
          size === "lg" && "h-11",
          invalid && invalidClasses,
          selectClassName
        )}
        {...props}
      >
        {placeholder != null && (
          <option value="" disabled>
            {placeholder}
          </option>
        )}
        {options?.map((option) => {
          const item = typeof option === "object" ? option : { value: option, label: option };
          return (
            <option key={item.value} value={item.value} disabled={item.disabled}>
              {item.label}
            </option>
          );
        })}
        {children}
      </select>
      <ChevronDown
        aria-hidden="true"
        className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
      />
    </div>
  );
});

export default Input;
