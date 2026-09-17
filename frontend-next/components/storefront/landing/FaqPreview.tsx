import Link from "next/link";
import { ArrowRight } from "lucide-react";
import Section from "@/components/storefront/Section";
import type { Faq } from "@/lib/api/types";
import { cn } from "@/lib/cn";
import { storeRoutes } from "@/lib/storefront/routes";
import { storeLink } from "@/lib/storefront/styles";
import FaqList from "./FaqList";

/** Questions shown on the home page. */
const HOME_FAQS = 6;

/** Home FAQ (LANDING_V1 §7.12): the first six questions as an accordion and a link to /faq. Returns nothing without FAQs. */
export default function FaqPreview({ faqs }: { faqs: Faq[] }) {
  if (!faqs.length) return null;
  const shown = faqs.slice(0, HOME_FAQS);

  return (
    <Section tone="white" eyebrow="FAQ" title="Questions customers ask">
      <div className="mx-auto max-w-3xl">
        <FaqList faqs={shown} />
        <Link href={storeRoutes.faq} className={cn(storeLink, "mt-6 inline-flex min-h-11 items-center gap-1.5 md:min-h-0")}>
          See all questions
          <ArrowRight aria-hidden="true" className="h-4 w-4" />
        </Link>
      </div>
    </Section>
  );
}
