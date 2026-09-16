# BE-2 status: Commerce & Operations (`agents/be-ops`)

Branch cut from `v3-agents-base` @ d48b482. No `API_CONTRACT_V3.md` or BE-1 `requireCapability` existed when this work started, so everything here is coded against PLATFORM_PLAN §1 and decision D4a. SUP-BE's contract wins where it differs.

## Progress

| Item | Status | Commit |
| --- | --- | --- |
| 1. Categories and products, package components | Done | see `git log` |
| 2. Inventory, movements, low-stock email | Not started | |
| 3. Order fulfilment | Not started | |
| 4. Installation jobs and staff profiles | Not started | |
| 5. Settings and notifications | Not started | |
| 6. Dashboard KPIs | Not started | |

## How it is built

- **Shared logic** lives in `backend/shared/` (pure ES modules, no dependencies): validation, sanitiser, capability map, transitions, serializers. Express and the Worker both import it, so messages and response shapes match by construction. Shared errors carry `statusCode` and `expose: true`; the Worker's `errorResponse` now exposes them like `ApiError`.
- **Storage.** New collections go in the existing stores. Express uses the JSON file store or Mongo, with model names prefixed `Ops*` to avoid the `backend/models/*` clash. The Worker uses the D1 `records` table.
- **Capabilities.** Temporary shims with BE-1's signature: `backend/middleware/capabilities.shim.js` (`requireCapability(...caps)` middleware) and `backend/cloudflare/src/capabilities.shim.js` (`requireCapability(admin, ...caps)`, throws 403). Role map: `backend/shared/capabilities.js`. `super_admin` and the static token count as superadmin; unknown roles get nothing. At integration, swap the imports for BE-1's implementation and delete the shims.
- **Migrations.** BE-2 uses `0010+`.
- **Tests.** Run `cd backend && npm test`. Each module test runs the same scenario against Express (temp JSON store) and the Worker (`fetch` against a `node:sqlite` D1 stand-in with every migration applied), then compares response shapes. Mongo mode is not covered.
- `app.js` exports `app` and skips `start()` when `BACKEND_NO_LISTEN=true`.

## Endpoints (item 1)

Errors follow the existing `{ success: false, message }` shape. 403 message: `You do not have permission to perform this action.`

### Public

| Method | Path | Notes |
| --- | --- | --- |
| GET | `/categories` | Active categories: `{ id, name, slug, parentId, description, imageUrl, sortOrder }` |
| GET | `/categories/:idOrSlug` | 404 when inactive |
| GET | `/products?category=<idOrSlug>` | Active products. The category filter includes descendant categories; unknown category is 404 |
| GET | `/products/:idOrSlug` | 404 unless `status` is `active` |

Public product: `{ id, sku, name, slug, categoryId, category: { id, name, slug } | null, brand, descriptionHtml, attributes, price, currency, images, tags, inStock, sortOrder }`. `costPrice`, `stockQuantity` and `reorderLevel` are never public.

### Admin

| Method | Path | Capability |
| --- | --- | --- |
| GET | `/admin/categories` | `catalog:read` |
| POST | `/admin/categories` | `catalog:write` |
| PUT | `/admin/categories/:id` | `catalog:write` |
| DELETE | `/admin/categories/:id` | `catalog:write` (409 if it has subcategories or products) |
| GET | `/admin/products` | `catalog:read` |
| GET | `/admin/products/:id` | `catalog:read` |
| POST | `/admin/products` | `catalog:write` |
| PUT | `/admin/products/:id` | `catalog:write` |
| DELETE | `/admin/products/:id` | `catalog:write` (409 if a package uses it) |

Admin lists return the stored records.

**Category body**

- `name` (required, ≤100)
- `slug`: optional. It is normalised and made unique with `-2`, `-3`, ...
- `parentId`: id or null. It must exist and must not create a cycle.
- `description` (≤2000)
- `imageUrl`: https URL or a `/path`
- `isActive`, `sortOrder`

**Product body**

- `sku` (required): stored upper-case, `[A-Z0-9._-]`, ≤64, unique (409).
- `name` (required, ≤150), `slug`
- `categoryId`: id or null
- `brand`
- `descriptionHtml`: sanitised server-side by `backend/shared/sanitizeHtml.js` (allowlist; links are forced to `rel="noopener noreferrer nofollow"`)
- `attributes`: object of up to 50 entries; values are stored as strings
- `price` (required on create, ≥0), `costPrice`
- `currency`: always `NGN`
- `stockQuantity`: create only. On update, a value different from the stored one is rejected with 400; use stock adjustments (item 2).
- `reorderLevel`: integer, or null to use the settings default
- `images`: up to 20 URLs; `tags`: up to 20
- `status`: `active`, `hidden` or `archived`. `isActive` mirrors `status === "active"`.
- `sortOrder`

On update, absent optional fields are kept, and `null` clears them.

**Packages** accept `components: [{ productId, quantity }]` on admin create and update (quantity 1–1000, duplicates merged, products must exist). Public `/packages` responses are unchanged.

**D1:** migration `0010_catalog.sql` adds a unique index on product SKU and on category/product slugs.
