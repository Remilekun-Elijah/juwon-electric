"use client";

import type { ChangeEvent } from "react";
import { Field, Input, Select, Switch, Textarea } from "@/components/ui";
import { LIMITS } from "@/lib/validation";
import { packageTypeOptions, type ContentItem, type FieldErrors } from "./contentConstants";

const grid = "grid gap-4 sm:grid-cols-2";

type ControlEvent = ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>;

export type ContentFormProps = {
  model: ContentItem;
  setModel: (model: ContentItem) => void;
  errors?: FieldErrors;
  optionsText: string;
  setOptionsText: (value: string) => void;
  optionsError: string;
  validateOptions: () => void;
};

const text = (value: unknown) => (value === null || value === undefined ? "" : String(value));

export function PackageForm({
  model,
  setModel,
  optionsText,
  setOptionsText,
  optionsError,
  validateOptions,
  errors = {},
}: ContentFormProps) {
  const set = (key: keyof ContentItem) => (event: ControlEvent) => setModel({ ...model, [key]: event.target.value });
  return (
    <div className="space-y-5">
      <div className={grid}>
        <Field label="Name" required className="sm:col-span-2" error={errors.name}>
          <Input value={text(model.name)} onChange={set("name")} placeholder="Basic" maxLength={LIMITS.packageName} />
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
      <Field
        label="Price options (JSON)"
        helper={`A list of 1 to ${LIMITS.packageOptions} options, each with a "name", a "price" above 0 and "kits" (required).`}
        error={optionsError}
        required
      >
        <Textarea
          rows={10}
          spellCheck={false}
          className="font-mono text-xs leading-relaxed"
          value={optionsText}
          onChange={(event) => setOptionsText(event.target.value)}
          onBlur={validateOptions}
        />
      </Field>
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
  return (
    <div className="space-y-5">
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
