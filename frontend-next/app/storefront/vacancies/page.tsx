import type { Metadata } from "next";
import Link from "next/link";
import { Briefcase, Filter } from "lucide-react";
import PageIntro from "@/components/storefront/PageIntro";
import Section from "@/components/storefront/Section";
import VacancyCard from "@/components/storefront/content/VacancyCard";
import VacancyFilters, { type VacancyFilterOption } from "@/components/storefront/content/VacancyFilters";
import { EmptyState, buttonClasses } from "@/components/ui";
import type { PublicVacancy } from "@/lib/api/types";
import { getStoreVacancies } from "@/lib/storefront/data";
import { storeRoutes } from "@/lib/storefront/routes";
import { employmentTypeLabel, vacancyKey } from "@/lib/vacancies";

export const revalidate = 60;

export const metadata: Metadata = {
  title: "Careers",
  description: "Open roles at Juwon Electric for engineers, installers and support staff.",
  alternates: { canonical: "/vacancies" },
};

const firstValue = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value)?.trim() ?? "";

/** Distinct values with counts, sorted by label. */
function optionsOf(vacancies: PublicVacancy[], valueOf: (vacancy: PublicVacancy) => string | null, labelOf: (value: string) => string) {
  const counts = new Map<string, number>();
  for (const vacancy of vacancies) {
    const value = valueOf(vacancy)?.trim();
    if (value) counts.set(value, (counts.get(value) ?? 0) + 1);
  }
  return [...counts.entries()]
    .map(([value, count]): VacancyFilterOption => ({ value, label: labelOf(value), count }))
    .sort((a, b) => a.label.localeCompare(b.label));
}

/**
 * Careers (docs/agents/fe-storefront.md §4 `/vacancies`). Filters are query links (`?department=&type=`) applied to
 * the cached list of open roles, so every filtered view shares one API read.
 */
export default async function VacanciesPage({ searchParams }: PageProps<"/storefront/vacancies">) {
  const query = await searchParams;
  const vacancies = await getStoreVacancies();

  const departments = optionsOf(vacancies, (vacancy) => vacancy.department, (value) => value);
  const types = optionsOf(vacancies, (vacancy) => vacancy.employmentType, (value) => employmentTypeLabel(value as PublicVacancy["employmentType"]) ?? value);

  // Unknown values are ignored rather than showing an empty list for a stale link.
  const department = departments.find((option) => option.value.toLowerCase() === firstValue(query.department).toLowerCase())?.value ?? "";
  const type = types.find((option) => option.value === firstValue(query.type))?.value ?? "";
  const shown = vacancies.filter(
    (vacancy) => (!department || vacancy.department?.trim() === department) && (!type || vacancy.employmentType === type)
  );

  const count = vacancies.length;

  return (
    <>
      <PageIntro
        eyebrow="Join our team"
        title="Careers"
        description={
          count > 0
            ? `Help us keep homes and businesses powered. We have ${count} open ${count === 1 ? "role" : "roles"} right now.`
            : "Help us keep homes and businesses powered. Open roles for engineers, installers and support staff are listed here."
        }
      />

      <Section>
        {count === 0 ? (
          <EmptyState
            standalone
            icon={Briefcase}
            title="No open roles right now"
            description="Check back soon, or send us a message with the kind of work you do and we’ll keep your details on file."
            action={
              <Link href={storeRoutes.contact} className={buttonClasses({ size: "lg" })}>
                Contact us
              </Link>
            }
          />
        ) : (
          <div className="space-y-6">
            <VacancyFilters departments={departments} types={types} selected={{ department, type }} />
            <p className="text-sm text-slate-500">
              Showing {shown.length} of {count} open {count === 1 ? "role" : "roles"}
            </p>
            {shown.length > 0 ? (
              <ul className="grid gap-5 md:grid-cols-2">
                {shown.map((vacancy) => (
                  <li key={vacancyKey(vacancy)} className="min-w-0">
                    <VacancyCard vacancy={vacancy} />
                  </li>
                ))}
              </ul>
            ) : (
              <EmptyState
                standalone
                icon={Filter}
                title="No roles match these filters"
                description="Try another department or employment type."
                action={
                  <Link href={storeRoutes.vacancies} className={buttonClasses({ variant: "outline" })}>
                    Show all roles
                  </Link>
                }
              />
            )}
          </div>
        )}
      </Section>
    </>
  );
}
