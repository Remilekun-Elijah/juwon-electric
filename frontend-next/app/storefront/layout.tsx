import FloatingActions from "@/components/storefront/FloatingActions";
import LiveRefresh from "@/components/storefront/LiveRefresh";
import StoreFooter from "@/components/storefront/StoreFooter";
import StoreHeader from "@/components/storefront/StoreHeader";
import { getStoreChromeSettings } from "@/lib/storefront/data";

/**
 * Storefront chrome (docs/agents/fe-storefront.md). Served at public paths through proxy.ts; `/storefront/*` itself
 * redirects. Plus Jakarta Sans on slate-50 like the admin console, skip link, sticky header, main landmark, footer,
 * LiveRefresh for near-realtime updates, and the floating actions (load calculator and WhatsApp, TEAM_AND_MOTION_V1 §7.4).
 */
export default async function StorefrontLayout({ children }: LayoutProps<"/storefront">) {
  const settings = await getStoreChromeSettings();

  return (
    <div className="flex min-h-screen flex-1 flex-col bg-slate-50 font-sans text-slate-900 antialiased">
      <a
        href="#store-main"
        className="sr-only z-50 rounded-md bg-white px-4 py-3 text-sm font-medium text-brand-700 shadow-elev-4 focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-brand-500"
      >
        Skip to content
      </a>
      <StoreHeader phone={settings.business.phone} calculatorEnabled={Boolean(settings.calculator)} />
      <main id="store-main" tabIndex={-1} className="flex-1 focus:outline-hidden">
        {children}
      </main>
      <StoreFooter settings={settings} />
      <FloatingActions whatsappNumber={settings.website.whatsappNumber} calculatorEnabled={Boolean(settings.calculator)} />
      <LiveRefresh />
    </div>
  );
}
