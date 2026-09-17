// Shared storefront class strings (docs/agents/fe-storefront.md §3). Plain module, safe in server and client code.

/** Page container. */
export const storeContainer = "mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8";

/** Vertical rhythm for a page section. */
export const storeSection = "py-14 sm:py-20";

/** Content card surface (add your own padding if `storeCardPadding` doesn't fit). */
export const storeCard = "rounded-2xl border border-slate-200 bg-white shadow-elev-1";
export const storeCardPadding = "p-5 sm:p-6";

export const storeEyebrow = "text-xs font-semibold uppercase tracking-[0.14em] text-brand-700";
export const storeH1 = "text-3xl font-semibold tracking-tight text-slate-900 sm:text-4xl lg:text-5xl";
export const storeH2 = "text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl";
export const storeH3 = "text-lg font-semibold tracking-tight text-slate-900";
export const storeBody = "text-slate-600";
export const storeMeta = "text-sm text-slate-500";

/** Visible keyboard focus ring for custom interactive elements (kit components already have one). */
export const storeFocus = "focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2";

/** Inline text link. */
export const storeLink = `rounded-sm font-medium text-brand-700 transition-colors hover:text-brand-800 ${storeFocus}`;

/** Section entrance animation, off for reduced motion. */
export const storeFadeUp = "motion-safe:animate-fade-up";
