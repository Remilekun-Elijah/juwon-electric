import { NextResponse, type NextRequest } from "next/server";

/**
 * Admin host split and public UI switch (docs/agents/fe-storefront.md §2.1).
 *
 * Admin host (`NEXT_PUBLIC_ADMIN_HOST`, e.g. admin.juwonelectric.com):
 * - Unset: `/admin` is served on every host, as before (local development).
 * - Set, on the admin host: `/admin/*` is served, `/` redirects to `/admin`, and any other path redirects to the same
 *   path on `NEXT_PUBLIC_SITE_URL`, so storefront links clicked from the admin still land on the public site.
 * - Set, on any other host: `/admin/*` renders the site's 404, so the admin is only reachable on its own host.
 *
 * Public UI:
 * - `/storefront` and `/storefront/*` always redirect (308) to the same path without the prefix, so the storefront
 *   never has a second public URL.
 * - `NEXT_PUBLIC_PUBLIC_UI=classic`: nothing else happens and app/(public) serves the classic site.
 * - Anything else (the default): every matched path P is rewritten to `/storefront` + P, keeping the query string.
 *
 * The env values are read here directly (no app imports; proxy runs apart from render code). They are inlined at build
 * time, so changing them needs a rebuild.
 */
const PREFIX = "/storefront";
const ADMIN = "/admin";
const ADMIN_HOST = (process.env.NEXT_PUBLIC_ADMIN_HOST ?? "").trim().toLowerCase();
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://www.juwonelectric.com";

const isUnder = (pathname: string, base: string) => pathname === base || pathname.startsWith(`${base}/`);

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const isAdminPath = isUnder(pathname, ADMIN);

  if (ADMIN_HOST) {
    const host = (request.headers.get("host") ?? "").split(":")[0].toLowerCase();

    if (host === ADMIN_HOST) {
      if (isAdminPath) return NextResponse.next();
      if (pathname === "/") {
        const url = request.nextUrl.clone();
        url.pathname = ADMIN;
        return NextResponse.redirect(url);
      }
      const target = new URL(pathname + request.nextUrl.search, SITE_URL);
      return NextResponse.redirect(target);
    }

    if (isAdminPath) {
      // A path with no page renders the 404 (with a 404 status) in the active public UI's chrome.
      const url = request.nextUrl.clone();
      url.pathname = process.env.NEXT_PUBLIC_PUBLIC_UI === "classic" ? "/_admin-not-found" : `${PREFIX}${ADMIN}`;
      return NextResponse.rewrite(url);
    }
  } else if (isAdminPath) {
    return NextResponse.next();
  }

  if (isUnder(pathname, PREFIX)) {
    const url = request.nextUrl.clone();
    url.pathname = pathname.slice(PREFIX.length) || "/";
    return NextResponse.redirect(url, 308);
  }

  if (process.env.NEXT_PUBLIC_PUBLIC_UI === "classic") return NextResponse.next();

  const url = request.nextUrl.clone();
  url.pathname = `${PREFIX}${pathname === "/" ? "" : pathname}`;
  return NextResponse.rewrite(url);
}

export const config = {
  // Skip /api, Next internals and any path with a dot (static files, sitemap.xml, robots.txt, favicon.ico).
  // `api` must be a whole segment, so a page such as /apiary would still be matched. /admin is matched so the proxy can
  // keep it on the admin host.
  matcher: ["/((?!api(?:/|$)|_next/|.*\\..*).*)"],
};
