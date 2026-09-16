"use client";

import { createContext, useContext } from "react";

export const FieldContext = createContext(null);

/**
 * Merges the surrounding <Field> wiring (id, aria-describedby, aria-invalid, required) into a control's props.
 * Explicit props on the control win.
 */
export function useFieldControl({ id, invalid, required, ...props }) {
  const field = useContext(FieldContext);
  const isInvalid = invalid ?? field?.invalid ?? false;
  const describedBy =
    [props["aria-describedby"], field?.describedBy].filter(Boolean).join(" ") || undefined;

  return {
    ...props,
    id: id ?? field?.id,
    required: required ?? field?.required,
    invalid: isInvalid,
    "aria-invalid": isInvalid || undefined,
    "aria-describedby": describedBy,
  };
}
