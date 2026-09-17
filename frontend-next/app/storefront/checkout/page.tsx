import type { Metadata } from "next";
import PageIntro from "@/components/storefront/PageIntro";
import CheckoutView from "@/components/storefront/cart/CheckoutView";
import { getStoreSettings } from "@/lib/storefront/data";

export const revalidate = 60;

export const metadata: Metadata = {
  title: "Checkout",
  description: "Enter your delivery details and place your order. We’ll call you to confirm it.",
  alternates: { canonical: "/checkout" },
  robots: { index: false, follow: true },
};

/** `/checkout`: payment mode and contact details come from public settings; the cart and form are a client island. */
export default async function Page() {
  const settings = await getStoreSettings();

  return (
    <>
      <PageIntro
        eyebrow="Checkout"
        title="Checkout"
        description="Enter your delivery details and place your order. We’ll call you to confirm it before delivery."
      />
      <CheckoutView gatewayEnabled={settings.payments.gatewayEnabled} phone={settings.business.phone} />
    </>
  );
}
