# BE-2 status: Commerce & Operations (`agents/be-ops`)

Base: `v3-agents-base` @ `d48b482`. Contract: `docs/agents/API_CONTRACT_V3.md` on `agents/be-supervisor` (c737453). Endpoint reference: the "Commerce and operations (v3)" section at the end of `backend/docs/API.md`.

## Progress

| Contract item | Status |
| --- | --- |
| §4 Catalog: categories, products, package `items` | Done (aligned with the contract) |
| §5 Inventory: stock view, adjustments, movements, low-stock alerts and check | Done (aligned; `low_stock` notification lands with §8) |
| §6 Orders and fulfilment (D4a) | Not started |
| §7 Installation jobs, engineer endpoints, staff | Not started |
| §8 Settings and notifications | Not started |
| §9 Dashboard KPIs | Not started |

Commit history: items 1–2 were first built before the contract existed (a8da77f, 68e2c5c), then aligned with it in the commit that adds this file version.

## Integration with BE-1

- **Capabilities.** `backend/shared/capabilities.js`, `backend/middleware/capabilities.js` and `backend/cloudflare/src/capabilities.js` are BE-1's files (checked out from `agents/be-platform` 391a979), unchanged. There are no shims.
- **Test harness.** Also taken unchanged from BE-1: `backend/test/helpers/express.js`, `backend/cloudflare/test/helpers/{d1,worker}.js`, and BE-1's `backend/cloudflare/src/http.js` (`data: null`). `app.js` uses BE-1's `isEntryPoint` block, and `package.json` matches BE-1's (`"test": "node --test"`, `engines`).
- **Rich text.** BE-2 owns `backend/shared/richText.js` (`sanitizeRichText`) and `backend/shared/__fixtures__/richText.json`, and both test suites run the fixtures. BE-1 should import it for vacancies rather than write another one.
- **Routing.** New Express admin routes are on `backend/routes/ops.js` (`opsAdminRouter`), mounted inside `routes/admin.js` after `adminAuth`. New public routes are on `opsPublicRouter`, mounted in `routes/public.js`. The Worker dispatches to `backend/cloudflare/src/ops/*` from `route()` in `src/index.js`.
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
  - `0011_orders_fulfilment.sql` comes with §6, and `0013` with §8.
- **Tests** (`cd backend && npm test`):
  - Scenarios: `backend/test/scenarios/{catalog,inventory}.js`, plus `opsKit.js` for admin seeding, email capture (nodemailer and Resend) and masking.
  - Runners: `backend/test/*.test.js` (Express), `backend/cloudflare/test/*.test.js` (Worker) and `backend/test/parity/*.parity.test.js`.
  - `backend/test/sourceHygiene.test.js` fails on any control or format character in backend sources.
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
