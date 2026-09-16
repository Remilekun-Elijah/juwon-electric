/* eslint-disable react/prop-types */
import { Description, Field as HeadlessField, Label, Switch as HeadlessSwitch } from "@headlessui/react";
import { cn } from "../../lib/cn";

/**
 * Switch (Headless UI). Props: checked, onChange(boolean), label, description, disabled, name, className,
 * aria-label (required when there is no label).
 */
export function Switch({ checked, onChange, label, description, disabled, name, className, ...props }) {
  const toggle = (
    <HeadlessSwitch
      checked={checked}
      onChange={onChange}
      disabled={disabled}
      name={name}
      className={cn(
        "group relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent bg-slate-200 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2 data-[checked]:bg-brand-600 data-[disabled]:cursor-not-allowed data-[disabled]:opacity-50",
        !label && className
      )}
      {...props}
    >
      <span
        aria-hidden="true"
        className="pointer-events-none inline-block h-4 w-4 translate-x-0 rounded-full bg-white shadow transition group-data-[checked]:translate-x-4"
      />
    </HeadlessSwitch>
  );

  if (!label) return toggle;

  return (
    <HeadlessField disabled={disabled} className={cn("flex items-start gap-3", className)}>
      <span className="pt-0.5">{toggle}</span>
      <span className="min-w-0">
        <Label className="cursor-pointer text-sm text-slate-700 data-[disabled]:cursor-not-allowed data-[disabled]:opacity-60">
          {label}
        </Label>
        {description && <Description className="text-xs text-slate-500">{description}</Description>}
      </span>
    </HeadlessField>
  );
}

export default Switch;
