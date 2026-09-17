import { ChevronDown } from "lucide-react";
import SampleBadge from "@/components/storefront/SampleBadge";
import type { Faq } from "@/lib/api/types";
import { cn } from "@/lib/cn";
import { answerParagraphs } from "@/lib/storefront/content";

export type FaqListProps = {
  faqs: Faq[];
  className?: string;
};

/**
 * FAQ accordion on native `<details>`/`<summary>`: keyboard and screen-reader support without script, and answers stay
 * in the HTML for search engines. Questions are plain text: a heading inside `<summary>` (a button) loses its role.
 * Answers open with a height and opacity transition where `::details-content` is supported (app/globals.css
 * `.je-details`), and instantly elsewhere or under reduced motion. Server component.
 */
export default function FaqList({ faqs, className }: FaqListProps) {
  return (
    <ul className={cn("divide-y divide-slate-200 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-elev-1", className)}>
      {faqs.map((faq) => (
        <li key={faq.id}>
          <details className="je-details group">
            <summary
              className={cn(
                "flex min-h-14 cursor-pointer list-none items-center gap-4 px-5 py-4 text-left transition-colors hover:bg-slate-50 sm:px-6 [&::-webkit-details-marker]:hidden",
                "focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand-500"
              )}
            >
              <span className="min-w-0 flex-1 font-medium text-slate-900">{faq.question}</span>
              <SampleBadge show={faq.sample} />
              <ChevronDown aria-hidden="true" className="h-5 w-5 shrink-0 text-slate-400 transition-transform duration-300 ease-out group-open:rotate-180 group-open:text-brand-700" />
            </summary>
            <div className="space-y-3 px-5 pb-5 text-sm leading-relaxed text-slate-600 sm:px-6 sm:text-base">
              {answerParagraphs(faq.answer).map((lines, index) => (
                <p key={index}>
                  {lines.map((line, lineIndex) => (
                    <span key={lineIndex}>
                      {lineIndex > 0 && <br />}
                      {line}
                    </span>
                  ))}
                </p>
              ))}
            </div>
          </details>
        </li>
      ))}
    </ul>
  );
}
