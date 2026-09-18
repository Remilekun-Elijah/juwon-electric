"use client";

import { useId, useMemo, useState, type FormEvent } from "react";
import Link from "next/link";
import { ArrowRight, BatteryCharging, Fuel, Minus, Phone, Plus, RotateCcw, Sun, Trash2, Zap } from "lucide-react";
import SampleBadge from "@/components/storefront/SampleBadge";
import AnimatedNumber from "@/components/storefront/motion/AnimatedNumber";
import Reveal from "@/components/storefront/motion/Reveal";
import { Button, Field, Input, buttonClasses } from "@/components/ui";
import { formatPrice } from "@/lib/catalog";
import { cn } from "@/lib/cn";
import {
  type CalculatorRow,
  type StoreCalculator,
  defaultRows,
  formatNumber,
  generatorMonthlyCost,
  longestHours,
  paybackMonths,
  sizeSystem,
} from "@/lib/storefront/calculator";
import { contactTopicPath, telHref } from "@/lib/storefront/routes";
import { storeCard, storeFocus, storePress } from "@/lib/storefront/styles";

/** A package the calculator can suggest: only what the island needs. */
/** `categoryLabel` is the package's catalogue category (Commerce v3 §4), falling back to its stored battery type. */
export type CalculatorPackage = { id: string; name: string; kva: number; price: number; href: string; categoryLabel: string };

export type LoadCalculatorProps = {
  settings: StoreCalculator;
  /** Available packages with a price and kVA. */
  packages: CalculatorPackage[];
  /** Primary business phone for "Talk to an engineer". */
  phone: string;
};

const MAX_QUANTITY = 20;
const MAX_HOURS = 24;
const MAX_CUSTOM_WATTS = 10000;
const MAX_CUSTOM_ROWS = 10;

function Stepper({
  value,
  min,
  max,
  step,
  onChange,
  label,
  unit,
}: {
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (value: number) => void;
  label: string;
  unit?: string;
}) {
  const button = cn(
    "grid h-11 w-11 place-items-center text-slate-700 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:text-slate-300 disabled:hover:bg-transparent sm:h-10 sm:w-10",
    storeFocus,
    "focus-visible:ring-offset-0"
  );
  const name = label.charAt(0).toLowerCase() + label.slice(1);
  const clamp = (next: number) => Math.min(max, Math.max(min, Math.round(next / step) * step));
  return (
    <div role="group" aria-label={label} className="inline-flex items-center overflow-hidden rounded-lg border border-slate-200 bg-white shadow-xs">
      <button type="button" className={button} disabled={value <= min} onClick={() => onChange(clamp(value - step))} aria-label={`Decrease ${name}`}>
        <Minus aria-hidden="true" className="h-4 w-4" />
      </button>
      <output className="grid h-11 min-w-14 place-items-center border-x border-slate-200 px-1.5 text-sm font-semibold tabular-nums text-slate-900 sm:h-10">
        {formatNumber(value, 1)}
        {unit && <span className="sr-only"> {unit}</span>}
      </output>
      <button type="button" className={button} disabled={value >= max} onClick={() => onChange(clamp(value + step))} aria-label={`Increase ${name}`}>
        <Plus aria-hidden="true" className="h-4 w-4" />
      </button>
    </div>
  );
}

/** Result figure that tweens to each new value (TEAM_AND_MOTION_V1 §5.9): `digits` decimals plus a unit. */
type ResultValue = { amount: number; digits: number; unit?: string };

const formatResult = ({ digits, unit = "" }: ResultValue) => (amount: number) => `${formatNumber(amount, digits)}${unit}`;

function Result({ icon: Icon, label, value, detail }: { icon: typeof Zap; label: string; value: ResultValue; detail?: string }) {
  return (
    <div className="flex gap-3 rounded-xl bg-slate-50 p-4">
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-white text-brand-700 ring-1 ring-slate-200">
        <Icon aria-hidden="true" className="h-5 w-5" />
      </span>
      <div className="min-w-0">
        <dt className="text-xs font-medium text-slate-500">{label}</dt>
        <dd className="mt-0.5 text-lg font-semibold tabular-nums tracking-tight text-slate-900">
          <AnimatedNumber value={value.amount} format={formatResult(value)} />
        </dd>
        {detail && <dd className="text-xs text-slate-500">{detail}</dd>}
      </div>
    </div>
  );
}

/**
 * /calculator island (LANDING_V1 §7): appliance rows from the admin defaults plus custom appliances, live sizing,
 * matching packages, a generator running-cost comparison and a disclaimer. Nothing is stored or sent anywhere.
 */
export default function LoadCalculator({ settings, packages, phone }: LoadCalculatorProps) {
  const formId = useId();
  const [rows, setRows] = useState<CalculatorRow[]>(() => defaultRows(settings));
  const [customLabel, setCustomLabel] = useState("");
  const [customWatts, setCustomWatts] = useState("");
  const [customError, setCustomError] = useState<{ field: "label" | "watts"; message: string } | null>(null);
  const [generatorHours, setGeneratorHours] = useState<number | null>(null);

  const result = useMemo(() => sizeSystem(rows, settings), [rows, settings]);
  const matches = useMemo(
    () =>
      result.inverterKva > 0
        ? packages
            .filter((pkg) => pkg.kva >= result.inverterKva)
            .sort((a, b) => a.price - b.price)
            .slice(0, 3)
        : [],
    [packages, result.inverterKva]
  );

  const hours = generatorHours ?? longestHours(rows);
  const { generator } = settings;
  const generatorConfigured = generator.fuelPricePerLitre > 0 && generator.litresPerKvaHour > 0;
  const monthlyGenerator = generatorMonthlyCost(result.inverterKva, hours, generator);
  const cheapest = matches[0] ?? null;
  const payback = cheapest ? paybackMonths(cheapest.price, monthlyGenerator) : null;

  const customCount = rows.filter((row) => row.key.startsWith("custom-")).length;
  const updateRow = (key: string, patch: Partial<CalculatorRow>) => setRows((current) => current.map((row) => (row.key === key ? { ...row, ...patch } : row)));

  const addCustom = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const label = customLabel.trim();
    const watts = Math.round(Number(customWatts));
    if (!label) return setCustomError({ field: "label", message: "Enter the appliance name." });
    if (customCount >= MAX_CUSTOM_ROWS) return setCustomError({ field: "label", message: `You can add up to ${MAX_CUSTOM_ROWS} appliances of your own.` });
    if (!customWatts || !Number.isFinite(watts) || watts < 1 || watts > MAX_CUSTOM_WATTS) {
      return setCustomError({ field: "watts", message: `Enter watts between 1 and ${formatNumber(MAX_CUSTOM_WATTS)}.` });
    }
    setRows((current) => [...current, { key: `custom-${Date.now()}`, label, watts, quantity: 1, hours: 4 }]);
    setCustomLabel("");
    setCustomWatts("");
    setCustomError(null);
  };

  const reset = () => {
    setRows(defaultRows(settings));
    setGeneratorHours(null);
    setCustomError(null);
  };

  const hasLoad = result.loadWatts > 0;

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_380px] lg:items-start xl:grid-cols-[minmax(0,1fr)_420px]">
      <div className="min-w-0 space-y-6">
        <section aria-labelledby={`${formId}-appliances`} className={cn(storeCard, "p-4 sm:p-6")}>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 id={`${formId}-appliances`} className="text-lg font-semibold tracking-tight text-slate-900">
                Your appliances
              </h2>
              <p className="mt-1 text-sm text-slate-500">Set how many you have and how many hours a day each runs during an outage.</p>
            </div>
            <Button variant="ghost" size="sm" onClick={reset} icon={<RotateCcw aria-hidden="true" />}>
              Reset
            </Button>
          </div>

          {rows.length > 0 ? (
            <>
              <div aria-hidden="true" className="mt-4 hidden grid-cols-[minmax(0,1fr)_9rem_9rem] gap-4 text-xs font-medium text-slate-500 sm:grid">
                <span>Appliance</span>
                <span>Quantity</span>
                <span>Hours a day</span>
              </div>
              <ul className="mt-2 divide-y divide-slate-100 border-y border-slate-100 sm:mt-2">
                {rows.map((row) => (
                  <li key={row.key} className="grid gap-3 py-4 sm:grid-cols-[minmax(0,1fr)_9rem_9rem] sm:items-center sm:gap-4">
                    <div className="flex min-w-0 items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className={cn("break-words font-medium", row.quantity > 0 ? "text-slate-900" : "text-slate-500")}>{row.label}</p>
                        <p className="text-sm tabular-nums text-slate-500">{formatNumber(row.watts, 0)}W each</p>
                      </div>
                      {row.key.startsWith("custom-") && (
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          onClick={() => setRows((current) => current.filter((item) => item.key !== row.key))}
                          aria-label={`Remove ${row.label}`}
                        >
                          <Trash2 aria-hidden="true" className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                    <div className="flex items-center justify-between gap-3 sm:block">
                      <span aria-hidden="true" className="text-sm text-slate-500 sm:hidden">
                        Quantity
                      </span>
                      <Stepper value={row.quantity} min={0} max={MAX_QUANTITY} step={1} onChange={(quantity) => updateRow(row.key, { quantity })} label={`Quantity of ${row.label}`} />
                    </div>
                    <div className="flex items-center justify-between gap-3 sm:block">
                      <span aria-hidden="true" className="text-sm text-slate-500 sm:hidden">
                        Hours a day
                      </span>
                      <Stepper value={row.hours} min={0} max={MAX_HOURS} step={0.5} onChange={(value) => updateRow(row.key, { hours: value })} label={`Hours a day for ${row.label}`} unit="hours" />
                    </div>
                  </li>
                ))}
              </ul>
            </>
          ) : (
            <p className="mt-4 rounded-xl bg-slate-50 p-4 text-sm text-slate-600">Add the appliances you want to power below.</p>
          )}

          <form onSubmit={addCustom} noValidate className="mt-6 rounded-xl border border-dashed border-slate-300 p-4">
            <h3 className="text-sm font-semibold text-slate-900">Add appliance</h3>
            <div className="mt-3 grid gap-3 sm:grid-cols-[minmax(0,1fr)_140px_auto] sm:items-end">
              <Field label="Name" error={customError?.field === "label" ? customError.message : undefined}>
                <Input value={customLabel} onChange={(event) => setCustomLabel(event.target.value)} maxLength={40} placeholder="e.g. Water dispenser" size="lg" />
              </Field>
              <Field label="Watts" error={customError?.field === "watts" ? customError.message : undefined}>
                <Input
                  value={customWatts}
                  onChange={(event) => setCustomWatts(event.target.value.replace(/[^\d]/g, ""))}
                  inputMode="numeric"
                  placeholder="e.g. 500"
                  size="lg"
                />
              </Field>
              <Button type="submit" variant="outline" size="lg" icon={<Plus aria-hidden="true" />}>
                Add
              </Button>
            </div>
            <p className="mt-2 text-xs text-slate-500">You’ll find the wattage on the appliance label or in its manual.</p>
          </form>
        </section>
      </div>

      <Reveal className="min-w-0 space-y-6 lg:sticky lg:top-24">
        <section aria-labelledby={`${formId}-results`} className={cn(storeCard, "p-4 sm:p-6")}>
          <div className="flex items-center justify-between gap-3">
            <h2 id={`${formId}-results`} className="text-lg font-semibold tracking-tight text-slate-900">
              Suggested system
            </h2>
            <SampleBadge show={settings.sample} />
          </div>
          <div aria-live="polite">
            {hasLoad ? (
              <dl className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
                <Result icon={Zap} label="Total load" value={{ amount: result.loadWatts, digits: 0, unit: "W" }} />
                <Result icon={Zap} label="Inverter" value={{ amount: result.inverterKva, digits: 1, unit: "kVA" }} detail={`Includes ${settings.inverterHeadroomPercent}% headroom`} />
                <Result icon={Sun} label="Daily energy" value={{ amount: result.dailyKwh, digits: 2, unit: "kWh" }} />
                <Result
                  icon={BatteryCharging}
                  label="Battery"
                  value={{ amount: result.batteryKwh, digits: 2, unit: "kWh" }}
                  detail={`About ${formatNumber(Math.ceil(result.batteryAh), 0)}Ah at ${settings.batteryVoltage}V`}
                />
                <Result icon={Sun} label="Solar panels" value={{ amount: result.panels, digits: 0 }} detail={`${settings.panelWatts}W panels, ${formatNumber(settings.peakSunHours, 1)} sun hours`} />
              </dl>
            ) : (
              <p className="mt-4 rounded-xl bg-slate-50 p-4 text-sm text-slate-600">Add at least one appliance to see a suggested size.</p>
            )}
          </div>
          <p className="mt-4 text-xs leading-relaxed text-slate-500">
            Estimates only — an engineer confirms your size before installation.
          </p>
        </section>

        {hasLoad && (
          <section aria-labelledby={`${formId}-packages`} className={cn(storeCard, "p-4 sm:p-6")}>
            <h2 id={`${formId}-packages`} className="text-lg font-semibold tracking-tight text-slate-900">
              Packages that fit
            </h2>
            {matches.length > 0 ? (
              <ul className="mt-4 space-y-3">
                {matches.map((pkg) => (
                  <li key={pkg.id}>
                    <Link
                      href={pkg.href}
                      className={cn("group flex items-center justify-between gap-3 rounded-xl border border-slate-200 p-4 transition-colors hover:border-brand-200 hover:bg-brand-50/40", storeFocus)}
                    >
                      <span className="min-w-0">
                        <span className="block font-medium text-slate-900 group-hover:text-brand-700">
                          {pkg.name} {formatNumber(pkg.kva, 1)}kVA
                        </span>
                        <span className="block text-sm text-slate-500">
                          {pkg.categoryLabel} · from <span className="font-medium tabular-nums text-slate-700">{formatPrice(pkg.price)}</span>
                        </span>
                      </span>
                      <ArrowRight aria-hidden="true" className="h-4 w-4 shrink-0 text-slate-400 group-hover:text-brand-700" />
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-4 rounded-xl bg-slate-50 p-4 text-sm text-slate-600">
                None of our listed packages is large enough for this load. An engineer can design a bigger system for you.
              </p>
            )}
          </section>
        )}

        {hasLoad && generatorConfigured && (
          <section aria-labelledby={`${formId}-generator`} className={cn(storeCard, "p-4 sm:p-6")}>
            <div className="flex items-center justify-between gap-3">
              <h2 id={`${formId}-generator`} className="flex items-center gap-2 text-lg font-semibold tracking-tight text-slate-900">
                <Fuel aria-hidden="true" className="h-5 w-5 text-brand-700" />
                Compared with a generator
              </h2>
              <SampleBadge show={settings.sample} />
            </div>
            <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
              <span className="text-sm text-slate-600">Generator hours a day</span>
              <Stepper value={hours} min={1} max={MAX_HOURS} step={1} onChange={setGeneratorHours} label="Generator hours a day" unit="hours" />
            </div>
            <dl className="mt-4 divide-y divide-slate-100 text-sm" aria-live="polite">
              <div className="flex justify-between gap-3 py-2.5">
                <dt className="text-slate-600">
                  Fuel and maintenance for a {formatNumber(result.inverterKva, 1)}kVA generator
                </dt>
                <dd className="shrink-0 font-semibold tabular-nums text-slate-900">
                  <AnimatedNumber value={Math.round(monthlyGenerator)} format={(amount) => `${formatPrice(Math.round(amount))}/month`} />
                </dd>
              </div>
              {cheapest && (
                <div className="flex justify-between gap-3 py-2.5">
                  <dt className="text-slate-600">Cheapest package that fits</dt>
                  <dd className="shrink-0 font-semibold tabular-nums text-slate-900">{formatPrice(cheapest.price)}</dd>
                </div>
              )}
              {payback && (
                <div className="flex justify-between gap-3 py-2.5">
                  <dt className="text-slate-600">Pays for itself in about</dt>
                  <dd className="shrink-0 font-semibold tabular-nums text-brand-700">
                    {payback} {payback === 1 ? "month" : "months"}
                  </dd>
                </div>
              )}
            </dl>
            <p className="mt-3 text-xs leading-relaxed text-slate-500">
              Based on fuel at {formatPrice(generator.fuelPricePerLitre)} a litre, {formatNumber(generator.litresPerKvaHour, 2)} litres per kVA each hour
              {generator.maintenancePerMonth > 0 ? ` and ${formatPrice(generator.maintenancePerMonth)} a month for servicing` : ""}. Fuel prices change.
            </p>
          </section>
        )}

        <div className={cn(storeCard, "p-4 sm:p-6")}>
          <h2 className="text-lg font-semibold tracking-tight text-slate-900">Talk to an engineer</h2>
          <p className="mt-1 text-sm leading-relaxed text-slate-600">We’ll check your appliances, confirm the size and recommend the right package. Nothing you enter here is saved.</p>
          <div className="mt-4 flex flex-col gap-3 sm:flex-row lg:flex-col xl:flex-row">
            {phone && (
              <a href={telHref(phone)} className={buttonClasses({ size: "lg", className: cn("w-full sm:flex-1", storePress) })}>
                <Phone aria-hidden="true" />
                <span className="tabular-nums">Call {phone}</span>
              </a>
            )}
            <Link
              href={contactTopicPath(hasLoad ? `Sizing: about ${formatNumber(result.inverterKva, 1)}kVA, ${formatNumber(result.dailyKwh, 1)}kWh a day` : "Help sizing a system")}
              className={buttonClasses({ variant: "outline", size: "lg", className: "w-full sm:flex-1" })}
            >
              Send a message
            </Link>
          </div>
        </div>
      </Reveal>
    </div>
  );
}
