import { DetailSkeleton, IntroSkeleton } from "@/components/storefront/catalog/CatalogSkeletons";

export default function Loading() {
  return (
    <>
      <IntroSkeleton breadcrumbs />
      <DetailSkeleton />
    </>
  );
}
