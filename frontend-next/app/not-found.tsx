import type { Metadata } from "next";
import NotFoundContent from "@/components/public/NotFoundContent";
import PublicChrome from "@/components/public/PublicChrome";

export const metadata: Metadata = {
  title: "Page not found",
  robots: { index: false },
};

/**
 * Root 404 (FE-1). Next serves this HTML for unmatched URLs and for notFound() on dynamic public routes, so it
 * renders the public chrome itself (the root layout has none).
 */
export default function NotFound() {
  return (
    <PublicChrome>
      <NotFoundContent />
    </PublicChrome>
  );
}
