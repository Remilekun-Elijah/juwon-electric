import type { Metadata } from "next";
import PageIntro, { INTRO_IMAGES } from "@/components/storefront/PageIntro";
import CartView from "@/components/storefront/cart/CartView";
import { getStoreChromeSettings } from "@/lib/storefront/data";

export const revalidate = 60;

export const metadata: Metadata = {
  title: "Your cart",
  description: "Review the packages and products in your cart, then check out.",
  alternates: { canonical: "/cart" },
  robots: { index: false, follow: true },
};

/** `/cart`: static shell with the stored cart rendered by a client island (the cart lives in the browser). */
export default async function Page() {
  const settings = await getStoreChromeSettings();

  return (
    <>
      <PageIntro
        eyebrow="Cart"
        title="Your Cart"
        description="Review your selected solar packages and products before proceeding. Once your order is submitted, our team will contact you to confirm your requirements, payment and delivery or installation details."
        image={INTRO_IMAGES.home}
        quick
      />
      <CartView productsEnabled={settings.website.productsEnabled} />
    </>
  );
}
