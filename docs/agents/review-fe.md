# Frontend Review Log (SUP-FE)

Checked against `FE_CONVENTIONS.md` (rev 2), `FE_ACCEPTANCE.md`, and `agents/be-supervisor:docs/agents/API_CONTRACT_V3.md`.
Severity: **Blocker** (must fix before the next feature commit) · **Major** (fix before sign-off) · **Minor** (fix when touching the file) · **Note** (no action).

---

## Review 1 — FE-1 `agents/fe-public` @ `b6e901d` (2026-09-16)

Commits: `b4a545f` brand system on Tailwind v4 `@theme`; `b6e901d` UI kit port + `lib/api`.

### Method
- Temporary detached worktree of `agents/fe-public` placed inside the supervisor's `frontend-next/`. Dependencies came from the supervisor's single install, plus FE-1's new packages added with `--no-save`. A plain `node_modules` symlink is rejected by Turbopack ("Symlink … points out of the filesystem root"), so the review copy used an **uncommitted** `turbopack.root` override pointing one level up. The worktree and `.next` were deleted afterwards.
- `npm run build` and `npm run lint`, run on the branch and on `v3-agents-base` for comparison.
- Diffed each of the 25 `components/ui/*` files against `frontend/src/components/ui/*`.
- Built a throwaway server-component page that renders every barrel export: once as `.tsx` (type-check) and once as `.jsx` (RSC boundary check).
- Compared the `@theme` tokens with `frontend/tailwind.config.js` and `frontend/src/App.css`/`index.html`. Compared `lib/api/*` with `frontend/src/utils/api.js` and the contract (§0.2, §1.5, §12).

### Results
| Check | Result |
| --- | --- |
| `next build` | **Pass.** Routes: `/` ○, `/admin/vacancies` ○, `/vacancies` ○, `/vacancies/[slug]` ƒ (the last three are pre-existing CSR pages, still to be converted). |
| `npm run lint` | **Fail, but not a regression.** There are 5 errors and 1 warning, all in pre-existing files: `app/admin/vacancies/page.jsx` (setState-in-effect, 4× unescaped `'`) and `app/vacancies/[slug]/page.jsx` (exhaustive-deps). **The base is already red** (5 errors, 2 warnings). FE-1 removed one warning by deleting `tailwind.config.js`. |
| Tokens vs Vite `tailwind.config.js` | **Complete.** brand 50–950, the 7 legacy colours, `elev-1…5` and `auth` shadows, and 4 animations with their keyframes are all present with correct values. Class-based `dark` variant present. |
| Kit fidelity (diff vs Vite) | **Faithful.** Changes are limited to the `@/lib/cn` import, `"use client"` where needed, `react-router` `Link to` → `next/link` `href` (StatCard), and Avatar's reset-on-`src` rewritten without an effect (same behaviour). Prop APIs are unchanged, and the barrel is identical. |
| Client/server boundaries | Correct `"use client"` on Avatar, Checkbox, Dialog, Drawer, Field, fieldContext, Input, Pagination, Switch, Tabs, and Toaster. Card, Badge, Container, PageHeader, Skeleton, Spinner, Table, and Button stay server-safe. All exports render from a server component. |
| Metadata and favicon | Title template, description, OG, manifest, and theme colour are set. The favicon is byte-identical to `frontend/public/favicon.ico`. create-next-app assets are removed. |
| `lib/api` vs contract | `Authorization: Bearer` ✓. Late-401 guard ✓. `cache: "no-store"` on admin ✓. Envelope and `ApiError.data` (carries `details`) ✓. Network errors return status 0 ✓. |

### Findings

**FE1-1 — Major — The UI kit cannot be used from `.tsx` pages.**
`components/ui/*.jsx` have no prop types. With `allowJs` + `strict`, TypeScript infers every destructured prop without a default as **required**. Rendering the barrel from a `.tsx` page produced 24 errors, for example `<UI.Card>` ("Property 'className' is missing"), `<UI.Button>go</UI.Button>` ("no properties in common with RefAttributes"), and `<UI.Badge>` (needs `tone`, `variant`, `className`). The current build passes only because no `.tsx` file imports the kit yet. **Fix:** add JSDoc `@param` object types that mark optional props, or add `components/ui/index.d.ts` with typed props. Keep the `.jsx` sources for Vite diffability. This blocks any `.tsx` page that uses the kit, for both FE-1 and FE-2.

**FE1-2 — Major — Public font parity is wrong: the body should be Inter, not Plus Jakarta Sans.**
Vite `App.css` sets `body { font-family: "Inter" }`, and `index.html` loads Inter, Manrope, Sora, and Plus Jakarta Sans. Only the admin app opts into `font-sans` (Plus Jakarta Sans). `app/globals.css` sets `body { font-family: var(--font-sans) }`, so every ported public page would render in the wrong typeface. The following are also missing:
- The helper classes `inter-regular|medium|semibold|bold|extrabold`, `sora-regular|semibold|bold`, and `manrope-medium|semibold`, which Vite uses 73 times.
- The `:root { --diamond: #ff6961; --gold: #dfc638 }` variables used by Cart and Packages. `--diamond` differs from the `diamond` token.

**Fix:** add Inter, Sora, and Manrope through `next/font` as variables. Set the body to Inter. Port the helper classes and the two CSS variables. The admin layout will apply `font-sans` (FE-2). See conventions §2.

**FE1-3 — Major — Tailwind v3 → v4 utility drift in the kit.**
Vite runs Tailwind `^3.4.4`, and the kit was copied without scale renames. In v4:
- `shadow-sm` is heavier. v3 `shadow-sm` equals v4 `shadow-xs`.
- `outline-none` no longer means "transparent 2px outline". That is now `outline-hidden`.

Affected: `shadow-sm` ×4 and `focus-visible:outline-none`/`focus:outline-none`/`outline-none` ×21, spread across Dialog, Switch, Input, Checkbox, Table, Tabs, Alert, buttonStyles, and StatCard. When pages are ported, the same applies to `shadow` → `shadow-sm` (×10 in Vite), `rounded` → `rounded-sm` (×4), `ring` → `ring-3` (×4, and the default ring colour changed from blue-500 to currentColor), and `flex-shrink-0` → `shrink-0` (removed in v4). **Fix:** apply the official v4 renames in the kit now, and in each page as it is ported. Record this in the parity notes so reviewers don't flag the diffs.

**FE1-4 — Minor — `fieldClasses` crosses the client boundary as a reference.**
`fieldClasses` is exported from `Input.jsx` (`"use client"`) and re-exported by the barrel. Imported in a server component, `typeof UI.fieldClasses === "function"` (a client reference), not the class string. Vite doesn't use it outside `Input.jsx` today. **Fix:** move it to a non-client module such as `components/ui/fieldStyles.js`, the same way `buttonStyles.js` works.

**FE1-5 — Minor — Callback props on server-safe components.**
`Alert` (`onDismiss`), `EmptyState` (`onRetry`), and `StatCard` (`onClick`) have no `"use client"`. This is fine, but passing those callbacks from a server component will throw at render. Documented in conventions §1.1. No code change needed.

**FE1-6 — Minor — `lib/api/admin.ts` is incomplete for the contract. FE-2 owns it from now on.**
- `clearAdminToken` leaves `je/admin-user` behind.
- There are no `je/admin-user` helpers.
- There is no `GET /admin/auth/me` and no refetch-on-403.

FE-1 seeded this file outside its lane. It is accepted as the transport, and FE-2 extends it (conventions §3.5).

**FE1-7 — Minor — Environment access.**
`app/layout.tsx` reads `process.env.NEXT_PUBLIC_SITE_URL` directly, and the variable is not documented. **Fix:** move it into `lib/config.ts` when Turnstile lands, and document it in `frontend-next/README.md`.

**FE1-8 — Minor — The `lib/api/index.ts` barrel mixes public and admin.**
`export * from "./admin"` puts admin session helpers on the public import surface. **Fix:** public code imports `@/lib/api/public` and admin code imports `@/lib/api/admin`. Keep the barrel for types if you like.

**FE1-9 — Note — Deviations accepted with the revised conventions.**
- FE-1's `lib/cn.ts` and `lib/api/client.ts` are a superset of the rev-1 snippets and are adopted as the shared originals. FE-1 should **not** rewrite them to match rev 1. If that has already happened, restore the `b6e901d` content.
- FE-1 ported the entire kit, including the files originally assigned to FE-2. That port is accepted, and FE-2 takes the files with `git checkout agents/fe-public -- …` and does not port them again.
- The new dependencies (`lucide-react`, `@headlessui/react`, `sonner`, `clsx`, `tailwind-merge`) mirror Vite's kit and are approved.
- Kit files stay `.jsx`, which is accepted, subject to FE1-1.

**FE1-10 — Note — The lint baseline is red on `v3-agents-base`.**
"Lint green on every commit" cannot hold yet. Ownership for the fixes:
- FE-2 fixes `app/admin/vacancies/page.jsx`, which is rewritten anyway and must drop the `je-user-role` gate.
- FE-1 fixes `app/vacancies/[slug]/page.jsx` in the SSG conversion.

Until both land, the rule is **no new lint errors**. Compare the counts with the base: 5 errors, 1 warning after FE-1.

### Verdict
The brand tokens, metadata, favicon, API transport, and kit port are faithful work. **Not yet accepted:** FE1-1, FE1-2, and FE1-3 must be fixed before public pages are ported on top of the kit and fonts. FE1-4, FE1-7, and FE1-8 can wait until those files are next touched.

---

## Review 2 — FE-2 `agents/fe-admin` @ `6d07424`, FE-1 re-check @ `0e03b90` (2026-09-16)

FE-2 commits: `2c5008f` foundation, admin client, and mocks · `63e1588` shell, login, and reset · `a7d9e03` dashboard KPIs and vacancies · `2b0f446` content, leads, and activity · `6d07424` orders fulfilment and carts. Catalog, inventory, jobs, staff, and settings are uncommitted, so they are not reviewed here.
FE-1 commits since review 1: `8e35473` reconcile · `8d2117b` review-1 fixes · `0e03b90` public layout.

### Method
- Detached review worktrees for both branches, placed under the supervisor's `frontend-next/` so they reuse its single install, with the same uncommitted `turbopack.root` override as review 1. Full `npm run build` and `npm run lint` on each HEAD.
- **Trial integration:** on a throwaway branch, merged `agents/fe-public` into `agents/fe-admin`, resolved the conflicts, and ran build and lint. The branch, both worktrees, and `.next` were deleted afterwards.
- Read the security-critical code: `lib/api/admin.ts`, `components/admin/AdminApp.tsx`, `AdminPage.tsx`, `AdminContext.tsx`, `AdminLogin.tsx` redirect handling, `lib/admin/{capabilities,modules,transitions,useStoredSession}.ts`, the vacancies screens, `RichTextEditor.tsx`, and the order status panel. Compared them with contract §1.2, §1.5, §3, §6, and §12, PRD §6.5, and the 404 handlers in `backend/app.js` and `backend/cloudflare/src/index.js`.
- `git grep` on both branches for `je-user-role`, `X-User-Role`, `x-admin-token`, `fetch(`, `process.env`, and `.role`.

### Build results
| Tree | `next build` | `npm run lint` |
| --- | --- | --- |
| FE-2 `6d07424` | **Pass.** 16 routes. All `/admin/*` routes are static shells (○); no admin data is fetched at build time. | **0 errors**, 2 warnings (`app/vacancies/[slug]/page.jsx` exhaustive-deps, which is FE-1's; the anonymous default export in `tailwind.config.js`, which FE-1 deleted). FE-2 removed the old `app/admin/vacancies/page.jsx` and its 5 errors. |
| FE-1 `0e03b90` | **Pass.** `components/ui/kit.typecheck.tsx` is type-checked. | 5 errors, 1 warning, all in the old `app/admin/vacancies/page.jsx` (FE-2 deletes it) and `app/vacancies/[slug]/page.jsx`. No new errors. |
| Trial merge (FE-1 into FE-2) | **Pass.** 16 routes. FE-2's `components/admin/kit.ts` type-checks against FE-1's `.d.ts` files. | **0 errors**, 1 warning (`app/vacancies/[slug]`). |

### FE-1: review 1 follow-up
| Finding | Status | Evidence |
| --- | --- | --- |
| FE1-1 kit unusable from `.tsx` | **Fixed** | A `.d.ts` beside every kit module plus `index.d.ts` and `types.d.ts`. `kit.typecheck.tsx` renders each export with required props only and compiles under `strict`. |
| FE1-2 font parity | **Fixed** | `layout.tsx` loads Inter, Sora, Manrope, Plus Jakarta Sans, and JetBrains Mono through `next/font`. The body uses `var(--font-inter)`. All 10 helper classes and `--diamond`/`--gold` are in `globals.css`. |
| FE1-3 v3 → v4 drift | **Fixed** | No `shadow-sm`, bare `shadow`/`rounded`/`ring`, or `outline-none` left in `components/ui` or `components/public`. The kit uses `outline-hidden`, `rounded-sm`, and `shrink-0`. |
| FE1-4 `fieldClasses` client reference | **Fixed** | Moved to `components/ui/fieldStyles.js`. |
| FE1-7 env access | **Fixed** | `lib/config.ts` holds `turnstileSiteKey` and `siteUrl`, and the variables are documented in `.env.example` and the README. |
| FE1-8 mixed API barrel | **Fixed** | `lib/api/index.ts` exports only client, public, and types. FE-1 deleted its `lib/api/admin.ts`, so FE-2 owns that file. |
| FE1-9 shared originals | **Holds** | `lib/api/client.ts` and `lib/cn.ts` on FE-1 HEAD are byte-identical to `b6e901d`. All 25 kit files are present. FE-2's status file says `8e35473` rewrote the client and removed kit files. That no longer matches FE-1 HEAD, so FE-2 should re-sync from HEAD (see FE2-7). |

New FE-1 note:
- **FE1-11 — Note.** `app/vacancies/*` sits outside the `(public)` route group, so it renders without Navbar and Footer until FE-1 moves it during the SSG conversion. `public/background_video*.mp4` adds 14 MB to the repo; these are the Vite assets, so this is accepted.

**FE-1 verdict:** review 1 is closed. Public page porting can continue.

### FE-2: what checked out
- **Transport and session**
  - `Authorization: Bearer` only. No `x-admin-token`, `X-User-Role`, or `je-user-role` anywhere in code (the README still mentions `je-user-role`, but FE-1's README replaces it at merge).
  - Keys are `je/admin-session` and `je/admin-user`. `clearAdminSession` removes both. Logout is best effort and clears storage whatever the result.
  - Storage is read through `useSyncExternalStore` with a `null` server snapshot, so the portal never renders or redirects before hydration, and sessions stay in sync across tabs.
- **401 and 403 handling**
  - The late-401 guard is kept, and the same stale-token guard applies to 403.
  - On 403, `/admin/auth/me` is refetched through a single in-flight promise. No loop: an unchanged user JSON produces no re-render.
- **Capabilities**
  - Navigation (`lib/admin/modules.ts`), page gates (`AdminPage`), and actions (`can("content:write")`, `can("orders:delete")`, …) use `capabilities` only. There are no `.role` branches and no role → capability table (`CAPABILITIES` is just the name list).
  - Module capabilities match contract §1.2 (carts → `orders:read`, customer segments → `content:*`, messages and newsletter → `leads:*`).
  - Missing capabilities show a no-access empty state.
- **Login redirect**
  - `next` only accepts `/admin` or `/admin/…`, rejects `//…` and auth paths, and otherwise falls back to `/admin`. No open redirect.
- **Mock trigger is narrow**
  - `isMissingRoute` requires `status === 404 && message === "Route not found."`.
  - That is exactly the unmatched-route response of both Express (`backend/app.js`) and the Worker (`backend/cloudflare/src/index.js`). Record-level 404s use `"<Label> not found."`.
  - 400, 401, 403, 409, 5xx, and network errors (status 0) are always rethrown. **No non-404 error can reach a mock.**
- **Vacancies (PRD §6.5)**
  - **List:** status tabs (all, draft, open, closed), debounced search, paging against the contract's paged shape.
  - **Create and edit:** every PRD field (title, department, location, employment type, salary range, rich-text description, requirements[], responsibilities[], status on create), client limits that mirror contract §3, and server messages mapped onto their fields.
  - **Status actions:** publish, unpublish, close, and reopen offer only contract transitions (never draft → closed).
  - **Delete and view:** delete asks for confirmation; open vacancies link to the public page.
  - **Editor:** `react-quill-new` loads through `next/dynamic` with `ssr: false`, `quill-overrides.css` is imported, and the toolbar is limited to the §0.5 allowlist.
  - **PRD §6.5 criteria (create, edit, delete, publish):** met in UI, but only exercised against mocks, because BE-1's `/admin/vacancies` hasn't landed.
- **Orders (contract §6)**
  - `FULFILLMENT_TRANSITIONS` and `PAYMENT_TRANSITIONS` match §6.2 exactly. `installed` is offered only when `requiresInstallation` is set.
  - Mark-paid uses `POST /mark-paid`, engineer assignment uses `/assign-engineer`, and cancel asks for confirmation.
  - **409 stock shortage:** a 409 with `details[]` renders `sku`, `required`, and `available` per product, as in §6.3. Other errors are toasted.
  - Delete is gated on `orders:delete`.
- **React 19 / Next 16**
  - Lint is clean under the React Compiler hook rules (`set-state-in-effect` and similar).
  - `LayoutProps` is typed. `app/admin/layout.tsx` is a server component carrying `robots: noindex` and `font-sans`, and wraps the client `AdminApp`.

### FE-2 findings

**FE2-1 — Major — Preview mocks can switch on against a production backend.**
The trigger is narrow (see above), but any deployed backend that lacks a route will answer `404 "Route not found."`. That happens, for example, when the Worker ships before BE-2's modules, or when Express and the Worker differ during rollout. When it happens:
- **Writes fake success.** Writes such as `saveVacancy`, `publishVacancy`, `setFulfillmentStatus`, `markOrderPaid`, and `assignOrderEngineer` report success from in-memory mocks. A banner says changes aren't saved, but the toast says "Vacancy published." or "Order marked as paid". That misleads staff, and the data is lost on reload.
- **Missing `/me` grants every capability** when the stored user has no `capabilities`. This is UI only, because the server still enforces access, but a limited account on a half-deployed backend sees and tries every screen.
- **Mocked order changes persist on real data.** `getOrders` and `getOrder` always apply `applyOrderOverlay`. `getOrder` fills a missing `jobs` field from `mockOrderJobs` without calling `markMocked`, so no banner shows.

**Fix:** make preview opt-in at build time.
- Add `adminPreview: process.env.NEXT_PUBLIC_ADMIN_PREVIEW === "true"`. FE-1 adds it to `lib/config.ts` on request; until then FE-2 reads it in a single `lib/admin/preview.ts`, which is the only other allowed `process.env` read.
- Default is off. When it is off:
  - `withContractFallback` rethrows, and the UI shows "This feature isn't available on the server yet."
  - `getSession` returns the stored user with `capabilities: []` unless the array is present.
  - The order overlay and mock jobs are skipped.
- `setRequiresInstallation`'s synthetic 404 (thrown when the response lacks a boolean) only applies in preview.
- Document the flag in `.env.example` and the README. It must never be set on Vercel production.

**FE2-2 — Major (integration) — Duplicate `<Toaster />`.**
FE-1's root `app/layout.tsx` now mounts `<Toaster />`, and `AdminApp` mounts another on both the auth and signed-in paths. After the merge every admin toast renders twice (confirmed in the trial merge: 3 mounts). **Fix:** at integration, remove both `<Toaster />` mounts from `AdminApp.tsx` and rely on the root one. FE-2 may do this after taking FE-1's `app/layout.tsx`, but must not edit that file.

**FE2-3 — Minor — Stale order after a non-stock 409.**
Conflicts such as `"Cannot change fulfilment status from X to Y."` (another admin moved the order) or `"Order does not require installation."` are toasted, but the old order stays on screen and keeps offering the same invalid step. **Fix:** refetch the order on any 409 in `useOrderAction`.

**FE2-4 — Minor (a11y) — The rich-text field has no accessible name.**
`RichTextEditor` puts `id` and `aria-describedby` on a wrapper `<div>`. The `<label for>` therefore points at a non-labelable element, and Quill's `contenteditable` (`.ql-editor`) is unnamed. **Fix:** after mount, set `aria-labelledby` (the label id), `aria-describedby`, and `aria-invalid` on `quill.root`, or pass a `ref` and do it in an effect. A click on the label should focus the editor.

**FE2-5 — Minor — Tailwind v4 rename missed.**
`components/admin/AdminShell.tsx` still has 4 × `focus-visible:outline-none` (lines 46, 125, 142, and 150), ported unchanged from Vite. Use `outline-hidden`, as `AdminLogin.tsx` already does.

**FE2-6 — Minor — Vacancy row actions during delete.**
The edit and delete icon buttons aren't disabled while `busy === vacancy.id`, so a second delete or edit can start during an in-flight action.

**FE2-7 — Note — Re-sync shared files from FE-1 HEAD, then drop the adapter.**
FE-2 holds the `b6e901d` kit and `globals.css`. FE-1 HEAD has the typed kit, `fieldStyles.js`, the v4 renames, and the font system.
- Run `git checkout agents/fe-public -- frontend-next/components/ui frontend-next/app/globals.css frontend-next/app/layout.tsx frontend-next/lib/api/index.ts frontend-next/lib/config.ts frontend-next/package.json frontend-next/package-lock.json`.
- Then switch imports from `@/components/admin/kit` to `@/components/ui/*`, delete `kit.ts`, and apply FE2-2 on the branch.
- This removes 12 of the 13 add/add conflicts.
- It is not blocking: the trial merge compiles with `kit.ts` in place.

**FE2-8 — Note — Shared-file conflicts to expect at integration.**
The trial merge produced 13 add/add conflicts. The two branches were cut from the same base and copied files independently, so git has no common ancestor for them.

| Path | Resolution |
| --- | --- |
| `components/ui/{Alert,Checkbox,Dialog,Input,StatCard,Switch,Table,Tabs}.jsx`, `buttonStyles.js`, `index.js`, `app/globals.css` | Take FE-1. FE-2's copies are unmodified `b6e901d`. |
| `lib/api/types.ts` | Keep both sections. `Paged`, `Category`, `CategoryAttribute`, and `EmploymentType` are identical, so keep one copy. **`CustomerSegment` differs:** admin has `id` and `isActive` required plus `sortOrder`; public has `id?` and no `isActive`. Rename the public one `PublicCustomerSegment` (used only by `ServicesData`). |
| `lib/validation.ts` | Take FE-2's (a superset). Add FE-1's `LIMITS.cartItems`, `quantityMin`, `quantityMax`, and the `PHONE_PATTERN` export. `EMAIL_REGEX`, `isValidEmail`, `PHONE_MESSAGE`, and `isValidPhone` are identical. |
| `lib/api/index.ts`, `package.json`, `package-lock.json`, `lib/cn.ts`, `lib/api/client.ts` | No conflict. FE-2 has no `index.ts`, and the other files are identical. |
| `app/admin/vacancies/page.jsx` | No conflict. FE-2 deleted it, and FE-1 never modified it. |

To avoid the `types.ts` conflict now, each agent can move its section into `lib/api/types/public.ts` and `lib/api/types/admin.ts` behind a `types.ts` that re-exports both. That is optional, and SUP-FE can resolve it at merge as described above.

### FE-2 verdict
The auth, session, capability gating, vacancies, and orders work is solid and follows the contract. **Before sign-off:** fix FE2-1. FE2-2 is handled at integration, or by FE-2 after the FE2-7 re-sync. FE2-3 to FE2-6 are due when those files are next touched. The uncommitted modules (catalog, inventory, jobs and the engineer view, staff, settings) and the E-section contract check of their stubs are still pending review.

---

## Review 3 — FE-2 `agents/fe-admin` @ `2cf7074` (2026-09-16)

New since review 2:
- `327670f` order deep links (`?order=`)
- `856a235` products, categories, inventory
- `a9e2024` installation jobs, engineer "My jobs", staff and roles, settings
- `baebf03` Tailwind v4 renames and checklist label
- `2cf7074` fixes for FE2-1 to FE2-7

FE-1 HEAD at review time was `14f0b00` (adds `adminPreview` to `lib/config.ts`, after `f88de22` page ports). I used it only for the trial merge; FE-1's page ports are not reviewed here.

### Method
- Detached worktree of `2cf7074` under the supervisor's `frontend-next/`, reusing its single install and the uncommitted `turbopack.root` override. Full `next build`, `npm run lint`, and `tsc --noEmit`.
- **Trial integration:** merged `agents/fe-public` @ `14f0b00` into a throwaway branch, resolved the conflicts, and ran build and lint. The branch, worktree, and `.next` were deleted afterwards.
- `git diff` of the shared files against FE-1 `0e03b90`/`14f0b00`, and of `lib/api/admin.ts` against `6d07424`.
- Code read of every `mock.*` use, capability checks in the new modules, the staff and user dialogs, the engineer view, and the types, compared with contract §2, §4, §5, §7, §8, §9, and §13.

### Build results
| Tree | `next build` | lint / tsc |
| --- | --- | --- |
| FE-2 `2cf7074` | **Pass.** 23 routes (FE-2 reported 24; the list is `/`, `_not-found`, 19 × `/admin/*`, `/vacancies`, `/vacancies/[slug]`). All admin routes are ○ static shells. | **0 errors**, 2 warnings (FE-1's `app/vacancies/[slug]`; `tailwind.config.js` anonymous export). `tsc` clean. |
| Trial merge with FE-1 `14f0b00` | **Pass** after the resolutions below. Public pages build as ISR/SSG (`/packages/[id]` 66 SSG paths from fallbacks). | **0 errors**, 1 warning. |

### Review 2 follow-up
| Finding | Status | Evidence |
| --- | --- | --- |
| FE2-1 mocks in production | **Fixed** | See "FE2-1 verification" below. |
| FE2-2 duplicate `<Toaster />` | **Fixed** | `git grep "<Toaster"` finds one mount, in `app/layout.tsx`. `AdminApp.tsx` has only a comment. |
| FE2-3 stale order after a 409 | **Fixed** | `useOrderAction(onChange, onReload)` refetches on a 409 without stock `details`. |
| FE2-4 rich-text accessible name | **Fixed** | `useEditorA11y` sets `role="textbox"`, `aria-multiline`, `aria-labelledby` (label id), `aria-describedby`, `aria-invalid`, and `aria-readonly` on `.ql-editor`. A MutationObserver waits for Quill to mount, and a label click focuses the editor. |
| FE2-5 Tailwind v4 renames | **Fixed** | No `outline-none`, bare `shadow`/`rounded`/`ring`, or `flex-shrink-*` in `components/admin` or `app/admin`. |
| FE2-6 vacancy row actions | **Fixed** | Edit and delete are `disabled={rowBusy}`. |
| FE2-7 re-sync with FE-1 | **Fixed, with one leftover** | See "FE2-7 verification" below. |

**FE2-1 verification (preview flag unset):**
- **Fake saves.** `withContractFallback` rethrows every non-`Route not found.` error. On `Route not found.` it throws `FeatureUnavailableError` ("This feature isn't available on the server yet.") unless `config.adminPreview`. No mock write runs, and `markMocked` isn't called.
- **Capabilities.**
  - `getSession` on a missing `/me` returns the stored identity unchanged if it already carries `capabilities`, and otherwise `capabilities: []`.
  - `PREVIEW_CAPABILITIES` is used only behind the flag.
- **Overlays.**
  - `getOrders`/`getOrder` return the raw response. `applyOrderOverlay` and `mockOrderJobs` run only with the flag, and `getOrder` now calls `markMocked("orders")` when it fills jobs.
  - `setRequiresInstallation` throws `FeatureUnavailableError` rather than a synthetic 404.
  - `resolveKpis` returns `available: false` (no mock KPIs).
- **Exhaustive check.** `git grep "mock\."` finds nothing outside those gated paths, apart from type imports and `() => mock.*` fallbacks inside `withContractFallback`.
- **Flag definition and docs.**
  - The flag is `process.env.NEXT_PUBLIC_ADMIN_PREVIEW === "true"`, so anything else is off.
  - FE-1's README and `.env.example` document it as dev only, with no Production setting on Vercel.

**FE2-7 verification:**
- Byte-identical to FE-1 `0e03b90`:
  - `components/ui/**` (including the `.d.ts` files and `fieldStyles.js`)
  - `app/globals.css` and `app/layout.tsx`
  - `lib/cn.ts`, `lib/api/client.ts`, and `lib/site.ts`
  - `package.json` and `package-lock.json`
- `components/admin/kit.ts` is deleted, and admin code imports `@/components/ui`.
- `lib/api/index.ts` is not taken, as agreed. The trial merge adds FE-1's version cleanly.
- **Leftover (Note):** `tailwind.config.js` is still on FE-2 (FE-1 deleted it). The merge applies FE-1's deletion automatically.
- **`lib/config.ts`:** content is identical to FE-1 `14f0b00` except the doc comment on `adminPreview` (FE-2 has 4 lines, FE-1 has 1). That produces an add/add conflict; take FE-1's side. It is worth aligning now so the merge is clean.

### New modules against the contract

**Capability gating (UI; the server enforces):**
| Capability | Where it gates | Contract | OK |
| --- | --- | --- | --- |
| `products:read` / `products:write` | Products and Categories nav (`modules.ts`). Create, edit, and delete buttons only when `can("products:write")`. | §4 | ✓ |
| `inventory:read` / `inventory:adjust` | Inventory nav. Adjust stock and "Run low-stock check" only when `canAdjust`. | §5 (low-stock-check is `inventory:adjust`) | ✓ |
| `orders:update` / `jobs:assign` | Order installation toggle and engineer assignment need `canUpdate`. Create job needs `canAssignJobs`. Job drawer assign, edit, status, and delete need `canAssign`. Delete only for `unassigned|assigned|cancelled`. | §6.4, §7.2 | ✓ |
| `jobs:read` | Installations nav. The engineer filter and picker only when `staff:read` (every `jobs:assign` role has `staff:read`). | §7.2, §7.4, §12 | ✓ |
| `jobs:update-own` | "My jobs" nav, and `/admin` lands on the first allowed module, so an engineer lands on My jobs. | §7.3 | ✓ |
| `staff:read` / `staff:write` | Staff nav (Team tab). Profile editing only when `staff:write`. | §7.4 | ✓ |
| `users:read` / `users:manage` | The Accounts tab exists only when `users:read`. Invite, edit, role, and (de)activate only when `users:manage`. | §2 | ✓ |
| `settings:read` / `settings:write` | Settings nav. Every section's save only when `canWrite`, with a read-only notice otherwise. | §8.1 | ✓ |

- **Engineer view:** `MyJobs.tsx`/`MyJobDetail.tsx` import only `getMyJobs`, `setMyJobStatus`, and `updateMyJob`, which call `/admin/me/jobs*`. It offers only `assigned → in_progress → completed` (`ENGINEER_JOB_TRANSITIONS`). Complete is disabled until every checklist item is done (the server 409 is still surfaced). Checklist PUTs send only `{ id, done }`. Primary controls are `size="lg"`/`min-h-11` (≥44 px). ✓
- **Self changes:** "Change role" and "Deactivate/Reactivate" are `disabled` on your own row, with an `aria-describedby` explanation ("You can't change your own role or status."). Self edit of name/phone stays available (contract §13.3). ✓
- **Mock and type shapes:** `lib/api/types.ts` matches the contract field for field for `Category`/`CategoryAttribute`, `Product`/`ProductInput` (stock only on create), `InventoryItem`, `InventoryMovement`, `StockAdjustmentInput` (manual reasons only), `InstallationJob`/`ChecklistItem`/`JobCreateInput`/`JobUpdateInput`/`MyJobUpdateInput`, `AdminUser`/`StaffProfile`/`StaffMember (+openJobs)`, `Settings`/`SettingsInput`, `AdminNotification`/`NotificationsPage (+unreadCount)`, and dashboard `kpis`. Return shapes match too: admin categories are an array; products, inventory, movements, jobs, my jobs, users, staff, and notifications are paged; adjustments return `{ movement, product }`; low-stock returns `{ lowStock, emailed }`. Mocks are typed against these, so `tsc` enforces the shapes. ✓

### Findings (round 3)

**FE2-9 — Minor — Missing invite-expiry hint (contract §13.4).**
The clarification says FE-2 should tell admins on the users page that an invitee whose 30-minute invite token expired uses "Forgot password" (`POST /admin/auth/request-password-reset`). The invite success toast mentions the reset token but not the expiry or the recovery path. **Fix:** add one helper line in the Invite dialog and the Accounts tab.

**FE2-10 — Note — The mock module ships in the production bundle.**
`lib/api/admin.ts` statically imports `lib/admin/mocks.ts` (about 1,200 lines of sample data). It is inert with the flag off, but it is downloaded by every admin. **Fix, when mocks are removed after backend integration (already planned):** delete it. Alternatively, `await import()` it inside the preview branch now. Not blocking.

**FE2-11 — Note — Deployment dependency.**
With preview off, a backend without `/admin/auth/me` and without `capabilities` in the login response gives every admin an empty shell. This is correct fail-closed behaviour, but it means the Next admin cannot replace the Vite admin in production until BE-1's roles milestone (login `capabilities` + `/me`) is deployed to the same environment. Record this in the release plan.

**FE2-8 (updated) — Integration conflicts** with FE-1 `14f0b00`. The trial merge now has **3** add/add conflicts, down from 13:
| Path | Resolution |
| --- | --- |
| `lib/config.ts` | Take FE-1 (comment-only difference). |
| `lib/validation.ts` | Take FE-2, add FE-1's `LIMITS.cartItems`, `quantityMin`, `quantityMax`, and `PHONE_PATTERN`. |
| `lib/api/types.ts` | Keep both sections, and keep one copy of the identical `Paged`, `Category`, `CategoryAttribute`, and `EmploymentType`. Rename FE-1's `CustomerSegment` to `PublicCustomerSegment` in `types.ts` **and** in `lib/fallbacks/index.ts`. The first trial build failed type-check on exactly this: 6 errors at `lib/fallbacks/index.ts:84–114`. |

After those resolutions the merged tree builds and lints with 0 errors.

### Known gaps FE-2 declared — acceptance decision
| Gap | Decision | Reason |
| --- | --- | --- |
| No category filter on Inventory (contract §5 supports `category`) | **Not blocking.** Follow-up. | PRD §6.2 asks for a stock view, adjustments, movement history, and a low-stock badge, all of which are present. Search plus low/out filters cover day-to-day use. Add the filter in the next pass (the API function already accepts the query). |
| Movement filters reset on tab switch | **Not blocking.** Follow-up. | UX polish only; no data or permission impact. |
| Jobs created only from an order | **Not blocking**, and accepted as designed. | Contract §7.2 requires `orderId`, and the order must `requiresInstallation`. Creating from the order detail, where that toggle lives, is the natural flow. The Installations page should point users to Orders in its empty state, which is a nice-to-have. |

### FE-2 verdict
**Accepted for integration.** All review-2 findings are fixed, and the new modules gate correctly and match the contract. FE2-9 is a small follow-up that doesn't block. FE2-10 and FE2-11 are tracking notes. Remaining sign-off items are live checks that need BE-1 and BE-2: section D live 401/expiry/reset runs, server-side refusal with limited accounts, and vacancies end to end. They happen during `agents/fe-integration` (section G).
