"use client";

import { useState, type FormEvent, type ReactNode } from "react";
import { Plus, X } from "lucide-react";
import { toast } from "sonner";
import { AdminPage } from "@/components/admin/AdminPage";
import { useAdmin, useAdminQuery } from "@/components/admin/AdminContext";
import {
  Alert,
  Button,
  Card,
  CardContent,
  ErrorState,
  Field,
  Input,
  Select,
  Skeleton,
  Switch,
  Textarea,
} from "@/components/ui";
import { errorMessage, formatDateTime } from "@/lib/admin/format";
import { ApiError, getSettings, saveSettings } from "@/lib/api/admin";
import type { Settings, SettingsInput } from "@/lib/api/types";
import { LIMITS, PHONE_MESSAGE, isValidEmail, isValidPhone, validateUrlField } from "@/lib/validation";

type SaveSection = (input: SettingsInput) => Promise<boolean | string>;

/** Settings document (contract §8.1): one card and one save per section. */
export function SettingsForm() {
  const { can } = useAdmin();
  const settings = useAdminQuery("settings", getSettings);
  const canWrite = can("settings:write");
  const data = settings.data;

  /** Resolves true on success, or the server's validation message for the section's Alert. */
  const save: SaveSection = async (input) => {
    try {
      const updated = await saveSettings(input);
      settings.setData(() => updated);
      toast.success("Settings updated.");
      return true;
    } catch (error) {
      if (error instanceof ApiError && error.status === 400) return errorMessage(error);
      toast.error(errorMessage(error));
      return false;
    }
  };

  return (
    <AdminPage
      module="settings"
      previewAreas={["settings"]}
      error={data ? settings.error : ""}
      onRetry={settings.reload}
      retrying={settings.loading}
    >
      {settings.initialLoading ? (
        <div className="space-y-4" aria-busy="true">
          {Array.from({ length: 3 }, (_, index) => (
            <Skeleton key={index} className="h-48 w-full rounded-xl" />
          ))}
        </div>
      ) : !data ? (
        <ErrorState
          title="Settings couldn’t be loaded"
          description={settings.error}
          onRetry={settings.reload}
          retrying={settings.loading}
        />
      ) : (
        <div className="space-y-6">
          <p className="text-sm text-slate-500">
            {data.updatedAt
              ? `Last updated ${formatDateTime(data.updatedAt)}${data.updatedBy ? ` by ${data.updatedBy.email}` : ""}.`
              : "Using the default settings. Nothing has been saved yet."}
          </p>
          {!canWrite && (
            <Alert tone="info" title="View only">
              Your role can view settings but not change them.
            </Alert>
          )}
          <BusinessSection key={JSON.stringify(data.business)} value={data.business} canWrite={canWrite} save={save} />
          <NotificationsSection
            key={JSON.stringify(data.notifications)}
            value={data.notifications}
            canWrite={canWrite}
            save={save}
          />
          <PaymentsSection key={JSON.stringify(data.payments)} value={data.payments} canWrite={canWrite} save={save} />
          <InventorySection key={JSON.stringify(data.inventory)} value={data.inventory} canWrite={canWrite} save={save} />
          <SectionCard title="Uploads" description="How images are added across the admin.">
            <p className="text-sm text-slate-700">
              <span className="font-medium">Image URLs.</span> Paste an https:// link or a site path for each image.
              File uploads aren’t available yet.
            </p>
          </SectionCard>
        </div>
      )}
    </AdminPage>
  );
}

/* ---------- Layout ---------- */

function SectionCard({
  title,
  description,
  children,
  onSubmit,
  footer,
}: {
  title: string;
  description: string;
  children: ReactNode;
  onSubmit?: (event: FormEvent<HTMLFormElement>) => void;
  footer?: ReactNode;
}) {
  const headingId = `settings-${title.toLowerCase().replace(/\W+/g, "-")}`;
  const body = (
    <>
      <div className="border-b border-slate-100 px-5 py-4 sm:px-6">
        <h2 id={headingId} className="text-base font-semibold text-slate-900">
          {title}
        </h2>
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
function useSection(save: SaveSection) {
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

const saveButton = (canWrite: boolean, saving: boolean, label: string) =>
  canWrite ? (
    <Button type="submit" loading={saving} loadingText="Saving…">
      {label}
    </Button>
  ) : undefined;

/* ---------- Business ---------- */

type SectionProps<K extends keyof SettingsInput> = { value: Settings[K]; canWrite: boolean; save: SaveSection };

type BusinessErrors = Partial<Record<"name" | "email" | "phone" | "address" | "website", string>>;

function BusinessSection({ value, canWrite, save }: SectionProps<"business">) {
  const [name, setName] = useState(value.name ?? "");
  const [email, setEmail] = useState(value.email ?? "");
  const [phone, setPhone] = useState(value.phone ?? "");
  const [address, setAddress] = useState(value.address ?? "");
  const [website, setWebsite] = useState(value.website ?? "");
  const [errors, setErrors] = useState<BusinessErrors>({});
  const section = useSection(save);

  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const found = Object.fromEntries(
      Object.entries({
        name: !name.trim()
          ? "Enter the business name."
          : name.trim().length > LIMITS.personName
            ? `Business name must be ${LIMITS.personName} characters or fewer.`
            : "",
        email: email.trim() && !isValidEmail(email) ? "Enter a valid email address." : "",
        phone: phone.trim() && !isValidPhone(phone) ? PHONE_MESSAGE : "",
        address:
          address.trim().length > LIMITS.deliveryAddress
            ? `Address must be ${LIMITS.deliveryAddress} characters or fewer.`
            : "",
        website: validateUrlField(website, "Website"),
      }).filter(([, message]) => message)
    ) as BusinessErrors;
    setErrors(found);
    if (Object.keys(found).length) return;
    section.submit({
      business: {
        name: name.trim(),
        email: email.trim() || null,
        phone: phone.trim() || null,
        address: address.trim() || null,
        website: website.trim() || null,
      },
    });
  };

  return (
    <SectionCard
      title="Business"
      description="Shown on the public site and in customer emails."
      onSubmit={onSubmit}
      footer={saveButton(canWrite, section.saving, "Save business details")}
    >
      {section.alert}
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Business name" required error={errors.name}>
          <Input value={name} disabled={!canWrite} maxLength={LIMITS.personName} onChange={(event) => setName(event.target.value)} />
        </Field>
        <Field label="Email address" error={errors.email}>
          <Input
            type="email"
            value={email}
            disabled={!canWrite}
            maxLength={LIMITS.email}
            onChange={(event) => setEmail(event.target.value)}
          />
        </Field>
        <Field label="Phone" error={errors.phone}>
          <Input
            type="tel"
            value={phone}
            disabled={!canWrite}
            maxLength={LIMITS.phoneNumber}
            onChange={(event) => setPhone(event.target.value)}
          />
        </Field>
        <Field label="Website" error={errors.website} helper="An https:// link.">
          <Input
            type="url"
            value={website}
            disabled={!canWrite}
            maxLength={LIMITS.url}
            placeholder="https://"
            onChange={(event) => setWebsite(event.target.value)}
          />
        </Field>
      </div>
      <Field label="Address" error={errors.address}>
        <Textarea
          rows={3}
          className="min-h-[88px]"
          value={address}
          disabled={!canWrite}
          maxLength={LIMITS.deliveryAddress}
          onChange={(event) => setAddress(event.target.value)}
        />
      </Field>
    </SectionCard>
  );
}

/* ---------- Notifications ---------- */

type EmailListKey = "orderEmails" | "lowStockEmails" | "vacancyEmails";

const emailLists: { key: EmailListKey; label: string; helper: string }[] = [
  { key: "orderEmails", label: "New orders", helper: "Who gets an email when an order is placed." },
  { key: "lowStockEmails", label: "Low stock", helper: "Who gets low-stock alerts." },
  { key: "vacancyEmails", label: "Vacancies", helper: "Who hears about newly posted vacancies." },
];

function NotificationsSection({ value, canWrite, save }: SectionProps<"notifications">) {
  const [lists, setLists] = useState<Record<EmailListKey, string[]>>({
    orderEmails: value.orderEmails ?? [],
    lowStockEmails: value.lowStockEmails ?? [],
    vacancyEmails: value.vacancyEmails ?? [],
  });
  const section = useSection(save);

  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    section.submit({ notifications: lists });
  };

  return (
    <SectionCard
      title="Notifications"
      description={`Email addresses for admin alerts, up to ${LIMITS.settingsEmails} per list. When a list is empty, the server’s default recipients are used.`}
      onSubmit={onSubmit}
      footer={saveButton(canWrite, section.saving, "Save notifications")}
    >
      {section.alert}
      <div className="grid gap-6 lg:grid-cols-3">
        {emailLists.map((list) => (
          <EmailListEditor
            key={list.key}
            label={list.label}
            helper={list.helper}
            emails={lists[list.key]}
            disabled={!canWrite}
            onChange={(emails) => setLists((current) => ({ ...current, [list.key]: emails }))}
          />
        ))}
      </div>
    </SectionCard>
  );
}

function EmailListEditor({
  label,
  helper,
  emails,
  disabled,
  onChange,
}: {
  label: string;
  helper: string;
  emails: string[];
  disabled: boolean;
  onChange: (emails: string[]) => void;
}) {
  const [draft, setDraft] = useState("");
  const [error, setError] = useState("");
  const full = emails.length >= LIMITS.settingsEmails;

  const add = () => {
    const email = draft.trim().toLowerCase();
    const problem = !isValidEmail(email)
      ? "Enter a valid email address."
      : emails.includes(email)
        ? "This address is already on the list."
        : full
          ? `You can add up to ${LIMITS.settingsEmails} addresses.`
          : "";
    setError(problem);
    if (problem) return;
    onChange([...emails, email]);
    setDraft("");
  };

  return (
    <fieldset className="min-w-0 space-y-3">
      <legend className="text-sm font-medium text-slate-700">{label}</legend>
      <p className="text-xs text-slate-500">{helper}</p>
      {emails.length ? (
        <ul className="divide-y divide-slate-100 rounded-lg border border-slate-200">
          {emails.map((email) => (
            <li key={email} className="flex min-w-0 items-center gap-2 py-1 pl-3 pr-1 text-sm">
              <span className="min-w-0 flex-1 truncate text-slate-700">{email}</span>
              {!disabled && (
                <Button
                  variant="ghost"
                  size="icon-sm"
                  aria-label={`Remove ${email} from ${label.toLowerCase()}`}
                  onClick={() => onChange(emails.filter((item) => item !== email))}
                >
                  <X aria-hidden="true" />
                </Button>
              )}
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-slate-400">No addresses.</p>
      )}
      {!disabled && (
        <div className="flex items-start gap-2">
          <Field label={`Add an address for ${label.toLowerCase()}`} labelClassName="sr-only" error={error} className="min-w-0 flex-1 space-y-1">
            <Input
              type="email"
              value={draft}
              maxLength={LIMITS.email}
              placeholder="name@example.com"
              disabled={full}
              onChange={(event) => setDraft(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  add();
                }
              }}
            />
          </Field>
          <Button variant="outline" icon={<Plus aria-hidden="true" />} onClick={add} disabled={full || !draft.trim()}>
            Add
          </Button>
        </div>
      )}
      <p className="text-xs tabular-nums text-slate-500">
        {emails.length}/{LIMITS.settingsEmails}
      </p>
    </fieldset>
  );
}

/* ---------- Payments ---------- */

type Provider = Settings["payments"]["provider"];

const providerOptions = [
  { value: "none", label: "None" },
  { value: "paystack", label: "Paystack" },
  { value: "flutterwave", label: "Flutterwave" },
];

function PaymentsSection({ value, canWrite, save }: SectionProps<"payments">) {
  const [gatewayEnabled, setGatewayEnabled] = useState(Boolean(value.gatewayEnabled));
  const [provider, setProvider] = useState<Provider>(value.provider ?? null);
  const section = useSection(save);

  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    section.submit({ payments: { gatewayEnabled, provider } });
  };

  return (
    <SectionCard
      title="Payments"
      description="Online card payments at checkout."
      onSubmit={onSubmit}
      footer={saveButton(canWrite, section.saving, "Save payments")}
    >
      {section.alert}
      <Switch
        checked={gatewayEnabled}
        onChange={setGatewayEnabled}
        disabled={!canWrite}
        label="Accept online payments"
        description="When off, customers place orders and pay by transfer or on delivery."
      />
      <Field label="Payment provider" className="max-w-sm">
        <Select
          value={provider ?? "none"}
          options={providerOptions}
          disabled={!canWrite}
          onChange={(event) => setProvider(event.target.value === "none" ? null : (event.target.value as Provider))}
        />
      </Field>
      {gatewayEnabled && !provider && (
        <p className="text-sm text-amber-700">Choose a provider so customers can pay online.</p>
      )}
    </SectionCard>
  );
}

/* ---------- Inventory ---------- */

function InventorySection({ value, canWrite, save }: SectionProps<"inventory">) {
  const [reorderLevel, setReorderLevel] = useState(String(value.defaultReorderLevel ?? 0));
  const [alertsEnabled, setAlertsEnabled] = useState(Boolean(value.lowStockAlertsEnabled));
  const [error, setError] = useState("");
  const section = useSection(save);

  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const level = Number(reorderLevel);
    const problem =
      reorderLevel.trim() === "" || !Number.isInteger(level) || level < 0 || level > LIMITS.stockMax
        ? "Enter a whole number of 0 or more."
        : "";
    setError(problem);
    if (problem) return;
    section.submit({ inventory: { defaultReorderLevel: level, lowStockAlertsEnabled: alertsEnabled } });
  };

  return (
    <SectionCard
      title="Inventory"
      description="Defaults for new products and stock alerts."
      onSubmit={onSubmit}
      footer={saveButton(canWrite, section.saving, "Save inventory")}
    >
      {section.alert}
      <Field
        label="Default reorder level"
        error={error}
        helper="New products start with this reorder level. Stock at or below it counts as low."
        className="max-w-sm"
      >
        <Input
          type="number"
          inputMode="numeric"
          min={0}
          step={1}
          value={reorderLevel}
          disabled={!canWrite}
          onChange={(event) => setReorderLevel(event.target.value)}
        />
      </Field>
      <Switch
        checked={alertsEnabled}
        onChange={setAlertsEnabled}
        disabled={!canWrite}
        label="Send low-stock alerts"
        description="Email the low-stock list when products run low."
      />
    </SectionCard>
  );
}
