"use client";

import Link from "next/link";
import { useEffect } from "react";
import { cn } from "@/lib/cn";
import { buttonBase, buttonHover, sectionTitle } from "@/lib/publicStyles";
import { routes } from "@/lib/site";

/** Error boundary for public pages (e.g. a vacancy that can't be loaded while the API is down). */
export default function PublicError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="energyBackground flex min-h-[70vh] items-center justify-center px-4 pb-20 pt-32">
      <div role="alert" className="max-w-lg rounded-xl bg-white p-8 text-center shadow-sm">
        <h1 className={cn("text-deep_red", sectionTitle)}>Something went wrong</h1>
        <p className="inter-regular mt-3 text-base text-faint">
          We couldn&apos;t load this page. Please try again in a moment.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <button type="button" onClick={reset} className={cn(buttonBase, buttonHover, "bg-brand-500 text-white")}>
            Try again
          </button>
          <Link
            href={routes.home}
            className={cn(buttonBase, "border-2 border-brand-500 text-brand-500 transition-colors hover:bg-brand-500 hover:text-white")}
          >
            Go home
          </Link>
        </div>
      </div>
    </div>
  );
}
