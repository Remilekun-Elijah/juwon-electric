"use client";

import { useState, type FormEvent, type ReactNode } from "react";
import { Alert, Button, Card, CardContent } from "@/components/ui";
import type { Settings, SettingsInput } from "@/lib/api/types";

/** Resolves true on success, or the server's validation message for the section's Alert. */
export type SaveSection = (input: SettingsInput) => Promise<boolean | string>;

export type SectionProps<K extends keyof Settings> = { value: Settings[K]; canWrite: boolean; save: SaveSection };

export function SectionCard({
  title,
  description,
  children,
  onSubmit,
  footer,
  badge,
}: {
  title: string;
  description: string;
  /** Shown next to the title, e.g. the Sample badge. */
  badge?: ReactNode;
  children: ReactNode;
  onSubmit?: (event: FormEvent<HTMLFormElement>) => void;
  footer?: ReactNode;
}) {
  const headingId = `settings-${title.toLowerCase().replace(/\W+/g, "-")}`;
  const body = (
    <>
      <div className="border-b border-slate-100 px-5 py-4 sm:px-6">
        <div className="flex flex-wrap items-center gap-2">
          <h2 id={headingId} className="text-base font-semibold text-slate-900">
            {title}
          </h2>
          {badge}
        </div>
        <p className="mt-1 text-sm text-slate-500">{description}</p>
      </div>
      <CardContent className="space-y-4 px-5 pt-5 sm:px-6">{children}</CardContent>
      {footer && (
        <div className="flex justify-end border-t border-slate-100 px-5 py-3 sm:px-6">{footer}</div>
      )}
    </>
  );

  return onSubmit ? (
    <form aria-labelledby={headingId} onSubmit={onSubmit} noValidate>
      <Card>{body}</Card>
    </form>
  ) : (
    <Card as="section" aria-labelledby={headingId}>
      {body}
    </Card>
  );
}

/** Save button plus section-level submit handling (validation → save → Alert on server 400). */
export function useSection(save: SaveSection) {
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");

  const submit = async (input: SettingsInput) => {
    setFormError("");
    setSaving(true);
    const result = await save(input);
    setSaving(false);
    if (typeof result === "string") setFormError(result);
  };

  const alert = formError ? (
    <Alert tone="danger" onDismiss={() => setFormError("")}>
      {formError}
    </Alert>
  ) : null;

  return { saving, submit, alert };
}

export const saveButton = (canWrite: boolean, saving: boolean, label: string) =>
  canWrite ? (
    <Button type="submit" loading={saving} loadingText="Saving…">
      {label}
    </Button>
  ) : undefined;

