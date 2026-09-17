# Frontend Conventions (v3) — `frontend-next`

Owner: SUP-FE (`agents/fe-supervisor`). Binding for FE-1 (`agents/fe-public`) and FE-2 (`agents/fe-admin`).
Base: `v3-agents-base` @ `d48b482` (`next build` green, `react-quill-new` installed, `npm ci` works).
Revision 2 (after reviewing FE-1 `b6e901d` and `API_CONTRACT_V3.md`): the admin token moves to `Authorization: Bearer`, nav is gated by `capabilities` from `/admin/auth/me`, FE-1's committed `lib/cn.ts` and `lib/api/client.ts` become the shared originals, the UI kit is frozen at FE-1's port, and the public body font is Inter. See `review-fe.md`.
If a rule blocks you, note it in your status file (`docs/agents/<agent-id>.md`) and follow the rule until SUP-FE changes this file.

Read `frontend-next/AGENTS.md` first: Next 16.3 has breaking changes. Check `node_modules/next/dist/docs/` before relying on memory.

---

## 1. Directory layout and ownership

```
frontend-next/
  app/
    layout.tsx, globals.css, page.tsx, not-found.tsx   FE-1
    (public)/...  services, portfolio, packages, packages/[id], contact, cart, checkout, vacancies, vacancies/[slug]   FE-1
    admin/**      layout.tsx (client shell), login, reset-password, and every admin page   FE-2
    sitemap.ts, robots.ts   FE-1
  components/
    ui/        shared primitives (see §1.1 for who ports each file)
    public/    Navbar, Header, Footer, Home sections, TurnstileWidget, cart widgets   FE-1
    admin/     AdminShell, nav, NewActivityBanner, DetailList, forms, tables   FE-2
  lib/
    api/client.ts    shared fetch core   FE-1 (shared original, §3.3)
    api/index.ts     barrel   FE-1 (public code imports `@/lib/api/public`, admin code `@/lib/api/admin`)
    api/public.ts    public endpoint helpers   FE-1
    api/admin.ts     adminRequest transport (seeded by FE-1 in b6e901d; FE-2 owns it from now on)
    api/types.ts     response types; add your own section, do not edit the other agent's section
    cn.ts            class joiner   FE-1 (shared original, §3.3)
    config.ts        env access (non-API env such as the Turnstile site key and site URL)   FE-1
    cart/            cart store (D3)   FE-1
    turnstile/       useTurnstile hook   FE-1
    admin/           session, capability helpers, notification hook   FE-2
  public/            brand assets and favicon   FE-1
```

- Use the `@/*` path alias (`@/components/ui/Button`). Do not use deep relative imports across top-level folders.
- New files are `.tsx`/`.ts`. The existing `app/**/vacancies/*.jsx` files get converted when they are rewritten.
- **UI kit exception:** `components/ui/*` stays `.jsx`/`.js`, so it can be diffed line by line against Vite. It **must** be usable from `.tsx` with `strict` on. TypeScript currently infers every destructured prop without a default as required (for example, `<Card>` without `className` fails type-check). FE-1 fixes this by adding JSDoc prop types that mark optional props (`@param {{ className?: string, … }} props`), or by adding a `components/ui/index.d.ts` with prop types. Blocking before any `.tsx` page consumes the kit.
- Route groups such as `(public)` are optional. If FE-1 uses one, keep `app/admin` outside it.
- Do not create `pages/` (Pages Router). App Router only (D2).

### 1.1 UI kit ownership (`frontend/src/components/ui` → `frontend-next/components/ui`)

FE-1 ported the **whole** kit, all 25 files, in `b6e901d`. SUP-FE reviewed it as faithful to Vite, so the original split (FE-2 porting the admin-leaning files) is withdrawn to avoid duplicate ports.

- **FE-2 does not port any kit file.** Bring FE-1's kit and shared lib into your branch without merging, so both branches add identical content:
  `git checkout agents/fe-public -- frontend-next/components/ui frontend-next/lib/cn.ts frontend-next/lib/api/client.ts frontend-next/lib/api/index.ts frontend-next/lib/api/public.ts frontend-next/package.json frontend-next/package-lock.json`
  Then run `npm ci`. Repeat when FE-1 changes those paths. Never edit them on your branch. FE-1 no longer ships `lib/api/admin.ts`, which is FE-2's own file (§3.5).
- Tailwind v3 → v4 renames apply to ported markup (Vite is on Tailwind 3.4): `shadow-sm`→`shadow-xs`, `shadow`→`shadow-sm`, `rounded-sm`→`rounded-xs`, `rounded`→`rounded-sm`, `blur`→`blur-sm`, `ring`→`ring-3`, `outline-none`→`outline-hidden`, `flex-shrink-*`→`shrink-*`. Parity means the same **rendered** result, not the same class string.
- Kit changes needed by admin (new props, variants) are requested in `docs/agents/fe-admin.md`. FE-1 makes them. If FE-1 is blocked, FE-2 wraps the component in `components/admin/*` instead of editing it.
- The barrel is `components/ui/index.js` (FE-1).
- Non-kit Vite components: `Navbar`, `Header`, `Footer`, `Slider`, `Tab`, `CustomChip`, `TurnstileWidget` go to FE-1 (`components/public`). `Modal.jsx` is replaced by `ui/Dialog`, so do not port it.
- Keep each component's props API identical to the Vite version unless the change is needed for Next (for example, `Link` from `next/link`, `Image` from `next/image`). Parity reviews diff against the Vite file.
- Mark a component `"use client"` only when it uses state, effects, refs, event handlers, or browser APIs. Presentational primitives (`Card`, `Badge`, `Container`, `PageHeader`, `Skeleton`) stay server-compatible.
- A `"use client"` module must export only components and hooks. Plain values exported from one (for example, `fieldClasses` from `Input.jsx`) become client references in server components. Move shared class strings into a non-client module, as `buttonStyles.js` does.
- Components that accept callback props but have no `"use client"` (`Alert` `onDismiss`, `EmptyState` `onRetry`, `StatCard` `onClick`) may receive callbacks **only from client components**. Server components pass `href`, or leave the callback out.

---

## 2. Design tokens and styling

- **Tailwind v4 CSS-first.** FE-1 moves every token from `frontend-next/tailwind.config.js` into `@theme` in `app/globals.css` and then deletes `tailwind.config.js`. Until that lands, FE-2 uses the same class names (`bg-brand-700`, `shadow-elev-3`, `animate-fade-up`), and they will resolve after the merge.
- **Accessibility outranks pixel parity (PRD §6.8, review 4 ruling).**
  - **Thresholds:** normal text and text buttons need a contrast ratio of at least 4.5:1, and large text (≥24 px, or ≥18.66 px bold) and non-text UI need at least 3:1, measured against the actual background (white **and** `offWhite`).
  - **Required replacements for Vite colours:**

    | Vite colour | Use | Replacement |
    | --- | --- | --- |
    | `brand-500`/`brand-600` `#DB464C` | token value | `#CC4147` |
    | `faint` `#85793E` | token value | `#7D723A` |
    | footer `#E67E82` | on `deep_red` | `#EA9598` |
    | `#878787` | labels | `#767676` |
    | `#e26767` | load text | `#BD5656` |
    | `#EDA4A6` | "In Cart" | `#BD5656`, with white text on it |

  - `#D24349` is not enough, because it is 4.32:1 on `offWhite`.
  - Token *names* stay fixed; only these values change.
  - Record every such change as an "a11y deviation from Vite" in `fe-public.md`.
  - Decorative shapes and disabled states are exempt.
- **Parity decisions (review 4):**
  - The Navbar keeps the Vite items, with no Products or Careers link. Both pages are linked from the footer and the sitemap.
  - Checkout stays a dialog on `/cart`.
  - The Vite solar-toggle kits-text bug is kept for payload parity and is tracked as an open product issue (review-fe FE4-5).
  - There is no CSP yet. The follow-up is a report-only policy first (FE4-3).
- Token names are fixed. Use the Vite config's names:
  - Colours: `brand-50…950`, `navbar_color`, `header_color`, `deep_red`, `offWhite`, `faint`, `milk`, `diamond`.
  - Shadows: `elev-1…5`, `auth`.
  - Animations: `fade-up`, `fade-in`, `slide-in-left`, `slide-in-right`.
  - Do not rename them, and do not add colours as raw hex in components. If a token is missing, add it to `@theme` (FE-1), or ask FE-1 in your status file (FE-2).
  - Vite also defines the plain CSS variables `:root { --diamond: #ff6961; --gold: #dfc638 }`. They are used as `text-[var(--gold)]`/`bg-[var(--diamond)]` in Cart and Packages. Note that `--diamond` is **not** the same as the Tailwind `diamond` token. Port both variables into `globals.css` as they are.
  - Page-level global CSS in `App.css` (`.overlay`, `.header-video`, `.header-content`, `.energyBackground`, `rotate` keyframes, scrollbar styling, `.overlay:focus-within`, `img` rule) is ported by FE-1 together with the page that needs it. The `swal2` z-index rule is dropped (sonner replaces SweetAlert2).
- **Fonts** (all through `next/font/google` in `app/layout.tsx`, FE-1, with no `<link>` tags). This mirrors Vite exactly:
  - The **public site body is Inter.** Vite `App.css` sets `body { font-family: "Inter" }`. Plus Jakarta Sans applies only where `font-sans` is used, which is the whole admin app (`AdminApp`/`AdminShell`/`AdminLogin` set `font-sans`).
  - `--font-sans` = Plus Jakarta Sans and `--font-mono` = JetBrains Mono (theme tokens). Add `--font-inter`, `--font-manrope`, `--font-sora` variables. `body` uses Inter. The admin root element (`app/admin/layout.tsx`, FE-2) sets `font-sans`.
  - Port the helper classes from `frontend/src/App.css` into `globals.css` (`@layer components`), backed by the variables: `inter-regular|medium|semibold|bold|extrabold`, `sora-regular|semibold|bold`, `manrope-medium|semibold`. Vite uses them 73 times, so ship all of them, not just the ones in use. (`inter-events` in the grep results is not a font class.) Load only the weights those helpers use.
  - JetBrains Mono is not loaded by Vite (the fallback stack is used). Loading it is fine.
- **Dark mode:** Vite uses `darkMode: "class"`. Keep class-based dark mode (`@custom-variant dark (&:where(.dark, .dark *));`). Remove the create-next-app `prefers-color-scheme` block and Arial `body` font.
- **Styles:** use `cn()` for conditional classes, and use no CSS-in-JS. Global CSS only in `globals.css`. Scoped third-party overrides (such as `app/admin/vacancies/quill-overrides.css`) are imported by the page that needs them.
- **Rich HTML** (vacancy and product descriptions) renders inside one `.prose-je` scoped style defined in `globals.css` (FE-1). The server sanitises the HTML (D6), and that is the security boundary. The client runs `lib/sanitize.ts` (FE-1) before `dangerouslySetInnerHTML` as defence in depth. FE-2 uses the same helper for admin previews.
  - **`lib/sanitize.ts` is an exact TypeScript port of `backend/shared/richText.js`** (review 4, FE4-1). Its header names the backend commit it mirrors.
  - Every change to `richText.js` or its fixtures must be re-ported in the same round.
  - The port must pass `backend/shared/__fixtures__/richText.json` and stay linear-time on pathological input.

---

## 3. API access — one client, two surfaces

### 3.1 Environment

| Variable | Used by | Notes |
| --- | --- | --- |
| `NEXT_PUBLIC_BACKEND_URL` | both | e.g. `http://localhost:9000`. No trailing slash. Express serves both `/x` and `/api/x`. Use the unprefixed paths. |
| `NEXT_PUBLIC_TURNSTILE_SITE_KEY` | both | Turnstile is disabled when it is unset (same as Vite `VITE_TURNSTILE_SITE_KEY`). |
| `NEXT_PUBLIC_SITE_URL` | FE-1 | `metadataBase`, sitemap, and OG URLs. |
| `NEXT_PUBLIC_ADMIN_PREVIEW` | FE-2 | `"true"` enables the contract mock fallback (§3.5). **Never set it in production.** It is read in `lib/admin/preview.ts` until FE-1 adds `adminPreview` to `lib/config.ts`. |

Read `NEXT_PUBLIC_BACKEND_URL` only through `backendUrl` in `lib/api/client.ts`. Read the other variables through `lib/config.ts` (FE-1 creates it when Turnstile lands, and `app/layout.tsx` moves to it). Never read `process.env` in components.

### 3.2 Response envelope

The backend returns `{ success: true, message, data }`. Errors return `{ success: false, message, details? }` with a 4xx or 5xx status (`API_CONTRACT_V3.md` §0.2). `message` is a full sentence, and the UI shows it as it is. The client resolves to the **whole envelope**, so callers read `.data`. Non-2xx responses, non-JSON responses, and `success === false` throw `ApiError(message, status, body)`, and `error.data?.details` carries the contract's `details` (for example, insufficient stock). A network failure throws with `status === 0`. New admin list endpoints are paged as `{ items, page, limit, total }`. Existing lists stay arrays.

### 3.3 Shared originals (`lib/cn.ts`, `lib/api/client.ts`)

These files are the versions committed by FE-1 in `agents/fe-public` (first in `b6e901d`). **They replace the verbatim snippets in revision 1 of this file.** If FE-1 already rewrote them to match the revision-1 snippets, revert to the `b6e901d` content. The `b6e901d` client is a superset: JSON-encoding of object bodies, a `query` option, `ApiError.data` for `details`, and network errors as status 0.

- `cn` = `twMerge(clsx(inputs))`, matching Vite `frontend/src/lib/cn.js`.
- `apiRequest<T>(path, init)`: `init` extends `RequestInit` with `body?: unknown` (plain objects are JSON-encoded, so do **not** call `JSON.stringify` yourself), `query?`, and `next?: { revalidate, tags }`.
- `getPublicData<T>(path, params?, init?)` for GETs.
- Only FE-1 edits these files. FE-2 copies them with the `git checkout agents/fe-public -- …` command in §1.1. Request changes through `docs/agents/fe-admin.md` or SUP-FE.

### 3.4 Public helpers (`lib/api/public.ts`, FE-1)

- Export named, typed functions per endpoint, using the names already in `lib/api/public.ts` (`getPackages`, `getPackage(id)`, `getServices`, `getPortfolio`, `getPortfolioItem`, `quoteCart`, `saveCart`, `placeOrder`, `submitContact`, `subscribe`, `getVacancies`, `getVacancy(slug)`). The backend route is `GET /packages/:id`, so the detail page segment is `packages/[id]` unless the contract adds slug lookup. Replace the `Row` placeholder types with contract types as endpoints are confirmed. Do not scatter `fetch` calls in pages.
- Server-component reads pass `{ next: { revalidate: N } }` (§4). Mutations run client-side and send the Turnstile token the same way Vite does.
- Keep the Vite local fallbacks for packages, services, and portfolio (`frontend/src/utils/plans.json` and the page-level fallbacks). A backend outage at build time must not fail `next build`. Catch the error, render the fallback, and log it.

### 3.5 Admin helpers (`lib/api/admin.ts` + `lib/admin/*`, FE-2)

These are the facts about the existing admin session (verified against `frontend/src/utils/api.js`, `frontend/src/pages/Admin/*`, `backend/services/adminAuthService.js`):

- **Storage:** token in `localStorage["je/admin-session"]`, admin user JSON in `localStorage["je/admin-user"]`, seen-activity state in `localStorage["je/admin-seen"]`. Keep these exact keys so existing sessions survive the Vite → Next switch.
- **Transport:** send `Authorization: Bearer <token>` (`API_CONTRACT_V3.md` §12). The backend still accepts `x-admin-token`, but the contract wins, so do not send it. Never send `X-User-Role`/`X-User-Id`. Admin paths are `/admin/*`, and `adminRequest` in `lib/api/admin.ts` adds the prefix, the header, and `cache: "no-store"`.
- **Login:** `POST /admin/auth/login` `{ username, password }` (`username` holds the email address) returns `data: { token, admin: AdminSelf }`, where `AdminSelf = { id, name, email, role, capabilities: string[], isStatic?: true }`. Store `token` in `je/admin-session` and `admin` in `je/admin-user`.
- **Current admin:** `GET /admin/auth/me` returns `data: { admin: AdminSelf }`. Call it on admin app load (after a token is found) and after **any** `403`, and replace `je/admin-user` with the result. It is the source of truth for `capabilities`. The cached `je/admin-user` is only for first paint.
- **Password reset:** `POST /admin/auth/request-password-reset`, then `POST /admin/auth/reset-password`. **Logout:** `POST /admin/auth/logout`, then clear both keys whatever the result.
- **Lifetime:** sessions last 8 hours (absolute) with a 2-hour idle timeout, and the server enforces both. The client does not run its own timers to decide validity. It reacts to `401`.
- **401 handling:** already in FE-1's `adminRequest`, which you keep. On `401`, it calls the single registered handler (`setAdminUnauthorizedHandler`) **only if the stored token still equals the token that was sent**. The handler clears `je/admin-session` and `je/admin-user` and routes to `/admin/login`. FE-2 adds `je/admin-user` read, write, and clear helpers next to the token helpers (`clearAdminToken` currently leaves the user behind).
- **403 handling:** refetch `/admin/auth/me`, re-gate the nav, and show the envelope `message` inline (an "insufficient permission" state, not a crash and not a redirect).
- **Capabilities, not roles:** nav items, routes, and action buttons are gated by `admin.capabilities.includes("<cap>")` through a helper in `lib/admin/capabilities.ts` (for example, `can(admin, "vacancies:write")`). **Never branch on `role`.** Capability names come from contract §1.2 (`dashboard:read`, `content:write`, `orders:update`, `jobs:update-own`, `vacancies:write`, …). Do not copy the role → capability table into the frontend. An admin whose `capabilities` are empty still signs in and sees an empty-state shell. **Delete the `localStorage['je-user-role']` gate.** Hiding UI is cosmetic, because the server enforces access.
- **Routes with no Vite UI:** carts (`GET /admin/carts`) and customer segments (`POST|PUT|DELETE /admin/services/customer-segments[/:id]`) have backend routes but no Vite screens. FE-2 builds them new. Visual parity does not apply, so use the UI kit and existing admin table and form patterns.
- **Mocks are opt-in (review FE2-1).** The fallback to `lib/admin/mocks.ts` runs only when `NEXT_PUBLIC_ADMIN_PREVIEW === "true"` **and** the response is exactly `404 "Route not found."`. With the flag off, a missing route is an error state, `getSession` never adds capabilities, and no mock overlay touches real records.
- **One toaster.** The root `app/layout.tsx` (FE-1) mounts the only `<Toaster />`. Admin code calls `toast` and never mounts its own.
- Existing admin endpoints to port against (each now needs a capability; see contract §1.2): `dashboard`, `audit-logs`, `reads` (`GET`, `POST`, `POST /reads/all`), `packages`, `services`, `portfolio`, `contacts` (+ `/:id/reply`), `newsletter`, `carts`, `orders` (+ `/:id`). New module endpoints come only from `agents/be-supervisor:docs/agents/API_CONTRACT_V3.md`. Until an endpoint is in the contract, stub it behind a typed function in `lib/api/admin.ts` (or `lib/api/admin/<module>.ts`) returning mock data **in exactly the contract shape**, with `// TODO(contract): <endpoint>`. Stubs for endpoints that are already in the contract must match it field for field.

---

## 4. Data-fetching and rendering rules

| Surface | Rendering | Rules |
| --- | --- | --- |
| Public marketing pages (landing, services, portfolio, packages list) | Server components, static + ISR | `revalidate` 300 s. No `useEffect` data fetching. Interactive bits (carousels, add-to-cart) are small client islands receiving data as props. |
| `packages/[id]`, `vacancies/[slug]` | Server components + `generateStaticParams` + ISR | `revalidate` 300 s. `dynamicParams = true`. Unknown slug calls `notFound()`. Per-page `generateMetadata`. |
| `vacancies` list | Server component, ISR | Only `status === "open"` is shown. Key lists by `id ?? _id ?? slug` (JSON store has no `_id`). |
| Cart, checkout, contact forms | Client components | Cart store per D3, persisted to `localStorage["je/cart"]` with the Vite shape (`frontend/src/features/cart.js`), so `/cart/quote` and `/order` payloads are unchanged. Guard every `localStorage` access for SSR (`typeof window`). |
| `app/admin/**` | Client-rendered only | `app/admin/layout.tsx` is a client shell that performs the session check (token present → `GET /admin/auth/me` → render; otherwise `/admin/login`) and applies `font-sans`. Admin pages never fetch at build time, never use `generateStaticParams`, and never read admin data in server components. Add `robots: { index: false }` metadata for `/admin`. |

- `react-quill-new` loads only through `next/dynamic(() => import("react-quill-new"), { ssr: false })` inside a client component (D6).
- Browser-only libraries (Turnstile, Quill, `localStorage`) never run at module top level.
- Use `next/link` for internal links, and `next/image` for local and remote images (configure `images.remotePatterns` in `next.config.ts`, FE-1).
- Loading and error states: public routes provide `loading.tsx`/`error.tsx` where data is fetched. Admin screens use `Skeleton` + `Alert`/`EmptyState`.

---

## 5. Code, commits, and branch hygiene

- `npm run build` and `npm run lint` in `frontend-next` must pass on **every** commit. TypeScript `strict` stays on. Do not add `// @ts-nocheck` or blanket `eslint-disable`.
- Do not add dependencies without noting the reason in your status file. Pre-approved: `clsx`, `tailwind-merge`, `lucide-react`, `@headlessui/react`, `sonner` (already added by FE-1 for the kit; FE-2 gets them via the §1.1 checkout), `zustand` (FE-1, cart), `isomorphic-dompurify` (FE-1, sanitise helper). If both branches add dependencies, `package-lock.json` will conflict. SUP-FE resolves it at integration by regenerating the lockfile with `npm install`, so do not spend time pre-resolving it. Redux is not approved (D3). Commit `package-lock.json` changes in the same commit as the dependency change.
- Commit small with conventional messages (`feat(fe-public): …`, `feat(fe-admin): …`). Never push or merge into `v3`.
- Do not edit another agent's owned files. Shared-file changes go through SUP-FE.
- `frontend-next/AGENTS.md` is regenerated by `next dev`. Commit it if it changes, and do not fight it.
- **Disk:** install dependencies at most once per worktree with the default npm cache. Delete `.next` when you stop. Stop and report if `df -h /System/Volumes/Data` shows less than 3 GB free.
- Update `docs/agents/<agent-id>.md` with progress, stubs awaiting contract, and any deviations from this file.
