// Pure helpers for Landing v1 website content (server and client safe).
import type { Faq, PortfolioItem, TestimonialSource } from "@/lib/api/types";

/** Portfolio items with a written summary, which the home page shows as case studies. */
export const caseStudies = (items: PortfolioItem[]) => items.filter((item) => Boolean(item.summary?.trim()));

/** True when a portfolio item has any case-study detail to show. */
export const hasCaseStudyDetails = (item: PortfolioItem) =>
  Boolean(item.summary?.trim() || item.location?.trim() || item.system?.trim());

export const TESTIMONIAL_SOURCE_LABELS: Record<TestimonialSource, string> = {
  website: "Website",
  whatsapp: "WhatsApp",
  google: "Google",
  facebook: "Facebook",
  in_person: "In person",
};

/** FAQ category heading; uncategorised questions go under "General". */
export const FAQ_GENERAL = "General";

/** FAQs grouped by category in first-seen order (the API already sorts by sortOrder). */
export function groupFaqs(faqs: Faq[]) {
  const groups = new Map<string, Faq[]>();
  for (const faq of faqs) {
    const category = faq.category?.trim() || FAQ_GENERAL;
    groups.set(category, [...(groups.get(category) ?? []), faq]);
  }
  return [...groups.entries()].map(([category, items]) => ({ category, items }));
}

/** Plain multiline answer text split into paragraphs (blank lines) and lines. */
export const answerParagraphs = (answer: string) =>
  answer
    .split(/\n\s*\n/)
    .map((paragraph) => paragraph.split("\n").map((line) => line.trim()).filter(Boolean))
    .filter((lines) => lines.length > 0);
