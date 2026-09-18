import { useId } from "react";
import Link from "next/link";
import { ArrowRight, BatteryCharging, Calculator, Sun, Zap } from "lucide-react";
import BrandPanel from "@/components/storefront/BrandPanel";
import SampleBadge from "@/components/storefront/SampleBadge";
import CountUp from "@/components/storefront/motion/CountUp";
import Reveal from "@/components/storefront/motion/Reveal";
import { cn } from "@/lib/cn";
import { type StoreCalculator, defaultRows, formatNumber, sizeSystem } from "@/lib/storefront/calculator";
import { storeRoutes } from "@/lib/storefront/routes";
import { storeArrowNudge, storeContainer, storePress, storeSection } from "@/lib/storefront/styles";

export type CalculatorTeaserProps = {
  /** Enabled calculator settings: the preview sizes the default appliance list with the real formulas. */
  calculator: StoreCalculator;
};

/**
 * "Size your system" teaser linking to /calculator (LANDING_V1 §7.7) on a brand-900 panel with gold accents
 * (TEAM_AND_MOTION_V1 §7.5). The preview runs the calculator on the admin's default appliance list, so its figures come
 * from our own settings, and they count up as the panel appears. Render only when the calculator is enabled.
 */
export default function CalculatorTeaser({ calculator }: CalculatorTeaserProps) {
  const headingId = useId();
  const example = sizeSystem(defaultRows(calculator), calculator);
  const outputs = [
    { icon: Zap, label: "Inverter Capacity", value: `${formatNumber(example.inverterKva, 1)}kVA` },
    { icon: BatteryCharging, label: "Battery Capacity", value: `${formatNumber(example.batteryKwh, 1)}kWh` },
    { icon: Sun, label: "Solar Panels", value: `${formatNumber(example.panels, 0)} ${example.panels === 1 ? "Panel" : "Panels"}` },
  ];
  const hasExample = example.loadWatts > 0;

  return (
    <section aria-labelledby={headingId} className={storeSection}>
      <Reveal className={storeContainer}>
        <BrandPanel className="bg-brand-900 px-5 py-10 sm:px-10 sm:py-12 lg:px-14">
          <div aria-hidden="true" className="pointer-events-none absolute -bottom-24 -right-24 -z-10 h-72 w-72 rounded-full bg-gold-400/15 blur-3xl" />
          <div className="grid gap-10 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)] lg:items-center">
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-gold-400">Size your system</p>
              <h2 id={headingId} className="mt-2 text-2xl font-semibold tracking-tight text-white sm:text-3xl lg:text-4xl">
                Find the Right System for Your Energy Needs
              </h2>
              <p className="mt-3 max-w-xl text-base leading-relaxed text-brand-50/85">
                Select the appliances you want to power and our load calculator will estimate the inverter capacity,
                battery storage and solar panel requirements suitable for your needs.
              </p>
              <Link
                href={storeRoutes.calculator}
                className={cn(
                  "group mt-8 inline-flex h-14 w-full items-center justify-center gap-2 rounded-full bg-gold-400 px-7 text-base font-semibold text-slate-950 shadow-elev-4 transition-[background-color,translate] duration-200 hover:bg-gold-300 motion-safe:hover:-translate-y-0.5 sm:w-auto",
                  "focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-gold-300 focus-visible:ring-offset-2 focus-visible:ring-offset-brand-900",
                  storePress
                )}
              >
                <Calculator aria-hidden="true" className="h-5 w-5" />
                Calculate My Solar System
                <ArrowRight aria-hidden="true" className={cn("h-5 w-5", storeArrowNudge)} />
              </Link>
            </div>

            <div className="min-w-0 rounded-2xl border border-white/10 bg-white/5 p-5 backdrop-blur-sm sm:p-6">
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-medium text-white">{hasExample ? "Example System Recommendation" : "What you’ll get"}</p>
                <SampleBadge show={hasExample && calculator.sample} tone="brand" />
              </div>
              <Reveal as="ul" stagger delay={150} className="mt-4 grid gap-3 sm:grid-cols-3 lg:grid-cols-1">
                {outputs.map(({ icon: Icon, label, value }) => (
                  <li key={label} className="flex items-center gap-3 rounded-xl border border-white/10 bg-brand-950/40 p-4">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gold-400/15 text-gold-400 ring-1 ring-gold-400/30">
                      <Icon aria-hidden="true" className="h-5 w-5" />
                    </span>
                    <span className="flex min-w-0 flex-1 flex-col lg:flex-row lg:items-baseline lg:justify-between lg:gap-3">
                      <span className="text-sm text-brand-50/80">{label}</span>
                      {hasExample && (
                        <span className="text-2xl font-semibold tabular-nums tracking-tight text-gold-400">
                          <CountUp value={value} />
                        </span>
                      )}
                    </span>
                  </li>
                ))}
              </Reveal>
              {hasExample && <p className="mt-3 text-xs leading-relaxed text-brand-50/70">
                  This calculator provides an initial estimate only. Final system sizing and specifications will be
                  confirmed by our engineering team based on your actual energy requirements and site conditions.
                </p>}
            </div>
          </div>
        </BrandPanel>
      </Reveal>
    </section>
  );
}
