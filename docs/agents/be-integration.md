# Backend integration: `agents/be-integration`

Owner: SUP-BE · Date: 2026-09-17 · Review: `docs/agents/review-be.md` round 4 (on `agents/be-supervisor`, bff910c)

## Branch
- Cut from `v3-agents-base` (d48b482).
- `git merge --no-ff agents/be-platform` @ **ae917b4**: merge commit af63921, no conflicts.
- `git merge --no-ff agents/be-ops` @ **ca4cf07**: merge commit 14c2f93, no conflicts. `be-ops` already contained `be-platform` ae917b4.
- The resulting tree is **identical to `agents/be-ops` ca4cf07** (`git diff agents/be-ops agents/be-integration` is empty).
- Nothing has been pushed, and `v3`/`v2` are untouched.

## Checks run (Node 22.22.2, macOS; `node_modules` symlinked from BE-1's worktree, nothing installed)

| Check | Result |
|---|---|
| `cd backend && npm test` (Express, Worker on the node:sqlite D1 stand-in, parity) | **56/56 test files pass** (11.5 s) |
| `cd backend && npm run lint` (ESLint 10, then `scripts/check-chars.mjs`) | **Clean.** `check-chars: 161 files clean` |
| `cd backend/cloudflare && wrangler deploy --dry-run` | **Builds:** 289.46 KiB (68.21 KiB gzip), binding `DB` |
| D1 migrations 0001→0013 on a fresh stand-in DB, applied twice | OK (idempotent) |
| D1 migrations 0001–0006, then `seed.sql`, then →0013, applied twice | OK. Row counts unchanged (packages 66, services 5, portfolio 15, customerSegments 6), and all 16 `idx_records_*` indexes are present |
| Leftover references (`X-User-Role`, `requireAdminOrHR`, `d1-sync`, `d1-write`, `TODO(integration)`) in `backend/` and `.github/` | Only a historical comment in `0008_vacancies.sql` and the intentional assertions in `test/cleanup.test.js` and `test/scenarios/vacancies.js` |
| Express smoke run (below) | **52/52 steps pass** |

### Express smoke run
Command: `node app.js` in `backend/`, with `NODE_ENV=development`, the JSON store in a temp dir, no Mongo, `TURNSTILE_DISABLED=true`, `DEV_EXPOSE_RESET_TOKEN=true`, and a seeded superadmin. It listened on free port 52687 (not 9101/9102) and was driven over real HTTP.

| Area | Steps (all passed with the expected status) |
|---|---|
| Health and auth | `GET /health` 200. `POST /api/admin/auth/login` 200. `GET /api/admin/auth/me` 200: role `superadmin`, capabilities include `jobs:assign`. |
| Users (§2) | Create an engineer and an hr user (201, invite), then reset request, set password and login for each. `GET /admin/users?role=engineer` 200. hr on `GET /admin/users` gets 403. |
| Vacancies (§3) | hr creates a draft (201). The draft is not public (404). Publish returns 200. Public `GET /api/vacancies/:slug` returns 200, with `descriptionHtml` sanitised to `<p>Hi</p>`. `GET /vacancies` returns 200. Legacy `POST /vacancies` returns 404. |
| Catalog (§4) | Category create 201. Product create 201 (stock 3, image path, rich text). Public `GET /api/products/:slug` 200, `GET /products?category=inverters` 200, `GET /categories` 200. |
| Inventory (§5) | Restock +2 gives 201 (stock 5). Movements 200. |
| Orders and stock (§6) | Package with `items` (inverter ×2) 201. Public `POST /api/order` qty 2 returns 201 with `pending`/`pending`. `pending → processing` returns 200 with `stockCommittedAt` set and **stock 5 → 1**. Mark paid 200. `requiresInstallation: true` 200. A second order that needs 2 when 1 is left gets **409 "Insufficient stock to process this order."**. Cancelling the first order returns 200 and **stock goes back to 5**. The second order's `processing` then returns 200. |
| Jobs (§7) | Create a job assigned to the engineer (201). Engineer `GET /admin/me/jobs` 200 (total 1). Engineer `GET /admin/orders` 403. Engineer start, tick checklist and complete all return 200. `PUT /admin/staff/:id` profile 200. |
| Settings and notifications (§8) | `PUT /admin/settings` with `lowStockEmails` 200. `GET /api/settings/public` 200 and contains no notification email. Superadmin notifications: `low_stock, new_order, vacancy_posted`. Engineer notifications: `job_assigned` only. |
| Dashboard and audit (§9) | `GET /admin/dashboard` 200: `kpis` = revenue 1 800 000 (the paid order), openOrders 1, lowStockItems 1, openVacancies 1, upcomingJobs 0. `GET /admin/audit-logs` 200. |

## Integration checks still pending (not verifiable locally)
1. **Real D1 batch semantics.** `cloudflare/src/ops/stock.js` relies on `INSERT INTO batch_guard (ok) SELECT changes()` reflecting the preceding compare-and-set `UPDATE` inside one `DB.batch`, and on a `CHECK` failure rolling back the whole batch. Verify this against `wrangler dev --local` and a staging D1: run concurrent `pending→processing` on two orders that compete for the same stock, and check that exactly one commits and no movement rows are orphaned.
2. **Remote migrations 0007–0013 in order** on the production D1 (`wrangler d1 migrations apply juwon-electric --remote`), preceded by the duplicate checks in `docs/DEPLOYMENT.md` (admin emails, vacancy slugs). There is no `0009`, which is expected.
3. **Mongo mode is untested.** Covers `ensureUniqueIndexes` (admin email, vacancy slug, product SKU and slug) including the production exit on duplicates, the `$inc`-based stock commit and compensation, and the Mongo `Ops*` models. Run the smoke flow above with `MONGODB_URI` against a disposable database.
4. **Cron trigger:** the Worker `scheduled` handler (`0 7 * * *` low-stock digest). Check with `wrangler dev --test-scheduled` and on deploy.
5. **A real GitHub Actions run** of `.github/workflows/ci.yml`: the `backend`, `worker` and `frontend` jobs, and `deploy-worker`, which is gated to pushes to `v3`/`main` and needs `CLOUDFLARE_API_TOKEN`/`CLOUDFLARE_ACCOUNT_ID` plus the `production` environment.
6. **Email delivery:** SMTP (Express nodemailer: invites, resets, low-stock, new order) and Resend (Worker), including `ADMIN_APP_URL` links. Tests only capture the payloads.
7. **Frontend contract use:** FE branches consume `/admin/auth/me` capabilities, paged lists, the order enums and `/settings/public` (SUP-FE's check).

## Follow-ups (non-blocking; see `review-be.md` round 4)
- **L11:** in `0011`, store `legacyPaymentStatus` as `null` for a non-string `paymentStatus`, to match the read-time backfill.
- **L12:** the Worker's public `POST /order` response still includes `sortOrder`.
- **L13:** switch projected admin parity steps (orders, notifications, dashboard) to full masked bodies.
- **Observation:** an order with a completed installation job can still be cancelled (`processing → cancelled`), which restores its stock. The contract allows this, but the business may want to block cancelling once an installation is done.
- The ledger (`AGENT_WORKLOAD_SPLIT.md`) should record the retirement of `workers/d1-write`, `backend/d1-sync` and `backend/d1-schemas` (`docs/agents/be-platform.md` milestone 3) at human sign-off.

## Readiness
All BE-1 and BE-2 acceptance items are PASS. The integration branch is green on tests, lint, Worker bundle, migrations and the Express smoke run. **It is ready for human review and a staging deploy.** Items 1–2 above must pass on staging D1 before production.
