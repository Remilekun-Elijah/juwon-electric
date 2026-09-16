"use client";

import { createContext, useContext } from "react";

export type FieldContextValue = {
  id: string;
  describedBy?: string;
  invalid: boolean;
  required?: boolean;
};

export const FieldContext = createContext<FieldContextValue | null>(null);

type ControlProps = {
  id?: string;
  invalid?: boolean;
  required?: boolean;
  "aria-describedby"?: string;
  [prop: string]: unknown;
};

/**
 * Merges the surrounding <Field> wiring (id, aria-describedby, aria-invalid, required) into a control's props.
 * Explicit props on the control win.
 */
export function useFieldControl<P extends ControlProps>({ id, invalid, required, ...props }: P) {
  const field = useContext(FieldContext);
  const isInvalid = invalid ?? field?.invalid ?? false;
  const describedBy = [props["aria-describedby"], field?.describedBy].filter(Boolean).join(" ") || undefined;

  return {
    ...props,
    id: id ?? field?.id,
    required: required ?? field?.required,
    invalid: isInvalid,
    "aria-invalid": isInvalid || undefined,
    "aria-describedby": describedBy,
  };
}
