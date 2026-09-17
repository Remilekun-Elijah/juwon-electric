# FE-2 — Admin portal (`agents/fe-admin`)

Status: **implementation complete, awaiting SUP-FE review**. Last updated 2026-09-16.

Sources:
- `AGENT_WORKLOAD_SPLIT.md` §5 FE-2.
- `agents/fe-supervisor:docs/agents/FE_CONVENTIONS.md`, revision 2 (63b3aa7).
- `agents/be-supervisor:docs/agents/API_CONTRACT_V3.md` (c737453).

## Progress

| Item | State | Commit |
| --- | --- | --- |
| 1. Build fix | Done on base | d48b482 |
| Foundation: admin client, contract types, transitions, mocks | Done | 2c5008f |
| 2. Auth: `/admin` client shell, `/admin/login`, `/admin/reset-password`, session, 401/403 handling | Done | 63e1588 |
| 6. Dashboard KPI cards (Plan §2, contract §9) | Done | a7d9e03 |
| 4. Vacancies admin (PRD §6.5) | Done | a7d9e03 |
| 3. Content (packages, services, portfolio), messages with reply, newsletter, activity log | Done | 2b0f446 |
| 3b. Customer segments (new UI) | Done | 2b0f446 |
| 3a/5. Orders with fulfilment, payment, engineer assignment, job creation; carts (new UI) | Done | 6d07424, 327670f |
| 5. Products, categories, inventory | Done | 856a235 |
| 5. Installation jobs, engineer "My jobs" (mobile), staff and roles, settings | Done | a9e2024 |
| Tailwind v4 renames in admin, checklist label, status update | Done | baebf03 |
| SUP-FE review 2 fixes (FE2-1 to FE2-7) | Done | latest `fix(fe-admin)` commit |

**Build and lint.**
- a7d9e03, 2b0f446 and 6d07424 were committed with `tsc --noEmit` and `eslint` on their own paths only, because the helpers' unfinished screens were uncommitted in the worktree.
- The full checks ran before 856a235 and again before the final commit: `tsc --noEmit` clean, and `next build` green with 24 routes, every `/admin/**` route static (○) and no admin data at build time. They found nothing to fix in the three earlier commits.
- `eslint --max-warnings 0 app components lib` has no errors. Its one warning, the exhaustive-deps warning in `app/vacancies/[slug]/page.jsx`, is pre-existing and owned by FE-1 (review FE1-10). All admin paths are clean.

**375 px check (engineer view).**
- **Setup:** `next start` on the production build, then headless Google Chrome driven over the DevTools protocol:
  - viewport 375×812, mobile and touch emulation
  - requests to the backend URL intercepted and answered with `404 "Route not found."`, so the portal used its contract preview data and no real backend was contacted
  - a stored engineer session with only `jobs:update-own`
- **Checked:**
  - `/admin/my-jobs` list: `scrollWidth` 375, no element past the viewport, no button, link or checkbox under 44 px in `main`
  - job detail drawer: Start/Mark complete, checklist rows, directions/call, photos
- **Fixed from the screenshots:** a duplicated "Checklist" label in the detail view.
- **Not changed:** the kit Drawer close button is smaller than 44 px. It is FE-1's kit, so this is listed as a kit request below.

**Deep links.** Order links from installation jobs and inventory movements use `/admin/orders?order=<id>`. The orders screen opens that order once the list loads, or shows a toast if the order no longer exists.

**Review follow-up (review-fe.md, review 2 at 426c27c).**

| Finding | Fix |
| --- | --- |
| FE2-1 (Major) preview mocks could switch on in production | Preview is opt-in: `NEXT_PUBLIC_ADMIN_PREVIEW=true` (read only as `config.adminPreview` in `lib/config.ts`; FE-1 hadn't added it yet, so this branch adds that one line). With it off: a missing contract route throws `FeatureUnavailableError` ("This feature isn’t available on the server yet."), shown as a "Not available yet" notice or error toast, never a fake success; `getSession` never adds capabilities (`[]` when the array is absent); orders get no overlay and no mock jobs; dashboard period KPIs show "—" with a note. In preview, `getOrder` now flags the preview banner when it fills `jobs`. |
| FE2-2 (Major) duplicate `<Toaster />` | Both mounts removed from `AdminApp`; the root layout's toaster (taken from FE-1) is the only one. |
| FE2-3 stale order after a non-stock 409 | `useOrderAction` refetches the order on any 409 without stock `details` (status panel, installation, note). |
| FE2-4 rich-text field unnamed | `RichTextEditor` sets `aria-labelledby` (the field label), `role="textbox"`, `aria-multiline`, `aria-describedby`, `aria-invalid` and `aria-readonly` on Quill's editable root once it mounts; clicking the label focuses the editor. |
| FE2-5 `outline-none` in `AdminShell` | Fixed in baebf03 (`outline-hidden`). |
| FE2-6 vacancy row actions during an action | Edit and delete are disabled while that row is busy. |
| FE2-7 re-sync shared files, drop adapter | Took `components/ui` (typed `.d.ts`), `app/globals.css`, `app/layout.tsx` (+ `lib/site.ts`, favicon and manifest assets it references), `lib/cn.ts`, `lib/api/client.ts`, `lib/config.ts` from `agents/fe-public` HEAD (0e03b90). `components/admin/kit.ts` is deleted; admin code imports `@/components/ui`. `lib/api/index.ts` was not taken: it re-exports FE-1's `public.ts` and public `types.ts` section, which conflict with this branch's admin `types.ts` (FE2-8, resolved by SUP-FE at merge). |

- Earlier (review 1): FE1-3 renames swept in admin (baebf03); FE1-6 resolved on this branch; FE1-10 vacancies lint errors gone.
- After these fixes: `tsc --noEmit` clean; `eslint app components lib` 0 errors (1 pre-existing FE-1 warning); `next build` green (24 routes, admin all static); `.next` deleted.

**Known gaps.**
- There is no category filter on the inventory stock tab (`getInventory` supports `category`).
- Movement filters reset when switching tabs, because the kit's TabPanel unmounts hidden panels.
- Job creation lives only in the order drawer (contract §7.2 requires an order that needs installation), so there is no standalone "new job" screen.
- Success toasts for order changes use portal wording, because the contract functions return only the record, not the server message.

## Requests to FE-1 (kit)

- **Drawer close button:** at least 44 px on mobile (the engineer view is used on site).

- **`lib/config.ts`:** keep the `adminPreview` line this branch added (conventions §3.1) when resolving the merge.

## Cleanup items for integration

- `lib/admin/mocks.ts` and `withContractFallback` in `lib/api/admin.ts`: delete once the backend endpoints are integrated.

## Layout

- `app/admin/layout.tsx` (server, `robots: noindex`, applies `font-sans`) → `components/admin/AdminApp.tsx` (client).
- **Signing in:** if no token is stored, AdminApp redirects to `/admin/login?next=…`. With a token, it calls `GET /admin/auth/me`, stores `AdminSelf` in `je/admin-user`, then renders `AdminShell`.
- **Session handling:**
  - A 401 on the current token clears both storage keys and routes to login. This is Vite's late-401 guard.
  - A 403 refetches `/me`.
  - Session state is read with `useSyncExternalStore`, so it stays in sync across tabs.
- **Page building blocks:**
  - `components/admin/AdminPage.tsx` provides the header from `lib/admin/modules.ts`, a "no access" state, a preview-data notice and a load error.
  - `components/admin/AdminContext.tsx` provides `useAdmin()` (`can`, `signOut`, `refreshKey`, notifications) and `useAdminQuery()`.
- **Notifications:** `lib/admin/useAdminNotifications.ts` is the Vite polling and read-status hook. It polls only the lists the admin can read.
- **Rich text:** `components/admin/RichTextEditor.tsx` wraps `react-quill-new` (`next/dynamic`, `ssr: false`, `quill-overrides.css` imported). Its toolbar matches the contract §0.5 allowlist.

## Deviations and decisions (for SUP-FE / SUP-BE)

1. **Bearer header.**
   - `adminFetch` sends `Authorization: Bearer <token>`, per contract §12 and conventions revision 2.
   - FE-1's `adminRequest` is replaced; this branch owns `lib/api/admin.ts`.
   - The name `adminRequest` is kept as an alias of `adminFetch`.
2. **Capabilities, never roles.**
   - Navigation, routes and actions are gated on `admin.capabilities` from login and `/me`.
   - There is no role → capability table in the frontend.
   - `lib/admin/capabilities.ts` holds only capability names, role labels for display and `normalizeRole`, which is also display only.
3. **Mock fallback (`TODO(contract)`), opt-in.**
   - **Flag:** `NEXT_PUBLIC_ADMIN_PREVIEW=true` enables it (build-time, `config.adminPreview`). Default off. **Never set it in production** (Vercel or any deployed build); use it only for local/demo builds against a backend without the new modules.
   - **How it works:** each contract function in `lib/api/admin.ts` calls the real endpoint first. Only with the flag on AND a `404 "Route not found."` does it fall back to `lib/admin/mocks.ts`. With the flag off the same response becomes `FeatureUnavailableError`.
   - **What stays real:** missing records, validation errors, 403s and network errors are never mocked.
   - **Visibility:** screens show a "Preview data" notice while an area is mocked, and changes made in preview mode are not saved.
   - **Order changes:** fulfilment, payment and engineer-assignment changes on real orders are laid over the list in memory only.
   - **Pre-contract session:** a backend without `/admin/auth/me` has no roles. With the flag on, a stored user without `capabilities` gets every capability (its only accounts are the seeded super admin and static token). With the flag off, it gets none and sees the empty shell until the backend returns `capabilities`.
   - **Removal:** delete the fallback, `mocks.ts` and `markMocked` after `agents/be-integration` lands.
4. **UI kit.** Imported from `@/components/ui` (FE-1's typed kit). The temporary typed adapter `components/admin/kit.ts` was deleted after FE-1 shipped `.d.ts` files (FE1-1).
5. **Shared files from FE-1 (`agents/fe-public` @ 0e03b90).**
   - `components/ui/**`, `app/globals.css`, `app/layout.tsx`, `lib/site.ts`, `lib/cn.ts`, `lib/api/client.ts`, `lib/config.ts` and the favicon/manifest assets are FE-1's files, unmodified except the one `adminPreview` line in `lib/config.ts`.
   - `package.json` and `package-lock.json` are identical to `agents/fe-public`.
   - Admin code uses `ApiError(message, status, data)` and plain-object `body`, and reads no environment variables directly.
6. **`lib/api/types.ts`.** This branch adds an admin section only. FE-1 has a public section in the same file, so expect an add/add conflict at integration. The admin section is self-contained.
7. **Dependencies.** No new ones. `@headlessui/react`, `lucide-react`, `sonner`, `clsx` and `tailwind-merge` are FE-1's pre-approved kit dependencies, taken through the conventions checkout.
8. **Assets.** `public/logo.svg` and `public/panel-4.webp` are copied from the Vite `frontend/public` and `src/assets`. The sign-in panel and shell use them. They are byte-identical to the Vite files, in case FE-1 adds the same ones.
9. **Removed.**
   - `app/admin/vacancies/page.jsx` is gone: the `je-user-role` gate, the direct `fetch` and the 5 lint errors.
   - Its replacement is `app/admin/vacancies/page.tsx`.

## Stubs waiting for backend endpoints

These show "not available yet" until `agents/be-platform` / `agents/be-ops` land (or preview data with `NEXT_PUBLIC_ADMIN_PREVIEW=true`):
- `/admin/auth/me`
- `/admin/vacancies*`
- `/admin/categories*`, `/admin/products*`
- `/admin/inventory*`
- `/admin/orders/:id/{fulfillment,mark-paid,assign-engineer}`
- `/admin/jobs*`, `/admin/me/jobs*`
- `/admin/users*`, `/admin/staff*`
- `/admin/settings`
- `/admin/notifications*`
- dashboard `kpis`
