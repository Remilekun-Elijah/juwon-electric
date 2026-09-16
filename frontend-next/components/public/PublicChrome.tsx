import type { ReactNode } from "react";
import Footer from "./Footer";
import Navbar from "./Navbar";

/** Skip link, fixed Navbar, main landmark and Footer. Shared by the (public) layout and the root 404 page. */
export default function PublicChrome({ children }: { children: ReactNode }) {
  return (
    <>
      <a
        href="#main"
        className="sr-only z-[60] rounded-md bg-white px-4 py-2 font-medium text-deep_red shadow-lg focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-brand-500"
      >
        Skip to main content
      </a>
      <Navbar />
      <main id="main" tabIndex={-1} className="flex-1 focus:outline-hidden">
        {children}
      </main>
      <Footer />
    </>
  );
}
