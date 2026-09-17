"use client";

import { useState } from "react";
import type { Package } from "@/lib/api/types";
import AddToCartDialog from "./AddToCartDialog";
import PackageCard from "./PackageCard";

/** Client island for `packages/[id]`: the package card with its add-to-cart dialog. */
export default function PackageDetailActions({ item }: { item: Package }) {
  const [product, setProduct] = useState<Package | null>(null);
  return (
    <>
      <PackageCard item={item} onAdd={setProduct} detail headingLevel="h2" />
      <AddToCartDialog product={product} onClose={() => setProduct(null)} />
    </>
  );
}
