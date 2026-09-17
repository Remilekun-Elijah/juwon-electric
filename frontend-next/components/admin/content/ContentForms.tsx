"use client";

import type { ChangeEvent } from "react";
import { useAdminQuery } from "@/components/admin/AdminContext";
import { categoryOptions } from "@/components/admin/catalog/categoryTree";
import { Alert, Field, Input, Select, Switch, Textarea } from "@/components/ui";
import { getCategories, getServicesAdmin } from "@/lib/api/admin";
import { WEBSITE_LIMITS } from "@/lib/admin/website";
import { LIMITS } from "@/lib/validation";
import { packageTypeOptions, type ContentItem, type FieldErrors } from "./contentConstants";
import { PackageOptionsEditor, type PackageOptionsState } from "./PackageOptionsEditor";

const grid = "grid gap-4 sm:grid-cols-2";

type ControlEvent = ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>;

export type ContentFormProps = {
  model: ContentItem;
  setModel: (model: ContentItem) => void;
  errors?: FieldErrors;
  /** Packages only: the price options editor state. */
  packageOptions?: PackageOptionsState;
};

const text = (value: unknown) => (value === null || value === undefined ? "" : String(value));

export function PackageForm({ model, setModel, packageOptions, errors = {} }: ContentFormProps) {
  const set = (key: keyof ContentItem) => (event: ControlEvent) => setModel({ ...model, [key]: event.target.value });
  const categories = useAdminQuery("package-form:categories", getCategories);
  const categoryId = model.categoryId || "";
  const categorySelectOptions = [{ value: "", label: "No category" }, ...categoryOptions(categories.data ?? [])];
  if (categoryId && categories.data && !categories.data.some((item) => item.id === categoryId)) {
    categorySelectOptions.push({ value: categoryId, label: model.categoryRef?.name || "Current category (not found)" });
  }
  return (
    <div className="space-y-5">
      <div className={grid}>
        <Field label="Name" required className="sm:col-span-2" error={errors.name}>
          <Input value={text(model.name)} onChange={set("name")} placeholder="Basic" maxLength={LIMITS.packageName} />
        </Field>
        <Field
          label="Category"
          className="sm:col-span-2"
          error={errors.categoryId}
          helper={
            categories.error && !categories.data
              ? `Couldn’t load categories. ${categories.error}`
              : "From the product catalogue. Customers can browse packages by category."
          }
        >
          <Select
            value={categoryId}
            disabled={categories.initialLoading && Boolean(categoryId)}
            options={
              categories.initialLoading && categoryId
                ? [{ value: categoryId, label: model.categoryRef?.name || "Loading categories…" }]
                : categorySelectOptions
            }
            onChange={(event) => setModel({ ...model, categoryId: event.target.value || null })}
          />
        </Field>
        <Field label="Battery type" required error={errors.type}>
          <Select value={text(model.type)} onChange={set("type")} options={packageTypeOptions} />
        </Field>
        <Field label="Inverter size (kVA)" required error={errors.kva}>
          <Input type="number" inputMode="decimal" step="any" min="0" value={text(model.kva)} onChange={set("kva")} />
        </Field>
        <Field label="Voltage (V)" helper="Leave empty if not applicable." error={errors.volt}>
          <Input type="number" inputMode="decimal" step="any" min="0" value={text(model.volt)} onChange={set("volt")} />
        </Field>
        <Field
          label="Shop id"
          helper="Whole number used to match cart items. Leave empty to keep the current one."
          error={errors.legacyId}
        >
          <Input
            type="number"
            inputMode="numeric"
            step="1"
            min="0"
            value={text(model.legacyId)}
            onChange={set("legacyId")}
          />
        </Field>
      </div>
      <Field
        label="What it can power"
        helper="Appliances this package can run, e.g. 2 fans, 1 TV, 6 lighting points."
        error={errors.load}
        required
      >
        <Textarea rows={3} value={text(model.load)} onChange={set("load")} maxLength={LIMITS.packageLoad} />
      </Field>
      {packageOptions && <PackageOptionsEditor {...packageOptions} />}
      <Switch
        label="Show on the shop"
        description="Hidden packages stay here but aren’t listed for customers."
        checked={Boolean(model.isActive)}
        onChange={(value) => setModel({ ...model, isActive: value })}
      />
    </div>
  );
}

export function ServiceForm({ model, setModel, errors = {} }: ContentFormProps) {
  const set = (key: keyof ContentItem) => (event: ControlEvent) => setModel({ ...model, [key]: event.target.value });
  return (
    <div className="space-y-5">
      <Field label="Title" required error={errors.title}>
        <Input
          value={text(model.title)}
          onChange={set("title")}
          placeholder="Energy audit"
          maxLength={LIMITS.serviceTitle}
        />
      </Field>
      <Field label="Description" required error={errors.subtitle}>
        <Textarea rows={4} value={text(model.subtitle)} onChange={set("subtitle")} maxLength={LIMITS.serviceSubtitle} />
      </Field>
      <Field
        label="Image path"
        helper="A photo in the site’s public folder, e.g. /panel-4.webp, or a full https:// URL."
        error={errors.image}
        required
      >
        <Input value={text(model.image)} onChange={set("image")} placeholder="/panel-4.webp" maxLength={LIMITS.url} />
      </Field>
      <div className={grid}>
        <Field label="Button label" error={errors.ctaLabel}>
          <Input value={text(model.ctaLabel)} onChange={set("ctaLabel")} maxLength={LIMITS.serviceCtaLabel} />
        </Field>
        <Field label="Button link" error={errors.ctaUrl}>
          <Input value={text(model.ctaUrl)} onChange={set("ctaUrl")} placeholder="/packages" maxLength={LIMITS.url} />
        </Field>
      </div>
      <Switch
        label="Show on the Services page"
        checked={Boolean(model.isActive)}
        onChange={(value) => setModel({ ...model, isActive: value })}
      />
    </div>
  );
}

export function PortfolioForm({ model, setModel, errors = {} }: ContentFormProps) {
  const set = (key: keyof ContentItem) => (event: ControlEvent) => setModel({ ...model, [key]: event.target.value });
  const segments = useAdminQuery("portfolio-form:segments", async () => (await getServicesAdmin()).data?.customerSegments || []);
  const category = model.category || "";
  const segmentOptions = [
    { value: "", label: "No category" },
    ...(segments.data ?? [])
      .filter((segment) => segment.slug)
      .map((segment) => ({ value: segment.slug as string, label: segment.isActive ? segment.title : `${segment.title} (hidden)` })),
  ];
  if (category && segments.data && !segmentOptions.some((option) => option.value === category)) {
    segmentOptions.push({ value: category, label: `${category} (not found)` });
  }
  const summaryLength = text(model.summary).trim().length;
  return (
    <div className="space-y-5">
      {model.sample && (
        <Alert tone="info" title="Sample content">
          <p>Saving your changes turns this into real content and removes the Sample badge.</p>
        </Alert>
      )}
      <Field label="Name" required error={errors.name}>
        <Input
          value={text(model.name)}
          onChange={set("name")}
          placeholder="5kVA hybrid system, Lekki"
          maxLength={LIMITS.portfolioName}
        />
      </Field>
      <Field
        label="Image path"
        helper="A photo in the site’s public folder, e.g. /image-1.svg, or a full https:// URL."
        error={errors.image}
        required
      >
        <Input value={text(model.image)} onChange={set("image")} maxLength={LIMITS.url} />
      </Field>
      <fieldset className="space-y-4 rounded-lg border border-slate-200 p-4">
        <legend className="px-1 text-sm font-medium text-slate-700">Case study</legend>
        <p className="text-sm text-slate-500">
          Optional. Items with a summary can appear as case studies on the home page.
        </p>
        <Field
          label="Category"
          error={errors.category}
          helper={
            segments.error && !segments.data
              ? `Couldn’t load customer segments. ${segments.error}`
              : "Who this installation was for. Customers can filter the portfolio by it."
          }
        >
          <Select
            value={category}
            disabled={segments.initialLoading && Boolean(category)}
            options={segments.initialLoading && category ? [{ value: category, label: "Loading segments…" }] : segmentOptions}
            onChange={(event) => setModel({ ...model, category: event.target.value || null })}
          />
        </Field>
        <Field
          label="Summary"
          error={errors.summary}
          helper={`What the customer needed and what you installed. ${summaryLength}/${WEBSITE_LIMITS.portfolioSummary}`}
        >
          <Textarea
            rows={4}
            value={text(model.summary)}
            onChange={set("summary")}
            maxLength={WEBSITE_LIMITS.portfolioSummary}
          />
        </Field>
        <div className={grid}>
          <Field label="Location" error={errors.location}>
            <Input
              value={text(model.location)}
              onChange={set("location")}
              placeholder="Lekki, Lagos"
              maxLength={WEBSITE_LIMITS.portfolioLocation}
            />
          </Field>
          <Field label="System" error={errors.system}>
            <Input
              value={text(model.system)}
              onChange={set("system")}
              placeholder="10kVA inverter, 8 × 200Ah lithium"
              maxLength={WEBSITE_LIMITS.portfolioSystem}
            />
          </Field>
        </div>
      </fieldset>
      <Field label="External link" helper="Optional, e.g. the Instagram post for this project." error={errors.link}>
        <Input
          type="text"
          inputMode="url"
          value={text(model.link)}
          onChange={set("link")}
          placeholder="https://"
          maxLength={LIMITS.url}
        />
      </Field>
      <fieldset className="space-y-4 rounded-lg border border-slate-200 p-4">
        <legend className="px-1 text-sm font-medium text-slate-700">Visibility</legend>
        <Switch
          label="Featured on the home page"
          checked={Boolean(model.featured)}
          onChange={(value) => setModel({ ...model, featured: value })}
        />
        <Switch
          label="Show on mobile"
          checked={Boolean(model.mobile)}
          onChange={(value) => setModel({ ...model, mobile: value })}
        />
        <Switch
          label="Show on the Portfolio page"
          checked={Boolean(model.isActive)}
          onChange={(value) => setModel({ ...model, isActive: value })}
        />
      </fieldset>
    </div>
  );
}
