# Frontend Acceptance Checklist (v3)

Owner: SUP-FE. SUP-FE uses this list to review FE-1 (`agents/fe-public`) and FE-2 (`agents/fe-admin`) and to sign off `agents/fe-integration`. Rules are in `FE_CONVENTIONS.md`. Endpoint shapes come from `agents/be-supervisor:docs/agents/API_CONTRACT_V3.md`.
An item passes only with evidence: a command output, a file and line reference, or a checked page. Implementers should self-check before asking for review.

**Status legend** (last updated after integration, 2026-09-17: FE-1 `00ab5c3`, FE-2 `6b8b544`, `agents/fe-integration` `28e0e1d`; details in `review-fe.md`):
- `[x]` verified on every branch the item applies to.
- `[~]` partly verified; the note says what is missing.
- `[ ]` not started, or not yet verifiable.

## A. Build and hygiene (every commit, both agents)

- [x] `cd frontend-next && npm ci && npm run build` succeeds with no type errors. *Status: green on FE-2 `2cf7074` (23 routes) and on the trial merge with FE-1 `14f0b00`, after the FE2-8 resolutions.*
- [x] `npm run lint` passes with no new `eslint-disable` or `@ts-nocheck`. *Status: 0 errors on FE-2 `2cf7074` and on the trial merge. The 1 warning is FE-1's `app/vacancies/[slug]`.*
- [x] `next build` succeeds **with the backend unreachable** (`NEXT_PUBLIC_BACKEND_URL` pointing at a closed port). Public pages fall back, and nothing crashes. *Status: FE-1 `00ab5c3` builds with `NEXT_PUBLIC_BACKEND_URL=http://127.0.0.1:9`, and every read falls back.*
- [x] No create-next-app leftovers: template `page.tsx`, "Create Next App" metadata, `public/{next,vercel,file,globe,window}.svg`, Geist font vars, Arial body. *Status: none on FE-1 or in the trial merge.*
- [x] `tailwind.config.js` removed, and all tokens live in `@theme`. *Status: removed on FE-1. The merge applies the deletion to FE-2.*
- [~] Shared originals (`lib/cn.ts`, `lib/api/*`, `components/ui/*`, `package.json`, `package-lock.json`) on `agents/fe-admin` are identical to `agents/fe-public` (`git diff agents/fe-public agents/fe-admin -- <paths>` is empty, except `lib/api/admin.ts`). *Status: FE-2 `2cf7074` matches FE-1 `0e03b90` for the kit, `globals.css`, `layout.tsx`, `cn.ts`, `client.ts`, `site.ts`, and the package files. `lib/config.ts` differs only in a comment (FE2-8). `lib/api/types.ts`, `lib/validation.ts`, and `lib/api/index.ts` are resolved at merge.*
- [x] The UI kit type-checks when consumed from `.tsx` without passing optional props (for example, `<Card>`, `<Button>`, `<Badge>` with only children). *Status: FE-1 `.d.ts` files plus `kit.typecheck.tsx`, which is compiled in the build (FE1-1 fixed).*
- [x] No `fetch(` outside `lib/api/**`. No `process.env` outside `lib/config.ts` and `next.config.ts`. *Status: FE-1 `00ab5c3` has `fetch(` only in `lib/api/client.ts`, and `process.env` only in `lib/config.ts`, `client.ts` and `next.config.ts`. The old vacancies `.jsx` files are deleted.*
- [x] Ownership respected (§1.1): no duplicate ports of the other agent's files, and stand-ins are flagged in the status file. *Status: FE-2 took FE-1's kit and declared `components/admin/kit.ts` as a temporary adapter.*
- [x] New dependencies are justified in the status file, and the lockfile is committed with them.
- [x] Status file `docs/agents/<agent-id>.md` is current. *Status: `fe-admin.md` updated in `2cf7074`.*

## B. Visual and behavioural parity with Vite (`frontend/`)

Check side by side at 375 px, 768 px, and 1280 px against `cd frontend && npm run dev`.

- [x] Navbar, Header, and Footer: same links, socials (`config.socials`), mobile menu behaviour, and active state. *Status: ported. Navbar items match Vite (review 4 ruling); FE-1's headless checks pass.*
- [~] Landing: all Home sections (Header, About, Benefits, Portfolio, Testimonials) present in order, with the same copy and imagery. *Status: ported (`f88de22`), with FE-1 evidence. SUP-FE's side-by-side visual pass happens at integration.*
- [~] Services, Portfolio, Packages list and detail, and Contact match layout, copy, and states (loading, empty, error). *Status: ported with loading, empty and error states. Side-by-side visual pass at integration.*
- [x] Cart: add, remove, and quantity updates persist in `localStorage["je/cart"]` in the Vite shape. A cart saved by the Vite site loads in Next. *Status: FE-1 headless 22/22, including a cart saved in the Vite shape. The store uses `je/cart`.*
- [x] Checkout: server quote via `/cart/quote`, fallback behaviour per `frontend/FRONTENDS.md`, Turnstile `order` action, and `/order` payload identical to Vite (diff the request body). *Status: review 4 code check matches `FRONTENDS.md` and Vite (quote, split on unavailable, fallback note, Turnstile `order`, server total). FE-1 captured byte-identical bodies. The solar kits-text bug is kept (FE4-5).*
- [~] Contact and newsletter submit with Turnstile when a site key is set, and without it when unset. *Status: same `useTurnstile` contract as Vite. A live run with a site key is still pending.*
- [x] Local fallbacks for packages, services, and portfolio still render when the API fails. *Status: verified by the backend-down build.*
- [~] Admin: the login, dashboard, content manager, orders and order details, contacts and reply, newsletter, activity log, and notifications screens match the Vite admin in layout and flows. *Status: code ported. Side-by-side visual check still pending.*
- [x] Ported UI-kit components keep Vite prop APIs. *Status: review 1 diff, and the `.d.ts` files add types without changing props.*

## C. PRD §7 rendering criteria (FE-1)

- [x] Public marketing pages are server components. `next build` output marks them static (`○`) or ISR, not dynamic (`ƒ`). *Status: static with a 5-minute revalidate in the build output.*
- [x] `packages/[id]` and `vacancies/[slug]` use `generateStaticParams` + `revalidate`. An unknown slug returns 404 via `notFound()`. *Status: 66 package paths SSG, and vacancies SSG with `dynamicParams`. Unknown IDs return 404 with the backend up (review 4). During an outage an unknown vacancy or product returns 500 on purpose.*
- [x] Vacancy list and detail pages are SSG/ISR (no `useEffect` fetch). The list shows only `open` roles and is keyed by `id ?? _id ?? slug`. The page shows employment type, requirements, and responsibilities. *Status: `233d036`: server pages, open-only, full field set. Verified end to end against BE-1 (review 4).*
- [x] View-source of a public page contains the rendered content (not an empty client shell). *Status: vacancy detail HTML contains the title, requirements and JSON-LD.*
- [~] Vacancy HTML renders inside `.prose-je` through `lib/sanitize.ts`. A test payload containing `<script>`, `onerror=`, and `javascript:` renders inert. *Status: renders inside `.prose-je`, and the XSS payload is inert end to end. `lib/sanitize.ts` is a stale port of `richText.js` (FE4-1) and must be re-ported before release.*
- [x] Per-page `metadata`/`generateMetadata` (title, description, OG), `sitemap.ts` including packages and open vacancies, and `robots.ts` disallowing `/admin`. *Status: `00ab5c3`: sitemap, robots (disallow `/admin` and `/cart`), canonicals, and JobPosting and Product JSON-LD.*
- [x] Real favicon and brand metadata. Fonts load through `next/font` (no layout shift from font swap). *Status: FE-1.*
- [x] Font parity: the public body renders in Inter. `inter-*`, `sora-*`, and `manrope-*` helper classes exist. Admin renders in Plus Jakarta Sans (`font-sans`). `--diamond`/`--gold` CSS variables are defined. *Status: FE-1 `8d2117b` (FE1-2). Admin `font-sans` is set in `app/admin/layout.tsx` (FE-2).*
- [x] `frontend-next/README.md` documents env vars and Vercel setup. *Status: `00ab5c3` README plus `.env.example`.*

## D. Admin security and session (FE-2)

- [x] No client-trusted authorisation: `je-user-role` and `X-User-Role` are removed (`grep -r "je-user-role\|X-User-Role" frontend-next` is empty). *Status: no `je-user-role`/`X-User-Role` in code. FE-1's README (merge) replaces the old text.*
- [x] Admin requests send `Authorization: Bearer <token>` from `localStorage["je/admin-session"]` (no `x-admin-token`, `X-User-Role`, or `X-User-Id`). `je/admin-user` holds the latest `AdminSelf`, and 401 and logout clear both keys. *Status: `lib/api/admin.ts` `adminFetch` and `clearAdminSession`.*
- [x] On load, the admin shell calls `GET /admin/auth/me` and gates nav from `data.admin.capabilities`. Any `403` triggers a `/me` refetch and shows the envelope `message`. *Status: verified in code. A missing `/me` never grants capabilities unless preview is on (FE2-1 fixed). Live run at integration (G).*
- [~] A 401 clears the session and redirects to `/admin/login`. A late 401 for an old token does not sign out a newer session. *Status: verified in code review. Not yet run against a live backend.*
- [~] Expired sessions (8 h absolute, 2 h idle) are detected via 401, and the UI recovers cleanly with no redirect loop. *Status: code path verified. A live smoke test is pending.*
- [x] Gating uses `capabilities` only: `grep -rn "\.role\b" frontend-next/app/admin frontend-next/components/admin frontend-next/lib/admin` shows no authorisation branches, and no role → capability table is copied into the frontend. Every hidden action is still refused server-side (verify with a `support` or `engineer` account and a direct URL). An admin with no capabilities gets an empty-state shell, not a crash. *Status: no `.role` branches, and `modules.ts` capabilities match contract §1.2. Server-side refusal still to be verified at integration.*
- [x] Logout calls `/admin/auth/logout` and clears storage even if the call fails.
- [~] Password reset flow works end to end. *Status: UI done. The live run is pending.*
- [x] `app/admin/**` does no build-time data fetching. `next build` marks admin routes as client or static shells, with no admin data in the HTML. *Status: every admin route (`/admin` and below) builds as a ○ static shell.*
- [x] `react-quill-new` loads via `next/dynamic` with `ssr: false`, and `quill-overrides.css` is imported. *Status: `components/admin/RichTextEditor.tsx`.*
- [x] Admin pages are `noindex`. *Status: `app/admin/layout.tsx` metadata.*
- [x] Contract mocks are opt-in: `NEXT_PUBLIC_ADMIN_PREVIEW` is unset in production, and with the flag off a `404 "Route not found."` shows an unavailable state. There are no fake successes, no all-capabilities session, and no order overlays. Non-404 errors are never mocked. *Status: FE2-1 fixed in `2cf7074`: `FeatureUnavailableError` when the flag is off, no overlays or KPIs, `capabilities: []`. Documented in FE-1's README and `.env.example`.*
- [x] Exactly one `<Toaster />` is mounted (root layout). *Status: only `app/layout.tsx` mounts it (FE2-2 fixed).*

## E. Admin modules (FE-2)

- [~] Vacancies (PRD §6.5): list with draft/open/closed filter, create and edit with all fields, publish and unpublish, delete with confirm, and server validation errors shown inline. *Status: UI complete and matches contract §3. The rich-text a11y fix is in (FE2-4). Only the live end-to-end run with BE-1 remains (G).*
- [x] Carts (`GET /admin/carts`) and customer segments (`/admin/services/customer-segments`) have new UIs built from the kit (no Vite reference exists). *Status: `components/admin/orders/Carts.tsx` and `components/admin/content/CustomerSegments.tsx`.*
- [x] New modules (products and categories, inventory, fulfilment, installation jobs, staff and roles, settings) call typed functions in `lib/api/admin.ts`. Each stub is marked `TODO(contract)` and matches the contract shape. SUP-FE checks every call against `API_CONTRACT_V3.md` (path, method, request and response fields, capability). *Status: review 3: capability gating, the engineer view using only `/admin/me/jobs*`, blocked self role/status changes, and types and mocks matching contract §2, §4, §5, §7, and §8 are all verified. Follow-ups that don't block: FE2-9 invite-expiry hint, inventory category filter, movement filter persistence.*
- [~] The engineer view is usable at 375 px: assigned jobs, status updates, and checklist, with touch targets of at least 44 px. *Status: code uses ≥44 px controls (`size="lg"`, `min-h-11`), and FE-2 reports a headless Chrome check at 375 px. SUP-FE's own viewport check happens at integration.*
- [x] Dashboard KPI cards follow Plan §2. *Status: `DashboardKpis` matches contract §9. With no `kpis` and preview off, cards show as unavailable.*

## F. Accessibility basics (both)

- [~] Landmarks: one `<main>` per page, plus `<nav>`, `<header>`, and `<footer>`. Skip link to main content. *Status: public side verified by FE-1 headless checks (33/33) and the skip link. Admin landmarks are checked at integration.*
- [~] Every input has an associated label (`Field` wiring). Errors use `aria-describedby`/`aria-invalid`. *Status: admin rich-text is fixed (FE2-4). A full a11y pass is due at integration.*
- [ ] Visible focus states on all interactive elements. Everything is keyboard-operable (menus, dialogs, drawers, tabs). Dialogs and drawers trap and restore focus and close on `Esc`.
- [~] Images have meaningful `alt` text, or `alt=""` if decorative. Icon-only buttons have `aria-label`. *Status: public side passes FE-1's checks. Admin is checked at integration.*
- [~] Text contrast is at least 4.5:1 on brand colours (check `brand-500` and `brand-600` on white). *Status: ruling in FE_CONVENTIONS §2 (review 4). FE-1 still has to apply the replacement shades (FE4-2).*
- [~] Heading order has no skipped levels, and pages have unique `<title>` values. *Status: public side passes FE-1's checks, and titles are per page. Admin is checked at integration.*

## G. Integration sign-off (`agents/fe-integration`, SUP-FE)

- [x] Merge `agents/fe-public` and then `agents/fe-admin` into a branch from `v3-agents-base`. Conflicts are resolved, the lockfile is regenerated, and FE-2 kit files are added to the `components/ui` barrel. *Status: `agents/fe-integration` @ `28e0e1d` (FE-1 `00ab5c3` + FE-2 `6b8b544`); resolutions are in `docs/agents/fe-integration.md` on that branch. The lockfile needed no regeneration because it is identical on both branches. The kit barrel is FE-1's, which already exports every kit file.*
- [~] Sections A–F re-checked on the merged tree. *Status: A re-checked on the merged tree: `tsc` 0, lint 0/0, build green. B–F carry their review statuses. The visual pass and live BE-2 checks are pending.*
- [~] Smoke run against local Express (`backend`, port 9000) with `next build && next start`: landing → package detail → add to cart → checkout quote; contact submit; vacancies list → detail; admin login → dashboard → vacancy create/publish → logout. *Status: done against BE-1 Express @ `ae917b4`: 20 routes by HTTP, and 13/13 headless Chrome checks (vacancy render and XSS, login redirect, sign-in, session keys, vacancies list, unavailable module state, sign-out). `/cart/quote` checked at the API level. Package → cart → checkout in a browser, contact submit, and the BE-2 modules wait for `agents/be-integration`.*
- [x] Findings and residual risks recorded in `docs/agents/review-fe.md`. *Status: reviews 1–4, plus follow-ups in `fe-integration.md`.*
