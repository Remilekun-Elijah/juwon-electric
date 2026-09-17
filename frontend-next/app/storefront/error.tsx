"use client";

import { useEffect } from "react";
import Link from "next/link";
import { RefreshCw } from "lucide-react";
import { Button, buttonClasses } from "@/components/ui";
import { cn } from "@/lib/cn";
import { contactFallback } from "@/lib/site";
import { primaryPhone, storeRoutes, telHref } from "@/lib/storefront/routes";
import { storeCard, storeContainer, storeEyebrow, storeLink } from "@/lib/storefront/styles";

/**
 * Storefront error boundary. Shown when a page has no cached copy and the API read fails at runtime
 * (lib/storefront/data.ts rethrows instead of rendering fallback data). `retry` re-fetches and re-renders the segment.
 */
export default function StorefrontError({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  const phone = primaryPhone(contactFallback.phone);

  return (
    <div className={cn(storeContainer, "py-16 sm:py-24")}>
      <div role="alert" className={cn(storeCard, "mx-auto max-w-xl p-6 text-center sm:p-10")}>
        <p className={storeEyebrow}>Connection problem</p>
        <h1 className="mt-3 text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">We couldn’t load this page</h1>
        <p className="mt-3 text-slate-600">
          Our catalogue didn’t respond just now. Please try again in a moment. If you need help straight away, call us on{" "}
          <a href={telHref(phone)} className={cn(storeLink, "tabular-nums")}>
            {phone}
          </a>
          .
        </p>
        <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
          <Button size="lg" onClick={() => retry()} icon={<RefreshCw aria-hidden="true" />}>
            Try again
          </Button>
          <Link href={storeRoutes.home} className={buttonClasses({ variant: "outline", size: "lg" })}>
            Go to the home page
          </Link>
        </div>
        {error.digest && <p className="mt-6 text-xs text-slate-400">Reference: {error.digest}</p>}
      </div>
    </div>
  );
}
