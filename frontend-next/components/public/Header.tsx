import Image from "next/image";
import Link from "next/link";
import { routes } from "@/lib/site";

/**
 * Photo hero used by the inner public pages. Port of frontend/src/components/Header.jsx, with the two background
 * videos replaced by a still (2026-09-18): they cost 13 MB in every deployment and the dark overlay carries the
 * heading either way.
 */
export default function Header({ text }: { text: string }) {
  return (
    <div className="header-nav relative mt-0 h-[400px] max-h-[900px] w-full overflow-hidden bg-slate-900 lg:h-screen">
      {/* 2026-09-18: the two background videos (13 MB in every deployment) were replaced by a still photo. */}
      <Image src="/header.jpg" alt="" aria-hidden="true" fill priority sizes="100vw" className="header-video object-cover" />
      <div className="header-content flex h-full w-full flex-col items-center justify-center px-5 lg:h-screen">
        <h1 className="inter-bold text-center text-3xl leading-tight text-offWhite md:text-4xl lg:text-5xl xl:text-6xl">
          {text}
        </h1>

        <Link
          href={routes.home}
          className="sora-bold mt-10 border-2 px-10 py-3 text-base text-white transition-opacity duration-150 hover:opacity-90 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-white sm:px-20 md:text-xl"
          style={{
            background:
              "radial-gradient(rgba(255, 255, 255, 0.4), rgba(255, 255, 255, 0.2641), rgba(255, 255, 255, 0))",
            filter: "drop-shadow(5px 10px 4px rgba(0, 0, 0, 0.5))",
          }}
        >
          GO HOME
        </Link>
      </div>
    </div>
  );
}
