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

Only `lib/config.ts` and `lib/api/client.ts` read `process.env`. Components never do.

## Rendering

- Public marketing pages are server components, statically generated and revalidated every 300 seconds (ISR). If the
  API is unreachable at build time, pages render the same local fallbacks as the Vite site and the build still passes.
- The cart lives in `localStorage["je/cart"]` in the Vite shape, so carts saved by the old site still load.
- `app/admin/**` is client-rendered only and never fetches at build time.

## Deploying on Vercel

1. Import the repository and set **Root Directory** to `frontend-next`. The framework preset is detected as Next.js.
2. Set `NEXT_PUBLIC_BACKEND_URL`, `NEXT_PUBLIC_SITE_URL` and (optionally) `NEXT_PUBLIC_TURNSTILE_SITE_KEY` for the
   Production and Preview environments. Do **not** set `NEXT_PUBLIC_ADMIN_PREVIEW` in Production.
3. Allow the site origin in the API's CORS settings, and add the site hostname to the Turnstile widget if it is enabled.
4. Deploy. Content edits in the admin appear on public pages within about 5 minutes (ISR), or on the next deploy.
