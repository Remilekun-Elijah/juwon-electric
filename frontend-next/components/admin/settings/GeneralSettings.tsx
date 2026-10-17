"use client";

import { useState, type FormEvent } from "react";
import { Plus, X } from "lucide-react";
import { Button, Field, Input, Select, Switch, Textarea } from "@/components/ui";
import type { Settings } from "@/lib/api/types";
import { LIMITS, PHONE_MESSAGE, isValidEmail, isValidPhone, validateUrlField } from "@/lib/validation";
import { SectionForm, SettingsCard, useDirty, useSection, type SectionProps } from "./settingsLayout";

/* ---------- Business ---------- */

type BusinessErrors = Partial<Record<"name" | "email" | "phone" | "address" | "website", string>>;

export function BusinessSection({ value, canWrite, save }: SectionProps<"business">) {
  const [name, setName] = useState(value.name ?? "");
  const [email, setEmail] = useState(value.email ?? "");
  const [phone, setPhone] = useState(value.phone ?? "");
  const [address, setAddress] = useState(value.address ?? "");
  const [website, setWebsite] = useState(value.website ?? "");
  const [errors, setErrors] = useState<BusinessErrors>({});
  const section = useSection(save);
  const dirty = useDirty({ name, email, phone, address, website });

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
    <SectionForm
      label="Business profile"
      dirty={dirty}
      canWrite={canWrite}
      saving={section.saving}
      alert={section.alert}
      onSubmit={onSubmit}
    >
      <SettingsCard title="Company details" description="How the business is named and where it lives online.">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Business name" required error={errors.name}>
            <Input value={name} disabled={!canWrite} maxLength={LIMITS.personName} onChange={(event) => setName(event.target.value)} />
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
      </SettingsCard>
      <SettingsCard
        title="Contact details"
        description="Shown on the contact page and in customer emails. Job applications go to this email address."
      >
        <div className="grid gap-4 sm:grid-cols-2">
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
      </SettingsCard>
    </SectionForm>
  );
}

/* ---------- Notifications ---------- */

type EmailListKey = "orderEmails" | "lowStockEmails" | "vacancyEmails";

const emailLists: { key: EmailListKey; label: string; helper: string }[] = [
  { key: "orderEmails", label: "New orders", helper: "Who gets an email when an order is placed." },
  { key: "lowStockEmails", label: "Low stock", helper: "Who gets low-stock alerts." },
  { key: "vacancyEmails", label: "Vacancies", helper: "Who hears about newly posted vacancies." },
];

export function NotificationsSection({
  value,
  canWrite,
  save,
  lowStockAlertsEnabled,
}: SectionProps<"notifications"> & { lowStockAlertsEnabled: boolean }) {
  const [lists, setLists] = useState<Record<EmailListKey, string[]>>({
    orderEmails: value.orderEmails ?? [],
    lowStockEmails: value.lowStockEmails ?? [],
    vacancyEmails: value.vacancyEmails ?? [],
  });
  const section = useSection(save);
  const dirty = useDirty(lists);

  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    section.submit({ notifications: lists });
  };

  return (
    <SectionForm
      label="Notification emails"
      dirty={dirty}
      canWrite={canWrite}
      saving={section.saving}
      alert={section.alert}
      onSubmit={onSubmit}
    >
      {emailLists.map((list) => (
        <SettingsCard
          key={list.key}
          title={list.label}
          description={
            list.key === "lowStockEmails" && !lowStockAlertsEnabled
              ? `${list.helper} Low-stock alerts are switched off in Settings → Sales → Inventory, so none are sent.`
              : list.helper
          }
        >
          <EmailListEditor
            label={list.label}
            emails={lists[list.key]}
            disabled={!canWrite}
            onChange={(emails) => setLists((current) => ({ ...current, [list.key]: emails }))}
          />
        </SettingsCard>
      ))}
    </SectionForm>
  );
}

function EmailListEditor({
  label,
  emails,
  disabled,
  onChange,
}: {
  label: string;
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
    <div className="min-w-0 space-y-3">
      {emails.length ? (
        <ul aria-label={`${label} addresses`} className="divide-y divide-slate-100 rounded-lg border border-slate-200">
          {emails.map((email) => (
            <li key={email} className="flex min-w-0 items-center gap-2 py-1 pl-3 pr-1 text-sm">
              <span className="min-w-0 flex-1 truncate text-slate-700">{email}</span>
              {!disabled && (
                <Button
                  variant="ghost"
                  size="icon-sm"
                  className="size-11 sm:size-8"
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
        <p className="text-sm text-slate-400">No addresses. The server’s default recipients are used.</p>
      )}
      {!disabled && (
        <div className="flex items-start gap-2 sm:max-w-lg">
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
    </div>
  );
}

/* ---------- Payments ---------- */

type Provider = Settings["payments"]["provider"];

const providerOptions = [
  { value: "none", label: "None" },
  { value: "paystack", label: "Paystack" },
  { value: "flutterwave", label: "Flutterwave" },
];

export function PaymentsSection({ value, canWrite, save }: SectionProps<"payments">) {
  const [gatewayEnabled, setGatewayEnabled] = useState(Boolean(value.gatewayEnabled));
  const [provider, setProvider] = useState<Provider>(value.provider ?? null);
  const section = useSection(save);
  const dirty = useDirty({ gatewayEnabled, provider });

  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    section.submit({ payments: { gatewayEnabled, provider } });
  };

  return (
    <SectionForm
      label="Payments"
      dirty={dirty}
      canWrite={canWrite}
      saving={section.saving}
      alert={section.alert}
      onSubmit={onSubmit}
    >
      <SettingsCard title="Online payments" description="Card payments at checkout.">
        <Switch
          checked={gatewayEnabled}
          onChange={setGatewayEnabled}
          disabled={!canWrite}
          label="Accept online payments"
          description="When off, customers place orders and pay by transfer or on delivery."
        />
      </SettingsCard>
      <SettingsCard title="Provider" description="The payment service that takes card payments.">
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
      </SettingsCard>
    </SectionForm>
  );
}

/* ---------- Inventory ---------- */

export function InventorySection({ value, canWrite, save }: SectionProps<"inventory">) {
  const [reorderLevel, setReorderLevel] = useState(String(value.defaultReorderLevel ?? 0));
  const [alertsEnabled, setAlertsEnabled] = useState(Boolean(value.lowStockAlertsEnabled));
  const [error, setError] = useState("");
  const section = useSection(save);
  const dirty = useDirty({ reorderLevel, alertsEnabled });

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
    <SectionForm
      label="Inventory"
      dirty={dirty}
      canWrite={canWrite}
      saving={section.saving}
      alert={section.alert}
      onSubmit={onSubmit}
    >
      <SettingsCard title="Reorder level" description="The default for new products. You can change it on each product.">
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
      </SettingsCard>
      <SettingsCard title="Low-stock alerts" description="Recipients are set in Settings → Notification emails → Low stock.">
        <Switch
          checked={alertsEnabled}
          onChange={setAlertsEnabled}
          disabled={!canWrite}
          label="Send low-stock alerts"
          description="Email the low-stock list when products run low."
        />
      </SettingsCard>
    </SectionForm>
  );
}
