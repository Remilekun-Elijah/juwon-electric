import Link from "next/link";
import { ArrowRight, Clock, MessageSquare, Wallet } from "lucide-react";
import SampleBadge from "@/components/storefront/SampleBadge";
import Section from "@/components/storefront/Section";
import Reveal from "@/components/storefront/motion/Reveal";
import { buttonClasses } from "@/components/ui";
import type { Package } from "@/lib/api/types";
import { formatPrice } from "@/lib/catalog";
import { cn } from "@/lib/cn";
import { packagePath } from "@/lib/packages";
import { type StoreFinancing, monthsLabel, workedExample } from "@/lib/storefront/financing";
import { contactTopicPath, storeRoutes } from "@/lib/storefront/routes";
import { storeArrowNudge, storeCard, storePress } from "@/lib/storefront/styles";

export type FinancingProps = {
  financing: StoreFinancing;
  /** The cheapest available package, used for the worked example. */
  examplePackage: Package | null;
  examplePrice: number;
};

const percent = (value: number) => `${new Intl.NumberFormat("en-NG", { maximumFractionDigits: 2 }).format(value)}%`;

/**
 * Pay in instalments (LANDING_V1 §7.11): the terms table, a worked example on the cheapest available package (deposit,
 * then flat monthly interest on the balance for each term), the note and calls to action. Render only when financing
 * is enabled. Server component.
 */
export default function Financing({ financing, examplePackage, examplePrice }: FinancingProps) {
  const example = workedExample(examplePrice, financing);
  const terms = [
    financing.depositPercent !== null && { label: "Deposit", value: `${percent(financing.depositPercent)} of the price` },
    { label: "Terms", value: financing.termsMonths.map((months) => monthsLabel(months)).join(", ") },
    financing.monthlyRatePercent !== null && { label: "Interest", value: `${percent(financing.monthlyRatePercent)} a month, flat on the balance` },
    financing.approvalTime && { label: "Approval", value: financing.approvalTime },
  ].filter((row): row is { label: string; value: string } => Boolean(row));

  return (
    <Section
      eyebrow="Financing"
      title="Spread the cost of your system"
      description="Pay a deposit, get your system installed, and pay the balance in monthly instalments."
      actions={<SampleBadge show={financing.sample} />}
    >
      <Reveal stagger staggerStep={120} className="grid gap-5 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] lg:gap-6">
        <div className={cn(storeCard, "flex flex-col p-5 sm:p-6")}>
          <div className="flex items-center gap-3">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-700">
              <Wallet aria-hidden="true" className="h-5 w-5" />
            </span>
            <h3 className="text-lg font-semibold tracking-tight text-slate-900">Our terms</h3>
          </div>
          <table className="mt-5 w-full text-left text-sm">
            <caption className="sr-only">Financing terms</caption>
            <tbody className="divide-y divide-slate-100">
              {terms.map((row) => (
                <tr key={row.label}>
                  <th scope="row" className="w-28 py-3 pr-4 align-top font-medium text-slate-500">
                    {row.label}
                  </th>
                  <td className="py-3 font-medium text-slate-900">{row.value}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {financing.note && <p className="mt-4 rounded-xl bg-slate-50 p-4 text-sm leading-relaxed text-slate-600">{financing.note}</p>}
          <div className="mt-auto flex flex-col gap-3 pt-6 sm:flex-row">
            <Link href={contactTopicPath("Financing")} className={buttonClasses({ size: "lg", className: cn("w-full sm:w-auto", storePress) })}>
              <MessageSquare aria-hidden="true" />
              Ask about financing
            </Link>
            <Link href={storeRoutes.packages} className={buttonClasses({ variant: "outline", size: "lg", className: cn("group w-full sm:w-auto", storePress) })}>
              Shop packages
              <ArrowRight aria-hidden="true" className={storeArrowNudge} />
            </Link>
          </div>
        </div>

        {example && (
          <div className={cn(storeCard, "p-5 sm:p-6")}>
            <h3 className="text-lg font-semibold tracking-tight text-slate-900">Worked example</h3>
            <p className="mt-1 text-sm leading-relaxed text-slate-600">
              For{" "}
              {examplePackage ? (
                <Link href={packagePath(examplePackage)} className="font-medium text-brand-700 hover:text-brand-800">
                  {examplePackage.name} {examplePackage.kva}kVA
                </Link>
              ) : (
                "a package"
              )}{" "}
              at <span className="font-medium tabular-nums text-slate-900">{formatPrice(example.price)}</span>
            </p>
            <dl className="mt-4 grid grid-cols-2 gap-3">
              <div className="rounded-xl bg-slate-50 p-4">
                <dt className="text-xs font-medium text-slate-500">Deposit today</dt>
                <dd className="mt-1 text-lg font-semibold tabular-nums text-slate-900">{formatPrice(example.deposit)}</dd>
              </div>
              <div className="rounded-xl bg-slate-50 p-4">
                <dt className="text-xs font-medium text-slate-500">Balance</dt>
                <dd className="mt-1 text-lg font-semibold tabular-nums text-slate-900">{formatPrice(example.balance)}</dd>
              </div>
            </dl>
            <div className="mt-4 overflow-x-auto">
              <table className="w-full min-w-[300px] text-left text-sm">
                <caption className="sr-only">Monthly instalments for each term</caption>
                <thead>
                  <tr className="border-b border-slate-200 text-xs text-slate-500">
                    <th scope="col" className="py-2 pr-3 font-medium">
                      Term
                    </th>
                    <th scope="col" className="py-2 pr-3 text-right font-medium">
                      Monthly
                    </th>
                    <th scope="col" className="py-2 text-right font-medium">
                      Total paid
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {example.plans.map((plan) => (
                    <tr key={plan.months}>
                      <th scope="row" className="py-3 pr-3 font-medium text-slate-700">
                        {monthsLabel(plan.months)}
                      </th>
                      <td className="py-3 pr-3 text-right font-semibold tabular-nums text-slate-900">{formatPrice(plan.monthly)}</td>
                      <td className="py-3 text-right tabular-nums text-slate-600">{formatPrice(plan.total)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="mt-4 flex gap-2 text-xs leading-relaxed text-slate-500">
              <Clock aria-hidden="true" className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              An illustration only. Your exact plan is confirmed after we call you and approve your application.
            </p>
          </div>
        )}
      </Reveal>
    </Section>
  );
}
