import Footer from "@/components/public/Footer";
import Navbar from "@/components/public/Navbar";

/** Public site chrome: skip link, fixed Navbar, main landmark, Footer. `app/admin` stays outside this group. */
export default function PublicLayout({ children }: LayoutProps<"/">) {
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
