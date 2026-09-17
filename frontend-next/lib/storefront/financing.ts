// Instalment maths for the home Financing section (docs/agents/LANDING_V1.md §7). Pure: server and client safe.

/** Financing settings as the storefront uses them (normalised from `settings.financing` when enabled). */
export type StoreFinancing = {
  depositPercent: number | null;
  termsMonths: number[];
  monthlyRatePercent: number | null;
  approvalTime: string | null;
  note: string | null;
  sample: boolean;
};

export type InstalmentPlan = {
  months: number;
  /** Flat interest on the balance for the whole term. */
  interest: number;
  monthly: number;
  total: number;
};

export type WorkedExample = {
  price: number;
  deposit: number;
  balance: number;
  plans: InstalmentPlan[];
};

/**
 * Deposit up front, then equal monthly instalments. Interest is flat: balance × monthly rate × months, spread evenly.
 * Amounts are rounded up to the naira so the example never understates a payment.
 */
export function workedExample(price: number, financing: StoreFinancing): WorkedExample | null {
  if (!(price > 0) || financing.termsMonths.length === 0) return null;
  const deposit = Math.round((price * (financing.depositPercent ?? 0)) / 100);
  const balance = price - deposit;
  const rate = (financing.monthlyRatePercent ?? 0) / 100;
  const plans = financing.termsMonths
    .filter((months) => months > 0)
    .map((months) => {
      const interest = Math.round(balance * rate * months);
      const monthly = Math.ceil((balance + interest) / months);
      return { months, interest, monthly, total: deposit + monthly * months };
    });
  return plans.length ? { price, deposit, balance, plans } : null;
}

export const monthsLabel = (months: number) => `${months} ${months === 1 ? "month" : "months"}`;
