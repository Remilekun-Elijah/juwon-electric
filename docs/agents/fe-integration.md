# Frontend integration (`agents/fe-integration`)

Built by SUP-FE on 2026-09-17.
- **Base:** `v3-agents-base` @ `d48b482`.
- **Merge 1:** `agents/fe-public` @ `00ab5c3`, clean.
- **Merge 2:** `agents/fe-admin` @ `6b8b544`, 5 conflicts, resolved below.

Reviews: `agents/fe-supervisor:docs/agents/review-fe.md`. Review 3 accepted FE-2; review 4 accepted FE-1.

Nothing is pushed, and `v3` is untouched.

## Conflict resolutions
| Path | Resolution |
| --- | --- |
| `app/globals.css` | FE-1. FE-2 carried FE-1's older `0e03b90` copy; FE-1 added the page CSS since. |
| `components/ui/Dialog.jsx`, `components/ui/Drawer.jsx` | FE-1. It adds the 44 px close-button hit area from `a2b053c`, which FE-2 didn't have yet. |
| `lib/api/types.ts` | Union: FE-1's public section first, then FE-2's admin section. The only `import` is at the top. The duplicate `Paged`, `EmploymentType`, `CategoryAttribute` and `Category` were identical, so one copy of each is kept, in the admin section. FE-1 already renamed its type to `PublicCustomerSegment` (`8fa3773`), so `CustomerSegment` is the admin shape (`id` and `isActive` required). |
| `lib/validation.ts` | FE-2's file, which is a superset, plus FE-1's `LIMITS.cartItems`, `quantityMin` and `quantityMax` and the `PHONE_PATTERN` export. `EMAIL_REGEX`, `isValidEmail`, `PHONE_MESSAGE` and `isValidPhone` were identical. |

Merged automatically:
- `lib/config.ts`, which is identical on both branches.
- FE-1's `lib/api/index.ts`.
- The deletions of `tailwind.config.js` and the old `app/vacancies/*.jsx`.
- FE-2's deletion of the old `app/admin/vacancies/page.jsx`.
- The package files, which are identical.

## Checks run
- **Environment:** a SUP-FE worktree using a symlinked single install and an uncommitted `turbopack.root` override (not committed).
- **Type-check:** `tsc --noEmit` exit 0.
- **Lint:** `npm run lint` shows 0 errors and 0 warnings on the committed tree. The only error during the run came from the uncommitted review override.
- **Build:** `next build` with `NEXT_PUBLIC_BACKEND_URL=http://127.0.0.1:9217` passes.
  - All `/admin/*` routes are static shells.
  - Public pages are static with a 5-minute revalidate.
  - `/packages/[id]` builds 66 SSG paths, and `/vacancies/smoke-installer` is prerendered.
  - `/products/*` build as SSG.
  - `robots.txt` and `sitemap.xml` are generated.
- **Backend-down build:** checked on FE-1 `00ab5c3` in review 4.
- **Smoke, local backend:** `agents/be-platform` @ `ae917b4` Express with a throwaway JSON store and a seeded superadmin, on port 9217. The frontend ran with `next start` on port 3217.
  - **HTTP status codes:**
    - 200: `/`, `/services`, `/portfolio`, `/packages`, `/packages/0`, `/contact`, `/cart`, `/vacancies`, `/vacancies/smoke-installer`, `/products`, `/sitemap.xml`, `/robots.txt`, `/admin`, `/admin/login`, `/admin/vacancies`, `/admin/my-jobs`
    - 404: `/packages/999999`, `/vacancies/nope`, `/products/nope`, `/nope`
    - Security headers are present, and the admin page is `noindex`.
  - **Headless Chrome, 13 of 13 passed:**
    - The home page renders.
    - The vacancy detail renders and the XSS payload is inert.
    - `/admin/vacancies` without a session redirects to `/admin/login?next=…`.
    - Signing in through the real form redirects back.
    - `je/admin-session` and `je/admin-user` are stored with role `superadmin` and 25 capabilities.
    - The vacancy created through the API is listed, and there is no preview banner (flag off).
    - There is a single toaster.
    - `/admin/products`, which the backend lacks, shows "isn't available on the server yet".
    - Sign-out clears both keys.
    - There were no uncaught exceptions.
  - **API level:** `POST /cart/quote` with the checkout item shape (`{ items: [toOrderItem(...)] }`) returns server prices (`unitPrice` 1,150,000 for "Basic, with solar").

## Remaining follow-ups
1. **Mocks removal:** once `agents/be-integration` is deployed, delete `lib/admin/mocks.ts`, `withContractFallback`, `markMocked`, `PREVIEW_CAPABILITIES`, and `NEXT_PUBLIC_ADMIN_PREVIEW` from `lib/config.ts`, the README and `.env.example` (FE2-10).
2. **`CustomerSegment` naming:** `CustomerSegment` is the admin type, and the public one is `PublicCustomerSegment`. Keep new public code on `PublicCustomerSegment`. Don't reintroduce a public `CustomerSegment`.
3. **CSP:** there is none yet. Add a report-only policy covering Turnstile, inline JSON-LD and the Next bootstrap (nonce), Quill styles and `https:` CMS images, then enforce it (FE4-3).
4. **Solar toggle bug** (open product issue, kept for Vite parity): toggling "With solar" changes `price` but not the kits text sent as `package` in `POST /order` (FE4-5). Waiting on a product decision.
5. **Before release:**
   - FE-1 re-ports `lib/sanitize.ts` from `backend/shared/richText.js` @ `ae917b4`, which adds the linear-time scanner and `MAX_DEPTH` (FE4-1).
   - FE-1 applies the contrast shades ruled in FE_CONVENTIONS §2 (FE4-2).
6. **Live backend checks pending BE integration** (need `agents/be-integration` with BE-2):
   - catalog, inventory, orders fulfilment and the 409 stock path
   - jobs and the engineer "My jobs" flow with an engineer account
   - staff and users with limited roles (server-side refusal on direct URLs)
   - settings, notifications and dashboard KPIs
   - 8 h / 2 h session expiry and 401 recovery
   - the password reset email flow
   - Turnstile with real site keys
   - a side-by-side visual parity pass against Vite at 375, 768 and 1280 px
7. **Release dependency:** the Next admin can't replace the Vite admin in production until BE-1's login `capabilities` and `/admin/auth/me` are deployed to the same environment (FE2-11).
