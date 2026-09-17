"use client";

import type { Turnstile } from "@/lib/turnstile/useTurnstile";

type TurnstileWidgetProps = Pick<Turnstile, "enabled" | "error" | "bindContainer"> & {
  className?: string;
  errorClassName?: string;
};

/**
 * Container for a Turnstile widget created by useTurnstile(). Renders nothing when Turnstile is disabled.
 * The widget uses appearance "interaction-only", so it stays invisible unless a visitor must interact.
 * Port of frontend/src/components/TurnstileWidget.jsx. The hook fields are passed individually
 * (`enabled`, `error`, `bindContainer`) because the React Compiler lint treats an object whose field is used as a
 * `ref` as a ref, and rejects reading its other fields during render.
 */
export default function TurnstileWidget({
  enabled,
  error,
  bindContainer,
  className = "",
  errorClassName = "text-sm text-brand-500",
}: TurnstileWidgetProps) {
  if (!enabled) return null;
  return (
    <div className={className}>
      <div ref={bindContainer} />
      {error && (
        <p role="alert" className={errorClassName}>
          {error}
        </p>
      )}
    </div>
  );
}
