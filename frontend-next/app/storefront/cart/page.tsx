import type { Metadata } from "next";
import PageIntro, { INTRO_IMAGES } from "@/components/storefront/PageIntro";
import CartView from "@/components/storefront/cart/CartView";

export const revalidate = 60;

export const metadata: Metadata = {
  title: "Your cart",
  description: "Review the packages and products in your cart, then check out.",
  alternates: { canonical: "/cart" },
  robots: { index: false, follow: true },
};

/** `/cart`: static shell with the stored cart rendered by a client island (the cart lives in the browser). */
export default function Page() {
  return (
    <>
      <PageIntro
        eyebrow="Cart"
        title="Your cart"
        description="Review the packages and products in your cart, then check out. We’ll call you to confirm before anything is delivered."
        image={INTRO_IMAGES.home}
        quick
      />
      <CartView />
    </>
  );
}
