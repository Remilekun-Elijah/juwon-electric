import { useId } from "react";
import Link from "next/link";
import { ArrowRight, BatteryCharging, Calculator, Sun, Zap } from "lucide-react";
import Reveal from "@/components/storefront/motion/Reveal";
import { buttonClasses } from "@/components/ui";
import { cn } from "@/lib/cn";
import { storeRoutes } from "@/lib/storefront/routes";
import { storeArrowNudge, storeBody, storeCard, storeContainer, storeEyebrow, storeH2, storePress, storeSection } from "@/lib/storefront/styles";

const outputs = [
  { icon: Zap, label: "Inverter size" },
  { icon: BatteryCharging, label: "Battery capacity" },
  { icon: Sun, label: "Number of panels" },
];

/** "Size your system" teaser linking to /calculator (LANDING_V1 §7.7). Render only when the calculator is enabled. */
export default function CalculatorTeaser() {
  const headingId = useId();

  return (
    <section aria-labelledby={headingId} className={storeSection}>
      <Reveal className={storeContainer}>
        <div className={cn(storeCard, "grid gap-8 p-5 sm:p-8 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)] lg:items-center lg:p-10")}>
          <div className="min-w-0">
            <p className={storeEyebrow}>Size your system</p>
            <h2 id={headingId} className={cn(storeH2, "mt-2")}>
              Not sure what size you need?
            </h2>
            <p className={cn(storeBody, "mt-3 max-w-xl text-base leading-relaxed")}>
              Tick the appliances you want to keep running during outages and see a suggested inverter, battery and panel
              size in a minute, with packages that fit.
            </p>
            <Link href={storeRoutes.calculator} className={buttonClasses({ size: "lg", className: cn("group mt-6 w-full sm:w-auto", storePress) })}>
              <Calculator aria-hidden="true" />
              Open the load calculator
              <ArrowRight aria-hidden="true" className={storeArrowNudge} />
            </Link>
          </div>
          <Reveal as="ul" stagger delay={150} className="grid gap-3 sm:grid-cols-3 lg:grid-cols-1">
            {outputs.map(({ icon: Icon, label }) => (
              <li key={label} className="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-white text-brand-700 ring-1 ring-slate-200">
                  <Icon aria-hidden="true" className="h-5 w-5" />
                </span>
                <span className="text-sm font-medium text-slate-700">{label}</span>
              </li>
            ))}
          </Reveal>
        </div>
      </Reveal>
    </section>
  );
}
