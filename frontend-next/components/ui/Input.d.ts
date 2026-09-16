import type {
  ForwardRefExoticComponent,
  InputHTMLAttributes,
  ReactNode,
  RefAttributes,
  SelectHTMLAttributes,
  TextareaHTMLAttributes,
} from "react";

export type InputProps = Omit<InputHTMLAttributes<HTMLInputElement>, "size"> & {
  size?: "md" | "lg";
  invalid?: boolean;
};

/**
 * Input. Props: size ("md" = h-10 | "lg" = h-11 for login/public forms), invalid, className, ...native input props.
 * Picks up id/aria wiring from a parent <Field>.
 */
export declare const Input: ForwardRefExoticComponent<InputProps & RefAttributes<HTMLInputElement>>;

/**
 * SearchInput. Input with a leading Search icon. Props: wrapperClassName, plus all Input props.
 * Pass an aria-label when there is no visible label.
 */
export declare const SearchInput: ForwardRefExoticComponent<
  InputProps & { wrapperClassName?: string } & RefAttributes<HTMLInputElement>
>;

/** Textarea. Props: invalid, rows, className, ...native textarea props. Min height 110px, vertical resize. */
export declare const Textarea: ForwardRefExoticComponent<
  TextareaHTMLAttributes<HTMLTextAreaElement> & { invalid?: boolean } & RefAttributes<HTMLTextAreaElement>
>;

export type SelectOption = string | { value: string; label: ReactNode; disabled?: boolean };

/**
 * Select (native). Props: options ([{ value, label, disabled? }] or strings), placeholder (disabled empty first option),
 * size ("md" | "lg"), invalid, className (applies to the wrapper, e.g. widths), selectClassName, children (extra <option>s),
 * ...native select props (value, onChange, name…).
 */
export declare const Select: ForwardRefExoticComponent<
  Omit<SelectHTMLAttributes<HTMLSelectElement>, "size"> & {
    options?: SelectOption[];
    placeholder?: string;
    size?: "md" | "lg";
    invalid?: boolean;
    selectClassName?: string;
  } & RefAttributes<HTMLSelectElement>
>;

export default Input;
