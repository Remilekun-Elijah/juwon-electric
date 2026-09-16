import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Briefcase, MapPin } from "lucide-react";
import CustomChip from "@/components/public/CustomChip";
import { getVacancies } from "@/lib/api/public";
import { isr, readOr } from "@/lib/api/server";
import type { PublicVacancy } from "@/lib/api/types";
import { cn } from "@/lib/cn";
import { richTextToPlain } from "@/lib/sanitize";
import { sectionTitle, siteContainer } from "@/lib/publicStyles";
import { routes } from "@/lib/site";
import { employmentTypeLabel, formatPostedDate, isOpenVacancy, vacancyKey, vacancyPath } from "@/lib/vacancies";

export const revalidate = 300;

export const metadata: Metadata = {
  title: "Careers",
  description: "Open roles at Juwon Electric: solar, inverter and battery installation, engineering and sales jobs in Nigeria.",
  alternates: { canonical: routes.vacancies },
  openGraph: { url: routes.vacancies, title: "Careers | Juwon Electric" },
};

/** Open vacancies (PRD §6.5). Server component with ISR; replaces the client-side fetch page. */
export default async function VacanciesPage() {
  const result = await readOr<PublicVacancy[]>("GET /vacancies", () => getVacancies({}, isr(["vacancies"])), []);
  const vacancies = result.data.filter(isOpenVacancy);
  const unavailable = result.fromFallback && !result.notFound;

  return (
    <div className="energyBackground pb-24 pt-32">
      <div className={siteContainer}>
        <CustomChip text="Careers" className="flex justify-center" />
        <h1 className={cn("mb-4 mt-8 text-center text-deep_red", sectionTitle)}>Open vacancies</h1>
        <p className="inter-medium mx-auto mb-12 max-w-2xl text-center text-base leading-relaxed text-faint">
          Help us bring clean, reliable power to homes and businesses across Nigeria.
        </p>

        {vacancies.length === 0 ? (
          <div role="status" className="mx-auto max-w-xl rounded-xl bg-white px-6 py-12 text-center shadow-sm">
            <Briefcase aria-hidden="true" className="mx-auto h-10 w-10 text-brand-500" />
            <h2 className="sora-semibold mt-4 text-xl text-deep_red">
              {unavailable ? "We couldn’t load our vacancies" : "No open vacancies right now"}
            </h2>
            <p className="inter-regular mt-2 text-base text-faint">
              {unavailable
                ? "Please try again in a few minutes."
                : "Check back soon, or send us a message and we’ll keep your details on file."}
            </p>
            <Link
              href={routes.contact}
              className="inter-semibold mt-6 inline-flex min-h-[44px] items-center justify-center rounded-lg bg-brand-500 px-6 text-white transition-opacity hover:opacity-90 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2"
            >
              Contact us
            </Link>
          </div>
        ) : (
          <ul className="mx-auto grid max-w-4xl gap-6">
            {vacancies.map((vacancy) => {
              const type = employmentTypeLabel(vacancy.employmentType);
              const posted = formatPostedDate(vacancy.postedAt);
              const excerpt = richTextToPlain(vacancy.descriptionHtml, 200);
              const meta = [vacancy.department, vacancy.location].filter(Boolean);
              return (
                <li key={vacancyKey(vacancy)}>
                  <article className="group relative rounded-xl bg-white p-6 shadow-sm transition-shadow focus-within:shadow-md hover:shadow-md">
                    <div className="flex flex-wrap items-center gap-2">
                      {type && (
                        <span className="inter-semibold rounded-full bg-brand-50 px-3 py-1 text-xs text-brand-700">{type}</span>
                      )}
                      {posted && (
                        <span className="inter-regular text-xs text-slate-500">
                          Posted <time dateTime={vacancy.postedAt ?? undefined}>{posted}</time>
                        </span>
                      )}
                    </div>
                    <h2 className="sora-semibold mt-3 text-xl leading-snug text-deep_red md:text-2xl">
                      <Link
                        href={vacancyPath(vacancy)}
                        className="rounded-sm after:absolute after:inset-0 after:content-[''] focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-brand-500"
                      >
                        {vacancy.title}
                      </Link>
                    </h2>
                    {meta.length > 0 && (
                      <p className="inter-medium mt-1 flex items-center gap-1.5 text-sm text-faint">
                        <MapPin aria-hidden="true" className="h-4 w-4 shrink-0" />
                        {meta.join(" · ")}
                      </p>
                    )}
                    {vacancy.salaryRange && <p className="inter-medium mt-1 text-sm text-slate-700">{vacancy.salaryRange}</p>}
                    {excerpt && <p className="inter-regular mt-3 text-base leading-relaxed text-slate-700">{excerpt}</p>}
                    <p aria-hidden="true" className="inter-semibold mt-4 inline-flex items-center gap-1 text-sm text-brand-600 group-hover:underline">
                      View role <ArrowRight className="h-4 w-4" />
                    </p>
                  </article>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
