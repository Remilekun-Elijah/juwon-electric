# Frontend Acceptance Checklist (v3)

Owner: SUP-FE. SUP-FE uses this list to review FE-1 (`agents/fe-public`) and FE-2 (`agents/fe-admin`) and to sign off `agents/fe-integration`. Rules are in `FE_CONVENTIONS.md`. Endpoint shapes come from `agents/be-supervisor:docs/agents/API_CONTRACT_V3.md`.
An item passes only with evidence: a command output, a file and line reference, or a checked page. Implementers should self-check before asking for review.

## A. Build and hygiene (every commit, both agents)

- [ ] `cd frontend-next && npm ci && npm run build` succeeds with no type errors.
- [ ] `npm run lint` passes with no new `eslint-disable` or `@ts-nocheck`.
- [ ] `next build` succeeds **with the backend unreachable** (`NEXT_PUBLIC_BACKEND_URL` pointing at a closed port). Public pages fall back, and nothing crashes.
- [ ] No create-next-app leftovers: template `page.tsx`, "Create Next App" metadata, `public/{next,vercel,file,globe,window}.svg`, Geist font vars, Arial body.
- [ ] `tailwind.config.js` removed, and all tokens live in `@theme`.
- [ ] Shared originals (`lib/cn.ts`, `lib/api/*`, `components/ui/*`, `package.json`, `package-lock.json`) on `agents/fe-admin` are identical to `agents/fe-public` (`git diff agents/fe-public agents/fe-admin -- <paths>` is empty, except `lib/api/admin.ts`).
- [ ] The UI kit type-checks when consumed from `.tsx` without passing optional props (for example, `<Card>`, `<Button>`, `<Badge>` with only children).
- [ ] No `fetch(` outside `lib/api/**`. No `process.env` outside `lib/config.ts` and `next.config.ts`.
- [ ] Ownership respected (§1.1): no duplicate ports of the other agent's files, and stand-ins are flagged in the status file.
- [ ] New dependencies are justified in the status file, and the lockfile is committed with them.
- [ ] Status file `docs/agents/<agent-id>.md` is current.

## B. Visual and behavioural parity with Vite (`frontend/`)

Check side by side at 375 px, 768 px, and 1280 px against `cd frontend && npm run dev`.

- [ ] Navbar, Header, and Footer: same links, socials (`config.socials`), mobile menu behaviour, and active state.
- [ ] Landing: all Home sections (Header, About, Benefits, Portfolio, Testimonials) present in order, with the same copy and imagery.
- [ ] Services, Portfolio, Packages list and detail, and Contact match layout, copy, and states (loading, empty, error).
- [ ] Cart: add, remove, and quantity updates persist in `localStorage["je/cart"]` in the Vite shape. A cart saved by the Vite site loads in Next.
- [ ] Checkout: server quote via `/cart/quote`, fallback behaviour per `frontend/FRONTENDS.md`, Turnstile `order` action, and `/order` payload identical to Vite (diff the request body).
- [ ] Contact and newsletter submit with Turnstile when a site key is set, and without it when unset.
- [ ] Local fallbacks for packages, services, and portfolio still render when the API fails.
- [ ] Admin: the login, dashboard, content manager, orders and order details, contacts and reply, newsletter, activity log, and notifications screens match the Vite admin in layout and flows.
- [ ] Ported UI-kit components keep Vite prop APIs.

## C. PRD §7 rendering criteria (FE-1)

- [ ] Public marketing pages are server components. `next build` output marks them static (`○`) or ISR, not dynamic (`ƒ`).
- [ ] `packages/[id]` and `vacancies/[slug]` use `generateStaticParams` + `revalidate`. An unknown slug returns 404 via `notFound()`.
- [ ] Vacancy list and detail pages are SSG/ISR (no `useEffect` fetch). The list shows only `open` roles and is keyed by `id ?? _id ?? slug`. The page shows employment type, requirements, and responsibilities.
- [ ] View-source of a public page contains the rendered content (not an empty client shell).
- [ ] Vacancy HTML renders inside `.prose-je` through `lib/sanitize.ts`. A test payload containing `<script>`, `onerror=`, and `javascript:` renders inert.
- [ ] Per-page `metadata`/`generateMetadata` (title, description, OG), `sitemap.ts` including packages and open vacancies, and `robots.ts` disallowing `/admin`.
- [ ] Real favicon and brand metadata. Fonts load through `next/font` (no layout shift from font swap).
- [ ] Font parity: the public body renders in Inter. `inter-*`, `sora-*`, and `manrope-*` helper classes exist. Admin renders in Plus Jakarta Sans (`font-sans`). `--diamond`/`--gold` CSS variables are defined.
- [ ] `frontend-next/README.md` documents env vars and Vercel setup.

## D. Admin security and session (FE-2)

- [ ] No client-trusted authorisation: `je-user-role` and `X-User-Role` are removed (`grep -r "je-user-role\|X-User-Role" frontend-next` is empty).
- [ ] Admin requests send `Authorization: Bearer <token>` from `localStorage["je/admin-session"]` (no `x-admin-token`, `X-User-Role`, or `X-User-Id`). `je/admin-user` holds the latest `AdminSelf`, and 401 and logout clear both keys.
- [ ] On load, the admin shell calls `GET /admin/auth/me` and gates nav from `data.admin.capabilities`. Any `403` triggers a `/me` refetch and shows the envelope `message`.
- [ ] A 401 clears the session and redirects to `/admin/login`. A late 401 for an old token does not sign out a newer session.
- [ ] Expired sessions (8 h absolute, 2 h idle) are detected via 401, and the UI recovers cleanly with no redirect loop.
- [ ] Gating uses `capabilities` only: `grep -rn "\.role\b" frontend-next/app/admin frontend-next/components/admin frontend-next/lib/admin` shows no authorisation branches, and no role → capability table is copied into the frontend. Every hidden action is still refused server-side (verify with a `support` or `engineer` account and a direct URL). An admin with no capabilities gets an empty-state shell, not a crash.
- [ ] Logout calls `/admin/auth/logout` and clears storage even if the call fails.
- [ ] Password reset flow works end to end.
- [ ] `app/admin/**` does no build-time data fetching. `next build` marks admin routes as client or static shells, with no admin data in the HTML.
- [ ] `react-quill-new` loads via `next/dynamic` with `ssr: false`, and `quill-overrides.css` is imported.
- [ ] Admin pages are `noindex`.

## E. Admin modules (FE-2)

- [ ] Vacancies (PRD §6.5): list with draft/open/closed filter, create and edit with all fields, publish and unpublish, delete with confirm, and server validation errors shown inline.
- [ ] Carts (`GET /admin/carts`) and customer segments (`/admin/services/customer-segments`) have new UIs built from the kit (no Vite reference exists).
- [ ] New modules (products and categories, inventory, fulfilment, installation jobs, staff and roles, settings) call typed functions in `lib/api/admin.ts`. Each stub is marked `TODO(contract)` and matches the contract shape. SUP-FE checks every call against `API_CONTRACT_V3.md` (path, method, request and response fields, capability).
- [ ] The engineer view is usable at 375 px: assigned jobs, status updates, and checklist, with touch targets of at least 44 px.
- [ ] Dashboard KPI cards follow Plan §2.

## F. Accessibility basics (both)

- [ ] Landmarks: one `<main>` per page, plus `<nav>`, `<header>`, and `<footer>`. Skip link to main content.
- [ ] Every input has an associated label (`Field` wiring). Errors use `aria-describedby`/`aria-invalid`.
- [ ] Visible focus states on all interactive elements. Everything is keyboard-operable (menus, dialogs, drawers, tabs). Dialogs and drawers trap and restore focus and close on `Esc`.
- [ ] Images have meaningful `alt` text, or `alt=""` if decorative. Icon-only buttons have `aria-label`.
- [ ] Text contrast is at least 4.5:1 on brand colours (check `brand-500` and `brand-600` on white).
- [ ] Heading order has no skipped levels, and pages have unique `<title>` values.

## G. Integration sign-off (`agents/fe-integration`, SUP-FE)

- [ ] Merge `agents/fe-public` and then `agents/fe-admin` into a branch from `v3-agents-base`. Conflicts are resolved, the lockfile is regenerated, and FE-2 kit files are added to the `components/ui` barrel.
- [ ] Sections A–F re-checked on the merged tree.
- [ ] Smoke run against local Express (`backend`, port 9000) with `next build && next start`: landing → package detail → add to cart → checkout quote; contact submit; vacancies list → detail; admin login → dashboard → vacancy create/publish → logout.
- [ ] Findings and residual risks recorded in `docs/agents/review-fe.md`.
