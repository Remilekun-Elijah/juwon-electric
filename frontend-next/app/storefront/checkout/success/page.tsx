import type { Metadata } from "next";
import OrderReceived from "@/components/storefront/cart/OrderReceived";
import { getStoreSettings } from "@/lib/storefront/data";

export const revalidate = 60;

export const metadata: Metadata = {
  title: "Order received",
  description: "Thank you. We’ll call you to confirm your order, then arrange delivery and installation.",
  alternates: { canonical: "/checkout/success" },
  robots: { index: false, follow: true },
};

/**
 * `/checkout/success`: the order summary lives in the browser (sessionStorage), so the client island renders the page
 * header and body; the server passes the business contact details and payment mode from public settings.
 */
export default async function Page() {
  const settings = await getStoreSettings();

  return (
    <OrderReceived
      phone={settings.business.phone}
      email={settings.business.email}
      gatewayEnabled={settings.payments.gatewayEnabled}
    />
  );
}
