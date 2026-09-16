// Shared, colour-free class names for the public site (port of frontend/src/lib/publicStyles.js).
// Colours stay on each element so the palette is untouched.

/** Replaces MUI `<Container maxWidth="lg">` (1200px, 16px gutters, 24px from 600px). */
export const siteContainer = "mx-auto w-full max-w-[1200px] px-4 sm:px-6";

/** Page/section heading (e.g. "Our latest projects"). Add the colour and margins at the call site. */
export const sectionTitle = "sora-bold text-2xl md:text-4xl lg:text-[40px] leading-tight";

/** Card title (service, benefit, package and customer cards). */
export const cardTitle = "sora-semibold text-2xl leading-snug";

/** Primary action button/link: consistent height, radius, weight, hover and disabled states. */
export const buttonBase =
  "inline-flex items-center justify-center gap-2 min-h-[44px] px-6 py-2 rounded-lg inter-semibold text-base leading-tight text-center transition-opacity duration-150 disabled:cursor-not-allowed disabled:opacity-70 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2";

/** Opacity hover for solid buttons that have no hover colour of their own. */
export const buttonHover = "hover:opacity-90 disabled:hover:opacity-70";

/** Compact button used inside rows (Remove, Clear). */
export const buttonSmall =
  "inline-flex items-center justify-center gap-2 min-h-[36px] px-4 py-1 rounded-md inter-medium text-base leading-tight transition-opacity duration-150 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2";

/** Text input / textarea shell. Focus is shown with a shadow and a brand ring. */
export const fieldBase =
  "block border-2 p-3 rounded-md text-base leading-normal focus:outline-hidden focus:shadow-md focus-visible:ring-2 focus-visible:ring-brand-500/40 transition-shadow duration-150";
