// Shared form-control class strings. Kept out of Input.jsx ("use client") so server components receive the
// string itself rather than a client reference (FE_CONVENTIONS §1.1).

export const fieldClasses =
  "flex h-10 w-full rounded-lg border border-slate-200 bg-white px-3.5 text-sm text-slate-900 shadow-xs transition-colors placeholder:text-slate-400 hover:border-slate-300 focus:outline-hidden focus:border-brand-300 focus:ring-4 focus:ring-brand-500/10 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:opacity-60";

export const invalidFieldClasses = "border-red-300 hover:border-red-300 focus:border-red-400 focus:ring-red-500/10";
