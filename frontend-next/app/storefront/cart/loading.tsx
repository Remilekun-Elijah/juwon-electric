import PageIntro, { INTRO_IMAGES } from "@/components/storefront/PageIntro";
import CartSkeleton from "@/components/storefront/cart/CartSkeleton";

export default function Loading() {
  return (
    <>
      <PageIntro eyebrow="Cart" title="Your cart" headingAs="p" image={INTRO_IMAGES.home} />
      <CartSkeleton />
    </>
  );
}
