# Juwon Electric — Next.js frontend (`frontend-next`)

The public site and admin portal for Juwon Electric, on the Next.js App Router (Next 16, React 19, Tailwind CSS v4).
It replaces the Vite app in `frontend/`. Project rules: `docs/agents/FE_CONVENTIONS.md` on `agents/fe-supervisor`.

## Getting started

```bash
cd frontend-next
npm ci
cp .env.example .env.local   # or create .env.local with the variables below
npm run dev                  # http://localhost:3000
```

Run the API alongside it (`cd backend && npm run dev`, port 9000).

| Script | What it does |
| --- | --- |
| `npm run dev` | Development server |
| `npm run build` | Production build (also type-checks) |
| `npm start` | Serve the production build |
| `npm run lint` | ESLint |

## Environment variables

All are public (`NEXT_PUBLIC_*`): Next.js inlines them into the client bundle at **build time**, so change them in
the hosting settings and rebuild. Never put secrets here. Backend secrets (database, SMTP, admin auth) belong to the API
deployment, not this app.

| Variable | Required | Example | Used for |
| --- | --- | --- | --- |
| `NEXT_PUBLIC_BACKEND_URL` | Yes in production | `https://api.juwonelectric.com` | Base URL of the Express or Cloudflare Worker API, no trailing slash. Defaults to `http://localhost:9000`. Read only in `lib/api/client.ts`. |
| `NEXT_PUBLIC_SITE_URL` | Yes in production | `https://juwonelectric.com` | Canonical origin for `metadataBase`, Open Graph URLs, `sitemap.xml` and `robots.txt`. Defaults to `https://juwonelectric.com`. Read in `lib/config.ts`. |
| `NEXT_PUBLIC_TURNSTILE_SITE_KEY` | No | `0x4AAAAAAA…` | Cloudflare Turnstile on contact, newsletter and order forms. Unset disables Turnstile (no script, no widget, no token); the API must then also run without Turnstile. Read in `lib/config.ts`. |
| `NEXT_PUBLIC_ADMIN_PREVIEW` | No — **dev only, never in production** | `true` | When exactly `true`, the admin falls back to contract mocks for API routes that don't exist yet (`404 "Route not found."`). Anything else, including unset, is off. Read in `lib/config.ts` (`config.adminPreview`). |
| `NEXT_PUBLIC_PUBLIC_UI` | No | `classic` | Which public site to serve. Unset (or any value other than `classic`) serves the new storefront in `app/storefront`; `classic` serves the ported Vite-look site in `app/(public)`. Applied by `proxy.ts` and exposed as `config.publicUi`. Rebuild after changing it. |

Only `lib/config.ts`, `lib/api/client.ts`, `next.config.ts` and `proxy.ts` read `process.env`. Components never do.

## Public routes

| Route | Rendering | Data |
| --- | --- | --- |
| `/` | Static, ISR 5 min | `GET /portfolio?featured=true` (fallback: Vite tiles) |
| `/services` | Static, ISR 5 min | `GET /services` (fallback: Vite offerings and customers) |
| `/portfolio` | Static, ISR 5 min | `GET /portfolio` (fallback: Vite tiles) |
| `/packages`, `/packages/[id]` | Static + `generateStaticParams`, ISR 5 min | `GET /packages`, `GET /packages/:id` (fallback: `lib/fallbacks/plans.json`) |
| `/products`, `/products/page/[page]`, `/products/category/[slug]`, `/products/[slug]` | Static + `generateStaticParams`, ISR 5 min | `GET /categories`, `GET /products` (empty catalogue until the API serves them) |
| `/vacancies`, `/vacancies/[slug]` | Static + `generateStaticParams`, ISR 5 min | `GET /vacancies`, `GET /vacancies/:slug` (open roles only) |
| `/contact` | Static, ISR 5 min | `GET /settings/public` for business details; form posts `POST /contact` |
| `/cart` | Static shell, client cart | `localStorage["je/cart"]`, `POST /cart/quote`, `POST /order` |
| `/sitemap.xml`, `/robots.txt` | Generated, revalidated every 5 min | Pages, packages, open vacancies, categories, first 100 products |

- Every server read goes through `lib/api/server.ts`: an 8-second timeout, a logged warning, and a local fallback. If the
  API is unreachable at build time the build still passes and pages show the Vite fallbacks (or an empty state).
- The cart lives in `localStorage["je/cart"]` in the Vite shape, so carts saved by the old site still load, and the
  `/cart/quote` and `/order` request bodies are unchanged.
- Rich text (vacancy and product descriptions) is sanitised again on render by `lib/sanitize.ts`, a port of the API's
  `backend/shared/richText.js`, and styled by `.prose-je`.
- `app/admin/**` is client-rendered only and never fetches at build time.

## Public UI switch and near-realtime storefront

Two public sites ship in the same build, and `NEXT_PUBLIC_PUBLIC_UI` picks one:

| Value | Served at `/`, `/packages`, … | Source |
| --- | --- | --- |
| unset, or anything but `classic` (default) | New storefront, in the admin console's design language | `app/storefront/**`, `components/storefront/**` |
| `classic` | Ported Vite-look site | `app/(public)/**`, `components/public/**` |

- `proxy.ts` does the switch. In storefront mode it rewrites every public path `P` to `/storefront` + `P`, keeping
  the query string. It skips `/admin`, `/api`, `/_next` and any path with a dot, such as `sitemap.xml`, `robots.txt`
  and files in `public/`.
- `/storefront/*` always redirects (308) to the path without the prefix, in both modes, so there is only one public
  URL per page. Storefront pages set `alternates.canonical` to the public path.
- `sitemap.xml` and `robots.txt` are shared by both modes. The cart and checkout pages are `noindex`.
- Unknown paths in storefront mode render the storefront 404 (`app/storefront/[...missing]` → `not-found.tsx`).
- The cart (`localStorage["je/cart"]`) and the `/cart/quote` and `/order` payloads are the same in both modes, so a
  cart carries over when you switch.
- The value is inlined at build time: rebuild and redeploy after changing it.

### How admin changes reach the storefront

1. **Every storefront read is cached for 60 seconds** and tagged (`lib/storefront/data.ts`, tags `store`, `packages`,
   `products`, `categories`, `services`, `portfolio`, `vacancies`, `settings`). Without anything else, a change shows
   within about a minute.
2. **Admin writes expire the cache straight away.** After a successful non-GET request, `adminFetch` calls
   `notifyStorefront` (`lib/storefront/notify.ts`). That posts the affected tags to `POST /api/storefront/revalidate`
   with the admin session token. The route checks the token against `GET /admin/auth/me` on the API, then calls
   `revalidateTag(tag, { expire: 0 })`, so the next page view reads fresh data.
3. **Open storefront tabs refresh themselves.** `LiveRefresh` (mounted in the storefront layout) calls
   `router.refresh()` every 60 seconds while the tab is visible and when the tab becomes visible again. It also
   refreshes immediately when the admin console in the same browser broadcasts a change on the `je-storefront`
   `BroadcastChannel`. It never refreshes while a visitor is typing in a form.

If the API is down **during `next build`**, storefront reads log a warning and use local fallbacks, so the build still
passes. **At runtime** a failed read is not replaced with fallback data: Next keeps serving the last good cached page,
and a page with no cached copy shows the storefront error page with a "Try again" button. The header and footer are
the one exception: if only the settings read fails they show the contact details from `lib/site.ts`.

`POST /api/storefront/revalidate` is safe to call by hand when you need to force a refresh:

```bash
curl -X POST https://juwonelectric.com/api/storefront/revalidate \
  -H "Authorization: Bearer <admin session token>" \
  -H "Content-Type: application/json" \
  -d '{"tags":["products"]}'
```

It answers `401` without a valid admin token, `400` for a body that isn't `{ "tags": [...] }` or is over 2 KB, and
`405` for methods other than POST. Unknown tags are ignored, and `store` (every storefront read) is always included.

## SEO and accessibility

- Per-page titles, descriptions, canonical URLs and Open Graph data; JSON-LD `JobPosting` on vacancies and `Product` on
  products. `NEXT_PUBLIC_SITE_URL` must be the production origin or canonical URLs point to the default.
- `robots.txt` disallows `/admin` and `/cart` and links the sitemap. The cart and 404 pages are `noindex`.
- Skip link, one `<main>` per page, labelled forms, visible focus rings, keyboard-operable tabs, dialogs and carousels
  (with a pause button), and no decorative video when the visitor prefers reduced motion.
- Security headers (`X-Content-Type-Options`, `Referrer-Policy`, `X-Frame-Options`, `Permissions-Policy`) are set in
  `next.config.ts`. A Content-Security-Policy is not set yet.

## Deploying on Vercel

1. Import the repository and set **Root Directory** to `frontend-next`. The framework preset is detected as Next.js; no
   `vercel.json` is needed (the Vite app's SPA rewrites do not apply).
2. Set `NEXT_PUBLIC_BACKEND_URL`, `NEXT_PUBLIC_SITE_URL` and (optionally) `NEXT_PUBLIC_TURNSTILE_SITE_KEY` for the
   Production and Preview environments. Do **not** set `NEXT_PUBLIC_ADMIN_PREVIEW` in Production. For Preview
   deployments, set `NEXT_PUBLIC_SITE_URL` to the preview origin (or leave the default) so previews aren't indexed as
   production.
3. Allow the site origin in the API's CORS settings, and add the site hostname to the Turnstile widget if it is enabled.
4. Deploy. On the storefront (the default), admin edits show on the next page view and open pages refresh within about a
   minute (see "How admin changes reach the storefront"). On the classic site they appear within about 5 minutes (ISR).
   Because `NEXT_PUBLIC_*` values are inlined at build time, redeploy after changing any of them.
