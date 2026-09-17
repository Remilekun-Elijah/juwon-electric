import PageIntro from "@/components/storefront/PageIntro";
import CartSkeleton from "@/components/storefront/cart/CartSkeleton";

export default function Loading() {
  return (
    <>
      <PageIntro eyebrow="Cart" title="Your cart" headingAs="p" />
      <CartSkeleton />
    </>
  );
}
