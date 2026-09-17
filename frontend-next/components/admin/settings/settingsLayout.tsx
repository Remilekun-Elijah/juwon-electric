"use client";

import { useEffect, useId, useRef, useState, type FormEvent, type ReactNode } from "react";
import { Alert, Button, Card, CardContent } from "@/components/ui";
import type { Settings, SettingsInput } from "@/lib/api/types";
import { useSettings } from "./SettingsContext";

/** Resolves true on success, or the server's validation message for the section's Alert. */
export type SaveSection = (input: SettingsInput) => Promise<boolean | string>;

export type SectionProps<K extends keyof Settings> = { value: Settings[K]; canWrite: boolean; save: SaveSection };

/** One titled card of related fields inside a settings page. */
export function SettingsCard({
  title,
  description,
  children,
}: {
  title: string;
  description?: ReactNode;
  children: ReactNode;
}) {
  const headingId = useId();
  return (
    <Card as="section" aria-labelledby={headingId}>
      <div className="border-b border-slate-100 px-5 py-4 sm:px-6">
        <h2 id={headingId} className="text-base font-semibold text-slate-900">
          {title}
        </h2>
        {description && <p className="mt-1 text-sm text-slate-500">{description}</p>}
      </div>
      <CardContent className="space-y-4 px-5 pt-5 sm:px-6">{children}</CardContent>
    </Card>
  );
}

/** Section-level submit handling (validation → save → Alert on server 400). */
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

/**
 * True once the form's state differs from what it started with. `snapshot` is any serialisable view of the fields;
 * the first render's value is the baseline (forms remount after a save or Discard, which resets it).
 */
export function useDirty(snapshot: unknown) {
  const current = JSON.stringify(snapshot);
  const [initial] = useState(current);
  return current !== initial;
}

/**
 * The form for one settings page: its cards, the server error Alert and a sticky save bar that shows only while
 * there are unsaved changes (never for view-only roles). Reports dirty state to the unsaved-changes guard.
 */
export function SectionForm({
  label,
  dirty,
  canWrite,
  saving,
  alert,
  onSubmit,
  children,
}: {
  label: string;
  dirty: boolean;
  canWrite: boolean;
  saving: boolean;
  alert: ReactNode;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  children: ReactNode;
}) {
  const { setDirty, discard } = useSettings();
  const formRef = useRef<HTMLFormElement>(null);
  const unsaved = canWrite && dirty;

  useEffect(() => {
    setDirty(unsaved);
  }, [unsaved, setDirty]);
  useEffect(() => () => setDirty(false), [setDirty]);

  const submit = (event: FormEvent<HTMLFormElement>) => {
    onSubmit(event);
    // After validation renders, bring the first problem into view (the save bar sits at the bottom).
    requestAnimationFrame(() => {
      const invalid = formRef.current?.querySelector<HTMLElement>('[aria-invalid="true"]');
      invalid?.focus();
    });
  };

  return (
    <form ref={formRef} aria-label={label} onSubmit={submit} noValidate className="space-y-6">
      {alert}
      {children}
      {unsaved && (
        <div
          role="region"
          aria-label="Unsaved changes"
          className="sticky bottom-4 z-20 flex flex-col gap-3 rounded-xl border border-slate-200 bg-white/95 px-4 py-3 shadow-elev-4 backdrop-blur motion-safe:animate-fade-up sm:flex-row sm:items-center sm:justify-between sm:px-5"
        >
          <p className="flex items-center gap-2 text-sm font-medium text-slate-700" aria-live="polite">
            <span aria-hidden="true" className="h-2 w-2 shrink-0 rounded-full bg-amber-500" />
            Unsaved changes
          </p>
          <div className="grid grid-cols-2 gap-2 sm:flex sm:items-center">
            <Button variant="outline" className="h-11 sm:h-9" onClick={discard} disabled={saving}>
              Discard
            </Button>
            <Button type="submit" className="h-11 sm:h-9" loading={saving} loadingText="Saving…">
              Save changes
            </Button>
          </div>
        </div>
      )}
    </form>
  );
}
