import PageIntro from "@/components/storefront/PageIntro";
import CartSkeleton from "@/components/storefront/cart/CartSkeleton";

export default function Loading() {
  return (
    <>
      <PageIntro eyebrow="Checkout" title="Checkout" headingAs="p" />
      <CartSkeleton variant="checkout" label="Loading checkout" />
    </>
  );
}
