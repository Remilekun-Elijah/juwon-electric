import Link from "next/link";
import { cn } from "@/lib/cn";
import { buttonBase, buttonHover, sectionTitle } from "@/lib/publicStyles";
import { routes } from "@/lib/site";

/** 404 body: unknown URLs, unknown packages and closed vacancies. Rendered inside the public chrome by app/not-found.tsx. */
export default function NotFoundContent() {
  return (
    <div className="energyBackground flex min-h-[70vh] items-center justify-center px-4 pb-20 pt-32">
      <div className="max-w-lg rounded-xl bg-white p-8 text-center shadow-sm">
        <p className="inter-bold text-sm uppercase tracking-[0.14em] text-brand-700">404</p>
        <h1 className={cn("mt-2 text-deep_red", sectionTitle)}>We couldn&apos;t find that page</h1>
        <p className="inter-regular mt-3 text-base text-faint">
          It may have moved, or the package or vacancy is no longer available.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <Link href={routes.home} className={cn(buttonBase, buttonHover, "bg-brand-500 text-white")}>
            Go home
          </Link>
          <Link
            href={routes.packages}
            className={cn(buttonBase, "border-2 border-brand-500 text-brand-500 transition-colors hover:bg-brand-500 hover:text-white")}
          >
            View packages
          </Link>
        </div>
      </div>
    </div>
  );
}
