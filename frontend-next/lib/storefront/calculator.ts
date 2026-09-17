// Solar and inverter sizing formulas for /calculator (docs/agents/LANDING_V1.md §7). Pure: server and client safe.

/** Calculator settings as the storefront uses them (normalised from `settings.calculator` when enabled). */
export type StoreCalculatorAppliance = {
  key: string;
  label: string;
  watts: number;
  defaultHours: number;
  defaultQuantity: number;
};

export type StoreCalculator = {
  appliances: StoreCalculatorAppliance[];
  inverterHeadroomPercent: number;
  batteryDepthOfDischargePercent: number;
  batteryVoltage: number;
  panelWatts: number;
  peakSunHours: number;
  generator: { fuelPricePerLitre: number; litresPerKvaHour: number; maintenancePerMonth: number };
  sample: boolean;
};

/** One row the customer is sizing: a preset or a custom appliance. */
export type CalculatorRow = { key: string; label: string; watts: number; quantity: number; hours: number };

export type CalculatorResult = {
  /** Total running load in watts. */
  loadWatts: number;
  /** Recommended inverter size in kVA, rounded up to the next 0.5. */
  inverterKva: number;
  /** Daily energy in kWh. */
  dailyKwh: number;
  /** Battery capacity in kWh after depth of discharge. */
  batteryKwh: number;
  /** Battery capacity in Ah at the battery voltage. */
  batteryAh: number;
  /** Number of panels. */
  panels: number;
};

/** Inverter power factor used by the sizing formula. */
export const POWER_FACTOR = 0.8;

const finite = (value: number) => (Number.isFinite(value) ? value : 0);

/**
 * LANDING_V1 §7 formulas, exactly:
 * - load = Σ watts × quantity
 * - inverter kVA = ceil((load × (1 + headroom)) / 0.8 / 1000 × 2) / 2
 * - energy = Σ watts × quantity × hours / 1000 (kWh)
 * - battery = energy / DoD (kWh), and × 1000 / voltage (Ah)
 * - panels = ceil(energy / (panelWatts × sunHours / 1000))
 */
export function sizeSystem(rows: CalculatorRow[], settings: StoreCalculator): CalculatorResult {
  const active = rows.filter((row) => row.watts > 0 && row.quantity > 0);
  const loadWatts = active.reduce((sum, row) => sum + row.watts * row.quantity, 0);
  const dailyKwh = active.reduce((sum, row) => sum + (row.watts * row.quantity * row.hours) / 1000, 0);

  const headroom = settings.inverterHeadroomPercent / 100;
  const inverterKva = loadWatts > 0 ? Math.ceil(((loadWatts * (1 + headroom)) / POWER_FACTOR / 1000) * 2) / 2 : 0;

  const depth = settings.batteryDepthOfDischargePercent / 100;
  const batteryKwh = depth > 0 ? dailyKwh / depth : 0;
  const batteryAh = settings.batteryVoltage > 0 ? (batteryKwh * 1000) / settings.batteryVoltage : 0;

  const panelKwhPerDay = (settings.panelWatts * settings.peakSunHours) / 1000;
  const panels = dailyKwh > 0 && panelKwhPerDay > 0 ? Math.ceil(dailyKwh / panelKwhPerDay) : 0;

  return {
    loadWatts: finite(loadWatts),
    inverterKva: finite(inverterKva),
    dailyKwh: finite(dailyKwh),
    batteryKwh: finite(batteryKwh),
    batteryAh: finite(batteryAh),
    panels: finite(panels),
  };
}

/**
 * Generator running cost per month: kVA × litres per kVA-hour × hours a day × 30 × fuel price, plus maintenance.
 * `kva` is the recommended inverter size, so both options are compared at the same capacity.
 */
export function generatorMonthlyCost(kva: number, hoursPerDay: number, generator: StoreCalculator["generator"]) {
  const fuel = kva * generator.litresPerKvaHour * hoursPerDay * 30 * generator.fuelPricePerLitre;
  return finite(fuel + generator.maintenancePerMonth);
}

/** Simple payback: months of generator costs that add up to the package price. `null` when it can't be computed. */
export const paybackMonths = (packagePrice: number, monthlyGeneratorCost: number) =>
  packagePrice > 0 && monthlyGeneratorCost > 0 ? Math.ceil(packagePrice / monthlyGeneratorCost) : null;

/** Rows from the admin's appliance defaults. */
export const defaultRows = (settings: StoreCalculator): CalculatorRow[] =>
  settings.appliances.map((appliance) => ({
    key: appliance.key,
    label: appliance.label,
    watts: appliance.watts,
    quantity: appliance.defaultQuantity,
    hours: appliance.defaultHours,
  }));

/** Longest running time among the rows in use, whole hours, 1 to 24 (the generator comparison's starting value). */
export const longestHours = (rows: CalculatorRow[]) => {
  const hours = rows.filter((row) => row.quantity > 0 && row.watts > 0).map((row) => row.hours);
  return Math.min(24, Math.max(1, Math.ceil(hours.length ? Math.max(...hours) : 8)));
};

/** "1.2", "12", "0.35": up to `digits` decimals without trailing zeros, en-NG grouping. */
export const formatNumber = (value: number, digits = 1) =>
  new Intl.NumberFormat("en-NG", { maximumFractionDigits: digits }).format(finite(value));
