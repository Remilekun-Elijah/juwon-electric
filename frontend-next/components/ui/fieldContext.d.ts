import type { Context } from "react";

export type FieldContextValue = {
  id: string;
  describedBy?: string;
  invalid: boolean;
  required?: true;
};

export declare const FieldContext: Context<FieldContextValue | null>;

/**
 * Merges the surrounding <Field> wiring (id, aria-describedby, aria-invalid, required) into a control's props.
 * Explicit props on the control win.
 */
export declare function useFieldControl<
  P extends { id?: string; invalid?: boolean; required?: boolean; "aria-describedby"?: string },
>(
  props: P
): Omit<P, "id" | "invalid" | "required" | "aria-describedby"> & {
  id: string | undefined;
  required: boolean | undefined;
  invalid: boolean;
  "aria-invalid": true | undefined;
  "aria-describedby": string | undefined;
};
