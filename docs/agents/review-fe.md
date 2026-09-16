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
