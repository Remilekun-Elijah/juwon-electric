# FE-1 status — Public site port (`agents/fe-public`)

Rules: `agents/fe-supervisor:docs/agents/FE_CONVENTIONS.md` (rev 2), `FE_ACCEPTANCE.md`, `review-fe.md`.
Endpoints: `agents/be-supervisor:docs/agents/API_CONTRACT_V3.md`.

## Progress

| Ledger item | Status | Commits |
| --- | --- | --- |
| 1. Build green on base | Done on base (`d48b482`) | — |
| 2. Brand system (`@theme`, fonts, metadata, favicon, scaffold removed) | Done | `b4a545f`, review fixes |
| 3a. UI kit + `lib/api` | Done; review FE1-1…FE1-8 addressed | `b6e901d`, `8e35473` (partly reverted), review fixes |
| 3b. Layout (Navbar, Header, Footer) | In progress | |
| 4. Page port | Not started | |
| 5. Vacancies SSG/ISR | Not started | |
| 6. Products & categories | Not started | |
| 7. SEO, a11y, README | README env section done (FE1-7) | |

## Review 1 fixes (`review-fe.md`)

| Finding | Fix |
| --- | --- |
| FE1-1 kit unusable from `.tsx` | Per-file declarations `components/ui/*.d.ts` (+ `types.d.ts`, `index.d.ts`). TypeScript resolves `X.d.ts` before `X.jsx`; the bundler still loads the `.jsx`, so the sources stay diffable against Vite. Proof: `components/ui/kit.typecheck.tsx` renders every barrel export with only required props, then with optional props, and is type-checked by every `next build`. A negative probe (missing `type` on `StatusBadge`, bad `variant`, missing `open` on `Dialog`, …) produced 6/6 expected errors. |
| FE1-2 public font | Inter (`--font-inter`) is the body font; Sora and Manrope added as variables; all 10 helper classes ported to `@layer components`; `--diamond` / `--gold` ported to `:root`. Plus Jakarta Sans stays the `font-sans` token for the admin root (FE-2). App.css page globals (`.overlay`, `.header-video`, `.header-content`, `.energyBackground`, rotate keyframes, scrollbar, `img`) ported too. |
| FE1-3 v3 → v4 drift | 19 renames in the kit: `shadow-sm`→`shadow-xs` ×4, `shadow`→`shadow-sm` ×1, `outline-none`→`outline-hidden` ×11, `rounded`→`rounded-sm` ×2, `backdrop-blur-sm`→`backdrop-blur-xs` ×1. Applied to every ported page too. |
| FE1-4 `fieldClasses` client reference | Moved to `components/ui/fieldStyles.js`; verified `typeof fieldClasses === "string"` in a server component. |
| FE1-6 / FE1-8 admin client | `lib/api/admin.ts` removed from this branch (coordinator instruction); `lib/api/index.ts` exports client, public helpers and types only. |
| FE1-7 env access | `lib/config.ts` holds `turnstileSiteKey` and `siteUrl` (`NEXT_PUBLIC_SITE_URL`); `NEXT_PUBLIC_BACKEND_URL` is read only in `lib/api/client.ts`. Documented in `frontend-next/README.md` and `.env.example`. |
| FE1-9 shared originals | `lib/cn.ts` and `lib/api/client.ts` restored to `b6e901d` byte for byte. The whole 25-file kit is restored as `.jsx` (my `8e35473` TypeScript conversion and FE-2-file removals are reverted). |

## Shared originals FE-2 checks out

`components/ui/**` (including the new `*.d.ts`, `fieldStyles.js`, `kit.typecheck.tsx`), `lib/cn.ts`, `lib/api/client.ts`,
`lib/api/index.ts`, `lib/api/public.ts`, `lib/api/types.ts`, `package.json`, `package-lock.json`.

**Not on this branch: `lib/api/admin.ts`.** Conventions rev 2 §1.1 lists it in FE-2's checkout command, but the coordinator
told FE-1 to remove it (FE-2 owns it). FE-2 can restore the seeded transport with
`git show b6e901d:frontend-next/lib/api/admin.ts > frontend-next/lib/api/admin.ts`. SUP-FE: please drop it from the §1.1
command.

## Kit changes since the review (tell FE-2)

- `fieldClasses` now lives in `components/ui/fieldStyles.js` (still exported from the barrel).
- Declarations added; no runtime API changes.

## `lib/api` (FE-1)

- `public.ts`: `getPackages`, `getPackage(id)`, `getServices`, `getPortfolio`, `getPortfolioItem`, `getCategories`,
  `getCategory`, `getProducts` (paged), `getProduct`, `getVacancies`, `getVacancy(slug)`, `getPublicSettings`,
  `quoteCart`, `saveCart`, `placeOrder`, `submitContact`, `subscribe`. Bodies are passed as objects (the client encodes).
- `types.ts` FE-1 section follows contract §3 (`PublicVacancy`), §4 (`Category`, `PublicProduct`, `Paged`), §8.1
  (`PublicSettings`) and the live package/service/portfolio/cart/order shapes. FE-2 section is empty and reserved.

## Dependencies

Approved in rev 2: `lucide-react`, `@headlessui/react`, `sonner`, `clsx`, `tailwind-merge` (committed with the lockfile in
`b6e901d`). No dependencies added since. The cart uses a `useSyncExternalStore` store instead of `zustand`, so there is
no second install; the sanitiser decision is recorded with item 5.

## Deviations and notes

1. **Routing:** `packages/[id]` (backend only offers `GET /packages/:id`; package slugs repeat, e.g. `basic`).
2. **Lint baseline:** base has 5 errors + 1 warning. `app/admin/vacancies/page.jsx` is FE-2's. `app/vacancies/[slug]/page.jsx`
   is fixed by FE-1 in item 5. Rule until then: no new lint errors.
