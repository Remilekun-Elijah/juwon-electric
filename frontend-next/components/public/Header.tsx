import Link from "next/link";
import { routes } from "@/lib/site";

/**
 * Video hero used by the inner public pages. Port of frontend/src/components/Header.jsx.
 * The background video is decorative motion with no controls, so it is not shown when the visitor prefers reduced
 * motion (the dark overlay keeps the heading readable on its own).
 */
export default function Header({ text }: { text: string }) {
  return (
    <div className="header-nav relative mt-0 h-[400px] max-h-[900px] w-full overflow-hidden bg-slate-900 lg:h-screen">
      <video autoPlay loop muted playsInline aria-hidden="true" className="header-video hidden h-full w-full object-cover motion-reduce:hidden! md:block">
        <source src="/background_video_desktop.mp4" type="video/mp4" />
      </video>
      <video autoPlay loop muted playsInline aria-hidden="true" className="header-video block h-screen w-screen object-cover motion-reduce:hidden! md:hidden">
        <source src="/background_video.mp4" type="video/mp4" />
      </video>
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
