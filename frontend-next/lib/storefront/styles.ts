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

/** Page-load entrance for content at the top of a page (PageIntro), off for reduced motion. */
export const storeFadeUp = "motion-safe:animate-fade-up";

/* ---------- Motion (docs/agents/TEAM_AND_MOTION_V1.md §5; scroll reveals live in components/storefront/motion) ---------- */

/** Card hover: lifts 2px with a deeper shadow over 200 ms. Keyboard focus inside gets the shadow; no lift for reduced motion. */
export const storeHoverLift =
  "transition-[translate,box-shadow] duration-200 ease-out hover:shadow-elev-3 focus-within:shadow-elev-3 motion-safe:hover:-translate-y-0.5";

/** Image inside an `overflow-hidden` frame of a `group` card: gentle zoom on hover or keyboard focus. */
export const storeImageZoom =
  "transition-transform duration-300 ease-out motion-safe:group-hover:scale-[1.04] motion-safe:group-focus-within:scale-[1.04]";

/** Subtle press state for buttons and button-like links. */
export const storePress = "motion-safe:active:scale-[0.98]";

/** Arrow icon in a `group` link or card: nudges right on hover. */
export const storeArrowNudge = "transition-transform duration-200 ease-out motion-safe:group-hover:translate-x-0.5";

/**
 * Hero entrance delay for an element with the `je-enter` class (app/globals.css). Pure CSS, so it also runs without
 * JavaScript; reduced motion turns it off.
 */
export const enterDelay = (ms: number) => ({ "--enter-delay": `${ms}ms` }) as Record<string, string>;

/* ---------- Dark page intros (docs/agents/TEAM_AND_MOTION_V1.md §8.1) ---------- */

/** Keyboard focus ring for controls on slate-950. */
export const storeOnDarkFocus =
  "focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-gold-400 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950";

const darkButtonBase =
  "inline-flex h-11 items-center justify-center gap-2 whitespace-nowrap rounded-full px-5 text-sm font-semibold transition-[background-color,translate] duration-200 ease-out motion-safe:hover:-translate-y-0.5 [&_svg]:size-4 [&_svg]:shrink-0";

/** Gold primary button on a dark surface (text is slate-950). */
export const storeGoldButton = `${darkButtonBase} bg-gold-400 text-slate-950 hover:bg-gold-300 ${storeOnDarkFocus} ${storePress}`;

/** Glass secondary button on a dark surface. */
export const storeGlassButton = `${darkButtonBase} border border-white/25 bg-white/10 text-white backdrop-blur-md hover:bg-white/15 ${storeOnDarkFocus} ${storePress}`;

/** Filter chip on a dark surface: glass, or gold while selected. Add `min-h-*`, padding and gap yourself if needed. */
export const storeDarkChip = (active: boolean) =>
  `inline-flex min-h-11 items-center gap-2 rounded-full border px-4 text-sm font-medium transition-colors md:min-h-10 ${storeOnDarkFocus} ${storePress} ${
    active ? "border-gold-400 bg-gold-400 text-slate-950" : "border-white/20 bg-white/10 text-white hover:bg-white/15"
  }`;

/** Delay for the nth item of a mounting list: `step` ms apart, capped so long lists never wait (8 steps by default). */
export const staggerDelay = (index: number, step = 60, base = 0, cap = 8) => enterDelay(base + Math.min(index, cap - 1) * step);
