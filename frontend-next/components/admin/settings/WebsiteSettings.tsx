"use client";

import { useState, type FormEvent, type ReactNode } from "react";
import { ChevronDown, ChevronUp, Plus, Trash2, X } from "lucide-react";
import { Button, Field, Input, Select, Switch, Textarea } from "@/components/ui";
import { SampleBadge } from "@/components/admin/website/shared";
import {
  WEBSITE_LIMITS,
  applianceKey,
  blankToNull,
  compactErrors,
  decimalError,
  integerError,
  lengthError,
  parseNumber,
} from "@/lib/admin/website";
import type { CalculatorAppliance, CalculatorSettings } from "@/lib/api/types";
import { LIMITS, PHONE_MESSAGE, isValidPhone } from "@/lib/validation";
import { SectionCard, saveButton, useSection, type SectionProps } from "./settingsLayout";

/* ---------- Shared bits ---------- */

let rowSequence = 0;
const nextRowId = () => {
  rowSequence += 1;
  return `row-${rowSequence}`;
};

const move = <T,>(list: T[], index: number, direction: -1 | 1) => {
  const target = index + direction;
  if (target < 0 || target >= list.length) return list;
  const next = [...list];
  [next[index], next[target]] = [next[target], next[index]];
  return next;
};

const numberText = (value: number | null | undefined) => (value === null || value === undefined ? "" : String(value));

type RowErrors<K extends string> = Record<string, Partial<Record<K, string>>>;

/** ▲ ▼ and remove buttons for an editable row. */
function RowControls({
  name,
  index,
  count,
  disabled,
  onMove,
  onRemove,
}: {
  name: string;
  index: number;
  count: number;
  disabled: boolean;
  onMove: (direction: -1 | 1) => void;
  onRemove: () => void;
}) {
  if (disabled) return null;
  return (
    <div className="flex shrink-0 items-center gap-1">
      <Button
        variant="ghost"
        size="icon-sm"
        aria-label={`Move ${name} up`}
        title="Move up"
        disabled={index === 0}
        onClick={() => onMove(-1)}
      >
        <ChevronUp aria-hidden="true" />
      </Button>
      <Button
        variant="ghost"
        size="icon-sm"
        aria-label={`Move ${name} down`}
        title="Move down"
        disabled={index === count - 1}
        onClick={() => onMove(1)}
      >
        <ChevronDown aria-hidden="true" />
      </Button>
      <Button
        variant="ghost"
        size="icon-sm"
        className="hover:bg-red-50 hover:text-red-700"
        aria-label={`Remove ${name}`}
        title="Remove"
        onClick={onRemove}
      >
        <Trash2 aria-hidden="true" />
      </Button>
    </div>
  );
}

function Group({ legend, description, children }: { legend: string; description?: string; children: ReactNode }) {
  return (
    <fieldset className="min-w-0 space-y-3">
      <legend className="text-sm font-medium text-slate-700">{legend}</legend>
      {description && <p className="text-xs text-slate-500">{description}</p>}
      {children}
    </fieldset>
  );
}

const sampleBadge = (sample: boolean | undefined) => (sample ? <SampleBadge /> : undefined);

/* ---------- Website ---------- */

type StatRow = { id: string; label: string; value: string };
type WebsiteErrors = Partial<Record<"whatsappNumber" | "businessHours", string>>;

export function WebsiteSection({ value, canWrite, save }: SectionProps<"website">) {
  const [stats, setStats] = useState<StatRow[]>(() =>
    (value.stats ?? []).map((stat) => ({ id: nextRowId(), label: stat.label, value: stat.value }))
  );
  const [whatsappNumber, setWhatsappNumber] = useState(value.whatsappNumber ?? "");
  const [businessHours, setBusinessHours] = useState(value.businessHours ?? "");
  const [errors, setErrors] = useState<WebsiteErrors>({});
  const [statErrors, setStatErrors] = useState<RowErrors<"label" | "value">>({});
  const section = useSection(save);
  const full = stats.length >= WEBSITE_LIMITS.stats;

  const updateStat = (id: string, patch: Partial<StatRow>) =>
    setStats((current) => current.map((row) => (row.id === id ? { ...row, ...patch } : row)));

  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const rowErrors: RowErrors<"label" | "value"> = {};
    stats.forEach((row) => {
      const found = compactErrors({
        label: lengthError(row.label, "Label", { min: 1, max: WEBSITE_LIMITS.statLabel }),
        value: lengthError(row.value, "Figure", { min: 1, max: WEBSITE_LIMITS.statValue }),
      });
      if (Object.keys(found).length) rowErrors[row.id] = found;
    });
    const found = compactErrors({
      whatsappNumber: whatsappNumber.trim() && !isValidPhone(whatsappNumber) ? PHONE_MESSAGE : "",
      businessHours: lengthError(businessHours, "Business hours", { max: WEBSITE_LIMITS.businessHours }),
    });
    setStatErrors(rowErrors);
    setErrors(found);
    if (Object.keys(found).length || Object.keys(rowErrors).length) return;
    section.submit({
      website: {
        stats: stats.map((row) => ({ label: row.label.trim(), value: row.value.trim() })),
        whatsappNumber: blankToNull(whatsappNumber),
        businessHours: blankToNull(businessHours),
      },
    });
  };

  return (
    <SectionCard
      title="Website"
      description="Headline figures, WhatsApp and opening hours shown on the public site."
      badge={sampleBadge(value.sample)}
      onSubmit={onSubmit}
      footer={saveButton(canWrite, section.saving, "Save website")}
    >
      {section.alert}
      <Group
        legend="Stats"
        description={`Up to ${WEBSITE_LIMITS.stats} figures for the band under the hero, e.g. “500+” installations. Only use numbers you can stand behind.`}
      >
        {stats.length ? (
          <ol className="space-y-3">
            {stats.map((row, index) => {
              const rowError = statErrors[row.id] ?? {};
              const name = row.label.trim() ? `stat “${row.label.trim()}”` : `stat ${index + 1}`;
              return (
                <li key={row.id} className="flex flex-col gap-2 rounded-lg border border-slate-200 p-3 sm:flex-row sm:items-start">
                  <div className="grid min-w-0 flex-1 gap-3 sm:grid-cols-[1fr_160px]">
                    <Field label="Label" error={rowError.label} className="min-w-0 space-y-1">
                      <Input
                        value={row.label}
                        disabled={!canWrite}
                        maxLength={WEBSITE_LIMITS.statLabel}
                        placeholder="Installations"
                        onChange={(event) => updateStat(row.id, { label: event.target.value })}
                      />
                    </Field>
                    <Field label="Figure" error={rowError.value} className="min-w-0 space-y-1">
                      <Input
                        value={row.value}
                        disabled={!canWrite}
                        maxLength={WEBSITE_LIMITS.statValue}
                        placeholder="500+"
                        onChange={(event) => updateStat(row.id, { value: event.target.value })}
                      />
                    </Field>
                  </div>
                  <div className="flex justify-end sm:pt-6">
                    <RowControls
                      name={name}
                      index={index}
                      count={stats.length}
                      disabled={!canWrite}
                      onMove={(direction) => setStats((current) => move(current, index, direction))}
                      onRemove={() => setStats((current) => current.filter((item) => item.id !== row.id))}
                    />
                  </div>
                </li>
              );
            })}
          </ol>
        ) : (
          <p className="text-sm text-slate-400">No stats. The stats band is hidden on the website.</p>
        )}
        <div className="flex flex-wrap items-center gap-3">
          {canWrite && (
            <Button
              variant="outline"
              size="sm"
              icon={<Plus aria-hidden="true" />}
              disabled={full}
              onClick={() => setStats((current) => [...current, { id: nextRowId(), label: "", value: "" }])}
            >
              Add stat
            </Button>
          )}
          <span className="text-xs tabular-nums text-slate-500">
            {stats.length}/{WEBSITE_LIMITS.stats}
          </span>
        </div>
      </Group>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field
          label="WhatsApp number"
          error={errors.whatsappNumber}
          helper="Include the country code, e.g. +234 803 000 0000. Leave empty to hide the WhatsApp button."
        >
          <Input
            type="tel"
            value={whatsappNumber}
            disabled={!canWrite}
            maxLength={LIMITS.phoneNumber}
            placeholder="+234"
            onChange={(event) => setWhatsappNumber(event.target.value)}
          />
        </Field>
        <Field
          label="Business hours"
          error={errors.businessHours}
          helper={`One line per day range. ${businessHours.trim().length}/${WEBSITE_LIMITS.businessHours}`}
        >
          <Textarea
            rows={3}
            className="min-h-[88px]"
            value={businessHours}
            disabled={!canWrite}
            maxLength={WEBSITE_LIMITS.businessHours}
            placeholder={"Mon–Fri 8am–6pm\nSat 9am–3pm"}
            onChange={(event) => setBusinessHours(event.target.value)}
          />
        </Field>
      </div>
    </SectionCard>
  );
}

/* ---------- Financing ---------- */

type FinancingErrors = Partial<Record<"depositPercent" | "monthlyRatePercent" | "approvalTime" | "note", string>>;

export function FinancingSection({ value, canWrite, save }: SectionProps<"financing">) {
  const [enabled, setEnabled] = useState(Boolean(value.enabled));
  const [depositPercent, setDepositPercent] = useState(numberText(value.depositPercent));
  const [terms, setTerms] = useState<number[]>(() => [...(value.termsMonths ?? [])].sort((a, b) => a - b));
  const [termDraft, setTermDraft] = useState("");
  const [termError, setTermError] = useState("");
  const [monthlyRatePercent, setMonthlyRatePercent] = useState(numberText(value.monthlyRatePercent));
  const [approvalTime, setApprovalTime] = useState(value.approvalTime ?? "");
  const [note, setNote] = useState(value.note ?? "");
  const [errors, setErrors] = useState<FinancingErrors>({});
  const section = useSection(save);
  const termsFull = terms.length >= WEBSITE_LIMITS.financingTerms;

  const addTerm = () => {
    const months = parseNumber(termDraft);
    const problem =
      months === null
        ? "Enter a number of months."
        : !Number.isInteger(months) || months < 1 || months > WEBSITE_LIMITS.termMonthsMax
          ? `Enter whole months from 1 to ${WEBSITE_LIMITS.termMonthsMax}.`
          : terms.includes(months)
            ? `${months} months is already a term.`
            : termsFull
              ? `You can add up to ${WEBSITE_LIMITS.financingTerms} terms.`
              : "";
    setTermError(problem);
    if (problem || months === null) return;
    setTerms((current) => [...current, months].sort((a, b) => a - b));
    setTermDraft("");
  };

  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const found = compactErrors({
      depositPercent: integerError(depositPercent, "Deposit", 0, 100, { required: false }),
      monthlyRatePercent: decimalError(monthlyRatePercent, "Monthly rate", 0, WEBSITE_LIMITS.monthlyRateMax, {
        decimals: 2,
        required: false,
      }),
      approvalTime: lengthError(approvalTime, "Approval time", { max: WEBSITE_LIMITS.approvalTime }),
      note: lengthError(note, "Note", { max: WEBSITE_LIMITS.financingNote }),
    });
    setErrors(found);
    if (Object.keys(found).length) return;
    setTermError("");
    section.submit({
      financing: {
        enabled,
        depositPercent: parseNumber(depositPercent),
        termsMonths: terms,
        monthlyRatePercent: parseNumber(monthlyRatePercent),
        approvalTime: blankToNull(approvalTime),
        note: blankToNull(note),
      },
    });
  };

  return (
    <SectionCard
      title="Financing"
      description="Pay-in-instalments terms shown on the home page. Customers still call to confirm before anything is agreed."
      badge={sampleBadge(value.sample)}
      onSubmit={onSubmit}
      footer={saveButton(canWrite, section.saving, "Save financing")}
    >
      {section.alert}
      <Switch
        checked={enabled}
        onChange={setEnabled}
        disabled={!canWrite}
        label="Show financing on the website"
        description="When off, the financing section is hidden and none of these terms are public."
      />
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Deposit (%)" error={errors.depositPercent} helper="Whole number from 0 to 100.">
          <Input
            type="number"
            inputMode="numeric"
            min={0}
            max={100}
            step={1}
            value={depositPercent}
            disabled={!canWrite}
            onChange={(event) => setDepositPercent(event.target.value)}
          />
        </Field>
        <Field
          label="Monthly rate (%)"
          error={errors.monthlyRatePercent}
          helper={`From 0 to ${WEBSITE_LIMITS.monthlyRateMax}, up to 2 decimal places.`}
        >
          <Input
            type="number"
            inputMode="decimal"
            min={0}
            max={WEBSITE_LIMITS.monthlyRateMax}
            step={0.01}
            value={monthlyRatePercent}
            disabled={!canWrite}
            onChange={(event) => setMonthlyRatePercent(event.target.value)}
          />
        </Field>
      </div>
      <Group
        legend="Terms (months)"
        description={`Up to ${WEBSITE_LIMITS.financingTerms} repayment periods, from 1 to ${WEBSITE_LIMITS.termMonthsMax} months. Shown shortest first.`}
      >
        {terms.length ? (
          <ul className="flex flex-wrap gap-2" aria-label="Terms">
            {terms.map((months) => (
              <li
                key={months}
                className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-slate-50 py-0.5 pl-3 pr-1 text-sm text-slate-700"
              >
                <span className="tabular-nums">{months} months</span>
                {canWrite && (
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    className="size-7 rounded-full"
                    aria-label={`Remove the ${months}-month term`}
                    onClick={() => setTerms((current) => current.filter((item) => item !== months))}
                  >
                    <X aria-hidden="true" />
                  </Button>
                )}
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-slate-400">No terms.</p>
        )}
        {canWrite && (
          <div className="flex items-start gap-2">
            <Field label="Add a term in months" labelClassName="sr-only" error={termError} className="w-40 space-y-1">
              <Input
                type="number"
                inputMode="numeric"
                min={1}
                max={WEBSITE_LIMITS.termMonthsMax}
                step={1}
                value={termDraft}
                placeholder="Months"
                disabled={termsFull}
                onChange={(event) => setTermDraft(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault();
                    addTerm();
                  }
                }}
              />
            </Field>
            <Button variant="outline" icon={<Plus aria-hidden="true" />} onClick={addTerm} disabled={termsFull || !termDraft.trim()}>
              Add
            </Button>
          </div>
        )}
        <p className="text-xs tabular-nums text-slate-500">
          {terms.length}/{WEBSITE_LIMITS.financingTerms}
        </p>
      </Group>
      <Field label="Approval time" error={errors.approvalTime} helper="How long a decision usually takes." className="sm:max-w-sm">
        <Input
          value={approvalTime}
          disabled={!canWrite}
          maxLength={WEBSITE_LIMITS.approvalTime}
          placeholder="24–48 hours"
          onChange={(event) => setApprovalTime(event.target.value)}
        />
      </Field>
      <Field
        label="Note"
        error={errors.note}
        helper={`Conditions customers should know, shown under the terms. ${note.trim().length}/${WEBSITE_LIMITS.financingNote}`}
      >
        <Textarea
          rows={3}
          className="min-h-[88px]"
          value={note}
          disabled={!canWrite}
          maxLength={WEBSITE_LIMITS.financingNote}
          onChange={(event) => setNote(event.target.value)}
        />
      </Field>
    </SectionCard>
  );
}

/* ---------- Calculator ---------- */

type ApplianceRow = {
  id: string;
  /** Existing key; new rows get one from the label when saved. */
  key: string | null;
  label: string;
  watts: string;
  defaultHours: string;
  defaultQuantity: string;
};
type ApplianceField = "label" | "watts" | "defaultHours" | "defaultQuantity";

type ParameterKey =
  | "inverterHeadroomPercent"
  | "batteryDepthOfDischargePercent"
  | "panelWatts"
  | "peakSunHours"
  | "fuelPricePerLitre"
  | "litresPerKvaHour"
  | "maintenancePerMonth";

const voltageOptions = [
  { value: "12", label: "12 V" },
  { value: "24", label: "24 V" },
  { value: "48", label: "48 V" },
];

const toRow = (appliance: CalculatorAppliance): ApplianceRow => ({
  id: nextRowId(),
  key: appliance.key,
  label: appliance.label,
  watts: String(appliance.watts),
  defaultHours: String(appliance.defaultHours),
  defaultQuantity: String(appliance.defaultQuantity),
});

export function CalculatorSection({ value, canWrite, save }: SectionProps<"calculator">) {
  const [enabled, setEnabled] = useState(Boolean(value.enabled));
  const [appliances, setAppliances] = useState<ApplianceRow[]>(() => (value.appliances ?? []).map(toRow));
  const [params, setParams] = useState<Record<ParameterKey, string>>({
    inverterHeadroomPercent: numberText(value.inverterHeadroomPercent),
    batteryDepthOfDischargePercent: numberText(value.batteryDepthOfDischargePercent),
    panelWatts: numberText(value.panelWatts),
    peakSunHours: numberText(value.peakSunHours),
    fuelPricePerLitre: numberText(value.generator?.fuelPricePerLitre),
    litresPerKvaHour: numberText(value.generator?.litresPerKvaHour),
    maintenancePerMonth: numberText(value.generator?.maintenancePerMonth),
  });
  const [batteryVoltage, setBatteryVoltage] = useState<CalculatorSettings["batteryVoltage"]>(value.batteryVoltage ?? 48);
  const [errors, setErrors] = useState<Partial<Record<ParameterKey, string>>>({});
  const [rowErrors, setRowErrors] = useState<RowErrors<ApplianceField>>({});
  const section = useSection(save);
  const full = appliances.length >= WEBSITE_LIMITS.appliances;

  const setParam = (key: ParameterKey) => (event: { target: { value: string } }) =>
    setParams((current) => ({ ...current, [key]: event.target.value }));

  const updateRow = (id: string, patch: Partial<ApplianceRow>) =>
    setAppliances((current) => current.map((row) => (row.id === id ? { ...row, ...patch } : row)));

  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const foundRows: RowErrors<ApplianceField> = {};
    appliances.forEach((row) => {
      const found = compactErrors({
        label: lengthError(row.label, "Label", { min: 1, max: WEBSITE_LIMITS.applianceLabel }),
        watts: integerError(row.watts, "Watts", 1, WEBSITE_LIMITS.applianceWattsMax),
        defaultHours: decimalError(row.defaultHours, "Hours", 0, 24, { decimals: 1, step: 0.5 }),
        defaultQuantity: integerError(row.defaultQuantity, "Quantity", 0, WEBSITE_LIMITS.applianceQuantityMax),
      });
      if (Object.keys(found).length) foundRows[row.id] = found;
    });
    const found = compactErrors({
      inverterHeadroomPercent: integerError(params.inverterHeadroomPercent, "Inverter headroom", 0, 100),
      batteryDepthOfDischargePercent: integerError(params.batteryDepthOfDischargePercent, "Depth of discharge", 10, 100),
      panelWatts: integerError(params.panelWatts, "Panel watts", 100, 1000),
      peakSunHours: decimalError(params.peakSunHours, "Peak sun hours", 1, 10, { decimals: 1 }),
      fuelPricePerLitre: integerError(params.fuelPricePerLitre, "Fuel price", 0, WEBSITE_LIMITS.fuelPriceMax),
      litresPerKvaHour: decimalError(params.litresPerKvaHour, "Litres per kVA-hour", 0, WEBSITE_LIMITS.litresPerKvaHourMax, {
        decimals: 2,
      }),
      maintenancePerMonth: integerError(params.maintenancePerMonth, "Maintenance", 0, WEBSITE_LIMITS.maintenanceMax),
    });
    setRowErrors(foundRows);
    setErrors(found);
    if (Object.keys(found).length || Object.keys(foundRows).length) return;

    const taken = new Set(appliances.map((row) => row.key).filter((key): key is string => Boolean(key)));
    const keyed = appliances.map((row) => {
      if (row.key) return row;
      const key = applianceKey(row.label, taken);
      taken.add(key);
      return { ...row, key };
    });
    const number = (key: ParameterKey) => Number(params[key]);
    section.submit({
      calculator: {
        enabled,
        appliances: keyed.map((row) => ({
          key: row.key as string,
          label: row.label.trim(),
          watts: Number(row.watts),
          defaultHours: Number(row.defaultHours),
          defaultQuantity: Number(row.defaultQuantity),
        })),
        inverterHeadroomPercent: number("inverterHeadroomPercent"),
        batteryDepthOfDischargePercent: number("batteryDepthOfDischargePercent"),
        batteryVoltage,
        panelWatts: number("panelWatts"),
        peakSunHours: number("peakSunHours"),
        generator: {
          fuelPricePerLitre: number("fuelPricePerLitre"),
          litresPerKvaHour: number("litresPerKvaHour"),
          maintenancePerMonth: number("maintenancePerMonth"),
        },
      },
    });
  };

  const numberField = (
    key: ParameterKey,
    label: string,
    helper: string,
    input: { min: number; max: number; step: number; decimal?: boolean }
  ) => (
    <Field label={label} error={errors[key]} helper={helper}>
      <Input
        type="number"
        inputMode={input.decimal ? "decimal" : "numeric"}
        min={input.min}
        max={input.max}
        step={input.step}
        value={params[key]}
        disabled={!canWrite}
        onChange={setParam(key)}
      />
    </Field>
  );

  return (
    <SectionCard
      title="Calculator"
      description="The appliances and assumptions behind the “Size your system” calculator. Results are estimates; an engineer confirms the size."
      badge={sampleBadge(value.sample)}
      onSubmit={onSubmit}
      footer={saveButton(canWrite, section.saving, "Save calculator")}
    >
      {section.alert}
      <Switch
        checked={enabled}
        onChange={setEnabled}
        disabled={!canWrite}
        label="Show the calculator on the website"
        description="When off, the calculator page and its home page teaser are hidden."
      />

      <Group
        legend="Appliances"
        description={`Up to ${WEBSITE_LIMITS.appliances}. Customers start from these defaults and can change them. Hours go in steps of 0.5.`}
      >
        {appliances.length ? (
          <ol className="space-y-3">
            {appliances.map((row, index) => {
              const rowError = rowErrors[row.id] ?? {};
              const name = row.label.trim() ? `“${row.label.trim()}”` : `appliance ${index + 1}`;
              return (
                <li key={row.id} className="rounded-lg border border-slate-200 p-3">
                  <div className="flex flex-col gap-2 lg:flex-row lg:items-start">
                    <div className="grid min-w-0 flex-1 grid-cols-2 gap-3 sm:grid-cols-[minmax(0,1fr)_110px_110px_110px]">
                      <Field label="Appliance" error={rowError.label} className="col-span-2 min-w-0 space-y-1 sm:col-span-1">
                        <Input
                          value={row.label}
                          disabled={!canWrite}
                          maxLength={WEBSITE_LIMITS.applianceLabel}
                          placeholder="Standing fan"
                          onChange={(event) => updateRow(row.id, { label: event.target.value })}
                        />
                      </Field>
                      <Field label="Watts" error={rowError.watts} className="min-w-0 space-y-1">
                        <Input
                          type="number"
                          inputMode="numeric"
                          min={1}
                          max={WEBSITE_LIMITS.applianceWattsMax}
                          step={1}
                          value={row.watts}
                          disabled={!canWrite}
                          onChange={(event) => updateRow(row.id, { watts: event.target.value })}
                        />
                      </Field>
                      <Field label="Hours a day" error={rowError.defaultHours} className="min-w-0 space-y-1">
                        <Input
                          type="number"
                          inputMode="decimal"
                          min={0}
                          max={24}
                          step={0.5}
                          value={row.defaultHours}
                          disabled={!canWrite}
                          onChange={(event) => updateRow(row.id, { defaultHours: event.target.value })}
                        />
                      </Field>
                      <Field label="Quantity" error={rowError.defaultQuantity} className="min-w-0 space-y-1">
                        <Input
                          type="number"
                          inputMode="numeric"
                          min={0}
                          max={WEBSITE_LIMITS.applianceQuantityMax}
                          step={1}
                          value={row.defaultQuantity}
                          disabled={!canWrite}
                          onChange={(event) => updateRow(row.id, { defaultQuantity: event.target.value })}
                        />
                      </Field>
                    </div>
                    <div className="flex justify-end lg:pt-6">
                      <RowControls
                        name={name}
                        index={index}
                        count={appliances.length}
                        disabled={!canWrite}
                        onMove={(direction) => setAppliances((current) => move(current, index, direction))}
                        onRemove={() => setAppliances((current) => current.filter((item) => item.id !== row.id))}
                      />
                    </div>
                  </div>
                </li>
              );
            })}
          </ol>
        ) : (
          <p className="text-sm text-slate-400">No appliances. Customers can still add their own.</p>
        )}
        <div className="flex flex-wrap items-center gap-3">
          {canWrite && (
            <Button
              variant="outline"
              size="sm"
              icon={<Plus aria-hidden="true" />}
              disabled={full}
              onClick={() =>
                setAppliances((current) => [
                  ...current,
                  { id: nextRowId(), key: null, label: "", watts: "", defaultHours: "0", defaultQuantity: "0" },
                ])
              }
            >
              Add appliance
            </Button>
          )}
          <span className="text-xs tabular-nums text-slate-500">
            {appliances.length}/{WEBSITE_LIMITS.appliances}
          </span>
        </div>
      </Group>

      <Group legend="Sizing assumptions">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {numberField("inverterHeadroomPercent", "Inverter headroom (%)", "Extra capacity above the load. 0–100.", {
            min: 0,
            max: 100,
            step: 1,
          })}
          {numberField(
            "batteryDepthOfDischargePercent",
            "Battery depth of discharge (%)",
            "How much of the battery is used. 10–100.",
            { min: 10, max: 100, step: 1 }
          )}
          <Field label="Battery voltage" helper="System battery bank voltage.">
            <Select
              value={String(batteryVoltage)}
              options={voltageOptions}
              disabled={!canWrite}
              onChange={(event) => setBatteryVoltage(Number(event.target.value) as CalculatorSettings["batteryVoltage"])}
            />
          </Field>
          {numberField("panelWatts", "Panel watts (W)", "Rating of one solar panel. 100–1000.", {
            min: 100,
            max: 1000,
            step: 1,
          })}
          {numberField("peakSunHours", "Peak sun hours", "Average a day. 1–10, one decimal place.", {
            min: 1,
            max: 10,
            step: 0.1,
            decimal: true,
          })}
        </div>
      </Group>

      <Group legend="Generator costs" description="Used to compare running a generator with a solar or inverter system.">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {numberField("fuelPricePerLitre", "Fuel price per litre (₦)", "Whole naira, 0–100,000.", {
            min: 0,
            max: WEBSITE_LIMITS.fuelPriceMax,
            step: 1,
          })}
          {numberField("litresPerKvaHour", "Litres per kVA-hour", "0–2, up to 2 decimal places.", {
            min: 0,
            max: WEBSITE_LIMITS.litresPerKvaHourMax,
            step: 0.01,
            decimal: true,
          })}
          {numberField("maintenancePerMonth", "Maintenance per month (₦)", "Whole naira, 0–10,000,000.", {
            min: 0,
            max: WEBSITE_LIMITS.maintenanceMax,
            step: 1,
          })}
        </div>
      </Group>
    </SectionCard>
  );
}
