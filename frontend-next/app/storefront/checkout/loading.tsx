import PageIntro, { INTRO_IMAGES } from "@/components/storefront/PageIntro";
import CartSkeleton from "@/components/storefront/cart/CartSkeleton";

export default function Loading() {
  return (
    <>
      <PageIntro eyebrow="Checkout" title="Checkout" headingAs="p" compact quick image={INTRO_IMAGES.commercial} />
      <CartSkeleton variant="checkout" label="Loading checkout" />
    </>
  );
}
