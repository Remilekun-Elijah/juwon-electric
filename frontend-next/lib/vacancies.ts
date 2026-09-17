import type { EmploymentType, PublicVacancy } from "@/lib/api/types";
import { routes } from "@/lib/site";

/** Stable React key: the JSON store has no `_id` and legacy Mongo records have no `id` (FE_CONVENTIONS §4). */
export const vacancyKey = (vacancy: Pick<PublicVacancy, "id" | "slug"> & { _id?: string }) =>
  vacancy.id ?? vacancy._id ?? vacancy.slug;

/** Public detail URL. The API resolves slug, then id. */
export const vacancyPath = (vacancy: Pick<PublicVacancy, "id" | "slug"> & { _id?: string }) =>
  `${routes.vacancies}/${encodeURIComponent(vacancy.slug || vacancy.id || vacancy._id || "")}`;

/** Defence in depth: the contract already returns open vacancies only. Records without `status` are legacy and open. */
export const isOpenVacancy = (vacancy: Partial<PublicVacancy>) => !vacancy.status || vacancy.status === "open";

export const employmentTypeLabels: Record<EmploymentType, string> = {
  "full-time": "Full-time",
  "part-time": "Part-time",
  contract: "Contract",
  internship: "Internship",
  temporary: "Temporary",
};

/** schema.org JobPosting employmentType values. */
const schemaEmploymentTypes: Record<EmploymentType, string> = {
  "full-time": "FULL_TIME",
  "part-time": "PART_TIME",
  contract: "CONTRACTOR",
  internship: "INTERN",
  temporary: "TEMPORARY",
};

export const employmentTypeLabel = (type: EmploymentType | null | undefined) => (type ? employmentTypeLabels[type] ?? type : null);

export const schemaEmploymentType = (type: EmploymentType | null | undefined) => (type ? schemaEmploymentTypes[type] : undefined);

/** "16 September 2026" in Lagos time, or null. */
export const formatPostedDate = (value: string | null | undefined) => {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? null
    : new Intl.DateTimeFormat("en-NG", { day: "numeric", month: "long", year: "numeric", timeZone: "Africa/Lagos" }).format(date);
};

/** Drops blank entries (legacy records may contain empty strings). */
export const cleanList = (items: unknown): string[] =>
  Array.isArray(items) ? items.filter((item): item is string => typeof item === "string" && item.trim() !== "") : [];
