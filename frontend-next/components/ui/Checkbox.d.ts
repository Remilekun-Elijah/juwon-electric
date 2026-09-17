import type { ForwardRefExoticComponent, InputHTMLAttributes, ReactNode, RefAttributes } from "react";

export type ChoiceProps = Omit<InputHTMLAttributes<HTMLInputElement>, "type"> & {
  label?: ReactNode;
  description?: ReactNode;
  inputClassName?: string;
};

/**
 * Checkbox (native, brand accent). Props: label, description, id, checked/defaultChecked, onChange, disabled,
 * className (wrapper when label is set, else the input), inputClassName, ...native input props.
 */
export declare const Checkbox: ForwardRefExoticComponent<ChoiceProps & RefAttributes<HTMLInputElement>>;

/**
 * Radio (native, brand accent). Same props as Checkbox plus name/value. Group radios in a
 * <fieldset> with a <legend> (or role="radiogroup" + aria-label).
 */
export declare const Radio: ForwardRefExoticComponent<ChoiceProps & RefAttributes<HTMLInputElement>>;

export default Checkbox;
