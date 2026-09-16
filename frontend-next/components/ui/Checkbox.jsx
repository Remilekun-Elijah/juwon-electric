"use client";

import { forwardRef, useId } from "react";
import { cn } from "@/lib/cn";

const controlClasses =
  "mt-0.5 h-4 w-4 shrink-0 cursor-pointer rounded border-slate-300 text-brand-600 accent-brand-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50";

const ChoiceControl = forwardRef(function ChoiceControl(
  { type, label, description, id, className, inputClassName, disabled, ...props },
  ref
) {
  const autoId = useId();
  const inputId = id ?? `choice-${autoId.replace(/:/g, "")}`;
  const descriptionId = description ? `${inputId}-description` : undefined;

  const input = (
    <input
      ref={ref}
      id={inputId}
      type={type}
      disabled={disabled}
      aria-describedby={descriptionId}
      className={cn(controlClasses, type === "radio" && "rounded-full", !label && className, inputClassName)}
      {...props}
    />
  );

  if (!label) return input;

  return (
    <div className={cn("flex items-start gap-2.5", disabled && "opacity-60", className)}>
      {input}
      <div className="min-w-0">
        <label htmlFor={inputId} className={cn("text-sm text-slate-700", disabled ? "cursor-not-allowed" : "cursor-pointer")}>
          {label}
        </label>
        {description && (
          <p id={descriptionId} className="text-xs text-slate-500">
            {description}
          </p>
        )}
      </div>
    </div>
  );
});

/**
 * Checkbox (native, brand accent). Props: label, description, id, checked/defaultChecked, onChange, disabled,
 * className (wrapper when label is set, else the input), inputClassName, ...native input props.
 */
export const Checkbox = forwardRef(function Checkbox(props, ref) {
  return <ChoiceControl ref={ref} type="checkbox" {...props} />;
});

/**
 * Radio (native, brand accent). Same props as Checkbox plus name/value. Group radios in a
 * <fieldset> with a <legend> (or role="radiogroup" + aria-label).
 */
export const Radio = forwardRef(function Radio(props, ref) {
  return <ChoiceControl ref={ref} type="radio" {...props} />;
});

export default Checkbox;
