"use client";

import { useMemo, useState, type FormEvent } from "react";
import Link from "next/link";
import { Archive, ExternalLink, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Alert, Button, ConfirmDialog, Drawer, Field, Input, Select } from "@/components/ui";
import { ImageListUpload } from "@/components/admin/ImageListUpload";
import { RichTextEditor } from "@/components/admin/RichTextEditor";
import { saveProduct } from "@/lib/api/admin";
import type { Category, Product, ProductInput, ProductStatus } from "@/lib/api/types";
import { errorMessage } from "@/lib/admin/format";
import { LIMITS, validateUrlField } from "@/lib/validation";
import { ATTRIBUTE_KEY_PATTERN } from "./CategoryForm";
import { categoryOptions, nextRowId } from "./categoryTree";
import { productStatusOptions } from "./productBadges";

export const SKU_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._-]*$/;
const RICH_TEXT_MAX = 50_000;
const ATTRIBUTES_MAX = 50;

const booleanOptions = [
  { value: "", label: "Not set" },
  { value: "true", label: "Yes" },
  { value: "false", label: "No" },
];

type Row = { rowId: string; value: string };
type ExtraRow = { rowId: string; key: string; value: string };

type Model = {
  sku: string;
  name: string;
  slug: string;
  categoryId: string;
  brand: string;
  price: string;
  costPrice: string;
  reorderLevel: string;
  stockQuantity: string;
  images: Row[];
  tags: string;
  status: ProductStatus;
  descriptionHtml: string;
  /** Values for the selected category's specification schema, as text ("true"/"false" for yes/no). */
  specs: Record<string, string>;
  extras: ExtraRow[];
};

type FieldName =
  | "sku"
  | "name"
  | "slug"
  | "brand"
  | "price"
  | "costPrice"
  | "reorderLevel"
  | "stockQuantity"
  | "images"
  | "tags"
  | "descriptionHtml"
  | "attributes";

type Errors = Partial<Record<FieldName, string>> & {
  imageRows?: Record<string, string>;
  specs?: Record<string, string>;
  extras?: Record<string, string>;
};

const toModel = (product: Product | null, categories: readonly Category[]): Model => {
  const schema = categories.find((item) => item.id === product?.categoryId)?.attributes ?? [];
  const schemaKeys = new Set(schema.map((item) => item.key));
  const attributes = Object.entries(product?.attributes ?? {});
  return {
    sku: product?.sku ?? "",
    name: product?.name ?? "",
    slug: product?.slug ?? "",
    categoryId: product?.categoryId ?? "",
    brand: product?.brand ?? "",
    price: product ? String(product.price) : "",
    costPrice: product?.costPrice != null ? String(product.costPrice) : "",
    reorderLevel: String(product?.reorderLevel ?? 0),
    stockQuantity: "0",
    images: (product?.images ?? []).map((value) => ({
      rowId: nextRowId(),
      value,
    })),
    tags: (product?.tags ?? []).join(", "),
    status: product?.status ?? "active",
    descriptionHtml: product?.descriptionHtml ?? "",
    specs: Object.fromEntries(
      attributes.filter(([key]) => schemaKeys.has(key)).map(([key, value]) => [key, String(value)])
    ),
    extras: attributes
      .filter(([key]) => !schemaKeys.has(key))
      .map(([key, value]) => ({
        rowId: nextRowId(),
        key,
        value: String(value),
      })),
  };
};

const isWhole = (value: string, max: number) => {
  const number = Number(value);
  return value.trim() !== "" && Number.isInteger(number) && number >= 0 && number <= max;
};

const parseTags = (value: string) =>
  value
    .split(",")
    .map((tag) => tag.trim())
    .filter(Boolean);

type Built = { errors: Errors; input: ProductInput };

const build = (model: Model, category: Category | undefined, creating: boolean): Built => {
  const errors: Errors = {};
  const sku = model.sku.trim();
  if (!sku) errors.sku = "SKU is required.";
  else if (sku.length > LIMITS.productSku) errors.sku = `SKU must be ${LIMITS.productSku} characters or fewer.`;
  else if (!SKU_PATTERN.test(sku))
    errors.sku = "Start with a letter or number; use letters, numbers, dots, dashes and underscores.";

  const name = model.name.trim();
  if (!name) errors.name = "Name is required.";
  else if (name.length > LIMITS.productName) errors.name = `Name must be ${LIMITS.productName} characters or fewer.`;
  if (model.slug.trim().length > 120) errors.slug = "Slug must be 120 characters or fewer.";
  if (model.brand.trim().length > LIMITS.productBrand)
    errors.brand = `Brand must be ${LIMITS.productBrand} characters or fewer.`;

  const price = Number(model.price);
  if (model.price.trim() === "" || !Number.isFinite(price) || price <= 0 || price > LIMITS.priceMax) {
    errors.price = "Price must be greater than 0 and at most 1,000,000,000.";
  }
  const costPrice = Number(model.costPrice);
  if (model.costPrice.trim() !== "" && (!Number.isFinite(costPrice) || costPrice < 0 || costPrice > LIMITS.priceMax)) {
    errors.costPrice = "Cost price must be 0 or more.";
  }
  if (!isWhole(model.reorderLevel, LIMITS.stockMax)) {
    errors.reorderLevel = "Reorder level must be a whole number from 0 to 1,000,000.";
  }
  if (creating && !isWhole(model.stockQuantity, LIMITS.stockMax)) {
    errors.stockQuantity = "Opening stock must be a whole number from 0 to 1,000,000.";
  }

  const imageRows: Record<string, string> = {};
  const images: string[] = [];
  for (const row of model.images) {
    const value = row.value.trim();
    if (!value) continue;
    const error = validateUrlField(value, "Image link");
    if (error) imageRows[row.rowId] = error;
    images.push(value);
  }
  if (Object.keys(imageRows).length) errors.imageRows = imageRows;
  if (images.length > LIMITS.productImages) errors.images = `Add at most ${LIMITS.productImages} images.`;

  const tags = parseTags(model.tags);
  if (tags.length > LIMITS.productTags) errors.tags = `Add at most ${LIMITS.productTags} tags.`;
  else if (tags.some((tag) => tag.length > LIMITS.productTag)) {
    errors.tags = `Each tag must be ${LIMITS.productTag} characters or fewer.`;
  }

  if (model.descriptionHtml.length > RICH_TEXT_MAX)
    errors.descriptionHtml = "Description must be 50000 characters or fewer.";

  const attributes: Record<string, string | number | boolean> = {};
  const specErrors: Record<string, string> = {};
  const schema = category?.attributes ?? [];
  for (const spec of schema) {
    const raw = (model.specs[spec.key] ?? "").trim();
    if (!raw) continue;
    if (spec.type === "boolean") attributes[spec.key] = raw === "true";
    else if (spec.type === "number") {
      const number = Number(raw);
      if (Number.isFinite(number)) attributes[spec.key] = number;
      else specErrors[spec.key] = `${spec.label} must be a number.`;
    } else if (raw.length > LIMITS.productAttributeValue) {
      specErrors[spec.key] = `${spec.label} must be ${LIMITS.productAttributeValue} characters or fewer.`;
    } else attributes[spec.key] = raw;
  }
  if (Object.keys(specErrors).length) errors.specs = specErrors;

  const extraErrors: Record<string, string> = {};
  for (const row of model.extras) {
    const key = row.key.trim();
    const value = row.value.trim();
    if (!key && !value) continue;
    if (!ATTRIBUTE_KEY_PATTERN.test(key)) {
      extraErrors[row.rowId] = "Key must start with a letter and use letters, numbers and underscores.";
    } else if (key in attributes || schema.some((spec) => spec.key === key)) {
      extraErrors[row.rowId] = "This key is already used above.";
    } else if (value.length > LIMITS.productAttributeValue) {
      extraErrors[row.rowId] = `Value must be ${LIMITS.productAttributeValue} characters or fewer.`;
    } else attributes[key] = value;
  }
  if (Object.keys(extraErrors).length) errors.extras = extraErrors;
  if (Object.keys(attributes).length > ATTRIBUTES_MAX)
    errors.attributes = `Add at most ${ATTRIBUTES_MAX} specifications.`;

  const input: ProductInput = {
    sku,
    name,
    ...(model.slug.trim() ? { slug: model.slug.trim() } : {}),
    categoryId: model.categoryId || null,
    brand: model.brand.trim() || null,
    price,
    costPrice: model.costPrice.trim() === "" ? null : costPrice,
    reorderLevel: Number(model.reorderLevel),
    images,
    tags,
    status: model.status,
    descriptionHtml: model.descriptionHtml,
    attributes,
    ...(creating ? { stockQuantity: Number(model.stockQuantity) } : {}),
  };
  return { errors, input };
};

type ProductFormProps = {
  open: boolean;
  product: Product | null;
  categories: readonly Category[];
  onClose: () => void;
  onSaved: (product: Product) => void;
  /** Package options that include this product (Commerce v2 §3); undefined when packages couldn't be read. */
  usedInOptions?: number;
};

const optionsLabel = (count: number) => `${count} package option${count === 1 ? "" : "s"}`;

/** Create/edit drawer for a product. Mount it with a fresh `key` per open so the form starts from `product`. */
export function ProductForm({ open, product, categories, onClose, onSaved, usedInOptions }: ProductFormProps) {
  const [model, setModel] = useState<Model>(() => toModel(product, categories));
  const [errors, setErrors] = useState<Errors>({});
  const [formError, setFormError] = useState("");
  const [saving, setSaving] = useState(false);
  const [pendingArchive, setPendingArchive] = useState<ProductInput | null>(null);
  const creating = !product;
  const usage = creating ? 0 : (usedInOptions ?? 0);
  const formId = "product-form";

  const options = useMemo(() => [{ value: "", label: "No category" }, ...categoryOptions(categories)], [categories]);
  const category = categories.find((item) => item.id === model.categoryId);

  const set = <K extends keyof Model>(key: K, value: Model[K]) => setModel((current) => ({ ...current, [key]: value }));

  const close = () => {
    if (!saving) onClose();
  };

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const { errors: nextErrors, input } = build(model, category, creating);
    setErrors(nextErrors);
    setFormError("");
    if (Object.keys(nextErrors).length) {
      setFormError("Check the highlighted fields and try again.");
      return;
    }
    // Archiving a product used in packages makes those options unavailable: confirm first.
    if (usage > 0 && product?.status !== "archived" && input.status === "archived") {
      setPendingArchive(input);
      return;
    }
    await save(input);
  };

  const save = async (input: ProductInput) => {
    if (saving) return;
    setSaving(true);
    try {
      const saved = await saveProduct(product?.id ?? null, input);
      toast.success(creating ? "Product created." : "Product updated.");
      onSaved(saved);
    } catch (error) {
      setFormError(errorMessage(error, "The product couldn’t be saved."));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Drawer
      open={open}
      onClose={close}
      size="lg"
      title={creating ? "Add product" : "Edit product"}
      description={creating ? "Fields marked * are required." : `${product.name} · ${product.sku}`}
      footer={
        <>
          <Button variant="outline" onClick={close} disabled={saving}>
            Cancel
          </Button>
          <Button type="submit" form={formId} loading={saving} loadingText="Saving…">
            {creating ? "Add product" : "Save changes"}
          </Button>
        </>
      }
    >
      <form id={formId} onSubmit={submit} className="space-y-5" noValidate>
        {formError && (
          <Alert tone="danger" title="Couldn’t save the product">
            {formError}
          </Alert>
        )}

        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="SKU" required error={errors.sku}>
            <Input
              value={model.sku}
              maxLength={LIMITS.productSku}
              className="font-mono"
              autoCapitalize="characters"
              onChange={(event) => set("sku", event.target.value)}
            />
          </Field>
          <Field label="Status">
            <Select
              value={model.status}
              options={productStatusOptions}
              onChange={(event) => set("status", event.target.value as ProductStatus)}
            />
          </Field>
        </div>

        <Field label="Name" required error={errors.name}>
          <Input
            value={model.name}
            maxLength={LIMITS.productName}
            onChange={(event) => set("name", event.target.value)}
          />
        </Field>

        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="Slug" helper="Leave blank to create one from the name." error={errors.slug}>
            <Input value={model.slug} maxLength={120} onChange={(event) => set("slug", event.target.value)} />
          </Field>
          <Field label="Brand" error={errors.brand}>
            <Input
              value={model.brand}
              maxLength={LIMITS.productBrand}
              onChange={(event) => set("brand", event.target.value)}
            />
          </Field>
        </div>

        <Field label="Category">
          <Select
            value={model.categoryId}
            options={options}
            onChange={(event) => set("categoryId", event.target.value)}
          />
        </Field>

        <div className="grid gap-5 sm:grid-cols-2">
          <Field
            label="Price (NGN)"
            required
            error={errors.price}
            helper={usage > 0 ? `Used in ${optionsLabel(usage)}. Their prices will update.` : undefined}
          >
            <Input
              type="number"
              inputMode="decimal"
              min={0}
              step="any"
              value={model.price}
              onChange={(event) => set("price", event.target.value)}
            />
          </Field>
          <Field label="Cost price (NGN)" helper="Only visible to admins." error={errors.costPrice}>
            <Input
              type="number"
              inputMode="decimal"
              min={0}
              step="any"
              value={model.costPrice}
              onChange={(event) => set("costPrice", event.target.value)}
            />
          </Field>
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="Reorder level" helper="Low-stock alerts start at this quantity." error={errors.reorderLevel}>
            <Input
              type="number"
              inputMode="numeric"
              min={0}
              step={1}
              value={model.reorderLevel}
              onChange={(event) => set("reorderLevel", event.target.value)}
            />
          </Field>
          {creating ? (
            <Field label="Opening stock" helper="Later changes go through Inventory." error={errors.stockQuantity}>
              <Input
                type="number"
                inputMode="numeric"
                min={0}
                step={1}
                value={model.stockQuantity}
                onChange={(event) => set("stockQuantity", event.target.value)}
              />
            </Field>
          ) : (
            <div className="space-y-2">
              <p className="text-sm font-medium leading-none text-slate-700">Stock</p>
              <p className="text-lg font-semibold tabular-nums text-slate-900">{product.stockQuantity}</p>
              <Link
                href={`/admin/inventory?product=${encodeURIComponent(product.id)}`}
                className="inline-flex items-center gap-1 text-sm font-medium text-brand-700 hover:underline"
              >
                Adjust in Inventory
                <ExternalLink aria-hidden="true" className="h-3.5 w-3.5" />
              </Link>
            </div>
          )}
        </div>

        <ImageListUpload
          label="Images"
          helper={`The first image is the main one. Up to ${LIMITS.productImages}.`}
          rows={model.images}
          onChange={(update) => setModel((current) => ({ ...current, images: update(current.images) }))}
          newRowId={nextRowId}
          purpose="products"
          max={LIMITS.productImages}
          rowErrors={errors.imageRows}
          error={errors.images}
        />

        <Field label="Tags" helper={`Separate tags with commas. Up to ${LIMITS.productTags}.`} error={errors.tags}>
          <Input
            value={model.tags}
            placeholder="solar, lithium"
            onChange={(event) => set("tags", event.target.value)}
          />
        </Field>

        <div role="group" aria-labelledby="product-specs-heading" className="space-y-3">
          <div>
            <h3 id="product-specs-heading" className="text-sm font-medium text-slate-900">
              Specifications
            </h3>
            <p className="text-xs text-slate-500">
              {category?.attributes.length
                ? `Fields from the ${category.name} category, plus any extra details.`
                : "Pick a category to see its specification fields, or add extra details below."}
            </p>
          </div>
          {errors.attributes && <p className="text-sm text-red-600">{errors.attributes}</p>}
          {category?.attributes.length ? (
            <div className="grid gap-4 sm:grid-cols-2">
              {category.attributes.map((spec) => {
                const label = spec.unit ? `${spec.label} (${spec.unit})` : spec.label;
                const value = model.specs[spec.key] ?? "";
                const update = (next: string) => set("specs", { ...model.specs, [spec.key]: next });
                return (
                  <Field key={spec.key} label={label} error={errors.specs?.[spec.key]}>
                    {spec.type === "boolean" ? (
                      <Select value={value} options={booleanOptions} onChange={(event) => update(event.target.value)} />
                    ) : (
                      <Input
                        type={spec.type === "number" ? "number" : "text"}
                        inputMode={spec.type === "number" ? "decimal" : undefined}
                        step={spec.type === "number" ? "any" : undefined}
                        maxLength={spec.type === "text" ? LIMITS.productAttributeValue : undefined}
                        value={value}
                        onChange={(event) => update(event.target.value)}
                      />
                    )}
                  </Field>
                );
              })}
            </div>
          ) : null}

          {model.extras.length > 0 && (
            <ul className="space-y-2">
              {model.extras.map((row, index) => (
                <li key={row.rowId} className="space-y-1">
                  <div className="flex items-start gap-2">
                    <div className="grid flex-1 gap-2 sm:grid-cols-2">
                      <Field label={`Extra detail ${index + 1} key`} labelClassName="sr-only">
                        <Input
                          placeholder="Key, for example warrantyYears"
                          className="font-mono"
                          maxLength={64}
                          value={row.key}
                          invalid={Boolean(errors.extras?.[row.rowId])}
                          onChange={(event) =>
                            set(
                              "extras",
                              model.extras.map((item) =>
                                item.rowId === row.rowId ? { ...item, key: event.target.value } : item
                              )
                            )
                          }
                        />
                      </Field>
                      <Field label={`Extra detail ${index + 1} value`} labelClassName="sr-only">
                        <Input
                          placeholder="Value"
                          maxLength={LIMITS.productAttributeValue}
                          value={row.value}
                          onChange={(event) =>
                            set(
                              "extras",
                              model.extras.map((item) =>
                                item.rowId === row.rowId ? { ...item, value: event.target.value } : item
                              )
                            )
                          }
                        />
                      </Field>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="hover:bg-red-50 hover:text-red-700"
                      aria-label={`Remove extra detail ${row.key || index + 1}`}
                      title="Remove"
                      onClick={() =>
                        set(
                          "extras",
                          model.extras.filter((item) => item.rowId !== row.rowId)
                        )
                      }
                    >
                      <Trash2 aria-hidden="true" />
                    </Button>
                  </div>
                  {errors.extras?.[row.rowId] && <p className="text-sm text-red-600">{errors.extras[row.rowId]}</p>}
                </li>
              ))}
            </ul>
          )}
          <Button
            variant="outline"
            size="sm"
            icon={<Plus aria-hidden="true" />}
            onClick={() => set("extras", [...model.extras, { rowId: nextRowId(), key: "", value: "" }])}
          >
            Add extra detail
          </Button>
        </div>

        <Field label="Description" error={errors.descriptionHtml}>
          {({ id, describedBy, invalid }) => (
            <RichTextEditor
              id={id}
              value={model.descriptionHtml}
              onChange={(html) => set("descriptionHtml", html)}
              placeholder="Describe the product for customers"
              invalid={invalid}
              aria-describedby={describedBy}
            />
          )}
        </Field>
      </form>

      <ConfirmDialog
        open={Boolean(pendingArchive)}
        onClose={() => {
          if (!saving) setPendingArchive(null);
        }}
        onConfirm={async () => {
          const input = pendingArchive;
          if (!input) return;
          await save(input);
          setPendingArchive(null);
        }}
        loading={saving}
        loadingText="Archiving…"
        tone="warning"
        title="Archive this product?"
        description={`“${model.name.trim() || product?.name}” is used in ${optionsLabel(usage)}. While it’s archived, those options are unavailable: customers can’t order them and their packages may disappear from the shop.`}
        confirmLabel="Archive product"
        confirmIcon={<Archive aria-hidden="true" />}
      />
    </Drawer>
  );
}
