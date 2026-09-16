import type { Metadata } from "next";
import CartView from "@/components/public/cart/CartView";
import { routes } from "@/lib/site";

export const metadata: Metadata = {
  title: "Your cart",
  description: "Review your Juwon Electric packages and place your order.",
  alternates: { canonical: routes.cart },
  robots: { index: false, follow: true },
};

/** Cart and checkout (client-rendered from localStorage, FE_CONVENTIONS §4). */
export default function CartPage() {
  return <CartView />;
}
