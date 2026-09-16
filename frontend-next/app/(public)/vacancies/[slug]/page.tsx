import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Banknote, Briefcase, Building2, CalendarDays, ChevronLeft, MapPin } from "lucide-react";
import RichText from "@/components/public/RichText";
import { getPublicSettings, getVacancies, getVacancy } from "@/lib/api/public";
import { isr, readOr } from "@/lib/api/server";
import type { PublicVacancy } from "@/lib/api/types";
import { cn } from "@/lib/cn";
import { richTextToPlain, sanitizeRichText } from "@/lib/sanitize";
import { buttonBase, buttonHover, siteContainer } from "@/lib/publicStyles";
import { SITE_NAME, SITE_URL, contactFallback, routes } from "@/lib/site";
import {
  cleanList,
  employmentTypeLabel,
  formatPostedDate,
  isOpenVacancy,
  schemaEmploymentType,
  vacancyPath,
} from "@/lib/vacancies";

export const revalidate = 300;
export const dynamicParams = true;

/** Pre-render open vacancies; new ones render on first request and are cached (ISR). */
export async function generateStaticParams() {
  const result = await readOr<PublicVacancy[]>("GET /vacancies (static params)", () => getVacancies({}, isr(["vacancies"])), []);
  return result.data.filter(isOpenVacancy).map((vacancy) => ({ slug: vacancy.slug || vacancy.id }));
}

/**
 * `GET /vacancies/:slug` is 404 unless the vacancy is open (contract §3), so 404 → notFound(). Any other failure is
 * thrown: rendering the error boundary is better than caching a 404 for a real role while the API is down.
 */
async function loadVacancy(slug: string): Promise<PublicVacancy | null> {
  const result = await readOr<PublicVacancy | null>(`GET /vacancies/${slug}`, () => getVacancy(slug, isr(["vacancies", `vacancy:${slug}`])), null);
  if (result.notFound) return null;
  if (!result.data) throw new Error("Vacancy could not be loaded. Please try again shortly.");
  return isOpenVacancy(result.data) ? result.data : null;
}

export async function generateMetadata({ params }: PageProps<"/vacancies/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const vacancy = await loadVacancy(slug).catch(() => null);
  if (!vacancy) return { title: "Vacancy not found", robots: { index: false } };

  const description =
    richTextToPlain(vacancy.descriptionHtml, 160) ||
    `${vacancy.title}${vacancy.location ? ` in ${vacancy.location}` : ""} at ${SITE_NAME}.`;
  return {
    title: `${vacancy.title} — Careers`,
    description,
    alternates: { canonical: vacancyPath(vacancy) },
    openGraph: { type: "article", url: vacancyPath(vacancy), title: `${vacancy.title} | ${SITE_NAME} careers`, description },
  };
}

/** JobPosting structured data for search engines. `<` is escaped so the JSON can't close the script tag. */
function jobPostingJsonLd(vacancy: PublicVacancy, email: string) {
  const data = {
    "@context": "https://schema.org",
    "@type": "JobPosting",
    title: vacancy.title,
    description: sanitizeRichText(vacancy.descriptionHtml) || vacancy.title,
    datePosted: vacancy.postedAt ?? vacancy.createdAt,
    employmentType: schemaEmploymentType(vacancy.employmentType),
    hiringOrganization: { "@type": "Organization", name: SITE_NAME, sameAs: SITE_URL, logo: `${SITE_URL}/logo.svg` },
    jobLocation: vacancy.location
      ? { "@type": "Place", address: { "@type": "PostalAddress", addressLocality: vacancy.location, addressCountry: "NG" } }
      : undefined,
    applicantLocationRequirements: { "@type": "Country", name: "Nigeria" },
    url: `${SITE_URL}${vacancyPath(vacancy)}`,
    directApply: false,
    identifier: { "@type": "PropertyValue", name: SITE_NAME, value: vacancy.id },
    contactPoint: { "@type": "ContactPoint", email },
  };
  return JSON.stringify(data).replace(/</g, "\\u003c");
}

export default async function VacancyDetailPage({ params }: PageProps<"/vacancies/[slug]">) {
  const { slug } = await params;
  const vacancy = await loadVacancy(slug);
  if (!vacancy) notFound();

  const settings = await readOr("GET /settings/public", () => getPublicSettings(isr(["settings"])), null);
  const email = settings.data?.business?.email || contactFallback.email;
  const applyHref = `mailto:${email}?subject=${encodeURIComponent(`Application: ${vacancy.title}`)}`;

  const type = employmentTypeLabel(vacancy.employmentType);
  const posted = formatPostedDate(vacancy.postedAt);
  const responsibilities = cleanList(vacancy.responsibilities);
  const requirements = cleanList(vacancy.requirements);
  const facts = [
    vacancy.department && { icon: Building2, label: "Department", value: vacancy.department },
    vacancy.location && { icon: MapPin, label: "Location", value: vacancy.location },
    type && { icon: Briefcase, label: "Employment type", value: type },
    vacancy.salaryRange && { icon: Banknote, label: "Salary", value: vacancy.salaryRange },
    posted && { icon: CalendarDays, label: "Posted", value: posted },
  ].filter((fact): fact is { icon: typeof MapPin; label: string; value: string } => Boolean(fact));

  return (
    <div className="energyBackground pb-24 pt-32">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jobPostingJsonLd(vacancy, email) }} />
      <div className={cn(siteContainer, "max-w-4xl")}>
        <nav aria-label="Breadcrumb" className="mb-6">
          <Link
            href={routes.vacancies}
            className="inter-medium inline-flex items-center gap-1 rounded-sm text-faint hover:underline focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-brand-500"
          >
            <ChevronLeft aria-hidden="true" className="h-4 w-4" />
            All vacancies
          </Link>
        </nav>

        <article className="rounded-xl bg-white p-6 shadow-sm md:p-10">
          <header className="border-b-2 border-deep_red pb-6">
            <h1 className="sora-bold text-2xl leading-tight text-deep_red md:text-4xl">{vacancy.title}</h1>
            {facts.length > 0 && (
              <dl className="mt-5 grid gap-x-8 gap-y-3 sm:grid-cols-2">
                {facts.map(({ icon: Icon, label, value }) => (
                  <div key={label} className="flex items-start gap-2">
                    <Icon aria-hidden="true" className="mt-0.5 h-5 w-5 shrink-0 text-brand-500" />
                    <div>
                      <dt className="inter-medium text-xs uppercase tracking-wide text-slate-500">{label}</dt>
                      <dd className="inter-medium text-base text-slate-800">{value}</dd>
                    </div>
                  </div>
                ))}
              </dl>
            )}
          </header>

          {vacancy.descriptionHtml && (
            <section aria-labelledby="about-role" className="mt-8">
              <h2 id="about-role" className="sora-semibold mb-3 text-xl text-deep_red">
                About the role
              </h2>
              <RichText html={vacancy.descriptionHtml} />
            </section>
          )}

          {responsibilities.length > 0 && (
            <section aria-labelledby="responsibilities" className="mt-8">
              <h2 id="responsibilities" className="sora-semibold mb-3 text-xl text-deep_red">
                Responsibilities
              </h2>
              <ul className="prose-je">
                {responsibilities.map((item, index) => (
                  <li key={index}>{item}</li>
                ))}
              </ul>
            </section>
          )}

          {requirements.length > 0 && (
            <section aria-labelledby="requirements" className="mt-8">
              <h2 id="requirements" className="sora-semibold mb-3 text-xl text-deep_red">
                Requirements
              </h2>
              <ul className="prose-je">
                {requirements.map((item, index) => (
                  <li key={index}>{item}</li>
                ))}
              </ul>
            </section>
          )}

          <section aria-labelledby="apply" className="mt-10 rounded-lg bg-offWhite p-6">
            <h2 id="apply" className="sora-semibold text-xl text-deep_red">
              How to apply
            </h2>
            <p className="inter-regular mt-2 text-base text-slate-700">
              Email your CV and a short cover note to <a href={`mailto:${email}`} className="text-brand-700 underline">{email}</a>{" "}
              with the job title in the subject line.
            </p>
            <a href={applyHref} className={cn(buttonBase, buttonHover, "mt-5 bg-brand-500 text-white")}>
              Apply by email
            </a>
          </section>
        </article>
      </div>
    </div>
  );
}
