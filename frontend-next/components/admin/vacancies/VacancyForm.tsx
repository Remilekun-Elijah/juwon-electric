"use client";

import { useState, type FormEvent } from "react";
import { Alert, Button, Drawer, Field, Input, Select, Textarea } from "@/components/admin/kit";
import { errorMessage } from "@/lib/admin/format";
import { saveVacancy } from "@/lib/api/admin";
import type { EmploymentType, Vacancy, VacancyInput, VacancyStatus } from "@/lib/api/types";
import { LIMITS, linesOf } from "@/lib/validation";
import { RichTextEditor } from "../RichTextEditor";

export const employmentTypeOptions: { value: EmploymentType; label: string }[] = [
  { value: "full-time", label: "Full-time" },
  { value: "part-time", label: "Part-time" },
  { value: "contract", label: "Contract" },
  { value: "internship", label: "Internship" },
  { value: "temporary", label: "Temporary" },
];

type FormState = {
  title: string;
  slug: string;
  department: string;
  location: string;
  employmentType: EmploymentType | "";
  salaryRange: string;
  descriptionHtml: string;
  requirements: string;
  responsibilities: string;
  status: VacancyStatus;
};

type Errors = Partial<Record<keyof FormState, string>>;

const toForm = (vacancy: Vacancy | null): FormState => ({
  title: vacancy?.title ?? "",
  slug: vacancy?.slug ?? "",
  department: vacancy?.department ?? "",
  location: vacancy?.location ?? "",
  employmentType: vacancy?.employmentType ?? "",
  salaryRange: vacancy?.salaryRange ?? "",
  descriptionHtml: vacancy?.descriptionHtml ?? "",
  requirements: (vacancy?.requirements ?? []).join("\n"),
  responsibilities: (vacancy?.responsibilities ?? []).join("\n"),
  status: vacancy?.status ?? "draft",
});

const listError = (value: string, label: string) => {
  const items = linesOf(value);
  if (items.length > LIMITS.vacancyListItems) return `${label} can have at most ${LIMITS.vacancyListItems} items.`;
  if (items.some((item) => item.length > LIMITS.vacancyListItem)) {
    return `Each ${label.toLowerCase()} item must be ${LIMITS.vacancyListItem} characters or fewer.`;
  }
  return "";
};

const validate = (form: FormState): Errors => {
  const errors: Errors = {};
  if (!form.title.trim()) errors.title = "Title is required.";
  else if (form.title.trim().length > LIMITS.vacancyTitle) errors.title = `Title must be ${LIMITS.vacancyTitle} characters or fewer.`;
  if (form.slug.trim().length > LIMITS.vacancySlug) errors.slug = `Slug must be ${LIMITS.vacancySlug} characters or fewer.`;
  (["department", "location", "salaryRange"] as const).forEach((key) => {
    if (form[key].trim().length > LIMITS.vacancyShortText) {
      errors[key] = `This must be ${LIMITS.vacancyShortText} characters or fewer.`;
    }
  });
  const requirements = listError(form.requirements, "Requirements");
  if (requirements) errors.requirements = requirements;
  const responsibilities = listError(form.responsibilities, "Responsibilities");
  if (responsibilities) errors.responsibilities = responsibilities;
  if (form.status === "open" && !form.descriptionHtml) {
    errors.descriptionHtml = "Add a description before publishing.";
  }
  return errors;
};

/** Maps a server validation message onto the field it names (contract messages start with the field label). */
const fieldForMessage = (message: string): keyof FormState | null => {
  const rules: [RegExp, keyof FormState][] = [
    [/^title/i, "title"],
    [/^slug/i, "slug"],
    [/^department/i, "department"],
    [/^location/i, "location"],
    [/^employment type/i, "employmentType"],
    [/^salary/i, "salaryRange"],
    [/^description/i, "descriptionHtml"],
    [/^requirement/i, "requirements"],
    [/^responsibilit/i, "responsibilities"],
  ];
  return rules.find(([pattern]) => pattern.test(message))?.[1] ?? null;
};

const toInput = (form: FormState, isNew: boolean): VacancyInput => ({
  title: form.title.trim(),
  ...(form.slug.trim() ? { slug: form.slug.trim() } : {}),
  department: form.department.trim() || null,
  location: form.location.trim() || null,
  employmentType: form.employmentType || null,
  salaryRange: form.salaryRange.trim() || null,
  descriptionHtml: form.descriptionHtml,
  requirements: linesOf(form.requirements),
  responsibilities: linesOf(form.responsibilities),
  // Status changes on existing vacancies go through publish/unpublish/close actions.
  ...(isNew ? { status: form.status } : {}),
});

type VacancyFormProps = {
  open: boolean;
  vacancy: Vacancy | null;
  onClose: () => void;
  onSaved: (vacancy: Vacancy, created: boolean) => void;
};

export function VacancyForm({ open, vacancy, onClose, onSaved }: VacancyFormProps) {
  return (
    <Drawer
      open={open}
      onClose={onClose}
      size="lg"
      title={vacancy ? "Edit vacancy" : "New vacancy"}
      description={
        vacancy
          ? "Changes to an open vacancy show on the careers page straight away."
          : "New vacancies start as drafts unless you publish them now."
      }
    >
      {open && <VacancyFormBody key={vacancy?.id ?? "new"} vacancy={vacancy} onClose={onClose} onSaved={onSaved} />}
    </Drawer>
  );
}

function VacancyFormBody({ vacancy, onClose, onSaved }: Omit<VacancyFormProps, "open">) {
  const isNew = !vacancy;
  const [form, setForm] = useState<FormState>(() => toForm(vacancy));
  const [errors, setErrors] = useState<Errors>({});
  const [formError, setFormError] = useState("");
  const [saving, setSaving] = useState(false);

  const update = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((current) => ({ ...current, [key]: value }));
    setErrors((current) => (current[key] ? { ...current, [key]: undefined } : current));
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setFormError("");
    const found = validate(form);
    setErrors(found);
    if (Object.values(found).some(Boolean)) return;

    setSaving(true);
    try {
      const saved = await saveVacancy(vacancy?.id ?? null, toInput(form, isNew));
      onSaved(saved, isNew);
    } catch (error) {
      const message = errorMessage(error);
      const field = fieldForMessage(message);
      if (field) setErrors((current) => ({ ...current, [field]: message }));
      else setFormError(message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={submit} className="space-y-5" noValidate>
      {formError && <Alert tone="danger">{formError}</Alert>}

      <Field label="Title" required error={errors.title}>
        <Input value={form.title} maxLength={LIMITS.vacancyTitle} onChange={(event) => update("title", event.target.value)} />
      </Field>

      <Field
        label="URL slug"
        helper="Leave blank to create one from the title. Changing it changes the public link."
        error={errors.slug}
      >
        <Input
          value={form.slug}
          maxLength={LIMITS.vacancySlug}
          spellCheck={false}
          className="font-mono text-xs"
          placeholder="solar-installation-technician"
          onChange={(event) => update("slug", event.target.value)}
        />
      </Field>

      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Department" error={errors.department}>
          <Input
            value={form.department}
            maxLength={LIMITS.vacancyShortText}
            onChange={(event) => update("department", event.target.value)}
          />
        </Field>
        <Field label="Location" error={errors.location}>
          <Input
            value={form.location}
            maxLength={LIMITS.vacancyShortText}
            onChange={(event) => update("location", event.target.value)}
          />
        </Field>
        <Field label="Employment type" error={errors.employmentType}>
          <Select
            value={form.employmentType}
            onChange={(event) => update("employmentType", event.target.value as EmploymentType | "")}
            options={[{ value: "", label: "Not specified" }, ...employmentTypeOptions]}
          />
        </Field>
        <Field label="Salary range" helper="For example ₦250,000 – ₦350,000 monthly." error={errors.salaryRange}>
          <Input
            value={form.salaryRange}
            maxLength={LIMITS.vacancyShortText}
            onChange={(event) => update("salaryRange", event.target.value)}
          />
        </Field>
      </div>

      <Field label="Description" error={errors.descriptionHtml}>
        {({ id, describedBy, invalid }) => (
          <RichTextEditor
            id={id}
            aria-describedby={describedBy}
            invalid={invalid}
            value={form.descriptionHtml}
            onChange={(html) => update("descriptionHtml", html)}
            placeholder="What the role involves, who it suits and how to apply."
          />
        )}
      </Field>

      <Field label="Requirements" helper="One per line, up to 30." error={errors.requirements}>
        <Textarea rows={5} value={form.requirements} onChange={(event) => update("requirements", event.target.value)} />
      </Field>

      <Field label="Responsibilities" helper="One per line, up to 30." error={errors.responsibilities}>
        <Textarea
          rows={5}
          value={form.responsibilities}
          onChange={(event) => update("responsibilities", event.target.value)}
        />
      </Field>

      {isNew && (
        <Field label="Status" helper="Only open vacancies appear on the careers page.">
          <Select
            value={form.status}
            onChange={(event) => update("status", event.target.value as VacancyStatus)}
            options={[
              { value: "draft", label: "Draft (not public)" },
              { value: "open", label: "Open (publish now)" },
            ]}
          />
        </Field>
      )}

      <div className="flex flex-col-reverse gap-2 border-t border-slate-100 pt-5 sm:flex-row sm:justify-end">
        <Button variant="outline" onClick={onClose} disabled={saving}>
          Cancel
        </Button>
        <Button type="submit" loading={saving} loadingText="Saving…">
          {isNew ? (form.status === "open" ? "Publish vacancy" : "Save draft") : "Save changes"}
        </Button>
      </div>
    </form>
  );
}
