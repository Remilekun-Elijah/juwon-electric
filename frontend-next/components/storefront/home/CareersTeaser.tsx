import Link from "next/link";
import { ArrowRight, Briefcase } from "lucide-react";
import { buttonClasses } from "@/components/ui";
import type { PublicVacancy } from "@/lib/api/types";
import { cn } from "@/lib/cn";
import { storeRoutes } from "@/lib/storefront/routes";
import { storeCard, storeContainer, storeFadeUp, storeSection } from "@/lib/storefront/styles";

/** "We're hiring" strip with the open roles count and up to three role titles. Render only when there are roles. */
export default function CareersTeaser({ vacancies }: { vacancies: PublicVacancy[] }) {
  const count = vacancies.length;
  const roles = vacancies.slice(0, 3).map((vacancy) => vacancy.title);

  return (
    <section aria-labelledby="careers-teaser-heading" className={storeSection}>
      <div className={cn(storeContainer, storeFadeUp)}>
        <div className={cn(storeCard, "flex flex-col gap-6 p-5 sm:p-8 md:flex-row md:items-center md:justify-between")}>
          <div className="flex min-w-0 gap-4">
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-700">
              <Briefcase aria-hidden="true" className="h-6 w-6" />
            </span>
            <div className="min-w-0">
              <h2 id="careers-teaser-heading" className="text-xl font-semibold tracking-tight text-slate-900 sm:text-2xl">
                We’re hiring: {count} open {count === 1 ? "role" : "roles"}
              </h2>
              <p className="mt-1 text-slate-600">
                {roles.join(", ")}
                {count > roles.length ? ` and ${count - roles.length} more` : ""}.
              </p>
            </div>
          </div>
          <Link href={storeRoutes.vacancies} className={buttonClasses({ variant: "outline", size: "lg", className: "w-full shrink-0 md:w-auto" })}>
            See open roles
            <ArrowRight aria-hidden="true" />
          </Link>
        </div>
      </div>
    </section>
  );
}
