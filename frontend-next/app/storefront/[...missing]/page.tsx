import { notFound } from "next/navigation";

/** Any storefront path without a page renders app/storefront/not-found.tsx inside the storefront chrome (404). */
export default function MissingStorefrontPage() {
  notFound();
}
