import type { LabelHTMLAttributes, ReactElement, ReactNode } from "react";
import type { FieldContextValue } from "./fieldContext";

/** Label. Props: htmlFor, required (adds red * marker), className, children. */
export declare function Label(props: LabelHTMLAttributes<HTMLLabelElement> & { required?: boolean }): ReactElement;

/**
 * Field. Label + control + helper/error block. Props: label, id (defaults to useId), helper, error (string/node; marks the
 * control invalid), required, className, labelClassName, children (an Input/Textarea/Select — wired automatically via
 * context — or a render function ({ id, describedBy, invalid, required }) => node for custom controls).
 */
export declare function Field(props: {
  label?: ReactNode;
  id?: string;
  helper?: ReactNode;
  error?: ReactNode;
  required?: boolean;
  className?: string;
  labelClassName?: string;
  children?: ReactNode | ((field: FieldContextValue) => ReactNode);
}): ReactElement;

export default Field;
