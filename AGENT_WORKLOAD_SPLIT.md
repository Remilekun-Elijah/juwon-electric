# Juwon Electric — Current Status and Agent Workload Split (v3)

Date: 2026-09-16 (revalidated against the codebase on branch `v3` @ `323f3e0` + uncommitted WIP)

## 1) Source-of-truth documents

- [PRODUCT_REQUIREMENTS.md](./PRODUCT_REQUIREMENTS.md) — business requirements and acceptance criteria (canonical for *what*).
- [PLATFORM_PLAN.md](./PLATFORM_PLAN.md) — technical plan (canonical for *how*, **except where §4 below records a decision that supersedes it**).

v2 is a reference branch and must not be edited. All work lands on `agents/*` branches cut from `v3-agents-base`; merging into `v3` is done by a human after supervisor sign-off.

---

## 2) Drift found during revalidation

The previous version of this ledger overstated what was done and left out large parts of the codebase. Corrections:

### 2.1 Claims that were wrong or unverified

| Previous claim | Reality in code | Evidence |
| --- | --- | --- |
| "Next.js app scaffold — running" | **`next build` fails.** JSX parse error in the admin vacancies page (raw `{...}` JSON inside `<pre>`). `app/page.tsx` and `layout.tsx` are still the create-next-app template (title "Create Next App"). | `frontend-next/app/admin/vacancies/page.jsx:169` |
| "Vacancies module done (core), permission checks" | Writes are guarded by `requireAdminOrHR`, which trusts a client-supplied `X-User-Role` header, so **anyone can create/edit/delete vacancies**. The admin UI never sends that header, so creation from the UI returns 403. Admin UI role gate is `localStorage['je-user-role']`. No edit/delete/publish UI, no requirements/responsibilities/employmentType/status fields. | `backend/middleware/auth.js`, `backend/routes/vacancies.js`, `frontend-next/app/admin/vacancies/page.jsx` |
| "Vacancy public pages done" | Pages are client-side `useEffect` fetches, **not SSG** (PRD §7 requires static). List keys on `v._id`, which is undefined in JSON-store mode. Rendered HTML is trusted without client-side defence. | `frontend-next/app/vacancies/**` |
| Vacancies JSON-store fallback | Uncommitted WIP. Delete soft-marks `isActive:false` but the slug stays taken; JSON path defaults `status` to `open` while Mongo defaults to `draft`; unused `readDb`/`saveDb` imports. | `git diff backend/controllers/vacancies.js` |
| "D1 primary architecture done (scaffold)" | `workers/d1-write` has **no `wrangler.toml`**, binds `env.D1` (the real Worker uses `DB`), has **no auth on `POST /write/vacancies`**, and signs `JSON.stringify(payload)` which the sync service re-serialises (fragile). `d1-sync` skips signature verification when `SYNC_SECRET` is unset (fails open), imports `mongodb` that is not a direct dependency, and has no replay. `backend/d1-schemas/*.sql` are not wired into any migration set. | `workers/d1-write/index.js`, `backend/d1-sync/index.js` |
| "CI step to deploy Workers" | CI cannot pass: backend has no `lint` or `build` scripts; Node 18 is below Next 16's `>=20.9`; `wrangler publish` was removed in Wrangler 4 (`deploy`); it deploys a Worker with no config; the deploy job runs on every branch push. | `.github/workflows/ci.yml`, `backend/package.json` |
| "Local backend readiness validated (`GET /vacancies`)" | Not reproducible from the repo; no tests exist (`npm test` is a stub). Treat it as unverified. | `backend/package.json` |
| "PLATFORM_PLAN covers the D1-first strategy" | PLATFORM_PLAN never mentions D1, Cloudflare, or Workers. | `grep -i d1 PLATFORM_PLAN.md` → no hits |
| "Supervisor-level orchestration history recorded" | Nothing in the repo supports this. | — |

### 2.2 Existing work the previous ledger ignored

| Asset | What it is | Impact on plan |
| --- | --- | --- |
| `backend/cloudflare/` | A **full Cloudflare Worker + D1 API** with parity to Express: admin auth (sessions, password reset), dashboard, audit logs, per-admin reads, and CRUD for packages, services, portfolio, contacts, newsletter, carts, orders. Has migrations `0001`–`0006` and a real `database_id`. No vacancies. | This is the production D1 backend. `workers/d1-write` duplicates it. |
| Express admin API (`backend/routes/admin.js`) | Signed admin sessions, rate limiting, Turnstile, audit logging, dashboard, orders CRUD, contacts with reply webhook, newsletter, carts. | "Admin dashboard", "orders", and "audit logs" are **not** greenfield. They need extending (roles, fulfilment, engineers), not building. |
| Vite app `frontend/` | The real public site (Landing, Services, Portfolio, Packages, Contact, Cart, Checkout with server quote, Turnstile) **and** a full admin app (`pages/Admin/*`: shell, login, dashboard, content manager, orders, contacts, activity log, notifications) plus a UI kit (`components/ui/*`). | This is the source to port. `frontend/FRONTENDS.md` documents its API usage. |
| Typed Mongoose models `backend/models/{Category,Product,InventoryMovement,Order,InstallationJob,Setting,User}.js` | Match PLATFORM_PLAN §1 but **nothing imports them** (only `Vacancy` is used). `Order` and `User` names clash with the untyped `flexibleSchema` models registered in `backend/services/store.js`, so whichever loads first wins. | Schema "coverage" is on paper only. |
| Admin identity | Only a single seeded `super_admin` account (`adminAuthService.js`). No role enforcement in the PRD §6.6 sense. | Roles have to be designed on top of the existing session system, not replaced. |
| `backend/routes/user.js` | Legacy `/contact`, `/subscribe`, `/order` routes mounted after `publicRouter`, so they are unreachable. | Dead code; remove. |

### 2.3 Frontend dependency and config drift

- `react-quill@2.0.0` has peer dependency `react ^16–18`, but the app uses React 19.2. It relies on the removed `findDOMNode`, so it will break at runtime. Replace it with `react-quill-new` (or another editor that supports React 19).
- Tailwind v4 (`@tailwindcss/postcss`) is installed, but the brand tokens live in an untracked v3-style `tailwind.config.js`. v4 ignores that file without `@config`, so none of the brand colours apply. Port the tokens into `@theme` in `globals.css`.
- `quill-overrides.css` is untracked and imported nowhere.
- PLATFORM_PLAN assumes the **Pages Router** (`getStaticProps`, `_app.jsx`, next-redux-wrapper). The scaffold uses the **App Router**; see decision D2.
- Env var: `NEXT_PUBLIC_BACKEND_URL` is in place. `NEXT_PUBLIC_WORKER_WRITE_URL` is documented but unused.
- `backend/TODO_SANITIZE.md` is obsolete (`sanitize-html` is already a dependency).

---

## 3) Revalidated status

### 3.1 Done (verified in code)

- PRD and platform plan documents exist.
- Express backend with public catalog/commerce API, admin sessions, audit, rate limit, Turnstile, JSON + Mongo storage modes.
- Cloudflare Worker + D1 API at parity with Express for the existing modules (not vacancies).
- Vite public site and Vite admin app (the port source).
- Vacancy Mongoose model and CRUD controller with server-side `sanitize-html`.
- Next.js App Router scaffold with three draft vacancy pages (not yet building).

### 3.2 Partially done

- Vacancies: backend CRUD exists, but auth is fake, JSON/Mongo defaults are inconsistent, and there is no D1 support in the production Worker. The frontend doesn't build and doesn't meet PRD §6.5/§7.
- D1-first write path: a prototype only. See §2.1.
- Typed schemas: written but unused and clashing.
- CI: the workflow file exists but cannot pass.

### 3.3 Not started

- Role-based access (PRD §6.6) beyond the single super admin.
- Products and categories as first-class entities (today the catalog is `packages`/`services`/`portfolio`), inventory movements, low-stock email.
- Order fulfilment statuses, engineer assignment, installation jobs, engineer mobile UI.
- Settings and notifications modules.
- Any Next.js port of the public site or admin app.
- Tests of any kind. Vercel project config. Worker deploy pipeline that works.

---

## 4) Decisions that supersede PLATFORM_PLAN (recorded 2026-09-16)

These defaults unblock parallel work. Change them here if the business disagrees, and the agents will follow.

- **D1 — Backend runtimes.** `backend/cloudflare` (Worker + D1) is the **production API**. Express stays as the local and self-host runtime and must keep **route and response parity** (the existing convention). `workers/d1-write` and `backend/d1-sync` are **retired**: vacancies move into `backend/cloudflare` as a normal D1 module with a numbered migration. The DLQ and replay concept is kept only if a Mongo mirror is still required. Until the business confirms that, it is out of scope.
- **D2 — Next.js router.** Use the **App Router**, which is already scaffolded. Pages Router guidance in PLATFORM_PLAN §3 maps as follows: `getStaticProps`/`getStaticPaths` → server components + `generateStaticParams` + `revalidate`; `_app.jsx` → `app/layout.tsx` + client providers.
- **D3 — State.** Do not bring Redux across unless a page needs it. Cart state moves to a small client store (context or Zustand) persisted to `localStorage`, and keeps the Vite cart's shape so `/cart/quote` and `/order` payloads are unchanged.
- **D4 — Roles.** Extend the existing admin session system with `role ∈ {superadmin, admin, inventory, sales, engineer, hr, support}` and a server-side capability map. Do not adopt the unused `User` model as-is; resolve the `Order`/`User` model name clash.
- **D5 — Catalog.** Keep `packages` as the storefront unit (PRD §6.1). Add `products` and `categories`, with packages referencing products. Migrate existing package data rather than breaking public routes.
- **D6 — Editor.** Use `react-quill-new`, loaded client-only. Sanitisation stays server-side and is the security boundary.

---

## 5) Agent workload split — 4 implementers + 2 supervisors

Branching: every agent cuts its own branch from `v3-agents-base` in its own git worktree, commits small and often, and never pushes or merges into `v3`. Each agent keeps a running status file at `docs/agents/<agent-id>.md` on its own branch, which avoids conflicts on this ledger. Branches share one object store, so agents can read each other's work with `git show <branch>:<path>` and `git log <branch>`.

Cross-team contract: the backend supervisor owns `docs/agents/API_CONTRACT_V3.md` on branch `agents/be-supervisor`. Frontend agents build against that contract.

### BE-1 — Platform, Security & Infrastructure (`agents/be-platform`)

PRD §6.5 (roles), §6.6, §6.8 · Plan §2 Phase A auth, Phase D

1. **Roles (D4).** Add a role and capability map to admin accounts in both Express and the Worker (with a D1 migration). Add `requireCapability(...)` middleware. Add admin user management endpoints (list, create, change role, deactivate/reactivate) with audit logging. Seeded superadmin behaviour stays unchanged.
2. **Vacancies consolidation (D1).** Replace the `X-User-Role` placeholder with real session and capability checks (`vacancies:write` for hr/admin/superadmin). Add a vacancies module to `backend/cloudflare` (migration + routes) at parity with Express. Fix the JSON/Mongo inconsistencies (default status `draft`; soft-delete vs slug uniqueness; admin list that includes drafts/closed at `GET /admin/vacancies`). Add publish/unpublish. Public endpoints return only `open`.
3. Retire `workers/d1-write` and `backend/d1-sync` (plus `backend/d1-schemas`) after the vacancy port. Record the removal in the ledger. Remove the dead `routes/user.js` mount and the obsolete `TODO_SANITIZE.md`.
4. Resolve the Mongoose model-name clash between `backend/models/*` and `services/store.js`.
5. **CI/CD.** Add real backend `lint` and `test` scripts. Use Node 20+. Fix the frontend build/lint job. Worker deploy uses `wrangler deploy` from `backend/cloudflare`, only on `v3`/main, with `CLOUDFLARE_API_TOKEN`/`CLOUDFLARE_ACCOUNT_ID`, and applies D1 migrations first. Write an env/secrets matrix in `docs/DEPLOYMENT.md` covering Express, Worker, and Vercel.
6. Tests: `node:test` + supertest (or equivalent) for auth, role gating, and vacancies in Express, and a Worker test harness for the same routes.

### BE-2 — Commerce & Operations Modules (`agents/be-ops`)

PRD §6.1–6.4, §6.7 · Plan §1 schemas, §2 Phases A–B

Everything goes in **both** Express and `backend/cloudflare` (D1 migrations), guarded by BE-1's capabilities. If BE-1 hasn't landed yet, code against the contract and use a temporary `requireCapability` shim with the same signature.

1. **Categories and products (D5):** CRUD, slug/SKU uniqueness, sanitised `descriptionHtml`, attributes, images (URLs), status. Public list/detail endpoints. Packages can reference products without breaking existing `/packages` responses.
2. **Inventory:** `stockQuantity` and `reorderLevel` on products. Adjustment endpoint that writes an inventory-movement record (reason, qty, user). Movement history. Stock is decremented on order placement or fulfilment (document which). Low-stock check sends email to addresses in settings (Express via nodemailer; Worker via existing Resend path or a scheduled trigger).
3. **Orders fulfilment:** add `paymentStatus` and `fulfillmentStatus` enums from Plan §1 to the existing orders, with a migration for existing records. Status transitions are validated and audited. Mark as paid. `requiresInstallation` and assign engineer.
4. **Installation jobs and staff:** job CRUD (order, engineer, scheduledAt, status, checklist, photo URLs, notes). Engineer-scoped endpoints (`GET /admin/me/jobs`, status updates only on own jobs). Staff profile fields (area coverage, certifications) on engineer accounts.
5. **Settings and notifications:** a single settings document (business info, notification emails, payment gateway toggle, low-stock thresholds). Notification records for low-stock, new order, and vacancy posted.
6. Dashboard KPIs extended per Plan §2: revenue for a period, open orders, low-stock items, open vacancies, upcoming jobs.
7. Tests for each module and parity checks between Express and Worker responses.

### FE-1 — Public Site Port (`agents/fe-public`)

PRD §6.1, §6.5 public, §6.8, §7 Next.js criteria · Plan §3

1. **Fix the build first** (the `page.jsx` parse error) so `next build` and `eslint` are green. Keep them green on every commit.
2. **Brand system:** move tokens from `tailwind.config.js` into Tailwind v4 `@theme` in `globals.css`. Load the Plus Jakarta Sans and JetBrains Mono fonts. Set the real `metadata` and favicon. Delete the create-next-app assets.
3. Port the shared layout (Navbar, Header, Footer) and the public UI kit pieces needed from `frontend/src/components` into `frontend-next/components`.
4. **Port pages from `frontend/src/pages`:** Landing (all Home sections), Services, Portfolio, Packages (listing + `packages/[slug]` detail with `generateStaticParams` + ISR), Contact (Turnstile), Cart, Checkout (server quote via `/cart/quote`, fallback behaviour from `FRONTENDS.md`, Turnstile `order`). Keep the local fallbacks the Vite site has for packages, services, and portfolio.
5. **Vacancies public pages:** convert to server components with SSG/ISR. Add the full field set (employment type, requirements, responsibilities). Render sanitised HTML inside a scoped prose style.
6. Products/categories public catalog pages once BE-2 publishes their contract.
7. SEO (per-page metadata, sitemap, robots), basic a11y (landmarks, labels, focus states), responsive checks. Vercel config (`NEXT_PUBLIC_BACKEND_URL`, Turnstile site key), documented in `frontend-next/README.md`.

### FE-2 — Admin Portal Port & New Module UIs (`agents/fe-admin`)

PRD §6.2–6.7 admin, §7 · Plan §2 admin pages

Admin lives under `frontend-next/app/admin/**`. It is client-rendered and never statically generated with data.

1. **Auth:** port `AdminLogin`, the session storage and expiry behaviour from `frontend/src/pages/Admin`, and password reset against `/admin/auth/*`. Remove the `localStorage['je-user-role']` gate. Role comes from the session and hides nav items by capability (the server still enforces). Shared `adminFetch` client with the bearer token and 401 handling.
2. **Port the existing admin:** AdminShell/nav, Dashboard, ContentManager (packages, services, portfolio, customer segments), Orders + OrderDetails, Contacts with reply, Newsletter, Carts, Activity/Audit log, and new-activity notifications/read status. Reuse the ported UI kit and share components with FE-1 where possible.
3. **Vacancies admin (PRD §6.5 acceptance):** list with draft/open/closed filter, create/edit with `react-quill-new` (D6) and all fields, publish/unpublish, delete with confirm. Import `quill-overrides.css`.
4. **New module UIs** against BE contracts, stubbing with typed mock responses until the endpoints land: Products & Categories (category tree), Inventory (stock view, adjustments, movement history, low-stock badge), Orders fulfilment (status transitions, mark paid, assign engineer, create installation job), Installation jobs + a **mobile-first engineer view** (assigned jobs, status and checklist updates), Staff, Users & Roles, Settings.
5. Dashboard KPI cards per Plan §2.

### SUP-BE — Backend Supervisor (`agents/be-supervisor`)

- Before implementers get far: write `docs/agents/API_CONTRACT_V3.md`. It defines every new and changed endpoint (path, capability, request/response shape, error shape matching `services/http.js`/`errors.js`), the role → capability map, the D1 migration numbering plan (BE-1 and BE-2 must not collide: BE-1 takes `0007–0009`, BE-2 takes `0010+`), and the Express↔Worker parity rules.
- Write the backend acceptance checklist (from the PRD §7 and §4 decisions).
- Review BE-1 and BE-2 commits for correctness, security (auth on every write, sanitisation, no fail-open signatures, no secret leakage), parity, and contract adherence. Run their tests. Write findings to `docs/agents/review-be.md` on the supervisor branch.
- When both are done: build `agents/be-integration` by merging BE-1 and then BE-2, resolve conflicts, run all tests plus a smoke run of Express, and report readiness.

### SUP-FE — Frontend Supervisor (`agents/fe-supervisor`)

- Before implementers get far: write `docs/agents/FE_CONVENTIONS.md` covering directory layout (`components/ui`, `components/public`, `components/admin`, `lib/api`), a single API client module shared by both FE agents, data-fetching rules (server components for public pages, client for admin), design tokens, and which UI-kit files each FE agent owns (to avoid duplicate ports).
- Write the frontend acceptance checklist: `next build` and lint green, visual parity with the Vite pages, PRD §7 SSG criteria, a11y basics, no client-trusted authorisation.
- Review FE-1 and FE-2 commits, and check contract usage against `API_CONTRACT_V3.md`. Write findings to `docs/agents/review-fe.md`.
- When both are done: build `agents/fe-integration` by merging FE-1 and then FE-2, resolve conflicts, and run a build, lint, and smoke run against a local backend.

---

## 6) Deliverable tracker

| Deliverable | Owner | PRD / Plan | Status |
| --- | --- | --- | --- |
| API contract + migration numbering | SUP-BE | Plan §1–2 | Not started |
| FE conventions + shared API client | SUP-FE | Plan §3 | Not started |
| Roles & capabilities (Express + Worker) | BE-1 | PRD §6.6 | Not started |
| Vacancies secured + Worker/D1 port; retire d1-write/d1-sync | BE-1 | PRD §6.5, D1 | Partial (insecure) |
| CI green + deploy pipeline + env matrix | BE-1 | PRD §9 Sprint 4 | Broken |
| Products & categories | BE-2 / FE-2 / FE-1 | PRD §6.1 | Models only (unused) |
| Inventory + movements + low-stock email | BE-2 / FE-2 | PRD §6.2 | Not started |
| Order fulfilment + engineer assignment | BE-2 / FE-2 | PRD §6.3 | Orders CRUD exists; fulfilment not started |
| Installation jobs + engineer mobile UI | BE-2 / FE-2 | PRD §6.4 | Not started |
| Settings + notifications | BE-2 / FE-2 | PRD §6.7 | Not started |
| Next.js build green + brand system | FE-1 | Plan §3 | Broken |
| Public site port (landing → checkout) | FE-1 | PRD §6.1, §7 | Not started |
| Vacancies public SSG | FE-1 | PRD §6.5, §7 | Partial (CSR only) |
| Admin portal port + vacancies admin | FE-2 | PRD §6.5–6.6 | Partial (does not build) |
| Backend integration branch | SUP-BE | — | Not started |
| Frontend integration branch | SUP-FE | — | Not started |

## 7) Out of scope for this round

The PRD's Phase C/D items stay out of scope: payment gateway integration (only a toggle is needed), promotions, i18n/multi-currency, S3 signed uploads (use image URLs for now), production deployment execution (the pipeline is prepared, but a human triggers the first deploy), and a Mongo mirror of D1.

Update this ledger after each supervisor sign-off.
