"use client";

import { useId, useMemo, type ComponentPropsWithoutRef, type ReactNode } from "react";
import { cn } from "@/lib/cn";
import { FieldContext, type FieldContextValue } from "./fieldContext";

type LabelProps = ComponentPropsWithoutRef<"label"> & { required?: boolean };

/**
 * Label. Props: htmlFor, required (adds red * marker), className, children.
 */
export function Label({ required, className, children, ...props }: LabelProps) {
  return (
    <label className={cn("block text-sm font-medium leading-none text-slate-700", className)} {...props}>
      {children}
      {required && (
        <span aria-hidden="true" className="ml-0.5 text-red-600">
          *
        </span>
      )}
    </label>
  );
}

type FieldProps = {
  label?: ReactNode;
  id?: string;
  helper?: ReactNode;
  error?: ReactNode;
  required?: boolean;
  className?: string;
  labelClassName?: string;
  children?: ReactNode | ((field: FieldContextValue) => ReactNode);
};

/**
 * Field. Label + control + helper/error block. Props: label, id (defaults to useId), helper, error (string/node; marks the
 * control invalid), required, className, labelClassName, children (an Input/Textarea/Select — wired automatically via
 * context — or a render function ({ id, describedBy, invalid, required }) => node for custom controls).
 */
export function Field({ label, id, helper, error, required, className, labelClassName, children }: FieldProps) {
  const autoId = useId();
  const fieldId = id ?? `field-${autoId.replace(/:/g, "")}`;
  const messageId = `${fieldId}-message`;
  const hasMessage = Boolean(error || helper);
  const invalid = Boolean(error);

  const value = useMemo<FieldContextValue>(
    () => ({
      id: fieldId,
      describedBy: hasMessage ? messageId : undefined,
      invalid,
      required: required || undefined,
    }),
    [fieldId, hasMessage, messageId, invalid, required]
  );

  return (
    <FieldContext.Provider value={value}>
      <div className={cn("space-y-2", className)}>
        {label && (
          <Label htmlFor={fieldId} required={required} className={labelClassName}>
            {label}
          </Label>
        )}
        {typeof children === "function" ? children(value) : children}
        {error ? (
          <p id={messageId} className="text-sm text-red-600">
            {error}
          </p>
        ) : (
          helper && (
            <p id={messageId} className="text-xs text-slate-500">
              {helper}
            </p>
          )
        )}
      </div>
    </FieldContext.Provider>
  );
}

export default Field;
