import { IntroSkeleton, ProductListingSkeleton } from "@/components/storefront/catalog/CatalogSkeletons";

export default function Loading() {
  return (
    <>
      <IntroSkeleton breadcrumbs />
      <ProductListingSkeleton />
    </>
  );
}
