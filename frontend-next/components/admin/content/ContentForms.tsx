"use client";

import type { ChangeEvent } from "react";
import { useAdminQuery } from "@/components/admin/AdminContext";
import { ImageUpload } from "@/components/admin/ImageUpload";
import { categoryOptions } from "@/components/admin/catalog/categoryTree";
import { Alert, Field, Input, Select, Switch, Textarea } from "@/components/ui";
import { getCategories } from "@/lib/api/admin";
import { WEBSITE_LIMITS } from "@/lib/admin/website";
import { LIMITS } from "@/lib/validation";
import type { ContentItem, FieldErrors } from "./contentConstants";
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
  const categorySelectOptions = [{ value: "", label: "Choose a category" }, ...categoryOptions(categories.data ?? [])];
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
          required
          className="sm:col-span-2"
          error={errors.categoryId}
          helper={
            categories.error && !categories.data
              ? `Couldn’t load categories. ${categories.error}`
              : "From the product catalogue, e.g. Lithium or Tubular. Customers browse packages by category."
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
      <ImageUpload
        label="Image"
        required
        value={text(model.image)}
        onChange={(image) => setModel({ ...model, image })}
        purpose="services"
        error={errors.image}
        linkHelper="A photo in the site’s public folder, e.g. /panel-4.webp, or a full https:// URL."
        linkPlaceholder="/panel-4.webp"
        previewAlt={model.title ? `Image for ${model.title}` : "Service image"}
      />
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
      <ImageUpload
        label="Image"
        required
        value={text(model.image)}
        onChange={(image) => setModel({ ...model, image })}
        purpose="portfolio"
        error={errors.image}
        linkHelper="A photo in the site’s public folder, e.g. /image-1.jpg, or a full https:// URL."
        previewAlt={model.name ? `Image for ${model.name}` : "Portfolio image"}
      />
      <fieldset className="space-y-4 rounded-lg border border-slate-200 p-4">
        <legend className="px-1 text-sm font-medium text-slate-700">Case study</legend>
        <p className="text-sm text-slate-500">
          Optional. Items with a summary can appear as case studies on the home page.
        </p>
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
          <Field label="Amount" helper="What the project cost, e.g. ₦14,500,000." error={errors.system}>
            <Input
              value={text(model.system)}
              onChange={set("system")}
              placeholder="₦14,500,000"
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
