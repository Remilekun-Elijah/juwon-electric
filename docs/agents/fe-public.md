# FE-1 status — Public site port (`agents/fe-public`)

Rules: `agents/fe-supervisor:docs/agents/FE_CONVENTIONS.md`, `FE_ACCEPTANCE.md`. Endpoints: `agents/be-supervisor:docs/agents/API_CONTRACT_V3.md`.

## Progress

| Ledger item | Status | Commit |
| --- | --- | --- |
| 1. Build green on base | Done on base (`d48b482`) | — |
| 2. Brand system (`@theme`, fonts, metadata, favicon, scaffold removed) | Done | `b4a545f` |
| 3a. UI kit + `lib/api` | Done, reconciled with conventions | `b6e901d`, reconcile commit |
| 3b. Layout (Navbar, Header, Footer) | In progress | |
| 4. Page port | Not started | |
| 5. Vacancies SSG/ISR | Not started | |
| 6. Products & categories | Not started | |
| 7. SEO, a11y, README | Not started | |

## Reconciliation with FE_CONVENTIONS

- `lib/config.ts`, `lib/cn.ts`, `lib/api/client.ts` replaced with the §3.3 verbatim files (checked byte for byte against the doc).
- `lib/api/public.ts` rebuilt on the shared client; types in the FE-1 section of `lib/api/types.ts`, following the contract.
- Removed `lib/api/admin.ts` (`adminRequest`) and the `lib/api/index.ts` barrel: `lib/api/admin.ts` is FE-2's file (§1).
- Removed my ports of FE-2 kit files: `Table`, `Pagination`, `paginate`, `Tabs`, `Drawer`, `StatCard`, `PageHeader`, `EmptyState`, `Avatar`, `Switch`, `statusMaps`.
- FE-1 kit files converted to `.tsx`/`.ts` with the Vite prop APIs unchanged. Barrel is `components/ui/index.ts` and exports FE-1 files only.
- `process.env` removed from `app/layout.tsx`; site constants in `lib/site.ts`.

## Stand-ins (integration keeps the owner's version)

- `components/ui/statusMaps.ts` — FE-2 owns it. `Badge.tsx` (FE-1) exports `StatusBadge`, which imports it, so a copy of the Vite file with the same API is here so the branch builds.

## Dependencies added (not pre-approved; reason)

Committed with the lockfile in `b6e901d`.

- `lucide-react` ^1.46 — icons used by the Vite UI kit (`Alert`, `Input`, `Spinner`, `Dialog`) and replaces `@mui/icons-material` on public pages.
- `@headlessui/react` ^2.2 — `Dialog` is built on it in Vite (FE-1 owns `Dialog`); 2.2 is the first line supporting React 19. Also used for the Navbar mobile disclosure, as in Vite.
- `sonner` ^2.0.8 — `Toaster` (FE-1) wraps it; replaces SweetAlert2 toasts on public pages.
- `clsx`, `tailwind-merge` — pre-approved.

Not added: `zustand`, `isomorphic-dompurify` (pre-approved). See the cart and sanitiser notes below once those items land.

## Deviations and questions for SUP-FE / SUP-BE

1. **Admin auth header conflict.** `FE_CONVENTIONS.md` §3.5 and `FE_ACCEPTANCE.md` §D say `x-admin-token` and "no bearer header"; `API_CONTRACT_V3.md` §12 says `Authorization: Bearer <token>`. The Express middleware accepts both today. FE-1 no longer ships an admin client, but SUP-FE and SUP-BE should settle one rule for FE-2.
2. **Suggestion (shared file):** add `siteUrl: process.env.NEXT_PUBLIC_SITE_URL || ""` to `lib/config.ts`. Metadata, `sitemap.ts` and `robots.ts` need an absolute origin; until then `lib/site.ts` hardcodes `https://juwonelectric.com`.
3. **Suggestion (shared file):** the doc's `apiRequest` has no timeout and treats a network failure as a thrown `TypeError`, not `ApiError`. My earlier version mapped network errors to `ApiError(0)`. Public helpers catch any error, so this is not blocking.
