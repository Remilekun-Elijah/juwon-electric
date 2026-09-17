/**
 * Admin write → storefront refresh (docs/agents/fe-storefront.md §2.3). Browser only; a no-op on the server.
 *
 * After a successful admin write, `adminFetch` calls `notifyStorefront`. It asks the revalidate route to expire the
 * affected cache tags, then tells open storefront tabs in this browser to refresh (LiveRefresh listens).
 * Kept free of app imports so lib/api/admin.ts stays light.
 */

export const STOREFRONT_CHANNEL = "je-storefront";
export const STOREFRONT_REVALIDATE_PATH = "/api/storefront/revalidate";

export type StorefrontRefreshMessage = { type: "refresh"; tags: string[] };

const RULES: [prefix: string, tags: string[]][] = [
  ["/admin/packages", ["packages", "products"]],
  ["/admin/services", ["services"]],
  ["/admin/portfolio", ["portfolio"]],
  ["/admin/products", ["products", "packages", "categories"]],
  ["/admin/categories", ["categories", "products"]],
  ["/admin/inventory", ["products", "packages"]],
  ["/admin/orders", ["products", "packages"]],
  ["/admin/vacancies", ["vacancies"]],
  ["/admin/settings", ["settings"]],
  ["/admin/faqs", ["faqs"]],
  ["/admin/testimonials", ["testimonials"]],
  ["/admin/clients", ["clients"]],
  ["/admin/team", ["team"]],
];

const matchesPrefix = (path: string, prefix: string) => path === prefix || path.startsWith(`${prefix}/`);

/**
 * Storefront cache tags affected by an admin request. `path` is the API path with or without the `/admin` prefix
 * (`/admin/products/1` and `/products/1` are the same); the query string is ignored. GET and unknown paths give `[]`.
 */
export function tagsForAdminWrite(method: string | undefined, path: string): string[] {
  if (!method || method.toUpperCase() === "GET" || method.toUpperCase() === "HEAD") return [];
  const bare = (path.split(/[?#]/)[0] || "").replace(/\/+$/, "");
  const full = bare.startsWith("/admin/") || bare === "/admin" ? bare : `/admin${bare.startsWith("/") ? "" : "/"}${bare}`;
  const rule = RULES.find(([prefix]) => matchesPrefix(full, prefix));
  return rule ? [...rule[1]] : [];
}

/** Fire-and-forget: expire the tags for this admin write and broadcast a refresh. Never throws. */
export function notifyStorefront(method: string | undefined, path: string, token: string): void {
  if (typeof window === "undefined" || !token) return;
  const tags = tagsForAdminWrite(method, path);
  if (!tags.length) return;

  fetch(STOREFRONT_REVALIDATE_PATH, {
    method: "POST",
    keepalive: true,
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ tags }),
  })
    .then((response) => {
      if (!response.ok || typeof BroadcastChannel === "undefined") return;
      const channel = new BroadcastChannel(STOREFRONT_CHANNEL);
      const message: StorefrontRefreshMessage = { type: "refresh", tags };
      channel.postMessage(message);
      channel.close();
    })
    .catch(() => {
      // The storefront still refreshes within its 60-second window.
    });
}
