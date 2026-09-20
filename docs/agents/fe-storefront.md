# FE-STORE — v3 public storefront (new UI) · build spec

Branch: `agents/fe-storefront` (from `agents/fe-integration` 28e0e1d, plus `agents/fe-public` 4454048).
Worktree: `/private/tmp/claude-501/-Users-user-Documents-github-juwon-electric/c89e2ec8-b0d4-4738-be8d-61ad9401102e/scratchpad/storefront`.
App: `frontend-next/` (Next.js 16.3.5 App Router, React 19, Tailwind v4). **Read `frontend-next/AGENTS.md` first.** Next 16 has breaking changes, so check `node_modules/next/dist/docs/` before relying on memory, especially for `proxy.ts` (formerly middleware), `revalidateTag(tag, profile)`, async `params`/`searchParams`, and `PageProps<"/route">`/`LayoutProps` helpers.

## 1. Goal (from the owner)

1. **New public storefront by default.** It uses the same design language as the admin console and every screen serves a PRD purpose (`PRODUCT_REQUIREMENTS.md` §4–§7). It must line up exactly with the v3 backend contract: packages with product items, products and categories with attributes, stock status, services and customer segments, portfolio, vacancies, public settings, cart quote, order, contact, and subscribe.
2. **Old public UI behind an env switch.** `NEXT_PUBLIC_PUBLIC_UI=classic` serves the existing ported Vite-look site. Unset or any other value serves the new storefront. **Do not edit anything under `app/(public)/**` or `components/public/**`.** fe-public owns those files and is still fixing review findings in them.
3. **Near-realtime.** Anything created or changed in the admin console shows on the storefront on the next page view, and pages already open refresh within about a minute, or immediately when the admin is open in the same browser.

## 2. Architecture

### 2.1 Switch (no classic file edits)
- The storefront lives under a real segment: `app/storefront/**`.
- A new `proxy.ts` at `frontend-next/proxy.ts` (Next 16 proxy convention) does the following:
  - Mode is `process.env.NEXT_PUBLIC_PUBLIC_UI === "classic" ? "classic" : "storefront"`. Read the env directly in `proxy.ts`, without importing app modules.
  - Requests to `/storefront` or `/storefront/*` get a **308 redirect** to the path with that prefix stripped, in both modes. That avoids a duplicate public URL.
  - In `storefront` mode, rewrite every other matched path `P` to `/storefront` + (`P === "/" ? "" : P`), keeping the query string.
  - In `classic` mode, do nothing else.
  - Matcher: exclude `/admin`, `/api`, `/_next`, and any path containing a dot (static files, `sitemap.xml`, `robots.txt`, `favicon.ico`). Suggested: `["/((?!admin|api|_next|.*\\..*).*)"]`, then verify with curl.
- `lib/config.ts` gains `publicUi: "classic" | "storefront"` (same rule) for server and client code that needs it.
- The storefront 404 lives at `app/storefront/[...missing]/page.tsx`, which calls `notFound()`, plus `app/storefront/not-found.tsx` inside the storefront chrome.
- Every storefront page's metadata sets `alternates.canonical` to the **public** path (never `/storefront/...`). `app/sitemap.ts` and `app/robots.ts` stay shared. Add `/checkout` only if it becomes indexable (it shouldn't: noindex).
- Document the variable in `frontend-next/README.md` and `.env.example`.

### 2.2 Data layer: `lib/storefront/data.ts` (server-only; `import "server-only"` if the package exists, otherwise a comment)
- `STORE_REVALIDATE = 60` seconds (time-based safety net). Route segment configs that need a literal use `export const revalidate = 60`.
- Tags (the complete allowlist, exported as `STORE_TAGS`): `store`, `packages`, `products`, `categories`, `services`, `portfolio`, `vacancies`, `settings`.
- `storeRead<T>(label, request, { tags, fallback? })`:
  - Calls the existing `lib/api/public.ts` helpers with `{ next: { revalidate: 60, tags: ["store", ...tags] }, signal: AbortSignal.timeout(8000) }`.
  - A 404 returns `null`, and callers use `notFound()`.
  - Any other failure:
    - **during `next build`** (`process.env.NEXT_PHASE === "phase-production-build"`): log a warning and return `fallback` (from `lib/fallbacks`) if one is given, otherwise an empty value. This way the build passes with the backend down.
    - **at runtime:** rethrow. Do **not** return fallback data. That makes Next keep serving the last good cached page during an outage instead of caching fallback content over real data (this fixes review finding FP-03 for the storefront). A page with no cache entry shows the storefront `error.tsx` with a retry button.
- Typed getters: `getStorePackages`, `getStorePackage(id)`, `getStoreCategories`, `getStoreProducts(query)`, `getStoreProduct(slugOrId)`, `getStoreServices`, `getStorePortfolio`, `getStoreVacancies(query)`, `getStoreVacancy(slug)`, `getStoreSettings`.
- `getStoreSettings` falls back to `contactFallback` from `lib/site.ts` per field when the value is null. That is display data, not a cache-poisoning risk, because the settings response itself is real.
- Reuse the pure helpers in `lib/catalog.ts`, `lib/packages.ts`, `lib/vacancies.ts`, `lib/format.ts`, `lib/sanitize.ts` and `lib/fallbacks`. Don't duplicate them.

### 2.3 On-demand revalidation (the admin console makes the storefront update)
- **Route handler** `app/api/storefront/revalidate/route.ts` (`POST`):
  - Body `{ tags: string[] }`.
  - Requires the admin session token from `Authorization: Bearer <token>` or `x-admin-token`.
  - Verifies it server-side by calling `${backendUrl}/admin/auth/me` with `cache: "no-store"` and a 5 s timeout. Non-200 → `401 { success:false, message:"Unauthorized." }`.
  - Filters tags to `STORE_TAGS`, always adds `store`, and calls `revalidateTag(tag, { expire: 0 })` for each.
  - Responds `200 { success:true, message:"Storefront refreshed.", data:{ tags } }`.
  - Only POST (405 otherwise). Body capped at 2 KB (400 on anything else).
- **Client notifier** `lib/storefront/notify.ts`:
  - `tagsForAdminWrite(method, path): string[]`. Rules, by path prefix after the query string is stripped:
    - `/admin/packages`: `packages`, `products`
    - `/admin/services` (including `/customer-segments`): `services`
    - `/admin/portfolio`: `portfolio`
    - `/admin/products`: `products`, `packages`, `categories`
    - `/admin/categories`: `categories`, `products`
    - `/admin/inventory`: `products`, `packages`
    - `/admin/orders`: `products`, `packages` (stock moves on fulfilment)
    - `/admin/vacancies`: `vacancies`
    - `/admin/settings`: `settings`
    - anything else, or `GET`: `[]`
  - `notifyStorefront(method, path, token)`: if the tag list isn't empty, fire `fetch("/api/storefront/revalidate", { method:"POST", keepalive:true, headers:{Authorization:`Bearer ${token}`,"Content-Type":"application/json"}, body })`, ignoring errors. On success it posts `{ type:"refresh", tags }` on `BroadcastChannel("je-storefront")` (guard `typeof BroadcastChannel`).
- **Admin hook (the only admin edit allowed):** in `lib/api/admin.ts` `adminFetch`, after a successful response for a non-GET method, call `notifyStorefront(method, path, token)`. Keep it to one import plus a few lines, and don't change any other behaviour.
- **Live refresh:** `components/storefront/LiveRefresh.tsx` (client), mounted once in the storefront layout. It calls `router.refresh()`:
  1. on `visibilitychange` to visible, if more than 15 s have passed since the last refresh
  2. every 60 s while the page is visible
  3. immediately on a `BroadcastChannel("je-storefront")` refresh message
  It must not refresh while the user is typing in a form (skip when `document.activeElement` is an input, textarea or select). It renders nothing.

### 2.4 Cart and orders (unchanged contract)
- Reuse `lib/cart/store.ts` (`useCart`, `addToCart`, `updateCart`, `removeFromCart`, `clearCart`, `getCartItemKey`, `isCartFull`, `isWithSolar`), `lib/cart/orderItems.ts`, `lib/cart/useCartQuote.ts`, `lib/turnstile/useTurnstile.ts`, `lib/validation.ts` and `lib/api/public.ts` mutations.
- The storage key and cart item shape are unchanged, so a cart made in classic mode works in the storefront and the other way round. `/cart/quote` and `/order` payloads must stay byte-identical to classic.
- Only **packages** are purchasable (the order API prices package options). Products are a catalogue with specs and stock status. Their call to action is to enquire (Contact prefilled with the product name) or to see the packages that include the product.

## 3. Design language (match the admin console)

Reference screenshots: `/Users/user/Documents/github/juwon-electric/docs/reviews/v3/screens/admin/next-dashboard-1280.png`, `next-login-1280.png`, `next-orders-1280.png`, `next-order-details-1280.png`. Admin components to mirror: `components/admin/AdminShell.tsx`, `AdminLogin.tsx`, `components/admin/dashboard/Dashboard.tsx`, and the kit `components/ui/*` (import from `@/components/ui`).

- **Font:** `font-sans` (Plus Jakarta Sans), set on the storefront layout wrapper (the root body uses Inter for classic).
- **Surfaces:**
  - Page background: `bg-slate-50`.
  - Content cards: `bg-white rounded-2xl border border-slate-200 shadow-elev-1`, `p-5 sm:p-6`.
  - Section spacing: `py-14 sm:py-20`.
  - Container: `mx-auto max-w-7xl px-4 sm:px-6 lg:px-8`.
- **Type:**
  - Eyebrow: `text-xs font-semibold uppercase tracking-[0.14em] text-brand-700`.
  - H1: `text-3xl sm:text-4xl lg:text-5xl font-semibold tracking-tight text-slate-900`.
  - H2: `text-2xl sm:text-3xl font-semibold tracking-tight text-slate-900`.
  - Body: `text-slate-600`. Meta: `text-sm text-slate-500`.
  - Every page has exactly one `h1`, and headings don't skip levels.
- **Brand:**
  - Primary actions use the kit `Button` (brand).
  - Text links: `text-brand-700 hover:text-brand-800 font-medium`.
  - Feature and hero panels copy the admin login panel: `bg-brand-800 text-white`, a soft decorative ring (`rounded-full border-[48px] border-white/5`, absolutely positioned) and white text.
  - Brand colours only (`brand-*`, `slate-*`, and the existing tokens). No new hex colours, no gradients beyond the brand panel, no dark mode.
- **Status:** use kit `Badge`/`StatusBadge` ("In stock" green, "Out of stock" slate, "Low stock" is never shown publicly, "Open role", employment type).
- **Icons:** `lucide-react`, plain everyday objects only: `Sun`, `BatteryCharging`, `Zap`, `PlugZap`, `Wrench`, `Truck`, `ShieldCheck`, `Phone`, `Mail`, `MapPin`, `ShoppingCart`, `Package`, `Briefcase`, `Clock`, `CheckCircle2`, `ArrowRight`, `Search`, `Filter`, `Home`, `Building2`, `Factory`. **Never** use AI-looking icons (`Sparkles`, `Wand`, `Bot`, `Brain`, `Stars`, `Cpu` as decoration). The owner explicitly asked for this.
- **Images:** `next/image` with a sized container, `alt` text, and `sizes`. Assets already exist in `public/` (`panel-1..6.webp`, `engineer.svg`, `header.svg`, `logo.svg`, `portfolio-*.svg`, etc.). API image URLs need `images.remotePatterns` (check `next.config.ts`; if an API host isn't allowed, use `components/public/SiteImage.tsx`'s approach or `unoptimized`). **No background videos.**
- **Motion:** `animate-fade-up` for section entrances only, disabled under `motion-reduce:`.
- **States:** every data view has loading (`loading.tsx` with kit `Skeleton`), empty (kit `EmptyState`) and error (`error.tsx` with retry) states.
- **A11y:** skip link, landmarks, visible focus rings (`focus-visible:ring-2 ring-brand-500`), 44 px touch targets on mobile, labels on every input, `aria-live` for cart count changes, and dialogs from the kit.
- **Responsive:** design mobile-first. Check at 375, 768 and 1280 px, with no horizontal scroll at 375.
- **Copy:** plain, specific, Nigerian customer context (₦, Lagos, NEPA outages, kVA). No lorem ipsum.

## 4. Information architecture (public URLs; the files live under `app/storefront`)

| URL | PRD purpose | Content |
|---|---|---|
| `/` | §5 customer: discover and buy | Brand hero ("Reliable power for homes and businesses", CTAs "View Packages" and "Chat on WhatsApp" (or "Talk to an engineer" when WhatsApp is unset), trust points), "Find your package" (tabs by category with the 3 cheapest-to-premium cards), shop by category (top-level categories with counts), featured products (first 8 in stock), how it works (Choose → Order → We install, with fulfilment steps), services and customer segments, recent installations (portfolio), careers teaser (open roles count, if any), contact band with settings phone, email and address |
| `/packages` | §6.1 packages | Filter by category (the categories the packages use) and kVA range (?category=<slug>, legacy ?type= still honoured), sort by price. Cards show name, kVA, volt, load description, "from ₦" price, solar option available, and "What's included" count (items). Client-side filtering of server data |
| `/packages/[id]` | §5 view details, compare | Title, load and "what it powers", option selector (without and with solar, price per option), add to cart, **what's included**: `items` with quantity, product name linking to `/products/[slug]` and SKU, plus the kits text. Installation note, related packages (same type) |
| `/products` | §6.1 products | Category sidebar (tree, collapsible on mobile), search `q`, pagination (24 per page) via `searchParams`. Card: image, brand, name, key attributes (first 2 from the category schema), price, in-stock badge |
| `/products/category/[slug]` | categories | Same listing scoped to the category (including descendants), with breadcrumb and description |
| `/products/[slug]` | §5 product specs | Gallery, brand and SKU, price, stock badge, a specs table (`attributeRows` with the category schema), sanitised description (`lib/sanitize.ts` via `components/public/RichText.tsx`, or a storefront equivalent that uses the same sanitiser), "Included in these packages" (packages whose `items` include this product id) and "Ask about this product" (link to `/contact?topic=<name>`). JSON-LD `Product` |
| `/services` | services | Offerings (title, subtitle, image, CTA) and customer segments ("Who we power") |
| `/portfolio` | social proof | Grid of installations, with a featured item first |
| `/vacancies` | §6.5 public listing | Filters for department and employment type. Cards: title, department, location, type, salary range, posted date |
| `/vacancies/[slug]` | §6.5 detail | Sanitised description, responsibilities, requirements, meta sidebar, "Apply" (mailto the settings business email with the subject "Application: <title>", or fallback email). JSON-LD `JobPosting` (omit if the location is missing, and note the gap) |
| `/contact` | lead capture | Form (name, phone, email, message, Turnstile `contact`), prefilled from `?topic=`. Business details from settings, social links (`lib/site.ts socials`) and opening hours copy |
| `/cart` | §6.1 cart | Lines (package, option, with or without solar toggle, quantity stepper, remove), server quote via `useCartQuote` (unavailable lines flagged), subtotal, "Checkout" |
| `/checkout` | §6.1 checkout | Delivery details form (the same fields and validation as classic `components/public/cart/CheckoutForm.tsx`), order summary with the server quote, a payment note driven by `settings.payments.gatewayEnabled` (false: "No payment now: we'll call to confirm and arrange payment"; true: "You'll receive a secure payment link after we confirm your order"), Turnstile `order`, and place order. `noindex` |
| `/checkout/success` | confirmation | Reads the last placed order summary from `sessionStorage["je/last-order"]` (written by checkout): "Order received", total, what happens next (confirmation call → processing → delivery → installation). Empty state if missing. `noindex` |

- **Header (sticky, white, bottom border):** logo, nav (Packages, Products, Services, Our work, Careers, Contact), phone (from settings) on desktop, and a cart button with a live count badge. Mobile uses a kit `Drawer`.
- **Footer (white or slate-900? use white with a top border to match the admin):** columns Shop / Company / Contact, newsletter subscribe (Turnstile `subscribe`, reusing the `lib/api/public.ts` `subscribe` call), socials, © year.

## 5. Ownership (parallel agents: touch only your own files)

| Agent | Owns (create and edit) |
|---|---|
| **S0 Foundation** (runs first) | `proxy.ts`, `lib/config.ts` (`publicUi` only), `lib/storefront/**`, `app/api/storefront/**`, the one-line hook in `lib/api/admin.ts`, `app/storefront/layout.tsx`, `app/storefront/error.tsx`, `app/storefront/not-found.tsx`, `app/storefront/[...missing]/page.tsx`, `components/storefront/{StoreHeader,StoreFooter,LiveRefresh,Section,PageIntro,BrandPanel,Breadcrumbs,PriceTag,StockBadge,JsonLd}.tsx`, `components/storefront/cart/CartButton.tsx`, README and `.env.example` docs, and **placeholder `page.tsx` files for every route in §4**, each rendering a `PageIntro` with the page title so every URL resolves |
| **S1 Catalogue** | `app/storefront/packages/**`, `app/storefront/products/**`, `components/storefront/catalog/**` (`PackageCard`, `PackageFilters`, `ProductCard`, `CategoryNav`, `SpecsTable`, `ProductGallery`, `PackageOptionPicker`) |
| **S2 Commerce** | `app/storefront/cart/**`, `app/storefront/checkout/**`, `components/storefront/cart/**` except `CartButton` (`AddToCartButton`, `CartLines`, `OrderSummary`, `CheckoutForm`, `PaymentNote`) |
| **S3 Content** | `app/storefront/page.tsx` (home), `app/storefront/services/**`, `app/storefront/portfolio/**`, `app/storefront/vacancies/**`, `app/storefront/contact/**`, `components/storefront/home/**`, `components/storefront/content/**` |

**Shared contract between S1 and S2:** `components/storefront/cart/AddToCartButton.tsx` exports `default function AddToCartButton(props: { pkg: Package; optionIndex?: number; className?: string; size?: "sm" | "md" | "lg" })`.
- It adds the package with the chosen option to the cart in the exact classic shape. Copy the mapping from `components/public/packages/AddToCartDialog.tsx`.
- It shows a toast with a "View cart" action, and handles a full cart (`isCartFull`) with an explanatory toast.
- S0 creates a working minimal version, S2 finishes it, and S1 imports it.

## 6. Rules for every agent
- Follow `docs/agents/FE_CONVENTIONS.md` on `agents/fe-supervisor` (`git show agents/fe-supervisor:docs/agents/FE_CONVENTIONS.md`):
  - no `fetch(` outside `lib/api/**` and `lib/storefront/**`
  - no `process.env` outside `lib/config.ts`, `lib/api/client.ts`, `next.config.ts` and `proxy.ts`
  - `"use client"` only where needed
  - TypeScript strict, with no `any` and no `eslint-disable`
- **Hidden characters:** the Write/Edit tools turn `\uXXXX` in tool input into raw characters. Never type `\u` escapes in tool input. If you need one, write the file with a script. Before every commit, run `node scripts/check-chars.mjs` if it exists in `frontend-next/scripts`, or a Cc/Cf scan of your files.
- **Checks:** don't run `next build` or `next dev` while other agents are working, because the `.next` directory is shared. Check your work with `npx tsc --noEmit -p .` (ignore errors in files you don't own, but report them) and `npx eslint <your paths>`.
  - The integrator runs the build.
  - If you need to see a page, ask in your final report instead of starting a server.
- **Commits:** commit only your own paths (`git add <paths>`, never `git add -A`), in small conventional commits (`feat(storefront): …`). If `index.lock` is busy, wait and retry. **No `Co-Authored-By` or Claude attribution lines.** Never push, rebase, reset or stash.
- **Scope:** don't touch `app/(public)/**`, `components/public/**`, `app/admin/**`, `components/admin/**` or `backend/**`, except S0's single hook in `lib/api/admin.ts`.
- Your final message must list: files created, commits (hashes), checks run with results, open questions, and anything you stubbed.
