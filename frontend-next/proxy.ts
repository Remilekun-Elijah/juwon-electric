import { NextResponse, type NextRequest } from "next/server";

/**
 * Public UI switch (docs/agents/fe-storefront.md §2.1).
 *
 * - `/storefront` and `/storefront/*` always redirect (308) to the same path without the prefix, so the storefront
 *   never has a second public URL.
 * - `NEXT_PUBLIC_PUBLIC_UI=classic`: nothing else happens and app/(public) serves the classic site.
 * - Anything else (the default): every matched path P is rewritten to `/storefront` + P, keeping the query string.
 *
 * The env value is read here directly (no app imports; proxy runs apart from render code). It is inlined at build time,
 * so switching modes needs a rebuild.
 */
const PREFIX = "/storefront";

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname === PREFIX || pathname.startsWith(`${PREFIX}/`)) {
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
  // Skip /admin, /api, Next internals and any path with a dot (static files, sitemap.xml, robots.txt, favicon.ico).
  // `admin` and `api` must be whole segments, so a page such as /apiary would still be matched.
  matcher: ["/((?!(?:admin|api)(?:/|$)|_next/|.*\\..*).*)"],
};
