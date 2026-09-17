import type { Metadata } from "next";
import PageIntro from "@/components/storefront/PageIntro";
import CartView from "@/components/storefront/cart/CartView";

export const revalidate = 60;

export const metadata: Metadata = {
  title: "Your cart",
  description: "Review your packages, choose with or without solar, and check out.",
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
        description="Review your packages, choose with or without solar, and check out. We’ll call you to confirm before anything is delivered."
      />
      <CartView />
    </>
  );
}
