# Frontend Acceptance Checklist (v3)

Owner: SUP-FE. SUP-FE uses this list to review FE-1 (`agents/fe-public`) and FE-2 (`agents/fe-admin`) and to sign off `agents/fe-integration`. Rules are in `FE_CONVENTIONS.md`. Endpoint shapes come from `agents/be-supervisor:docs/agents/API_CONTRACT_V3.md`.
An item passes only with evidence: a command output, a file and line reference, or a checked page. Implementers should self-check before asking for review.

**Status legend** (last updated in review 2, 2026-09-16: FE-1 `0e03b90`, FE-2 `6d07424`; details in `review-fe.md`):
- `[x]` verified on every branch the item applies to.
- `[~]` partly verified; the note says what is missing.
- `[ ]` not started, or not yet verifiable.

## A. Build and hygiene (every commit, both agents)

- [x] `cd frontend-next && npm ci && npm run build` succeeds with no type errors. *Status: green on FE-1 `0e03b90`, on FE-2 `6d07424`, and on a trial merge of both.*
- [~] `npm run lint` passes with no new `eslint-disable` or `@ts-nocheck`. *Status: FE-2 has 0 errors. FE-1 has 5 errors, all in the old `app/admin/vacancies/page.jsx`, which FE-2 deletes. The trial merge has 0 errors and 1 warning (`app/vacancies/[slug]`, FE-1).*
- [ ] `next build` succeeds **with the backend unreachable** (`NEXT_PUBLIC_BACKEND_URL` pointing at a closed port). Public pages fall back, and nothing crashes. *Status: not yet run; no data-fetching public pages exist yet.*
- [x] No create-next-app leftovers: template `page.tsx`, "Create Next App" metadata, `public/{next,vercel,file,globe,window}.svg`, Geist font vars, Arial body. *Status: none on FE-1 or in the trial merge.*
- [~] `tailwind.config.js` removed, and all tokens live in `@theme`. *Status: done on FE-1. FE-2 still has the file, but FE-1's deletion wins at merge.*
- [~] Shared originals (`lib/cn.ts`, `lib/api/*`, `components/ui/*`, `package.json`, `package-lock.json`) on `agents/fe-admin` are identical to `agents/fe-public` (`git diff agents/fe-public agents/fe-admin -- <paths>` is empty, except `lib/api/admin.ts`). *Status: `cn.ts`, `client.ts`, and the package files are identical. The kit and `globals.css` are still at `b6e901d` on FE-2 (FE2-7).*
- [x] The UI kit type-checks when consumed from `.tsx` without passing optional props (for example, `<Card>`, `<Button>`, `<Badge>` with only children). *Status: FE-1 `.d.ts` files plus `kit.typecheck.tsx`, which is compiled in the build (FE1-1 fixed).*
- [~] No `fetch(` outside `lib/api/**`. No `process.env` outside `lib/config.ts` and `next.config.ts`. *Status: the only violations are the old `app/vacancies/*.jsx` pages (FE-1 is converting them). Admin code is clean.*
- [x] Ownership respected (§1.1): no duplicate ports of the other agent's files, and stand-ins are flagged in the status file. *Status: FE-2 took FE-1's kit and declared `components/admin/kit.ts` as a temporary adapter.*
- [x] New dependencies are justified in the status file, and the lockfile is committed with them.
- [~] Status file `docs/agents/<agent-id>.md` is current. *Status: FE-2's note about `8e35473` is outdated (FE2-7).*

## B. Visual and behavioural parity with Vite (`frontend/`)

Check side by side at 375 px, 768 px, and 1280 px against `cd frontend && npm run dev`.

- [~] Navbar, Header, and Footer: same links, socials (`config.socials`), mobile menu behaviour, and active state. *Status: ported in `0e03b90`. Side-by-side visual check still pending.*
- [ ] Landing: all Home sections (Header, About, Benefits, Portfolio, Testimonials) present in order, with the same copy and imagery.
- [ ] Services, Portfolio, Packages list and detail, and Contact match layout, copy, and states (loading, empty, error).
- [ ] Cart: add, remove, and quantity updates persist in `localStorage["je/cart"]` in the Vite shape. A cart saved by the Vite site loads in Next.
- [ ] Checkout: server quote via `/cart/quote`, fallback behaviour per `frontend/FRONTENDS.md`, Turnstile `order` action, and `/order` payload identical to Vite (diff the request body).
- [ ] Contact and newsletter submit with Turnstile when a site key is set, and without it when unset.
- [ ] Local fallbacks for packages, services, and portfolio still render when the API fails.
- [~] Admin: the login, dashboard, content manager, orders and order details, contacts and reply, newsletter, activity log, and notifications screens match the Vite admin in layout and flows. *Status: code ported. Side-by-side visual check still pending.*
- [x] Ported UI-kit components keep Vite prop APIs. *Status: review 1 diff, and the `.d.ts` files add types without changing props.*

## C. PRD §7 rendering criteria (FE-1)

- [ ] Public marketing pages are server components. `next build` output marks them static (`○`) or ISR, not dynamic (`ƒ`).
- [ ] `packages/[id]` and `vacancies/[slug]` use `generateStaticParams` + `revalidate`. An unknown slug returns 404 via `notFound()`.
- [ ] Vacancy list and detail pages are SSG/ISR (no `useEffect` fetch). The list shows only `open` roles and is keyed by `id ?? _id ?? slug`. The page shows employment type, requirements, and responsibilities.
- [ ] View-source of a public page contains the rendered content (not an empty client shell).
- [ ] Vacancy HTML renders inside `.prose-je` through `lib/sanitize.ts`. A test payload containing `<script>`, `onerror=`, and `javascript:` renders inert.
- [ ] Per-page `metadata`/`generateMetadata` (title, description, OG), `sitemap.ts` including packages and open vacancies, and `robots.ts` disallowing `/admin`.
- [x] Real favicon and brand metadata. Fonts load through `next/font` (no layout shift from font swap). *Status: FE-1.*
- [x] Font parity: the public body renders in Inter. `inter-*`, `sora-*`, and `manrope-*` helper classes exist. Admin renders in Plus Jakarta Sans (`font-sans`). `--diamond`/`--gold` CSS variables are defined. *Status: FE-1 `8d2117b` (FE1-2). Admin `font-sans` is set in `app/admin/layout.tsx` (FE-2).*
- [~] `frontend-next/README.md` documents env vars and Vercel setup. *Status: env vars are documented, plus `.env.example` (FE-1). Vercel section not yet checked.*

## D. Admin security and session (FE-2)

- [~] No client-trusted authorisation: `je-user-role` and `X-User-Role` are removed (`grep -r "je-user-role\|X-User-Role" frontend-next` is empty). *Status: none in code on FE-2. The old FE-2 README text is replaced by FE-1's README at merge.*
- [x] Admin requests send `Authorization: Bearer <token>` from `localStorage["je/admin-session"]` (no `x-admin-token`, `X-User-Role`, or `X-User-Id`). `je/admin-user` holds the latest `AdminSelf`, and 401 and logout clear both keys. *Status: `lib/api/admin.ts` `adminFetch` and `clearAdminSession`.*
- [~] On load, the admin shell calls `GET /admin/auth/me` and gates nav from `data.admin.capabilities`. Any `403` triggers a `/me` refetch and shows the envelope `message`. *Status: implemented, with a deduplicated refetch after 403. On a backend without `/me` it grants all capabilities in the UI (FE2-1).*
- [~] A 401 clears the session and redirects to `/admin/login`. A late 401 for an old token does not sign out a newer session. *Status: verified in code review. Not yet run against a live backend.*
- [~] Expired sessions (8 h absolute, 2 h idle) are detected via 401, and the UI recovers cleanly with no redirect loop. *Status: code path verified. A live smoke test is pending.*
- [x] Gating uses `capabilities` only: `grep -rn "\.role\b" frontend-next/app/admin frontend-next/components/admin frontend-next/lib/admin` shows no authorisation branches, and no role → capability table is copied into the frontend. Every hidden action is still refused server-side (verify with a `support` or `engineer` account and a direct URL). An admin with no capabilities gets an empty-state shell, not a crash. *Status: no `.role` branches, and `modules.ts` capabilities match contract §1.2. Server-side refusal still to be verified at integration.*
- [x] Logout calls `/admin/auth/logout` and clears storage even if the call fails.
- [~] Password reset flow works end to end. *Status: UI done. The live run is pending.*
- [x] `app/admin/**` does no build-time data fetching. `next build` marks admin routes as client or static shells, with no admin data in the HTML. *Status: every admin route (`/admin` and below) builds as a ○ static shell.*
- [x] `react-quill-new` loads via `next/dynamic` with `ssr: false`, and `quill-overrides.css` is imported. *Status: `components/admin/RichTextEditor.tsx`.*
- [x] Admin pages are `noindex`. *Status: `app/admin/layout.tsx` metadata.*
- [ ] Contract mocks are opt-in: `NEXT_PUBLIC_ADMIN_PREVIEW` is unset in production, and with the flag off a `404 "Route not found."` shows an unavailable state. There are no fake successes, no all-capabilities session, and no order overlays. Non-404 errors are never mocked. *Status: the non-404 part is verified. The opt-in flag is missing (FE2-1).*
- [ ] Exactly one `<Toaster />` is mounted (root layout). *Status: fails in the trial merge, with 3 mounts (FE2-2).*

## E. Admin modules (FE-2)

- [~] Vacancies (PRD §6.5): list with draft/open/closed filter, create and edit with all fields, publish and unpublish, delete with confirm, and server validation errors shown inline. *Status: UI complete and transitions match contract §3. Exercised only against mocks until BE-1 lands. The rich-text field has no accessible name (FE2-4).*
- [x] Carts (`GET /admin/carts`) and customer segments (`/admin/services/customer-segments`) have new UIs built from the kit (no Vite reference exists). *Status: `components/admin/orders/Carts.tsx` and `components/admin/content/CustomerSegments.tsx`.*
- [~] New modules (products and categories, inventory, fulfilment, installation jobs, staff and roles, settings) call typed functions in `lib/api/admin.ts`. Each stub is marked `TODO(contract)` and matches the contract shape. SUP-FE checks every call against `API_CONTRACT_V3.md` (path, method, request and response fields, capability). *Status: fulfilment is reviewed: §6.2 transitions are exact and 409 `details` are rendered. The other modules are uncommitted.*
- [ ] The engineer view is usable at 375 px: assigned jobs, status updates, and checklist, with touch targets of at least 44 px.
- [~] Dashboard KPI cards follow Plan §2. *Status: committed in `a7d9e03`. The contract §9 field check is pending.*

## F. Accessibility basics (both)

- [~] Landmarks: one `<main>` per page, plus `<nav>`, `<header>`, and `<footer>`. Skip link to main content. *Status: the public layout has a skip link and `main#main` (FE-1 `0e03b90`). Admin landmarks are not yet checked.*
- [~] Every input has an associated label (`Field` wiring). Errors use `aria-describedby`/`aria-invalid`. *Status: the admin rich-text editor has no accessible name (FE2-4).*
- [ ] Visible focus states on all interactive elements. Everything is keyboard-operable (menus, dialogs, drawers, tabs). Dialogs and drawers trap and restore focus and close on `Esc`.
- [ ] Images have meaningful `alt` text, or `alt=""` if decorative. Icon-only buttons have `aria-label`.
- [ ] Text contrast is at least 4.5:1 on brand colours (check `brand-500` and `brand-600` on white).
- [ ] Heading order has no skipped levels, and pages have unique `<title>` values.

## G. Integration sign-off (`agents/fe-integration`, SUP-FE)

- [ ] Merge `agents/fe-public` and then `agents/fe-admin` into a branch from `v3-agents-base`. Conflicts are resolved, the lockfile is regenerated, and FE-2 kit files are added to the `components/ui` barrel. *Status: trial merge done in review 2. Expected resolutions are listed in `review-fe.md` FE2-8.*
- [ ] Sections A–F re-checked on the merged tree.
- [ ] Smoke run against local Express (`backend`, port 9000) with `next build && next start`: landing → package detail → add to cart → checkout quote; contact submit; vacancies list → detail; admin login → dashboard → vacancy create/publish → logout.
- [ ] Findings and residual risks recorded in `docs/agents/review-fe.md`.
