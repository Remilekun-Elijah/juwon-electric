import type { Metadata } from "next";
import { notFound } from "next/navigation";
import PageIntro from "@/components/storefront/PageIntro";
import { getStoreVacancy } from "@/lib/storefront/data";
import { storeRoutes } from "@/lib/storefront/routes";
import { employmentTypeLabel, vacancyPath } from "@/lib/vacancies";

// Placeholder from S0 (storefront foundation). S3 replaces the body; keep the metadata canonical.
export const revalidate = 60;

export async function generateMetadata({ params }: PageProps<"/storefront/vacancies/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const vacancy = await getStoreVacancy(slug);
  if (!vacancy) return { title: "Role not found", robots: { index: false } };
  return {
    title: vacancy.title,
    description: [vacancy.title, vacancy.department, vacancy.location].filter(Boolean).join(" · "),
    alternates: { canonical: vacancyPath(vacancy) },
  };
}

export default async function Page({ params }: PageProps<"/storefront/vacancies/[slug]">) {
  const { slug } = await params;
  const vacancy = await getStoreVacancy(slug);
  if (!vacancy) notFound();

  return (
    <PageIntro
      eyebrow={vacancy.department || "Open role"}
      title={vacancy.title}
      description={[vacancy.location, employmentTypeLabel(vacancy.employmentType)].filter(Boolean).join(" · ") || undefined}
      breadcrumbs={[{ label: "Careers", href: storeRoutes.vacancies }, { label: vacancy.title, href: vacancyPath(vacancy) }]}
    />
  );
}
