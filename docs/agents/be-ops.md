# BE-2 status: Commerce & Operations (`agents/be-ops`)

Base: `v3-agents-base` @ `d48b482`. Contract: `docs/agents/API_CONTRACT_V3.md` on `agents/be-supervisor` (c737453). Endpoint reference: the "Commerce and operations (v3)" section at the end of `backend/docs/API.md`.

## Progress

| Contract item | Status |
| --- | --- |
| §4 Catalog: categories, products, package `items` | Done (aligned with the contract) |
| §5 Inventory: stock view, adjustments, movements, low-stock alerts and check | Done |
| §6 Orders and fulfilment (D4a) | Done |
| §7 Installation jobs, engineer endpoints, staff | Done |
| §8 Settings and notifications | Done (BE-1's two `TODO(integration)` vacancy markers now call `notify()`) |
| §9 Dashboard KPIs | Not started |

Commits:

- a8da77f: catalog (pre-contract)
- 68e2c5c: inventory (pre-contract)
- 05498dd: catalog and inventory aligned with the contract
- bd75e45: adopted BE-1's sanitiser, lint tooling and test globs
- faa51c4: orders (§6)
- 7fc1e05: jobs, engineer endpoints and staff (§7)
- 5e5fe02, 77a0107: merges of `agents/be-platform` (through ae917b4)
- settings and notifications (§8): the commit that adds this file version

## Integration with BE-1

- **Capabilities.** `backend/shared/capabilities.js`, `backend/middleware/capabilities.js` and `backend/cloudflare/src/capabilities.js` are BE-1's files (checked out from `agents/be-platform` 391a979), unchanged. There are no shims.
- **Test harness.** Also taken unchanged from BE-1: `backend/test/helpers/express.js`, `backend/cloudflare/test/helpers/{d1,worker}.js`, and BE-1's `backend/cloudflare/src/http.js` (`data: null`). `app.js` uses BE-1's `isEntryPoint` block, and `package.json`/`package-lock.json` are BE-1's (explicit test globs, `lint`, `engines`).
- **Merged `agents/be-platform`** into this branch. BE-1's side won for its owned files (capabilities, `richText.js`, admin users, vacancies, CI, cleanup deletions); BE-2's side won for catalog, inventory, orders and jobs. Conflicts were mechanical: collection lists, label maps, public routes, Worker imports, Mongo models and indexes. The Worker's legacy order branches stay removed, because `src/ops/orders.js` owns them with capability checks.
- **Unique index errors.** The Worker store converts UNIQUE violations into a generic `409` only for `categories` and `products`. Vacancies and admins keep the raw error, which BE-1's handlers catch for their slug retry and email `409`.
- **Rich text.** `backend/shared/richText.js`, its fixtures and both `richText.test.js` files are BE-1's, unchanged. BE-2 has no sanitiser of its own. Products call `sanitizeRichText` with the same rules as vacancies, and `cloudflare/test/catalog.test.js` also stores every fixture through `POST /admin/products`.
- **Lint.** `npm run lint` (BE-1's ESLint config and `check-chars`) passes.
- **Routing.**
  - Express admin routes are on `backend/routes/ops.js` (`opsAdminRouter`), mounted inside `routes/admin.js` after `adminAuth`, and public routes on `opsPublicRouter`, mounted in `routes/public.js`.
  - Express `GET/PUT/DELETE /admin/orders[/:id]` stay on `routes/admin.js` (gated by BE-1) with BE-2's controllers (`controllers/orders.js`).
  - The Worker dispatches to `backend/cloudflare/src/ops/*` **before** the legacy `handleAdmin`. The legacy order branches were removed from `handleAdmin`, and `src/ops/orders.js` owns `/admin/orders*` with capability checks.
- **Expected conflicts** (small, mechanical):
  - `routes/admin.js` and `routes/public.js`: one import line and one `router.use` line each.
  - `cloudflare/src/index.js`: imports, package `items`, the ops dispatch and `scheduled`.
  - `services/errors.js` and `cloudflare/src/store.js`: label maps and `COLLECTIONS`.
  - `services/store.js`: `ensureSecurityIndexes`.
  - `docs/API.md`: BE-2's section is appended at the end.

## How it is built

- **Shared logic.** Validation, filters, serializers, the stock plan and the low-stock rules live in `backend/shared/{fields,catalog,inventory,settings,errors,richText}.js` (pure ESM). Shared errors carry `statusCode` and `expose: true`, and the Worker's `errorResponse` exposes them like `ApiError`.
- **Storage.** New collections go in the existing stores: Express JSON/Mongo with models named `Ops*`, which avoids clashing with `backend/models/*`, and the D1 `records` table. SKU uniqueness regardless of case uses a stored `skuLower` field: a Mongo unique index, and a check under the JSON store lock. D1 uses the contract's `lower(json_extract(...))` index.
- **Atomic stock** (§5, §6.3). Details are in the API.md section.
  - JSON store: the lock.
  - Mongo: conditional `$inc` plus compensation.
  - D1: a single batch with a compare-and-set update per product and `batch_guard` CHECK rows that roll the whole batch back when a row changed, then retry. `cloudflare/test/inventory.test.js` tests the rollback and retry. The concurrent case (12 parallel decrements of 5 in stock) is tested in both runtimes.
  - **Integration check (real D1):** the guard relies on `changes()` inside `env.DB.batch()` reporting the previous statement's row count, as SQLite does. The local tests run on `node:sqlite`. Before the first production deploy, run a `batch` of a non-matching `UPDATE` followed by the guard insert against a real D1 database (`wrangler d1 execute --remote` or a preview Worker) and confirm it fails and rolls back.
- **Migrations.**
  - `0010_catalog.sql`: slug and SKU unique indexes.
  - `0012_inventory_jobs.sql`: `batch_guard`, plus movement and job indexes.
  - `0011_orders_fulfilment.sql`: order backfill (§6.1). Tested on a seeded database at `0010`: the migrated rows equal the read-time normalisation and are idempotent.
  - `0013_settings_notifications.sql`: notification and read-row indexes.
- **Tests** (`cd backend && npm test`):
  - Scenarios: `backend/test/scenarios/{catalog,inventory,orders,jobs,settingsNotifications}.js`, plus `opsKit.js` for admin and record seeding, email capture (nodemailer and Resend) and masking.
  - Runners: `backend/test/*.test.js` (Express), `backend/cloudflare/test/*.test.js` (Worker) and `backend/test/parity/*.parity.test.js`.
  - Mongo mode is not covered by tests.

## Interpretations (SUP-BE please confirm)

1. **Low-stock email recipients.** §5 says to email `lowStockEmails` "if non-empty"; §8.1 says env recipients are the fallback when the arrays are empty. Implemented: no email when `lowStockAlertsEnabled` is false. Otherwise the recipients are `lowStockEmails`, or `SMTP_FROM` (Express) / `ADMIN_NOTIFY_EMAIL` (Worker) when that list is empty.
2. **Product `reorderLevel` default** is `settings.inventory.defaultReorderLevel`. That setting defaults to 0, which matches "default 0" while making the setting meaningful.
3. **Public `GET /products?category=<unknown>`** returns an empty page, not 404.
4. **Public product order** is by name (the contract does not specify it). The public product response keeps `status`, as the `PublicProduct` type implies.
5. **Adjustments accept a slug or SKU** in `productId`, matching the `:id` resolution rule.
6. **Parity exclusions.**
   - Admin package create bodies are compared on `message` and `items` only, because Express seeds a package catalog and the Worker does not.
   - Two admin product lists are compared as sets, because records written in the same millisecond can tie on `updatedAt`.
   - The concurrent-adjustment step is compared as sorted statuses.
7. **Express low-stock digest timer** (24 hours, in `start()`) is the Express counterpart of the optional Worker cron. It runs once per Express instance, so N instances send N digests. This is documented in API.md.
8. **Unknown fields** in request bodies are ignored.
9. **Orders: `stockCommittedAt`** is set only when the `pending → processing` move actually changed stock, meaning at least one line maps to package items.
10. **Orders: the write guard** is the stored `fulfillmentStatus` and `paymentStatus` (`assignedEngineerId` for assignment), not the whole record. Concurrent note edits are last-write-wins; concurrent status changes answer `409`, so stock is never committed twice (tested with three racing transitions).
11. **Orders: stock reversal on cancel** restores the net quantity of the order's `sale` minus `sale_reversal` movements, so no separate commitment record is stored.
12. **Orders: removed `sortOrder`.** Admin order responses no longer include `sortOrder`. Only the Worker stored it, so this was a parity difference in existing endpoints.
13. **Orders: validation messages.** `400` `"Fulfilment status is not valid."`, `"Payment status is not valid."` and `"requiresInstallation must be true or false."` (filter). A missing `engineerId` answers `"Assignee must be an active engineer."`.
14. **Orders: repeated transitions.** `mark-paid` on a paid order and cancelling a cancelled order are `200` no-ops, as §6.2 says for the same value.
15. **Express order routes** are gated by BE-1's `routes/admin.js` (merged). The Worker gates them in `src/ops/orders.js`.
16. **Jobs: assignment of started jobs.** Assigning or reassigning is limited to `unassigned` and `assigned` jobs. Other statuses answer the transition `409` with `to` = `assigned` (or `unassigned` for `null`).
17. **Jobs: `note` on `POST /admin/jobs/:id/status`** is not stored on the job (the job shape has no field for it). It goes into the audit summary.
18. **Jobs: admins can complete a job** whose checklist is unfinished. The checklist rule applies to `/admin/me/jobs` only, as §7.3 says.
19. **Jobs: order checks for creation** run `requiresInstallation` (`409` "Order does not require installation.") before the cancelled check.
20. **Staff:** the list is ordered by name. `GET /admin/staff/:id` counts `openJobs` as the engineer's jobs that are not completed or cancelled. `PUT` ignores `role` and `isActive`, and is audited as `user.update` (§7 lists no staff action).
21. **Notifications: read state** is stored as `notificationReads` rows (one per read notification, plus a `"<adminId>:*"` watermark for read-all), as the contract suggests. `POST /admin/notifications/:id/read` returns the notification with `read: true`.
22. **Notifications: `unreadCount`** counts every unread notification in the caller's audience, ignoring the `type` and `unread` filters.
23. **Settings: vacancy emails** are sent only when `vacancyEmails` is not empty. Vacancies had no earlier env recipient to fall back to.
24. **Worker email sender** moved from `src/index.js` into `src/email.js` (same function), so notifications and vacancies can send email.
