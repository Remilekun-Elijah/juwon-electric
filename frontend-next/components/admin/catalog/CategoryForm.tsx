"use client";

import { useMemo, useState, type FormEvent } from "react";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Alert, Button, Drawer, Field, Input, Select, Switch, Textarea } from "@/components/admin/kit";
import { saveCategory } from "@/lib/api/admin";
import type { Category, CategoryAttribute, CategoryInput } from "@/lib/api/types";
import { errorMessage } from "@/lib/admin/format";
import { LIMITS, validateUrlField } from "@/lib/validation";
import { categoryOptions, descendantIds, nextRowId } from "./categoryTree";

export const ATTRIBUTE_KEY_PATTERN = /^[A-Za-z][A-Za-z0-9_]{0,63}$/;

const attributeTypeOptions = [
  { value: "text", label: "Text" },
  { value: "number", label: "Number" },
  { value: "boolean", label: "Yes / no" },
];

type AttributeRow = {
  rowId: string;
  key: string;
  label: string;
  type: CategoryAttribute["type"];
  unit: string;
};

type Model = {
  name: string;
  slug: string;
  parentId: string;
  description: string;
  imageUrl: string;
  isActive: boolean;
  sortOrder: string;
  attributes: AttributeRow[];
};

type Errors = Partial<Record<"name" | "slug" | "description" | "imageUrl" | "sortOrder" | "attributes", string>> & {
  rows?: Record<string, Partial<Record<"key" | "label" | "unit", string>>>;
};

const toModel = (category: Category | null): Model => ({
  name: category?.name ?? "",
  slug: category?.slug ?? "",
  parentId: category?.parentId ?? "",
  description: category?.description ?? "",
  imageUrl: category?.imageUrl ?? "",
  isActive: category?.isActive ?? true,
  sortOrder: String(category?.sortOrder ?? 0),
  attributes: (category?.attributes ?? []).map((item) => ({
    rowId: nextRowId(),
    key: item.key,
    label: item.label,
    type: item.type,
    unit: item.unit ?? "",
  })),
});

const validate = (model: Model): Errors => {
  const errors: Errors = {};
  const name = model.name.trim();
  if (!name) errors.name = "Name is required.";
  else if (name.length > LIMITS.categoryName) errors.name = `Name must be ${LIMITS.categoryName} characters or fewer.`;
  if (model.slug.trim().length > 120) errors.slug = "Slug must be 120 characters or fewer.";
  if (model.description.trim().length > LIMITS.categoryDescription) {
    errors.description = `Description must be ${LIMITS.categoryDescription} characters or fewer.`;
  }
  const urlError = validateUrlField(model.imageUrl, "Image URL");
  if (urlError) errors.imageUrl = urlError;
  const sortOrder = Number(model.sortOrder);
  if (model.sortOrder.trim() === "" || !Number.isInteger(sortOrder) || sortOrder < 0 || sortOrder > 1_000_000) {
    errors.sortOrder = "Sort order must be a whole number between 0 and 1,000,000.";
  }
  if (model.attributes.length > LIMITS.categoryAttributes) {
    errors.attributes = `A category can have at most ${LIMITS.categoryAttributes} specifications.`;
  }

  const rows: NonNullable<Errors["rows"]> = {};
  const seen = new Set<string>();
  for (const row of model.attributes) {
    const rowErrors: Partial<Record<"key" | "label" | "unit", string>> = {};
    const key = row.key.trim();
    if (!key) rowErrors.key = "Key is required.";
    else if (!ATTRIBUTE_KEY_PATTERN.test(key)) {
      rowErrors.key = "Start with a letter; use letters, numbers and underscores (64 at most).";
    } else if (seen.has(key)) rowErrors.key = "Each key must be unique.";
    seen.add(key);
    const label = row.label.trim();
    if (!label) rowErrors.label = "Label is required.";
    else if (label.length > LIMITS.attributeLabel)
      rowErrors.label = `Label must be ${LIMITS.attributeLabel} characters or fewer.`;
    if (row.unit.trim().length > LIMITS.attributeUnit)
      rowErrors.unit = `Unit must be ${LIMITS.attributeUnit} characters or fewer.`;
    if (Object.keys(rowErrors).length) rows[row.rowId] = rowErrors;
  }
  if (Object.keys(rows).length) errors.rows = rows;
  return errors;
};

const toInput = (model: Model): CategoryInput => ({
  name: model.name.trim(),
  ...(model.slug.trim() ? { slug: model.slug.trim() } : {}),
  parentId: model.parentId || null,
  description: model.description.trim() || null,
  imageUrl: model.imageUrl.trim() || null,
  isActive: model.isActive,
  sortOrder: Number(model.sortOrder),
  attributes: model.attributes.map((row) => ({
    key: row.key.trim(),
    label: row.label.trim(),
    type: row.type,
    unit: row.unit.trim() || null,
  })),
});

type CategoryFormProps = {
  open: boolean;
  category: Category | null;
  categories: readonly Category[];
  onClose: () => void;
  onSaved: (category: Category) => void;
};

/** Create/edit drawer for a category. Mount it with a fresh `key` per open so the form starts from `category`. */
export function CategoryForm({ open, category, categories, onClose, onSaved }: CategoryFormProps) {
  const [model, setModel] = useState<Model>(() => toModel(category));
  const [errors, setErrors] = useState<Errors>({});
  const [formError, setFormError] = useState("");
  const [saving, setSaving] = useState(false);
  const formId = "category-form";

  const parentOptions = useMemo(() => {
    const exclude = category ? descendantIds(categories, category.id) : undefined;
    return [{ value: "", label: "None (top level)" }, ...categoryOptions(categories, exclude)];
  }, [categories, category]);

  const set = <K extends keyof Model>(key: K, value: Model[K]) => setModel((current) => ({ ...current, [key]: value }));

  const updateRow = (rowId: string, patch: Partial<AttributeRow>) =>
    setModel((current) => ({
      ...current,
      attributes: current.attributes.map((row) => (row.rowId === rowId ? { ...row, ...patch } : row)),
    }));

  const addRow = () =>
    setModel((current) => ({
      ...current,
      attributes: [...current.attributes, { rowId: nextRowId(), key: "", label: "", type: "text", unit: "" }],
    }));

  const removeRow = (rowId: string) =>
    setModel((current) => ({
      ...current,
      attributes: current.attributes.filter((row) => row.rowId !== rowId),
    }));

  const close = () => {
    if (!saving) onClose();
  };

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const nextErrors = validate(model);
    setErrors(nextErrors);
    setFormError("");
    if (Object.keys(nextErrors).length) {
      setFormError("Check the highlighted fields and try again.");
      return;
    }
    setSaving(true);
    try {
      const saved = await saveCategory(category?.id ?? null, toInput(model));
      toast.success(category ? "Category updated." : "Category created.");
      onSaved(saved);
    } catch (error) {
      setFormError(errorMessage(error, "The category couldn’t be saved."));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Drawer
      open={open}
      onClose={close}
      size="lg"
      title={category ? "Edit category" : "Add category"}
      description={category ? category.name : "Fields marked * are required."}
      footer={
        <>
          <Button variant="outline" onClick={close} disabled={saving}>
            Cancel
          </Button>
          <Button type="submit" form={formId} loading={saving} loadingText="Saving…">
            {category ? "Save changes" : "Add category"}
          </Button>
        </>
      }
    >
      <form id={formId} onSubmit={submit} className="space-y-5" noValidate>
        {formError && (
          <Alert tone="danger" title="Couldn’t save the category">
            {formError}
          </Alert>
        )}

        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="Name" required error={errors.name}>
            <Input
              value={model.name}
              maxLength={LIMITS.categoryName}
              onChange={(event) => set("name", event.target.value)}
            />
          </Field>
          <Field label="Slug" helper="Leave blank to create one from the name." error={errors.slug}>
            <Input value={model.slug} maxLength={120} onChange={(event) => set("slug", event.target.value)} />
          </Field>
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="Parent category">
            <Select
              value={model.parentId}
              options={parentOptions}
              onChange={(event) => set("parentId", event.target.value)}
            />
          </Field>
          <Field label="Sort order" helper="Lower numbers show first." error={errors.sortOrder}>
            <Input
              type="number"
              inputMode="numeric"
              min={0}
              step={1}
              value={model.sortOrder}
              onChange={(event) => set("sortOrder", event.target.value)}
            />
          </Field>
        </div>

        <Field
          label="Description"
          helper={`${model.description.length}/${LIMITS.categoryDescription} characters`}
          error={errors.description}
        >
          <Textarea
            rows={4}
            value={model.description}
            maxLength={LIMITS.categoryDescription}
            onChange={(event) => set("description", event.target.value)}
          />
        </Field>

        <Field label="Image URL" helper="An https:// link or a site path starting with /." error={errors.imageUrl}>
          <Input
            type="url"
            inputMode="url"
            value={model.imageUrl}
            placeholder="https://"
            onChange={(event) => set("imageUrl", event.target.value)}
          />
        </Field>

        <Switch
          checked={model.isActive}
          onChange={(checked) => set("isActive", checked)}
          label="Active"
          description="Inactive categories are hidden from the website."
        />

        <div role="group" aria-labelledby="category-specs-heading" className="space-y-3">
          <div className="flex flex-wrap items-end justify-between gap-2">
            <div>
              <h3 id="category-specs-heading" className="text-sm font-medium text-slate-900">
                Specifications
              </h3>
              <p className="text-xs text-slate-500">
                The details products in this category record, such as capacity or voltage. Up to{" "}
                {LIMITS.categoryAttributes}.
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={addRow}
              disabled={model.attributes.length >= LIMITS.categoryAttributes}
              icon={<Plus aria-hidden="true" />}
            >
              Add specification
            </Button>
          </div>
          {errors.attributes && <p className="text-sm text-red-600">{errors.attributes}</p>}
          {model.attributes.length === 0 ? (
            <p className="rounded-lg border border-dashed border-slate-200 px-4 py-6 text-center text-sm text-slate-500">
              No specifications yet.
            </p>
          ) : (
            <ul className="space-y-3">
              {model.attributes.map((row, index) => {
                const rowErrors = errors.rows?.[row.rowId] ?? {};
                return (
                  <li key={row.rowId} className="rounded-lg border border-slate-200 p-3">
                    <div className="grid gap-3 sm:grid-cols-2">
                      <Field label="Key" required error={rowErrors.key} helper="For example capacityKwh.">
                        <Input
                          value={row.key}
                          maxLength={64}
                          className="font-mono"
                          onChange={(event) => updateRow(row.rowId, { key: event.target.value })}
                        />
                      </Field>
                      <Field label="Label" required error={rowErrors.label}>
                        <Input
                          value={row.label}
                          maxLength={LIMITS.attributeLabel}
                          onChange={(event) => updateRow(row.rowId, { label: event.target.value })}
                        />
                      </Field>
                      <Field label="Type">
                        <Select
                          value={row.type}
                          options={attributeTypeOptions}
                          onChange={(event) =>
                            updateRow(row.rowId, {
                              type: event.target.value as CategoryAttribute["type"],
                            })
                          }
                        />
                      </Field>
                      <div className="flex items-start gap-2">
                        <Field label="Unit" error={rowErrors.unit} className="flex-1">
                          <Input
                            value={row.unit}
                            maxLength={LIMITS.attributeUnit}
                            placeholder="kWh"
                            onChange={(event) => updateRow(row.rowId, { unit: event.target.value })}
                          />
                        </Field>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="mt-6 hover:bg-red-50 hover:text-red-700"
                          aria-label={`Remove specification ${row.label || row.key || index + 1}`}
                          title="Remove"
                          onClick={() => removeRow(row.rowId)}
                        >
                          <Trash2 aria-hidden="true" />
                        </Button>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </form>
    </Drawer>
  );
}
