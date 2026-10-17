import { ExternalLink } from "lucide-react";
import { cn } from "@/lib/cn";
import { storeFocus } from "@/lib/storefront/styles";
import { isAllowedUrl } from "@/lib/validation";

// Shared helpers for the team cards (TeamShowcase). The hover-overlay card that lived here until 2026-10-12 is gone.

/** Site paths and http(s) URLs only (LANDING_V1 site-path rule); anything else shows the initials avatar. */
export const teamPhotoSrc = (url: string | null | undefined) => {
  const value = (url || "").trim();
  if (value.startsWith("/") && !value.startsWith("//")) return value;
  return /^https?:\/\//i.test(value) ? value : "";
};

/** LinkedIn link when it is a safe https URL. */
export const teamLinkedinHref = (url: string | null | undefined) => {
  const value = (url || "").trim();
  return value && /^https:\/\//i.test(value) && isAllowedUrl(value) ? value : "";
};

/** Up to two initials: "Adaeze Okafor" → "AO", "Tunde" → "T". */
export const initialsOf = (name: string) =>
  name
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("");

export function LinkedinLink({ href, name, onBrand = false }: { href: string; name: string; onBrand?: boolean }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={cn(
        "inline-flex min-h-11 items-center gap-1.5 rounded-sm text-sm font-medium underline-offset-4 hover:underline md:min-h-8",
        storeFocus,
        onBrand ? "text-white focus-visible:ring-white focus-visible:ring-offset-brand-800" : "text-brand-700 hover:text-brand-800"
      )}
    >
      LinkedIn
      <span className="sr-only">
        {" "}
        profile of {name} (opens in a new tab)
      </span>
      <ExternalLink aria-hidden="true" className="h-3.5 w-3.5" />
    </a>
  );
}
