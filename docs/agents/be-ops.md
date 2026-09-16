# BE-2 status: Commerce & Operations (`agents/be-ops`)

Base: `v3-agents-base` @ `d48b482`. Contract: `docs/agents/API_CONTRACT_V3.md` on `agents/be-supervisor` (c737453). Endpoint reference: the "Commerce and operations (v3)" section at the end of `backend/docs/API.md`.

## Progress

| Contract item | Status |
| --- | --- |
| §4 Catalog: categories, products, package `items` | Done (aligned with the contract) |
| §5 Inventory: stock view, adjustments, movements, low-stock alerts and check | Done (aligned; `low_stock` notification lands with §8) |
| §6 Orders and fulfilment (D4a) | Done (`new_order` notification lands with §8) |
| §7 Installation jobs, engineer endpoints, staff | Not started |
| §8 Settings and notifications | Not started |
| §9 Dashboard KPIs | Not started |

Commits:

- a8da77f: catalog (pre-contract)
- 68e2c5c: inventory (pre-contract)
- 05498dd: catalog and inventory aligned with the contract
- bd75e45: adopted BE-1's sanitiser, lint tooling and test globs
- orders (§6): the commit that adds this file version

## Integration with BE-1

- **Capabilities.** `backend/shared/capabilities.js`, `backend/middleware/capabilities.js` and `backend/cloudflare/src/capabilities.js` are BE-1's files (checked out from `agents/be-platform` 391a979), unchanged. There are no shims.
- **Test harness.** Also taken unchanged from BE-1: `backend/test/helpers/express.js`, `backend/cloudflare/test/helpers/{d1,worker}.js`, and BE-1's `backend/cloudflare/src/http.js` (`data: null`). `app.js` uses BE-1's `isEntryPoint` block, and `package.json`/`package-lock.json` are BE-1's (explicit test globs, `lint`, `engines`).
- **Rich text.** `backend/shared/richText.js`, its fixtures and `backend/test/richText.test.js` are BE-1's files (01b22f3), unchanged. BE-2 no longer has a sanitiser of its own: the earlier `sanitizeHtml.js` was removed in 05498dd and BE-2's first `richText.js` was replaced in bd75e45. Products call `sanitizeRichText` with the same rules as vacancies. BE-1's `cloudflare/test/richText.test.js` needs the vacancies module, so it is not on this branch; `cloudflare/test/catalog.test.js` instead stores every fixture through `POST /admin/products`.
- **Lint.** `npm run lint` (BE-1's ESLint config and `check-chars`) passes. BE-1's fixes for pre-existing lint findings are applied line for line, so they merge cleanly.
- **Base `controllers/vacancies.js`.** It imports the shared sanitiser, because `sanitize-html` was removed from `package.json`. BE-1's rewrite replaces this file at integration.
- **Routing.**
  - Express admin routes are on `backend/routes/ops.js` (`opsAdminRouter`), mounted inside `routes/admin.js` after `adminAuth`, and public routes on `opsPublicRouter`, mounted in `routes/public.js`.
  - Express `GET/PUT/DELETE /admin/orders[/:id]` stay on `routes/admin.js` with changed controllers (`controllers/orders.js`). Their capability gating comes from BE-1's `routes/admin.js`.
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
- **Migrations.**
  - `0010_catalog.sql`: slug and SKU unique indexes.
  - `0012_inventory_jobs.sql`: `batch_guard`, plus movement and job indexes.
  - `0011_orders_fulfilment.sql`: order backfill (§6.1). Tested on a seeded database at `0010`: the migrated rows equal the read-time normalisation and are idempotent.
  - `0013` comes with §8.
- **Tests** (`cd backend && npm test`):
  - Scenarios: `backend/test/scenarios/{catalog,inventory,orders}.js`, plus `opsKit.js` for admin and record seeding, email capture (nodemailer and Resend) and masking.
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
7. **Express low-stock digest timer** (24 hours, in `start()`) is the Express counterpart of the optional Worker cron.
8. **Unknown fields** in request bodies are ignored.
9. **Orders: `stockCommittedAt`** is set only when the `pending → processing` move actually changed stock, meaning at least one line maps to package items.
10. **Orders: the write guard** is the stored `fulfillmentStatus` and `paymentStatus` (`assignedEngineerId` for assignment), not the whole record. Concurrent note edits are last-write-wins; concurrent status changes answer `409`, so stock is never committed twice (tested with three racing transitions).
11. **Orders: stock reversal on cancel** restores the net quantity of the order's `sale` minus `sale_reversal` movements, so no separate commitment record is stored.
12. **Orders: removed `sortOrder`.** Admin order responses no longer include `sortOrder`. Only the Worker stored it, so this was a parity difference in existing endpoints.
13. **Orders: validation messages.** `400` `"Fulfilment status is not valid."`, `"Payment status is not valid."` and `"requiresInstallation must be true or false."` (filter). A missing `engineerId` answers `"Assignee must be an active engineer."`.
14. **Orders: repeated transitions.** `mark-paid` on a paid order and cancelling a cancelled order are `200` no-ops, as §6.2 says for the same value.
15. **Express order routes on this branch** are not capability-gated until BE-1's `routes/admin.js` merges in. The Worker gates them already. The parity scenarios therefore only exercise non-superadmin roles on the new order routes.
