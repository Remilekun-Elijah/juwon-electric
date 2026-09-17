import { useId } from "react";
import SampleBadge from "@/components/storefront/SampleBadge";
import CountUp from "@/components/storefront/motion/CountUp";
import Reveal from "@/components/storefront/motion/Reveal";
import type { WebsiteStat } from "@/lib/api/types";
import { cn } from "@/lib/cn";
import { storeContainer } from "@/lib/storefront/styles";

export type StatsBandProps = {
  /** `settings.website.stats` (up to 4). Render only when there is at least one. */
  stats: WebsiteStat[];
  sample?: boolean;
};

/** Up to four large figures in a white band under the hero (LANDING_V1 §7.2), counting up as they appear. Server component. */
export default function StatsBand({ stats, sample = false }: StatsBandProps) {
  const headingId = useId();
  const shown = stats.slice(0, 4);

  return (
    <section aria-labelledby={headingId} className="py-8 sm:py-10">
      <div className={storeContainer}>
        <div className="rounded-2xl border border-slate-200 bg-white px-5 py-6 shadow-elev-1 sm:px-8 sm:py-8">
          <div className="flex items-center justify-between gap-3">
            <h2 id={headingId} className="sr-only">
              Juwon Electric in numbers
            </h2>
            {sample && <SampleBadge className="ml-auto" />}
          </div>
          <Reveal
            as="dl"
            stagger
            className={cn(
              "grid grid-cols-2 gap-x-4 gap-y-6",
              shown.length >= 4 ? "lg:grid-cols-4" : shown.length === 3 ? "sm:grid-cols-3" : "",
              sample && "mt-3"
            )}
          >
            {shown.map((stat) => (
              <div key={`${stat.label}-${stat.value}`} className="flex min-w-0 flex-col-reverse gap-1 border-l-2 border-brand-100 pl-4">
                <dt className="text-sm leading-snug text-slate-600">{stat.label}</dt>
                <dd className="break-words text-3xl font-semibold tabular-nums tracking-tight text-slate-900 sm:text-4xl">
                  <CountUp value={stat.value} />
                </dd>
              </div>
            ))}
          </Reveal>
        </div>
      </div>
    </section>
  );
}
