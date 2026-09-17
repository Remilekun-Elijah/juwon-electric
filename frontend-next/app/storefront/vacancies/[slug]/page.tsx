import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Banknote, Briefcase, Building2, CalendarDays, CheckCircle2, Mail, MapPin } from "lucide-react";
import JsonLd from "@/components/storefront/JsonLd";
import PageIntro from "@/components/storefront/PageIntro";
import RichText from "@/components/public/RichText";
import { Badge, buttonClasses } from "@/components/ui";
import type { PublicVacancy } from "@/lib/api/types";
import { cn } from "@/lib/cn";
import { richTextToPlain, sanitizeRichText } from "@/lib/sanitize";
import { SITE_NAME, SITE_URL } from "@/lib/site";
import { getStoreSettings, getStoreVacancies, getStoreVacancy } from "@/lib/storefront/data";
import { storeRoutes } from "@/lib/storefront/routes";
import { storeCard, storeContainer, storeLink, storeSection } from "@/lib/storefront/styles";
import { cleanList, employmentTypeLabel, formatPostedDate, schemaEmploymentType, vacancyPath } from "@/lib/vacancies";

export const revalidate = 60;
export const dynamicParams = true;

/** Pre-render open roles; new ones render on first request and are cached. */
export async function generateStaticParams() {
  const vacancies = await getStoreVacancies();
  return vacancies.map((vacancy) => ({ slug: vacancy.slug || vacancy.id })).filter((params) => Boolean(params.slug));
}

export async function generateMetadata({ params }: PageProps<"/storefront/vacancies/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const vacancy = await getStoreVacancy(slug);
  if (!vacancy) return { title: "Role not found", robots: { index: false } };

  const description =
    richTextToPlain(vacancy.descriptionHtml, 160) ||
    [vacancy.title, vacancy.department, vacancy.location].filter(Boolean).join(" · ");
  return {
    title: `${vacancy.title} · Careers`,
    description,
    alternates: { canonical: vacancyPath(vacancy) },
    openGraph: { type: "article", url: vacancyPath(vacancy), title: `${vacancy.title} | ${SITE_NAME} careers`, description },
  };
}

/**
 * schema.org JobPosting. `jobLocation` is included only when the role has a location. Google requires `jobLocation`
 * (or remote-job fields) for job search rich results, so roles without a location won't qualify until one is added.
 */
function jobPosting(vacancy: PublicVacancy, organization: string, email: string) {
  return {
    "@context": "https://schema.org",
    "@type": "JobPosting",
    title: vacancy.title,
    description: sanitizeRichText(vacancy.descriptionHtml) || vacancy.title,
    datePosted: vacancy.postedAt ?? vacancy.createdAt,
    employmentType: schemaEmploymentType(vacancy.employmentType),
    hiringOrganization: { "@type": "Organization", name: organization, sameAs: SITE_URL, logo: `${SITE_URL}/logo.svg` },
    ...(vacancy.location
      ? {
          jobLocation: {
            "@type": "Place",
            address: { "@type": "PostalAddress", addressLocality: vacancy.location, addressCountry: "NG" },
          },
        }
      : {}),
    url: `${SITE_URL}${vacancyPath(vacancy)}`,
    directApply: false,
    identifier: { "@type": "PropertyValue", name: organization, value: vacancy.id },
    contactPoint: { "@type": "ContactPoint", email },
  };
}

/** Vacancy detail (docs/agents/fe-storefront.md §4 `/vacancies/[slug]`). */
export default async function VacancyPage({ params }: PageProps<"/storefront/vacancies/[slug]">) {
  const { slug } = await params;
  const [vacancy, settings] = await Promise.all([getStoreVacancy(slug), getStoreSettings()]);
  if (!vacancy) notFound();

  const email = settings.business.email;
  const applyHref = `mailto:${email}?subject=${encodeURIComponent(`Application: ${vacancy.title}`)}`;
  const type = employmentTypeLabel(vacancy.employmentType);
  const posted = formatPostedDate(vacancy.postedAt);
  const responsibilities = cleanList(vacancy.responsibilities);
  const requirements = cleanList(vacancy.requirements);
  const hasDescription = Boolean(sanitizeRichText(vacancy.descriptionHtml));
  const facts = [
    vacancy.department && { icon: Building2, label: "Department", value: vacancy.department },
    vacancy.location && { icon: MapPin, label: "Location", value: vacancy.location },
    type && { icon: Briefcase, label: "Employment type", value: type },
    vacancy.salaryRange && { icon: Banknote, label: "Salary", value: vacancy.salaryRange },
    posted && { icon: CalendarDays, label: "Posted", value: posted, dateTime: vacancy.postedAt ?? undefined },
  ].filter((fact): fact is { icon: typeof MapPin; label: string; value: string; dateTime?: string } => Boolean(fact));

  const listSection = (id: string, title: string, items: string[]) =>
    items.length > 0 && (
      <section aria-labelledby={id} className="border-t border-slate-100 pt-8">
        <h2 id={id} className="text-xl font-semibold tracking-tight text-slate-900">
          {title}
        </h2>
        <ul className="mt-4 space-y-3">
          {items.map((item, index) => (
            <li key={index} className="flex gap-3 text-slate-700">
              <CheckCircle2 aria-hidden="true" className="mt-0.5 h-5 w-5 shrink-0 text-brand-700" />
              <span className="min-w-0 leading-relaxed">{item}</span>
            </li>
          ))}
        </ul>
      </section>
    );

  return (
    <>
      <JsonLd data={jobPosting(vacancy, settings.business.name || SITE_NAME, email)} />
      <PageIntro
        eyebrow={vacancy.department || "Open role"}
        title={vacancy.title}
        description={[vacancy.location, type].filter(Boolean).join(" · ") || undefined}
        breadcrumbs={[{ label: "Careers", href: storeRoutes.vacancies }, { label: vacancy.title, href: vacancyPath(vacancy) }]}
        actions={
          <a href={applyHref} className={buttonClasses({ size: "lg" })}>
            <Mail aria-hidden="true" />
            Apply by email
          </a>
        }
      />

      <div className={storeSection}>
        <div className={cn(storeContainer, "grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px] lg:items-start lg:gap-8")}>
          <article className={cn(storeCard, "min-w-0 space-y-8 p-5 sm:p-8")}>
            {hasDescription && (
              <section aria-labelledby="role-about">
                <h2 id="role-about" className="text-xl font-semibold tracking-tight text-slate-900">
                  About the role
                </h2>
                <RichText html={vacancy.descriptionHtml} className="mt-4 text-slate-700" />
              </section>
            )}
            {listSection("role-responsibilities", "Responsibilities", responsibilities)}
            {listSection("role-requirements", "Requirements", requirements)}
            {!hasDescription && responsibilities.length === 0 && requirements.length === 0 && (
              <p className="text-slate-600">Email us to ask for the full details of this role.</p>
            )}
          </article>

          <aside aria-labelledby="role-summary" className="lg:sticky lg:top-24">
            <div className={cn(storeCard, "p-5 sm:p-6")}>
              <div className="flex items-center justify-between gap-3">
                <h2 id="role-summary" className="font-semibold tracking-tight text-slate-900">
                  Role summary
                </h2>
                <Badge tone="success" dot>
                  Open
                </Badge>
              </div>
              {facts.length > 0 && (
                <dl className="mt-5 space-y-4">
                  {facts.map(({ icon: Icon, label, value, dateTime }) => (
                    <div key={label} className="flex gap-3">
                      <Icon aria-hidden="true" className="mt-0.5 h-5 w-5 shrink-0 text-slate-400" />
                      <div className="min-w-0">
                        <dt className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">{label}</dt>
                        <dd className="mt-0.5 break-words text-slate-800">
                          {dateTime ? <time dateTime={dateTime}>{value}</time> : value}
                        </dd>
                      </div>
                    </div>
                  ))}
                </dl>
              )}
              <div className="mt-6 border-t border-slate-100 pt-5">
                <a href={applyHref} className={buttonClasses({ size: "lg", className: "w-full" })}>
                  <Mail aria-hidden="true" />
                  Apply by email
                </a>
                <p className="mt-3 text-sm leading-relaxed text-slate-500">
                  Send your CV and a short cover note to{" "}
                  <a href={applyHref} className={cn(storeLink, "break-all")}>
                    {email}
                  </a>{" "}
                  with “Application: {vacancy.title}” as the subject.
                </p>
              </div>
            </div>
            <Link href={storeRoutes.vacancies} className={cn(storeLink, "mt-4 inline-flex min-h-11 items-center gap-1.5 text-sm")}>
              <ArrowLeft aria-hidden="true" className="h-4 w-4" />
              All open roles
            </Link>
          </aside>
        </div>
      </div>
    </>
  );
}
