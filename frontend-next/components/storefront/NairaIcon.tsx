import type { SVGProps } from "react";

/**
 * Naira sign (₦) drawn in the lucide outline style — 24px grid, `currentColor` stroke, round caps — so it sits
 * beside lucide icons (MapPin, Zap) at the same weight. lucide-react ships no Naira glyph, hence the local copy.
 * Decorative by default: callers pair it with their own label.
 */
export default function NairaIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      {...props}
    >
      <path d="M6 20V4l12 16V4" />
      <path d="M4 10h16" />
      <path d="M4 14h16" />
    </svg>
  );
}
