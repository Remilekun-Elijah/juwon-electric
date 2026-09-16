# FE-2 — Admin portal (`agents/fe-admin`)

Status: **in progress**. Last updated 2026-09-16.

Sources:
- `AGENT_WORKLOAD_SPLIT.md` §5 FE-2.
- `agents/fe-supervisor:docs/agents/FE_CONVENTIONS.md`, revision 2 (63b3aa7).
- `agents/be-supervisor:docs/agents/API_CONTRACT_V3.md` (c737453).

## Progress

| Item | State |
| --- | --- |
| 1. Build fix | Done on base (d48b482) |
| Foundation: admin client, contract types, transitions, mocks | Done (2c5008f) |
| 2. Auth: `/admin` client shell, `/admin/login`, `/admin/reset-password`, session, 401/403 handling | Done (63e1588) |
| 3. Port of existing screens: content (packages, services, portfolio), messages, newsletter, activity | Done (milestone b) |
| 3a. Orders with fulfilment | In progress |
| 3b. New screens with no Vite reference: customer segments (done, milestone b), carts (in progress) | Partial |
| 4. Vacancies admin (PRD §6.5) | Done (milestone a) |
| 5. New modules: products, categories, inventory, installation jobs, engineer view, staff and roles, settings | In progress |
| 6. Dashboard KPI cards (Plan §2, contract §9) | Done (milestone a) |

**Build note:** milestones (a) and (b) were checked with `tsc --noEmit` (no errors in their paths) and `eslint` (clean) only. `next build` was skipped for those two commits because unfinished screen files for orders, catalog, inventory and jobs were in the worktree (uncommitted). The full `next build` runs before the next milestone.

## Cleanup items for integration

- `components/admin/kit.ts` (typed kit adapter): delete once FE-1's kit prop types (review finding FE1-1) land, and import from `@/components/ui/*` directly.
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
3. **Mock fallback (`TODO(contract)`).**
   - **How it works:** each contract function in `lib/api/admin.ts` calls the real endpoint first. It falls back to `lib/admin/mocks.ts` only on `404 "Route not found."`.
   - **What stays real:** missing records, validation errors, 403s and network errors are never mocked.
   - **Visibility:** screens show a "Preview data" notice while an area is mocked, and changes made in preview mode are not saved.
   - **Order changes:** fulfilment, payment and engineer-assignment changes on real orders are laid over the list in memory only.
   - **Pre-contract session:** a backend without `/admin/auth/me` has no roles. Its only accounts are the seeded super admin and the static token, which the contract gives every capability. The preview session therefore grants all capabilities.
   - **Removal:** delete the fallback, `mocks.ts` and `markMocked` after `agents/be-integration` lands.
4. **Typed kit adapter (`components/admin/kit.ts`).**
   - FE-1's kit is `.jsx` without prop types, so `.tsx` usage fails `strict`. Conventions revision 2 §1 lists this as FE-1's blocking item.
   - Admin code imports the kit through `@/components/admin/kit`, which re-exports the same components cast to prop types taken from their JSDoc.
   - The kit itself is not edited.
   - **Request to FE-1:** ship prop types. Then this adapter can be deleted and imports switched to `@/components/ui/*`.
5. **Shared files taken from FE-1 `b6e901d`.**
   - `lib/api/client.ts`, `lib/cn.ts` and `components/ui/**` are taken as they are, per revision 2 §3.3.
   - `package.json` and `package-lock.json` come from `agents/fe-public`.
   - Admin code uses `ApiError(message, status, data)` and plain-object `body`.
   - `lib/config.ts` is not included (FE-1 owns it). Admin code reads no environment variables.
   - FE-1's later commit 8e35473 rewrote the client and removed kit files to match revision 1. Revision 2 supersedes that, so those changes were not taken.
6. **`lib/api/types.ts`.** This branch adds an admin section only. FE-1 has a public section in the same file, so expect an add/add conflict at integration. The admin section is self-contained.
7. **Dependencies.** No new ones. `@headlessui/react`, `lucide-react`, `sonner`, `clsx` and `tailwind-merge` are FE-1's pre-approved kit dependencies, taken through the conventions checkout.
8. **Assets.** `public/logo.svg` and `public/panel-4.webp` are copied from the Vite `frontend/public` and `src/assets`. The sign-in panel and shell use them. They are byte-identical to the Vite files, in case FE-1 adds the same ones.
9. **Removed.**
   - `app/admin/vacancies/page.jsx` is gone: the `je-user-role` gate, the direct `fetch` and the 5 lint errors.
   - Its replacement is `app/admin/vacancies/page.tsx`.

## Stubs waiting for backend endpoints

These are mocked through the fallback until `agents/be-platform` / `agents/be-ops` land:
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
