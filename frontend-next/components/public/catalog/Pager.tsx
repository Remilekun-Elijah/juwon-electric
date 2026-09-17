import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/cn";
import { productsPagePath } from "@/lib/catalog";

const link =
  "inter-medium inline-flex min-h-[44px] min-w-[44px] items-center justify-center gap-1 rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-700 transition-colors hover:border-brand-300 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-brand-500";

/** Link-based pagination for `/products` and `/products/page/[page]` (keeps pages static). */
export default function Pager({ page, pages }: { page: number; pages: number }) {
  if (pages <= 1) return null;
  const numbers = Array.from({ length: pages }, (_, i) => i + 1).filter((n) => n === 1 || n === pages || Math.abs(n - page) <= 1);

  return (
    <nav aria-label="Product pages" className="mt-12 flex flex-wrap items-center justify-center gap-2">
      {page > 1 && (
        <Link href={productsPagePath(page - 1)} className={link} rel="prev">
          <ChevronLeft aria-hidden="true" className="h-4 w-4" /> Previous
        </Link>
      )}
      {numbers.map((n, index) => (
        <span key={n} className="flex items-center gap-2">
          {index > 0 && n - numbers[index - 1] > 1 && <span aria-hidden="true" className="text-slate-400">…</span>}
          <Link
            href={productsPagePath(n)}
            aria-current={n === page ? "page" : undefined}
            aria-label={`Page ${n}`}
            className={cn(link, n === page && "border-brand-500 bg-brand-500 text-white hover:border-brand-500")}
          >
            {n}
          </Link>
        </span>
      ))}
      {page < pages && (
        <Link href={productsPagePath(page + 1)} className={link} rel="next">
          Next <ChevronRight aria-hidden="true" className="h-4 w-4" />
        </Link>
      )}
    </nav>
  );
}
