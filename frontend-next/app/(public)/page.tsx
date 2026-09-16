import Link from "next/link";

// Placeholder until the Landing page is ported from frontend/src/pages (FE-1 item 4).
export default function Home() {
  return (
    <div className="flex items-center justify-center bg-offWhite px-4 pb-24 pt-40">
      <div className="max-w-xl text-center">
        <p className="text-xs font-bold uppercase tracking-[0.14em] text-brand-700">Juwon Electric</p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
          Let us brighten your daily life.
        </h1>
        <p className="mt-4 text-base leading-relaxed text-slate-600">
          We&apos;re dedicated to making a positive impact on our world, starting right here on Earth.
        </p>
        <Link
          href="/packages"
          className="mt-8 inline-flex h-11 items-center justify-center rounded-lg bg-brand-600 px-5 text-sm font-medium text-white shadow-xs transition-colors hover:bg-brand-700 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2"
        >
          View packages
        </Link>
      </div>
    </div>
  );
}
