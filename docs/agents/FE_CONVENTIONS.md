# Frontend Conventions (v3) — `frontend-next`

Owner: SUP-FE (`agents/fe-supervisor`). Binding for FE-1 (`agents/fe-public`) and FE-2 (`agents/fe-admin`).
Base: `v3-agents-base` @ `d48b482` (`next build` green, `react-quill-new` installed, `npm ci` works).
If a rule blocks you, note it in your status file (`docs/agents/<agent-id>.md`) and follow the rule until SUP-FE changes this file.

Read `frontend-next/AGENTS.md` first: Next 16.3 has breaking changes. Check `node_modules/next/dist/docs/` before relying on memory.

---

## 1. Directory layout and ownership

```
frontend-next/
  app/
    layout.tsx, globals.css, page.tsx, not-found.tsx   FE-1
    (public)/...  services, portfolio, packages, packages/[slug], contact, cart, checkout, vacancies, vacancies/[slug]   FE-1
    admin/**      layout.tsx (client shell), login, reset-password, and every admin page   FE-2
    sitemap.ts, robots.ts   FE-1
  components/
    ui/        shared primitives (see §1.1 for who ports each file)
    public/    Navbar, Header, Footer, Home sections, TurnstileWidget, cart widgets   FE-1
    admin/     AdminShell, nav, NewActivityBanner, DetailList, forms, tables   FE-2
  lib/
    api/client.ts    shared fetch core (verbatim file in §3; both agents may add it)
    api/public.ts    public endpoint helpers   FE-1
    api/admin.ts     adminFetch + session helpers   FE-2
    api/types.ts     response types; add your own section, do not edit the other agent's section
    cn.ts            class joiner (verbatim in §3)
    config.ts        env access (verbatim in §3)
    cart/            cart store (D3)   FE-1
    turnstile/       useTurnstile hook   FE-1
    admin/           session, capability helpers, notification hook   FE-2
  public/            brand assets and favicon   FE-1
```

- Use the `@/*` path alias (`@/components/ui/Button`). Do not use deep relative imports across top-level folders.
- New files are `.tsx`/`.ts`. You can port a Vite file as `.jsx` first, but convert it before your final sign-off. The existing `app/**/vacancies/*.jsx` files get converted when they are rewritten.
- Route groups such as `(public)` are optional. If FE-1 uses one, keep `app/admin` outside it.
- Do not create `pages/` (Pages Router). App Router only (D2).

### 1.1 UI kit ownership (`frontend/src/components/ui` → `frontend-next/components/ui`)

Only the owner ports a file. The other agent imports it. If you need a file the owner has not ported yet, add a minimal version at the same path with the same exported API, and the integration merge keeps the owner's version. Flag this in your status file.

| Owner | Files |
| --- | --- |
| FE-1 | `Button` + `buttonStyles`, `Card`, `Container`, `Badge`, `Input`, `Field` + `fieldContext`, `Checkbox`, `Alert`, `Spinner`, `Skeleton`, `Dialog`, `Toaster`, `index.ts` (barrel) |
| FE-2 | `Table`, `Pagination` + `paginate`, `Tabs`, `Drawer`, `StatCard`, `PageHeader`, `EmptyState`, `Avatar`, `Switch`, `statusMaps` |

- FE-2 does not edit the barrel `components/ui/index.ts`. Import FE-2 files by path (`@/components/ui/Table`). SUP-FE adds them to the barrel during integration.
- Non-kit Vite components: `Navbar`, `Header`, `Footer`, `Slider`, `Tab`, `CustomChip`, `TurnstileWidget` go to FE-1 (`components/public`). `Modal.jsx` is replaced by `ui/Dialog`, so do not port it.
- Keep each component's props API identical to the Vite version unless the change is needed for Next (for example, `Link` from `next/link`, `Image` from `next/image`). Parity reviews diff against the Vite file.
- Mark a component `"use client"` only when it uses state, effects, refs, event handlers, or browser APIs. Presentational primitives (`Card`, `Badge`, `Container`, `PageHeader`, `Skeleton`) stay server-compatible.

---

## 2. Design tokens and styling

- **Tailwind v4 CSS-first.** FE-1 moves every token from `frontend-next/tailwind.config.js` into `@theme` in `app/globals.css` and then deletes `tailwind.config.js`. Until that lands, FE-2 uses the same class names (`bg-brand-700`, `shadow-elev-3`, `animate-fade-up`), and they will resolve after the merge.
- Token names are fixed. Use the Vite config's names:
  - Colours: `brand-50…950`, `navbar_color`, `header_color`, `deep_red`, `offWhite`, `faint`, `milk`, `diamond`.
  - Shadows: `elev-1…5`, `auth`.
  - Animations: `fade-up`, `fade-in`, `slide-in-left`, `slide-in-right`.
  - Do not rename them, and do not add colours as raw hex in components. If a token is missing, add it to `@theme` (FE-1), or ask FE-1 in your status file (FE-2).
- **Fonts:** load Plus Jakarta Sans (`--font-sans`) and JetBrains Mono (`--font-mono`) with `next/font/google` in `app/layout.tsx` (FE-1). Do not use `<link>` tags to Google Fonts. The Vite site also loads Inter, Manrope, and Sora for the `.sora-*` and `.inter-*` helper classes in `frontend/src/App.css`. FE-1 ports those helpers only where a ported page uses them, backed by `next/font` variables.
- **Dark mode:** Vite uses `darkMode: "class"`. Keep class-based dark mode (`@custom-variant dark (&:where(.dark, .dark *));`). Remove the create-next-app `prefers-color-scheme` block and Arial `body` font.
- **Styles:** use `cn()` for conditional classes, and use no CSS-in-JS. Global CSS only in `globals.css`. Scoped third-party overrides (such as `app/admin/vacancies/quill-overrides.css`) are imported by the page that needs them.
- **Rich HTML** (vacancy descriptions) renders inside one `.prose-je` scoped style defined in `globals.css` (FE-1). The server sanitises the HTML (D6), and the client additionally strips `<script>`, `<style>`, `on*` attributes, and `javascript:` URLs before `dangerouslySetInnerHTML`. Use one shared helper, `lib/sanitize.ts` (FE-1). FE-2 uses the same helper for admin previews.

---

## 3. API access — one client, two surfaces

### 3.1 Environment

| Variable | Used by | Notes |
| --- | --- | --- |
| `NEXT_PUBLIC_BACKEND_URL` | both | e.g. `http://localhost:9000`. No trailing slash. Express serves both `/x` and `/api/x`. Use the unprefixed paths. |
| `NEXT_PUBLIC_TURNSTILE_SITE_KEY` | both | Turnstile is disabled when it is unset (same as Vite `VITE_TURNSTILE_SITE_KEY`). |

Read these variables only through `lib/config.ts`. Never read `process.env` in components.

### 3.2 Response envelope

The backend returns `{ success: boolean, message: string, data: T }` (`backend/services/http.js`). Errors return `{ success: false, message }` with a 4xx or 5xx status. `message` may be an array, so take the first element. The client resolves to the **whole envelope**, so callers read `.data`, the same as Vite's `apiRequest`. Non-2xx responses and `success === false` throw an `ApiError` carrying `status` and `message`.

### 3.3 Verbatim shared files

Both agents may create these files. They must match **byte for byte**, so that the integration merge sees identical adds. Do not edit them. Ask SUP-FE instead.

`lib/config.ts`
```ts
export const config = {
  backendUrl: (process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:9000").replace(/\/+$/, ""),
  turnstileSiteKey: process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY || "",
};
```

`lib/cn.ts` (same semantics as Vite `frontend/src/lib/cn.js`; ported components rely on `twMerge` overrides)
```ts
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export const cn = (...inputs: ClassValue[]) => twMerge(clsx(inputs));
```

`lib/api/client.ts`
```ts
import { config } from "@/lib/config";

export type Envelope<T> = { success: boolean; message: string; data: T };

export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

export type Query = Record<string, string | number | boolean | undefined | null>;

export const toQuery = (params: Query = {}) => {
  const entries = Object.entries(params).filter(([, v]) => v !== undefined && v !== null && v !== "");
  const qs = new URLSearchParams(entries.map(([k, v]) => [k, String(v)])).toString();
  return qs ? `?${qs}` : "";
};

export type ApiInit = RequestInit & { next?: { revalidate?: number | false; tags?: string[] } };

export async function apiRequest<T>(path: string, init: ApiInit = {}): Promise<Envelope<T>> {
  const headers = new Headers(init.headers);
  if (init.body !== undefined && !headers.has("Content-Type")) headers.set("Content-Type", "application/json");
  const response = await fetch(`${config.backendUrl}${path}`, { ...init, headers });
  const body = (await response.json().catch(() => null)) as Envelope<T> | { success: false; message: string | string[] } | null;
  if (!response.ok || !body || body.success === false) {
    const raw = body?.message;
    throw new ApiError(response.status, (Array.isArray(raw) ? raw[0] : raw) || "Request failed");
  }
  return body as Envelope<T>;
}
```

### 3.4 Public helpers (`lib/api/public.ts`, FE-1)

- Export named, typed functions per endpoint (`getPackages`, `getPackage(slug)`, `getServices`, `getPortfolio`, `quoteCart`, `placeOrder`, `sendContact`, `subscribe`, `getVacancies`, `getVacancy(slug)`). Do not scatter `fetch` calls in pages.
- Server-component reads pass `{ next: { revalidate: N } }` (§4). Mutations run client-side and send the Turnstile token the same way Vite does.
- Keep the Vite local fallbacks for packages, services, and portfolio (`frontend/src/utils/plans.json` and the page-level fallbacks). A backend outage at build time must not fail `next build`. Catch the error, render the fallback, and log it.

### 3.5 Admin helpers (`lib/api/admin.ts` + `lib/admin/*`, FE-2)

These are the facts about the existing admin session (verified against `frontend/src/utils/api.js`, `frontend/src/pages/Admin/*`, `backend/services/adminAuthService.js`):

- **Storage:** token in `localStorage["je/admin-session"]`, admin user JSON in `localStorage["je/admin-user"]`, seen-activity state in `localStorage["je/admin-seen"]`. Keep these exact keys so existing sessions survive the Vite → Next switch.
- **Transport:** send the header `x-admin-token: <token>`. The session is **not** a `Authorization: Bearer` token (the ledger wording is wrong). Admin paths are `/admin/*`.
- **Login:** `POST /admin/auth/login` `{ username, password }` (`username` holds the email address) returns the envelope with `data: { token, admin: { id, name, email, role } }`. Store both values.
- **Password reset:** `POST /admin/auth/request-password-reset`, then `POST /admin/auth/reset-password`. **Logout:** `POST /admin/auth/logout`, then clear both keys whatever the result.
- **Lifetime:** sessions last 8 hours (absolute) with a 2-hour idle timeout, and the server enforces both. The client does not run its own timers to decide validity. It reacts to `401`.
- **401 handling:** `adminFetch` wraps `apiRequest` from §3.3 and adds the header. On `401`, it calls the single registered unauthorised handler **only if the stored token still equals the token that was sent** (Vite's late-401 guard). The handler clears storage and routes to `/admin/login`. Port `setAdminUnauthorizedHandler` semantics as they are.
- **Roles:** `admin.role` from the login response or `GET` session data drives nav visibility through a capability map in `lib/admin/capabilities.ts`, which mirrors the SUP-BE contract. **Delete the `localStorage['je-user-role']` gate** and never send `X-User-Role`. Hiding UI is cosmetic, because the server enforces access. A 403 renders an "insufficient permission" state, not a crash.
- **Routes with no Vite UI:** carts (`GET /admin/carts`) and customer segments (`POST|PUT|DELETE /admin/services/customer-segments[/:id]`) have backend routes but no Vite screens. FE-2 builds them new. Visual parity does not apply, so use the UI kit and existing admin table and form patterns.
- Existing admin endpoints to port against: `dashboard`, `audit-logs`, `reads` (`GET`, `POST`, `POST /reads/all`), `packages`, `services`, `portfolio`, `contacts` (+ `/:id/reply`), `newsletter`, `carts`, `orders` (+ `/:id`). New module endpoints come only from `agents/be-supervisor:docs/agents/API_CONTRACT_V3.md`. Until an endpoint is in the contract, stub it behind a typed function in `lib/api/admin.ts` returning mock data, with `// TODO(contract): <endpoint>`.

---

## 4. Data-fetching and rendering rules

| Surface | Rendering | Rules |
| --- | --- | --- |
| Public marketing pages (landing, services, portfolio, packages list) | Server components, static + ISR | `revalidate` 300 s. No `useEffect` data fetching. Interactive bits (carousels, add-to-cart) are small client islands receiving data as props. |
| `packages/[slug]`, `vacancies/[slug]` | Server components + `generateStaticParams` + ISR | `revalidate` 300 s. `dynamicParams = true`. Unknown slug calls `notFound()`. Per-page `generateMetadata`. |
| `vacancies` list | Server component, ISR | Only `status === "open"` is shown. Key lists by `id ?? _id ?? slug` (JSON store has no `_id`). |
| Cart, checkout, contact forms | Client components | Cart store per D3, persisted to `localStorage["je/cart"]` with the Vite shape (`frontend/src/features/cart.js`), so `/cart/quote` and `/order` payloads are unchanged. Guard every `localStorage` access for SSR (`typeof window`). |
| `app/admin/**` | Client-rendered only | `app/admin/layout.tsx` is a client shell that performs the session check. Admin pages never fetch at build time, never use `generateStaticParams`, and never read admin data in server components. Add `robots: { index: false }` metadata for `/admin`. |

- `react-quill-new` loads only through `next/dynamic(() => import("react-quill-new"), { ssr: false })` inside a client component (D6).
- Browser-only libraries (Turnstile, Quill, `localStorage`) never run at module top level.
- Use `next/link` for internal links, and `next/image` for local and remote images (configure `images.remotePatterns` in `next.config.ts`, FE-1).
- Loading and error states: public routes provide `loading.tsx`/`error.tsx` where data is fetched. Admin screens use `Skeleton` + `Alert`/`EmptyState`.

---

## 5. Code, commits, and branch hygiene

- `npm run build` and `npm run lint` in `frontend-next` must pass on **every** commit. TypeScript `strict` stays on. Do not add `// @ts-nocheck` or blanket `eslint-disable`.
- Do not add dependencies without noting the reason in your status file. Pre-approved: `clsx` + `tailwind-merge` (both, for `cn`; match the Vite major versions), `zustand` (FE-1, cart), `isomorphic-dompurify` (FE-1, sanitise helper). If both branches add dependencies, `package-lock.json` will conflict. SUP-FE resolves it at integration by regenerating the lockfile with `npm install`, so do not spend time pre-resolving it. Redux is not approved (D3). Commit `package-lock.json` changes in the same commit as the dependency change.
- Commit small with conventional messages (`feat(fe-public): …`, `feat(fe-admin): …`). Never push or merge into `v3`.
- Do not edit another agent's owned files. Shared-file changes go through SUP-FE.
- `frontend-next/AGENTS.md` is regenerated by `next dev`. Commit it if it changes, and do not fight it.
- **Disk:** install dependencies at most once per worktree with the default npm cache. Delete `.next` when you stop. Stop and report if `df -h /System/Volumes/Data` shows less than 3 GB free.
- Update `docs/agents/<agent-id>.md` with progress, stubs awaiting contract, and any deviations from this file.
