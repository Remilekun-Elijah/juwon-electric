# FE-1 status — Public site port (`agents/fe-public`)

Rules: `agents/fe-supervisor:docs/agents/FE_CONVENTIONS.md` (rev 2), `FE_ACCEPTANCE.md`, `review-fe.md` (reviews 1–2).
Endpoints: `agents/be-supervisor:docs/agents/API_CONTRACT_V3.md`.

## Progress

| Ledger item | Status | Commits |
| --- | --- | --- |
| 1. Build green on base | Done on base | `d48b482` |
| 2. Brand system | Done (review 1 closed) | `b4a545f`, `8d2117b` |
| 3a. UI kit + `lib/api` | Done (review 1 closed) | `b6e901d`, `8e35473` (partly reverted), `8d2117b` |
| 3b. Layout (Navbar, Header, Footer) | Done | `0e03b90` |
| 4. Page port (landing, services, portfolio, packages + `[id]`, contact, cart/checkout) | Done, **awaiting review** | `f88de22` |
| — `adminPreview` config flag (FE-2 request) | Done, byte-identical to `agents/fe-admin` | `14f0b00`, `a2b053c` |
| 5. Vacancies SSG/ISR + sanitiser + `.prose-je` | Done, **awaiting review** | `233d036` |
| — Drawer/Dialog 44 px close target (FE-2 request) | Done | `a2b053c` |
| — `CustomerSegment` → `PublicCustomerSegment` (merge conflict) | Done | `8fa3773` |
| 6. Products & categories catalogue | Done, **awaiting review** | `afa1173` |
| 7. SEO, a11y, responsive, Vercel/README | Done, **awaiting review** | this commit |

## Verification (evidence for FE_ACCEPTANCE)

All scripts are throwaway (session scratchpad), run against `next build && next start`. `.next` was deleted after every build.

- **A. Build/lint:** `npm run build` passes. `npx eslint .` reports only the 5 base errors in `app/admin/vacancies/page.jsx`
  (FE-2 deletes it); FE-1 files have 0 errors and 0 warnings (the `vacancies/[slug]` warning is gone with the rewrite).
  `kit.typecheck.tsx` type-checks every kit export from strict `.tsx`.
- **A. Backend down:** clean build with `NEXT_PUBLIC_BACKEND_URL=http://127.0.0.1:9` passes; every read logs
  `[public] … unavailable (network) … using fallback`, and packages/services/portfolio render the Vite fallbacks.
- **A. Env/fetch:** `process.env` only in `lib/config.ts`, `lib/api/client.ts`, `next.config.ts`; `fetch(` only in
  `lib/api/client.ts`.
- **B. Cart/checkout (headless Chrome, 22/22):** add-to-cart dialog → `je/cart` item has the Vite fields; navbar badge; quantity
  and solar toggle persist; checkout quote runs; **`POST /cart/quote` and `POST /order` bodies are byte-identical to the
  Vite `toOrderItem` output** for the same cart (order mocked via CDP, no real order created); confirmation shows the
  server total; cart clears; a cart saved in the Vite shape (string quantity) renders; no console errors.
- **C. Rendering:** build output marks `/`, `/services`, `/portfolio`, `/packages`, `/contact`, `/vacancies`, `/products`
  as static with 5 m revalidate, and `/packages/[id]` (66), `/vacancies/[slug]`, `/products/*` as SSG (●). Unknown
  package/vacancy/product/category/page → 404.
- **C. Sanitiser:** `lib/sanitize.ts` passes all 30 fixtures in `agents/be-platform:backend/shared/__fixtures__/richText.json`.
  Product page with `<script>`, `onerror=` and `javascript:` in `descriptionHtml` renders only `<p>`, `<strong>`, a
  link without href and the https link.
- **C. SEO:** `sitemap.xml` (74 URLs locally: pages, packages, open vacancies, categories, products), `robots.txt`
  (disallow `/admin`, `/cart`), per-page metadata and canonicals, JobPosting and Product JSON-LD.
- **Catalogue (mock of contract §4, 19/19):** 24 per page + page 2, `/products/page/1` → 308, subcategory products on the
  parent category page, breadcrumb from `parentId`, specs labelled/unit-formatted from the category attribute schema.
- **F. A11y + responsive (headless Chrome, 33/33):** 11 pages × 375/768/1280 px: no horizontal overflow, exactly one `h1`
  in `<main>`, no skipped heading levels, no unnamed visible controls, no `img` without `alt`.

## Deviations and decisions for SUP-FE

1. **Checkout stays a dialog on `/cart`** (Vite behaviour), not a `/checkout` route.
2. **Navbar is unchanged from Vite** (no Products or Careers item). Both are linked from the Footer and the sitemap.
   Adding them to the Navbar is a product decision.
3. **Packages detail route is `packages/[id]`** (review note); URLs are `/packages/0` etc.
4. **Sanitiser is a port of BE-1's `richText.js`**, not `isomorphic-dompurify` (no jsdom dependency, byte-identical output
   to what the API stores). Keep it in sync with `backend/shared/richText.js`.
5. **No `zustand`:** the cart store is ~150 lines on `useSyncExternalStore`, avoiding a second install.
6. **Colour contrast (FE_ACCEPTANCE §F vs §B parity) — needs a decision.** Vite palette ratios on white:
   `#DB464C` (brand-500/600 buttons and links) 4.21:1, `faint #85793E` 4.37:1 (4.18 on offWhite), footer `#E67E82` on
   `deep_red` 3.75:1, `#878787` checkout labels 3.59:1, package load text `#e26767` 3.30:1 and `#EDA4A6` 2.01:1, white on
   the `#EDA4A6` "In Cart" button 2.01:1. Nearest AA shades: `#D24349`, `#7F743B`, `#EA9598`, `#767676`, `#BD5656`.
   Left as Vite until SUP-FE/owner decides; the tokens are fixed by §2.
7. **On-demand 404s for dynamic params stream** (Next 16): `/vacancies/unknown` returns status 404, `noindex` and the
   custom not-found in the RSC payload, but the HTML shell is empty until JS runs. Unmatched URLs and build-time 404s
   render full HTML with the site chrome.
8. **Services CTA** uses the record's `ctaLabel`/`ctaUrl` when the admin set them (Vite always showed "Let's go" →
   packages); the fallback is the Vite text and link.
9. **Icons:** MUI icons replaced by lucide (outline style) and inline SVG brand icons; filled House/Star/Phone where MUI
   was filled. Small visual difference, no layout change.
10. **Vite parity bug kept:** toggling "With solar" in the cart changes `price` but not `package` (the kits text sent in
    `/order`), exactly as Vite. Fixing it changes the order payload, so it needs a product decision.
11. **Remote images** from the CMS render with `unoptimized` (`components/public/SiteImage.tsx`) instead of an
    `images.remotePatterns` allowlist, because admins can use any https host.
12. **Env sample file** is `frontend-next/.env.example` (not `.env.local.sample`); it lists all four variables with the
    `NEXT_PUBLIC_ADMIN_PREVIEW` "dev only, never in production" note.
13. **Admin auth header:** FE-1 ships no admin client. `lib/api/admin.ts` is FE-2's (restore the seeded transport with
    `git show b6e901d:frontend-next/lib/api/admin.ts` if needed). Please drop it from the §1.1 checkout command.

## Shared files FE-2 re-syncs from this branch

`components/ui/**` (including `*.d.ts`, `fieldStyles.js`, `kit.typecheck.tsx`), `lib/cn.ts`, `lib/api/client.ts`,
`lib/api/index.ts`, `lib/api/public.ts`, `lib/api/types.ts`, `lib/config.ts`, `lib/sanitize.ts`, `package.json`,
`package-lock.json`.

Kit changes since review 2: Dialog/Drawer close buttons have a 44 px hit area (`a2b053c`). No prop API changes.

## Dependencies

Approved in rev 2 and committed in `b6e901d`: `lucide-react`, `@headlessui/react`, `sonner`, `clsx`, `tailwind-merge`.
Nothing added since.

## Not done / follow-ups

- Visual side-by-side against `cd frontend && npm run dev` was not run (no `frontend/` install, per the disk rules);
  parity was checked by diffing markup against the Vite sources and with the automated checks above.
- Contact and newsletter submissions were not exercised end to end (they would write to the local backend); the forms
  use the same payload fields and Turnstile handling as Vite.
- No Content-Security-Policy yet (needs a policy covering Turnstile, Quill and next/font).
