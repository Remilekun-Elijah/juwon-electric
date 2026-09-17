import type { MetadataRoute } from "next";
import { SITE_URL, routes } from "@/lib/site";

/** Crawl everything public; keep the admin portal and the per-visitor cart out of search (FE_ACCEPTANCE §C). */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: "*", allow: "/", disallow: ["/admin", "/admin/", routes.cart] }],
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
