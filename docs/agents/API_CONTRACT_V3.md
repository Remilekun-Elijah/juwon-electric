# Juwon Electric API Contract v3

Owner: SUP-BE (`agents/be-supervisor`). Status: **v1, binding for BE-1, BE-2, FE-1, FE-2.**
Base: `v3-agents-base` @ `d48b482`. Ledger decisions D1–D6 in `AGENT_WORKLOAD_SPLIT.md` §4 apply; this document settles D4a.

If an implementer needs to deviate, add a note to their `docs/agents/<agent-id>.md` status file and ask SUP-BE. Do not deviate without that. The existing behaviour described in `backend/docs/API.md` still applies unless this document changes it.

---

## 0. Global conventions (unchanged from the existing API)

### 0.1 Prefixes
- Every public route is served at `/<path>` **and** `/api/<path>`.
- Every admin route is served at `/admin/<path>` **and** `/api/admin/<path>`, and gets `Cache-Control: no-store`.
- Express: new public routes go on `routes/public.js` (or a router mounted at both `/` and `/api`). New admin routes go on `routes/admin.js` (or routers mounted inside it, **after** `router.use(adminAuth)`). **`app.use('/vacancies', vacanciesRouter)` is removed.** It is mounted only at `/vacancies`, not `/api/vacancies`, and it bypasses admin auth.
- Worker: new routes go in `handlePublic` / `handleAdmin` (or modules called from them). Path normalisation (the `/api` alias) already happens before routing.

### 0.2 Envelope
Success (`services/http.js` `ok`/`created`, Worker `ok`/`created`):
```json
{ "success": true, "message": "Products retrieved.", "data": <payload> }
```
Error (the `ApiError` → error handler in both runtimes):
```json
{ "success": false, "message": "Human readable sentence.", "details": <optional> }
```
- `message` is always a full sentence ending in `.`. FE shows it as-is.
- `details` is only used where this contract says so (for example, insufficient stock).
- Status codes: `400` validation, `401` not signed in (`"Admin authorization is required."`), `403` signed in without the capability (§1.4), `404` `"<Label> not found."`, `409` state or uniqueness conflict, `413`, `415`, `429`, `500`, `503`. These match the existing codes.

### 0.3 Pagination (new admin list endpoints)
Query: `page` (1–100000, default 1), `limit` (positive integer, default 50, capped at 100). Invalid values return `400 "page must be a whole number from 1 to 100000."` / `400 "limit must be a positive whole number."`. These are the same messages as `/admin/audit-logs`. Reuse its parser, and move it into a shared helper.

Paged response `data`:
```json
{ "items": [...], "page": 1, "limit": 50, "total": 123 }
```
Endpoints marked **(paged)** use this shape. Endpoints marked **(array)** return a bare array in `data`. Existing endpoints keep their current shape.

### 0.4 Records
- `id`: a server-generated string (a UUID for new collections). Clients must treat it as opaque. Seeded admins have non-UUID ids such as `superadmin-…`.
- Timestamps: ISO-8601 UTC strings with milliseconds (`new Date().toISOString()`): `createdAt`, `updatedAt`, plus domain times such as `postedAt`, `scheduledAt`.
- Money: JSON numbers in NGN (naira, not kobo). `currency` is always `"NGN"`.
- `:id` path params on new modules resolve **by id, then slug** (products also by SKU when the value matches no id or slug). Writes then target the resolved record id. This is the existing convention.
- Unknown body fields are ignored (not stored). Mass assignment is forbidden: never spread `req.body` into a record.
- Text validation reuses `services/validators.js` / `cloudflare/src/validation.js` (trim, type, length, control and format characters) with the existing messages (`"<Label> must be text."`, `"<Label> must be N characters or fewer."`, `"<Label> contains invalid characters."`).
- URL fields reuse the existing rule: an `https://` URL or a path starting with a single `/`.
- Slug fields reuse the existing normalisation (`normalizeSlug`). Empty → derived from name/title, collisions → `-2`, `-3`…, UUID-shaped → `400 "Slug must not look like an id."`.

### 0.5 Rich text (D6)
- A single pure-JS sanitiser lives in **`backend/shared/richText.js`** and is imported by **both** Express and the Worker. It has no Node built-ins and no DOM. Signature: `sanitizeRichText(html: string): string`.
- Allowlist: `p br strong b em i u s blockquote ul ol li h2 h3 h4 a`. On `a`, only `href` is kept. `href` must be `https:`, `http:` or `mailto:`, otherwise the attribute is dropped. The server forces `rel="noopener noreferrer nofollow"` and `target="_blank"`. All other tags are unwrapped (their text is kept), except `script style iframe object embed noscript template svg math`, which are removed together with their content. All other attributes are removed, including `style`, `class` and `on*`. Comments are removed. Entities are preserved or escaped so the output is well-formed.
- No `img` in this round (uploads are out of scope). Product and category images are URL fields, not rich text.
- Fields: `descriptionHtml` (vacancies, products), max **50,000 characters after sanitisation** (`400 "Description must be 50000 characters or fewer."`). Input over 100 KB is already rejected with `413` by the body limit.
- Fixtures: `backend/shared/__fixtures__/richText.json` holds `[{ "name", "input", "output" }]`. The Express test suite and the Worker test suite must both run it. Include at least: script tag, `onerror` attribute, `javascript:` href, `data:` href, nested disallowed tags, unclosed tags, an entity-encoded `javascript:`, uppercase tags and attributes, a `style` attribute, and an `<a>` with an existing `rel`/`target`.
- If `sanitize-html` is kept in Express for any other reason, it must **not** be used for these fields, because the outputs would differ between runtimes.

---

## 1. Roles and capabilities (D4) — owner BE-1

### 1.1 Roles
`superadmin | admin | inventory | sales | engineer | hr | support`

- The PRD's `customer` role is **not** an admin role. There are no customer accounts this round, and `role: "customer"` is rejected.
- Legacy value: stored `super_admin` (the current seed in both runtimes) is read as `superadmin` everywhere and **returned as `superadmin`**. Migration `0007` rewrites D1 rows. Express normalises on read and rewrites on the next write. The seeders now write `superadmin`.
- An unknown or missing role gets **no capabilities** (fail closed). It can still sign in and call `GET /admin/auth/me`, and gets `403` everywhere else.
- The static `ADMIN_TOKEN` acts as `superadmin` (all capabilities), as it does today.

### 1.2 Capability map (the single source of truth)
Lives in **`backend/shared/capabilities.js`** (pure JS, imported by Express and the Worker):

```js
export const ROLES = ["superadmin","admin","inventory","sales","engineer","hr","support"];
export const CAPABILITIES = { /* capability -> roles[] as in the table below */ };
export const normalizeRole = (role) => role === "super_admin" ? "superadmin" : role;
export const capabilitiesFor = (role) => /* sorted string[] */;
export const hasCapability = (roleOrAdmin, capability) => boolean;
```

| Capability | superadmin | admin | inventory | sales | engineer | hr | support | Guards |
|---|:-:|:-:|:-:|:-:|:-:|:-:|:-:|---|
| `dashboard:read` | ✓ | ✓ | ✓ | ✓ | | ✓ | ✓ | `GET /admin/dashboard` |
| `audit:read` | ✓ | ✓ | | | | | | `GET /admin/audit-logs` |
| `users:read` | ✓ | ✓ | | | | | | `GET /admin/users*` |
| `users:manage` | ✓ | ✓ | | | | | | user create/update/role/deactivate (plus the escalation rule in §1.5) |
| `settings:read` | ✓ | ✓ | ✓ | ✓ | | ✓ | ✓ | `GET /admin/settings` |
| `settings:write` | ✓ | ✓ | | | | | | `PUT /admin/settings` |
| `content:read` | ✓ | ✓ | ✓ | ✓ | | | ✓ | admin GET packages/services/portfolio |
| `content:write` | ✓ | ✓ | | ✓ | | | | packages/services/portfolio/customer-segments writes |
| `products:read` | ✓ | ✓ | ✓ | ✓ | | | ✓ | admin GET products/categories |
| `products:write` | ✓ | ✓ | ✓ | | | | | product and category create/update/delete |
| `inventory:read` | ✓ | ✓ | ✓ | ✓ | | | | `GET /admin/inventory*` |
| `inventory:adjust` | ✓ | ✓ | ✓ | | | | | `POST /admin/inventory/adjustments`, low-stock check |
| `orders:read` | ✓ | ✓ | ✓ | ✓ | | | ✓ | `GET /admin/orders*`, `GET /admin/carts` |
| `orders:update` | ✓ | ✓ | | ✓ | | | | order PUT, fulfilment, payment, assign engineer |
| `orders:delete` | ✓ | ✓ | | | | | | `DELETE /admin/orders/:id` |
| `leads:read` | ✓ | ✓ | | ✓ | | | ✓ | GET contacts, newsletter |
| `leads:write` | ✓ | ✓ | | ✓ | | | ✓ | PUT/DELETE/reply for contacts and newsletter |
| `jobs:read` | ✓ | ✓ | | ✓ | | | ✓ | `GET /admin/jobs*` |
| `jobs:assign` | ✓ | ✓ | | ✓ | | | | job create/update/assign/status/delete |
| `jobs:update-own` | ✓ | | | | ✓ | | | `/admin/me/jobs*` (scoped to `req.admin.id`) |
| `staff:read` | ✓ | ✓ | | ✓ | | ✓ | | `GET /admin/staff*` |
| `staff:write` | ✓ | ✓ | | | | ✓ | | `PUT /admin/staff/:id` |
| `vacancies:read` | ✓ | ✓ | | | | ✓ | | `GET /admin/vacancies*` |
| `vacancies:write` | ✓ | ✓ | | | | ✓ | | vacancy create/update/delete/publish/unpublish |
| `notifications:read` | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | `/admin/notifications*` (audience-filtered, §6.6) |

`superadmin` is defined as **every capability**, including ones added later. Implement it as a wildcard, not by listing.

Authenticated with no capability needed: `POST /admin/auth/logout`, `GET /admin/auth/me`, `/admin/reads*`. For `/admin/reads*`, the record types it touches are checked against `leads:read` (contacts) and `orders:read` (orders). A type the caller cannot read → `403`.

**Every existing admin route gets a capability as listed above.** This is part of BE-1 task 1, and the existing routes must not be left open to all roles.

### 1.3 Enforcement
- Express: `backend/middleware/capabilities.js` → `export const requireCapability = (...caps) => (req, res, next)`. It requires **all** listed caps. It runs after `adminAuth` and reads the role from `req.admin.role` (the **stored admin record**, loaded per request by `verifyAdminToken`) or from the static token. **The role in the token payload is never used for authorisation.** Neither is any header (`X-User-Role`, `X-User-Id`) or body field. `middleware/auth.js` (`requireAdminOrHR`) is deleted.
- Worker: `backend/cloudflare/src/capabilities.js` → `export const requireCapability = (admin, ...caps)`, which throws `ApiError(403, …)`. It is called at the top of every admin branch, after `requireAdmin`.
- **BE-2 shim rule.** Until BE-1 lands, BE-2 may create these three files (`backend/shared/capabilities.js`, `backend/middleware/capabilities.js`, `backend/cloudflare/src/capabilities.js`) with exactly these paths, exports and the table above, and a first line `// SHIM (BE-2): replaced by BE-1 at integration.`. At integration BE-1's versions win. Signatures must match.
- A role change takes effect on the admin's next request, because the role is read from the stored record. Deactivation revokes all sessions.

### 1.4 Denial
`403 { "success": false, "message": "You do not have permission to perform this action." }`
The body is the same for every capability, so the response does not reveal which capability was missing. Denials are **not** audited, which avoids log flooding.

### 1.5 Admin identity in login and session
- `POST /admin/auth/login` → `200 "Login successful."`, `data: { token, admin: AdminSelf }` (additive `capabilities`).
- **New** `GET /admin/auth/me` (auth only) → `200 "Session retrieved."`, `data: { admin: AdminSelf }`. FE calls this on app load and after any `403` to refresh nav.

```ts
type AdminSelf = {
  id: string; name: string; email: string;
  role: Role;                 // normalised, never "super_admin"
  capabilities: string[];     // sorted; the full list for superadmin/static token
  isStatic?: true;            // only for ADMIN_TOKEN
};
```
FE hides nav by `capabilities`, **never by `role`**. It is UI-only, and the server enforces.

Escalation rules (users:manage):
- Only a `superadmin` may create, update, change the role of, deactivate or reactivate an account whose current **or** target role is `superadmin` or `admin`. Otherwise `403` (same message).
- No one may change their own role or deactivate themselves → `409 "You cannot change your own role or status."`.
- The last active `superadmin` cannot be demoted or deactivated → `409 "At least one active superadmin is required."`.

---

## 2. Admin users (BE-1)

`AdminUser` (never includes `passwordHash`, reset tokens or sessions):
```ts
type AdminUser = {
  id: string; name: string; email: string; role: Role; isActive: boolean;
  phone: string | null;
  profile: StaffProfile;       // §7.4, defaults to empty arrays / nulls
  lastLoginAt: string | null; createdAt: string; updatedAt: string;
};
```

| Method | Path | Cap | Body | Success |
|---|---|---|---|---|
| GET | `/admin/users?page&limit&role&isActive&q` | `users:read` | – | 200 `"Users retrieved."` **(paged)** `AdminUser`, `createdAt` desc. `q` = case-insensitive substring of name/email (≤100). `role` must be a valid role (`400 "Role is not valid."`). `isActive` is `true`/`false`. |
| GET | `/admin/users/:id` | `users:read` | – | 200 `"User retrieved."` `AdminUser`. 404 `"User not found."` |
| POST | `/admin/users` | `users:manage` | `{ name, email, role, phone? }` | 201 `"User created."` `AdminUser`. An invite reset token is emailed with the existing reset template, and the account has no usable password until it is reset. 409 `"An account with this email already exists."` |
| PUT | `/admin/users/:id` | `users:manage` | `{ name?, phone? }` | 200 `"User updated."` Only sent fields are written. |
| POST | `/admin/users/:id/role` | `users:manage` | `{ role }` | 200 `"Role updated."` `AdminUser` |
| POST | `/admin/users/:id/deactivate` | `users:manage` | `{}` | 200 `"User deactivated."`. Sets `isActive:false` and revokes all sessions. Idempotent. |
| POST | `/admin/users/:id/reactivate` | `users:manage` | `{}` | 200 `"User reactivated."` Idempotent. |

Validation: `name` 1–100, `email` uses the shared email rule and is lowercased, `phone` uses the existing phone rule or is `null`, `role` ∈ roles (`400 "Role is not valid."`). Invite emails and password resets reuse the existing flow and rate limits. Nothing else changes about login or reset.

Audit actions: `user.create`, `user.update`, `user.role_change` (summary includes `from → to`), `user.deactivate`, `user.reactivate`. Entity `user`. Add `user` (and every new entity below) to `AUDIT_ENTITIES` and the NotFound label maps in **both** runtimes.

---

## 3. Vacancies (BE-1)

```ts
type EmploymentType = "full-time" | "part-time" | "contract" | "internship" | "temporary";
type VacancyStatus = "draft" | "open" | "closed";
type Vacancy = {
  id: string; slug: string; title: string;
  department: string | null; location: string | null;
  employmentType: EmploymentType | null; salaryRange: string | null;
  descriptionHtml: string;            // sanitised (§0.5), "" allowed for draft
  requirements: string[]; responsibilities: string[];
  status: VacancyStatus;
  postedAt: string | null;            // first time it became open; never cleared
  closedAt: string | null;
  createdBy: { id: string; email: string } | null;   // from the session, never from the request
  createdAt: string; updatedAt: string;
};
type PublicVacancy = Omit<Vacancy, "createdBy" | "closedAt">;
```
Limits: `title` 1–150 (required), `slug` ≤120, `department` ≤100, `location` ≤100, `salaryRange` ≤100, `requirements` / `responsibilities` ≤30 items each, every item a single-line string of 1–300 characters (blank items dropped). `employmentType` invalid → `400 "Employment type is not valid."`, and `status` invalid → `400 "Status is not valid."`.

Default `status` is **`draft`** in every store. Delete is a **hard delete**, so the slug is freed. Slugs are unique across all vacancies (D1: a unique partial index, see §10).

### Public
| Method | Path | Success |
|---|---|---|
| GET | `/vacancies?department&employmentType` | 200 `"Vacancies retrieved."` **(array)** `PublicVacancy[]`, status `open` only, `postedAt` desc |
| GET | `/vacancies/:slug` | 200 `"Vacancy retrieved."` `PublicVacancy`. Resolves by slug, then id. Status other than `open` → 404 `"Vacancy not found."` (never reveal drafts) |

### Admin
| Method | Path | Cap | Body | Success |
|---|---|---|---|---|
| GET | `/admin/vacancies?status&q&page&limit` | `vacancies:read` | – | 200 `"Vacancies retrieved."` **(paged)** `Vacancy`, every status, `updatedAt` desc |
| GET | `/admin/vacancies/:id` | `vacancies:read` | – | 200 `"Vacancy retrieved."` |
| POST | `/admin/vacancies` | `vacancies:write` | Vacancy fields (not id/postedAt/closedAt/createdBy) | 201 `"Vacancy created."`. If created with `status: "open"`, `postedAt` is set. |
| PUT | `/admin/vacancies/:id` | `vacancies:write` | partial | 200 `"Vacancy updated."` A `status` change follows the transitions below. |
| POST | `/admin/vacancies/:id/publish` | `vacancies:write` | `{}` | 200 `"Vacancy published."` → `open` |
| POST | `/admin/vacancies/:id/unpublish` | `vacancies:write` | `{}` | 200 `"Vacancy unpublished."` → `draft` |
| DELETE | `/admin/vacancies/:id` | `vacancies:write` | – | 200 `"Vacancy deleted."` with the deleted record |

Transitions: `draft→open`, `open→draft` (unpublish), `open→closed`, `closed→open`, `closed→draft`. `draft→closed` → `409 "Cannot change vacancy status from draft to closed."`. The same status is a no-op (200). Publishing sets `postedAt` only when it is null. Closing sets `closedAt`. Reopening clears `closedAt`.

Audit: `vacancy.create`, `vacancy.update`, `vacancy.publish`, `vacancy.unpublish`, `vacancy.close`, `vacancy.delete`. The first publish emits a `vacancy_posted` notification (§6.6) through `notify()`. If BE-2's helper is not on the branch yet, BE-1 leaves a single `// TODO(integration): notify vacancy_posted` at the call site.

Removed: `POST/PUT/DELETE /vacancies*`. They now fall through to `404 "Route not found."`. Delete `middleware/auth.js`, `workers/d1-write`, `backend/d1-sync` and `backend/d1-schemas`.

---

## 4. Catalog (BE-2) — D5

### 4.1 Categories
```ts
type CategoryAttribute = { key: string; label: string; type: "text" | "number" | "boolean"; unit: string | null };
type Category = {
  id: string; slug: string; name: string; parentId: string | null;
  description: string | null; imageUrl: string | null;
  attributes: CategoryAttribute[];   // schema for product.attributes in this category
  isActive: boolean; sortOrder: number; createdAt: string; updatedAt: string;
};
```
Limits: `name` 1–100 (required), `description` ≤1000 (plain, multiline), `imageUrl` uses the URL rule, `attributes` ≤30, `key` `^[A-Za-z][A-Za-z0-9_]{0,63}$` and unique within the category, `label` 1–100, `unit` ≤20. `parentId` must exist (`400 "Parent category not found."`) and must not create a cycle (`400 "A category cannot be its own ancestor."`). `sortOrder` uses the existing rule.

| Method | Path | Cap | Success |
|---|---|---|---|
| GET | `/categories` | public | 200 `"Categories retrieved."` **(array)** active only, `sortOrder, name`. FE builds the tree from `parentId`. |
| GET | `/categories/:id` | public | 200 `"Category retrieved."` Inactive → 404 `"Category not found."` |
| GET | `/admin/categories` | `products:read` | **(array)** all |
| POST | `/admin/categories` | `products:write` | 201 `"Category created."` |
| PUT | `/admin/categories/:id` | `products:write` | 200 `"Category updated."` partial |
| DELETE | `/admin/categories/:id` | `products:write` | 200 `"Category deleted."`. `409 "Category has subcategories or products."` if it is referenced |

### 4.2 Products
```ts
type ProductStatus = "active" | "hidden" | "archived";
type Product = {
  id: string; sku: string; slug: string; name: string;
  categoryId: string | null; brand: string | null;
  descriptionHtml: string;                       // §0.5
  attributes: Record<string, string | number | boolean>;
  price: number; costPrice: number | null; currency: "NGN";
  stockQuantity: number; reorderLevel: number; lowStock: boolean;   // lowStock = stockQuantity <= reorderLevel
  images: string[]; status: ProductStatus; tags: string[];
  createdAt: string; updatedAt: string;
};
type PublicProduct = Omit<Product, "costPrice" | "stockQuantity" | "reorderLevel" | "lowStock"> & {
  inStock: boolean; category: { id: string; slug: string; name: string } | null;
};
```
Limits: `sku` 1–64 `^[A-Za-z0-9][A-Za-z0-9._-]*$`, stored as sent, **unique case-insensitively** → `409 "Another product already uses SKU <sku>."`. `name` 1–150. `brand` ≤100. `attributes` ≤50 keys (the key rule above), with values that are a string ≤200, a finite number or a boolean. `price` >0 and ≤1,000,000,000 (required). `costPrice` ≥0 or null. `currency` is omitted or `"NGN"`. `reorderLevel` is an integer 0–1,000,000 (default 0). `images` ≤10 URLs (URL rule). `tags` ≤20, each 1–50. `categoryId` must exist or be null (`400 "Category not found."`).

Stock is **not** writable through product create/update, except `stockQuantity` on **create** (an integer 0–1,000,000, default 0). A non-zero value writes an `initial` movement. `stockQuantity` in a PUT body that differs from the stored value → `400 "Use an inventory adjustment to change stock."`. The same value is ignored.

| Method | Path | Cap | Success |
|---|---|---|---|
| GET | `/products?category&q&page&limit` | public | 200 `"Products retrieved."` **(paged)** `PublicProduct`, status `active` only. `category` = id or slug (including descendants). |
| GET | `/products/:id` | public | 200 `"Product retrieved."` (id or slug). A status other than active → 404 `"Product not found."` |
| GET | `/admin/products?category&status&stock=low\|out&q&page&limit` | `products:read` | **(paged)** `Product`, `updatedAt` desc |
| GET | `/admin/products/:id` | `products:read` | `Product` (id, slug or SKU) |
| POST | `/admin/products` | `products:write` | 201 `"Product created."` |
| PUT | `/admin/products/:id` | `products:write` | 200 `"Product updated."` partial |
| DELETE | `/admin/products/:id` | `products:write` | 200 `"Product deleted."`. `409 "Product is used by a package."` if any package item references it. Movements keep their denormalised `sku`/`productName`. |

Audit: `category.create|update|delete`, `product.create|update|delete`.

### 4.3 Packages reference products (additive, non-breaking)
- Packages gain an optional `items: [{ productId: string, quantity: integer 1–1000, note: string|null ≤200 }]` (≤50). On write every `productId` must exist → `400 "Product not found."`.
- `GET /packages` and `GET /packages/:id` responses stay **byte-for-byte compatible** for packages without `items`. When `items` exist, the response adds `items: [{ productId, quantity, note, name, slug, sku }]`. Nothing else changes, and pricing still comes from package options.
- No automatic data migration of package kits text into products this round, because the text is free-form. BE-2 documents a manual mapping path. `options[].kits` stays.

---

## 5. Inventory (BE-2)

```ts
type MovementReason = "initial" | "restock" | "adjustment" | "damage" | "return" | "correction" | "sale" | "sale_reversal";
type InventoryMovement = {
  id: string; productId: string; sku: string; productName: string;
  change: number;            // non-zero integer
  stockBefore: number; stockAfter: number;
  reason: MovementReason;
  referenceType: "order" | null; referenceId: string | null;
  note: string | null;
  createdBy: { id: string; email: string } | null;   // null for system (for example, order transitions by static token → "static-token")
  createdAt: string;
};
```

| Method | Path | Cap | Body | Success |
|---|---|---|---|---|
| GET | `/admin/inventory?stock=all\|low\|out&category&q&page&limit` | `inventory:read` | – | 200 `"Inventory retrieved."` **(paged)** `{ productId, sku, name, categoryId, stockQuantity, reorderLevel, lowStock, status, updatedAt }`, sorted with low stock first, then name |
| POST | `/admin/inventory/adjustments` | `inventory:adjust` | `{ productId, change, reason, note? }` | 201 `"Stock adjusted."` `data: { movement, product }` |
| GET | `/admin/inventory/movements?productId&reason&from&to&page&limit` | `inventory:read` | – | 200 `"Movements retrieved."` **(paged)**, `createdAt` desc |
| POST | `/admin/inventory/low-stock-check` | `inventory:adjust` | `{}` | 200 `"Low-stock check complete."` `data: { lowStock: number, emailed: boolean }` |

Adjustment rules: `change` is a non-zero integer with |change| ≤1,000,000 (`400 "Change must be a non-zero whole number."`). `reason` ∈ `restock|adjustment|damage|return|correction` (manual; `400 "Reason is not valid."`). `note` ≤500. A result below 0 → `409 "Stock cannot go below zero."`.

**Atomicity (required):** the stock update and the movement insert must not lose updates under concurrency.
- Worker: a conditional `UPDATE records SET data = json_set(...) WHERE id=? AND collection='products' AND json_extract(data,'$.stockQuantity') + ? >= 0`, checking `changes`, and the movement insert, in one `env.DB.batch([...])`.
- Express Mongo: `findOneAndUpdate({ id, stockQuantity: { $gte: -change } }, { $inc })`. JSON store: under the store lock.

`from`/`to` are ISO dates or date-times (`400 "from must be a valid date."`).

Stock decrement (D4a): see §6.3. Stock is **never** touched by public `POST /order`.

Low stock:
- It fires when a movement makes `stockAfter <= reorderLevel` while `stockBefore > reorderLevel` (a crossing), with `reorderLevel > 0` or `stockAfter === 0`. It creates a `low_stock` notification and emails `settings.notifications.lowStockEmails` (if non-empty and `settings.inventory.lowStockAlertsEnabled`).
- Express uses the existing `sendMail`. The Worker uses the existing Resend `sendNotification` path in `ctx.waitUntil`. Email failure never fails the adjustment.
- `low-stock-check` sends one digest of all current low-stock active products. The Worker may also call it from a `scheduled` cron (optional; document it in the wrangler config if added).

Audit: `inventory.adjust` (entity `product`, summary includes change and reason).

---

## 6. Orders & fulfilment (BE-2) — **D4a settled**

### 6.1 Enums
```ts
type FulfillmentStatus = "pending" | "processing" | "out_for_delivery" | "delivered" | "installed" | "cancelled";
type PaymentStatus     = "pending" | "partial" | "paid" | "failed" | "refunded";
type LegacyOrderStatus = "pending" | "completed" | "cancelled";   // derived, read-only
```
**Decision (supersedes the D4a proposal on one point):** adopt the plan's `paymentStatus` values **and keep `partial`**. Solar installs are routinely paid by deposit, and collapsing `partial` into `pending` would lose real money state. So:

| Stored `paymentStatus` (legacy) | Backfilled to | `legacyPaymentStatus` |
|---|---|---|
| `unpaid` | `pending` | `"unpaid"` |
| `partial` | `partial` | not set |
| `paid` | `paid` | not set |
| `refunded` | `refunded` | not set |
| missing / other | `pending` | original value (or `null`) |

| Stored `status` (legacy) | `fulfillmentStatus` backfill |
|---|---|
| `pending` / missing / other | `pending` |
| `completed` | `delivered` |
| `cancelled` | `cancelled` |

New order fields: `fulfillmentStatus`, `requiresInstallation` (bool, default `false`), `assignedEngineerId` (string|null), `paidAt` (string|null), `stockCommittedAt` (string|null), `legacyPaymentStatus` (only where the backfill changed it). All of these are **always present** in admin responses (defaults are applied at read time in both runtimes, so pre-backfill records and post-backfill records serialise identically).

`status` becomes **derived and kept in sync on every write**: `cancelled` if `fulfillmentStatus = cancelled`, `completed` if `delivered|installed`, otherwise `pending`. It stays in responses for the Vite admin and the existing dashboard.

Public `POST /order` now stores `status: "pending"`, `paymentStatus: "pending"`, `fulfillmentStatus: "pending"`, `requiresInstallation: false`, `assignedEngineerId: null`. **The public response shape is otherwise unchanged.** Update `backend/docs/API.md`, which says `unpaid`.

Backfill:
- D1: migration `0011_orders_fulfilment.sql` (idempotent `UPDATE ... WHERE json_extract(data,'$.fulfillmentStatus') IS NULL`).
- Express: normalise at read, and persist on next write. A one-off script `backend/scripts/backfill-orders.js` is optional.

### 6.2 Transitions
Fulfilment (anything not listed → `409 "Cannot change fulfilment status from <from> to <to>."`; the same value is a no-op):
```
pending          -> processing | cancelled
processing       -> out_for_delivery | delivered | cancelled
out_for_delivery -> delivered | cancelled
delivered        -> installed          (only if requiresInstallation, else 409 "Order does not require installation.")
installed        -> (terminal)
cancelled        -> (terminal)
```
Payment (the same value is a no-op):
```
pending  -> partial | paid | failed
partial  -> paid | refunded | failed
failed   -> pending | partial | paid
paid     -> refunded
refunded -> (terminal)
```
Invalid → `409 "Cannot change payment status from <from> to <to>."`. Entering `paid` sets `paidAt` (if null).

### 6.3 Stock effects (D4a)
- `pending → processing` **commits stock**. For each order line with a resolvable `packageId` whose package has `items`, the server decrements `product.stockQuantity` by `item.quantity × line.quantity`, aggregated per product. It writes `sale` movements (`referenceType:"order"`, `referenceId: order.id`) and sets `stockCommittedAt`.
  - All-or-nothing. If any product would go below zero → `409 "Insufficient stock to process this order."`, `details: [{ productId, sku, required, available }]`, and nothing is written.
  - Worker: a single `DB.batch` with conditional updates, rolled back by checking `changes` and throwing before commit, or by pre-checking inside the batch with guarded `UPDATE ... WHERE stock >= n`. If any guarded update reports 0 changes, compensate within the same request and return 409. BE-2 documents the exact approach and tests the concurrent case.
  - Lines without product mapping don't touch stock.
- `→ cancelled` when `stockCommittedAt` is set: `sale_reversal` movements restore stock and `stockCommittedAt` is cleared.
- Low-stock alerts (§5) apply to `sale` movements.

### 6.4 Endpoints
Existing endpoints keep their shapes, with the new fields added to order objects.

| Method | Path | Cap | Body | Success |
|---|---|---|---|---|
| GET | `/admin/orders?fulfillmentStatus&paymentStatus&engineerId&requiresInstallation&from&to` | `orders:read` | – | **(array, unchanged)** with optional filters |
| GET | `/admin/orders/:id` | `orders:read` | – | unchanged, plus `jobs: InstallationJobSummary[]` (`{ id, status, engineerId, scheduledAt }`) |
| PUT | `/admin/orders/:id` | `orders:update` | `{ note?, isActive?, requiresInstallation?, paymentStatus?, fulfillmentStatus?, status? }` | 200 `"Order updated."`. `paymentStatus`/`fulfillmentStatus` follow §6.2–6.3. `status` is accepted **only** when it equals the current derived value (the Vite admin sends it back); otherwise → `400 "Use fulfillmentStatus to change the order status."`. Input alias: `paymentStatus: "unpaid"` is read as `"pending"`. Setting `requiresInstallation:false` while non-cancelled jobs exist → `409 "Order has installation jobs."` |
| POST | `/admin/orders/:id/fulfillment` | `orders:update` | `{ status, note? }` | 200 `"Fulfilment status updated."` |
| POST | `/admin/orders/:id/mark-paid` | `orders:update` | `{ note? }` | 200 `"Order marked as paid."` (equivalent to `paymentStatus: "paid"`) |
| POST | `/admin/orders/:id/assign-engineer` | `orders:update` | `{ engineerId: string \| null }` | 200 `"Engineer assigned."` / `"Engineer unassigned."`. Requires `requiresInstallation` (`409 "Order does not require installation."`). The engineer must be an active admin with role `engineer` (`400 "Assignee must be an active engineer."`). This does **not** create a job. |
| DELETE | `/admin/orders/:id` | `orders:delete` | – | unchanged. `409 "Order has installation jobs."` if non-cancelled jobs exist. |

Audit: `order.update`, `order.fulfillment_change` (summary `from → to`), `order.payment_change`, `order.assign_engineer`, `order.delete`. `order.status_change` is kept as an alias action written **in addition** only when the derived `status` changes, so existing audit filters keep working. New order placement creates a `new_order` notification.

---

## 7. Installation jobs, engineers, staff (BE-2)

### 7.1 Job model
```ts
type JobStatus = "unassigned" | "assigned" | "in_progress" | "completed" | "cancelled";
type ChecklistItem = { id: string; label: string; done: boolean; doneAt: string | null; doneBy: string | null };
type InstallationJob = {
  id: string; orderId: string;
  order: { id: string; name: string; phoneNumber: string; deliveryAddress: string };  // denormalised at read
  engineerId: string | null;
  engineer: { id: string; name: string; email: string; phone: string | null } | null;
  scheduledAt: string | null; durationEstimateMinutes: number | null;
  address: string | null;                // defaults to the order deliveryAddress
  status: JobStatus;
  checklist: ChecklistItem[];            // ≤50, label 1–200
  photos: string[];                      // ≤20 URLs (URL rule)
  notes: string | null;                  // admin notes ≤2000
  completionNotes: string | null;        // engineer ≤5000
  startedAt: string | null; completedAt: string | null; cancelledAt: string | null;
  createdAt: string; updatedAt: string;
};
```
Transitions (anything else → `409 "Cannot change job status from <from> to <to>."`):
```
unassigned  -> assigned (only via assign) | cancelled
assigned    -> unassigned (via assign null) | in_progress | cancelled
in_progress -> completed | cancelled
completed, cancelled -> terminal
```
Engineers (via `/admin/me/jobs`) may only do `assigned → in_progress` and `in_progress → completed`.

On `completed`: if the order is `delivered` and every non-cancelled job for the order is `completed`, the order moves to `installed` automatically (audited as `order.fulfillment_change` by the acting admin).

On assign: set `job.engineerId`, set `order.assignedEngineerId` if null, and create a `job_assigned` notification for that engineer.

### 7.2 Admin job endpoints
| Method | Path | Cap | Body | Success |
|---|---|---|---|---|
| GET | `/admin/jobs?status&engineerId&orderId&from&to&page&limit` | `jobs:read` | – | 200 `"Jobs retrieved."` **(paged)**, `scheduledAt` asc (nulls last) then `createdAt` desc. `from`/`to` filter `scheduledAt`. |
| GET | `/admin/jobs/:id` | `jobs:read` | – | 200 `"Job retrieved."`, or 404 `"Job not found."` |
| POST | `/admin/jobs` | `jobs:assign` | `{ orderId, engineerId?, scheduledAt?, durationEstimateMinutes?, address?, checklist?: string[], notes? }` | 201 `"Job created."`. The order must exist, have `requiresInstallation`, and not be cancelled (`409 "Order does not require installation."` / `409 "Order is cancelled."`). The status is `assigned` if an engineer is given, otherwise `unassigned`. |
| PUT | `/admin/jobs/:id` | `jobs:assign` | `{ scheduledAt?, durationEstimateMinutes?, address?, checklist?: (string \| {id,label})[], notes? }` | 200 `"Job updated."`. The checklist is replaced; items with a known `id` keep `done`. A terminal job → `409 "Job is closed."` |
| POST | `/admin/jobs/:id/assign` | `jobs:assign` | `{ engineerId: string \| null }` | 200 `"Job assigned."` / `"Job unassigned."`. A non-engineer → `400 "Assignee must be an active engineer."` |
| POST | `/admin/jobs/:id/status` | `jobs:assign` | `{ status, note? }` | 200 `"Job status updated."` |
| DELETE | `/admin/jobs/:id` | `jobs:assign` | – | 200 `"Job deleted."`. Only `unassigned|assigned|cancelled`, else `409 "Job cannot be deleted once started."` |

`scheduledAt` is an ISO date-time (`400 "Scheduled time must be a valid date."`). `durationEstimateMinutes` is an integer 15–10080.

### 7.3 Engineer-scoped endpoints (mobile UI)
All are scoped server-side to `engineerId === req.admin.id`. A job that is not the caller's → **404 `"Job not found."`** (not 403, which avoids enumeration). Cap: `jobs:update-own`.

| Method | Path | Body | Success |
|---|---|---|---|
| GET | `/admin/me/jobs?status&page&limit` | – | 200 `"Jobs retrieved."` **(paged)**. Default excludes `completed|cancelled` unless `status` is given. Sorted by `scheduledAt` asc. |
| GET | `/admin/me/jobs/:id` | – | 200 `"Job retrieved."` (`notes` included) |
| POST | `/admin/me/jobs/:id/status` | `{ status: "in_progress" \| "completed" }` | 200 `"Job status updated."`. `completed` requires every checklist item done → `409 "Complete the checklist first."` |
| PUT | `/admin/me/jobs/:id` | `{ checklist?: [{ id, done }], photos?: string[], completionNotes? }` | 200 `"Job updated."`. Only `done` on existing items can change (unknown id → `400 "Checklist item not found."`). `photos` replaces the list. Only `assigned|in_progress` jobs can be updated, else `409 "Job is closed."` |

Audit: `job.create`, `job.update`, `job.assign`, `job.status_change`, `job.delete` (entity `job`).

### 7.4 Staff
```ts
type StaffProfile = { areaCoverage: string[]; certifications: string[]; bio: string | null; avatarUrl: string | null };
```
`areaCoverage` ≤20 items (1–100 each), `certifications` ≤20 (1–150), `bio` ≤1000, `avatarUrl` uses the URL rule. The profile lives on the admin record (`admins` collection), so it is shared with §2 `AdminUser`.

| Method | Path | Cap | Body | Success |
|---|---|---|---|---|
| GET | `/admin/staff?role&area&isActive&q&page&limit` | `staff:read` | – | 200 `"Staff retrieved."` **(paged)** `AdminUser`. `area` = case-insensitive match in `areaCoverage`. The assign-engineer picker uses `?role=engineer&isActive=true`. |
| GET | `/admin/staff/:id` | `staff:read` | – | 200 `"Staff member retrieved."` plus `openJobs: number` |
| PUT | `/admin/staff/:id` | `staff:write` | `{ phone?, profile?: Partial<StaffProfile> }` | 200 `"Staff member updated."`. Roles and activation are **not** editable here (use §2). |

Ownership: BE-1 owns the `admins` record shape and `/admin/users`. BE-2 owns `/admin/staff` and `profile` validation. Both read and write the same record through the same store helpers. `profile` must be preserved by BE-1's updates.

---

## 8. Settings & notifications (BE-2)

### 8.1 Settings (a single document)
Storage: collection `settings`, fixed id `"global"`. Missing → defaults.
```ts
type Settings = {
  business: { name: string; email: string | null; phone: string | null; address: string | null; website: string | null };
  notifications: { orderEmails: string[]; lowStockEmails: string[]; vacancyEmails: string[] };   // ≤10 each, shared email rule
  payments: { gatewayEnabled: boolean; provider: "paystack" | "flutterwave" | null };
  inventory: { defaultReorderLevel: number; lowStockAlertsEnabled: boolean };
  uploads: { provider: "url" };
  updatedAt: string | null; updatedBy: { id: string; email: string } | null;
};
```
Defaults: `business.name "Juwon Electric"`, empty arrays, `gatewayEnabled false`, `provider null`, `defaultReorderLevel 0`, `lowStockAlertsEnabled true`, `uploads.provider "url"`.

| Method | Path | Cap | Success |
|---|---|---|---|
| GET | `/settings/public` | public | 200 `"Settings retrieved."` `{ business: { name, phone, email, address, website }, payments: { gatewayEnabled } }`. **Never** notification emails. |
| GET | `/admin/settings` | `settings:read` | 200 `"Settings retrieved."` `Settings` |
| PUT | `/admin/settings` | `settings:write` | 200 `"Settings updated."`. Merges per section: sent sections are merged key by key, and sent arrays replace. |

Audit: `settings.update` (changes = dotted keys such as `notifications.lowStockEmails`).

Existing env-based recipients (`SMTP_*`, the Worker's notification env) remain the fallback when the settings arrays are empty.

### 8.2 Notifications
```ts
type NotificationType = "low_stock" | "new_order" | "vacancy_posted" | "job_assigned";
type Notification = {
  id: string; type: NotificationType; title: string; message: string;
  entity: "product" | "order" | "vacancy" | "job"; entityId: string;
  recipientId: string | null;     // set only for job_assigned
  read: boolean;                  // computed per requesting admin
  createdAt: string;
};
```
Audience (server-side filter): `low_stock` → `inventory:read`; `new_order` → `orders:read`; `vacancy_posted` → `vacancies:read`; `job_assigned` → `recipientId === admin.id` only.

| Method | Path | Cap | Success |
|---|---|---|---|
| GET | `/admin/notifications?unread=true&type&page&limit` | `notifications:read` | 200 `"Notifications retrieved."` **(paged)** plus `unreadCount` in `data`, `createdAt` desc |
| POST | `/admin/notifications/:id/read` | `notifications:read` | 200 `"Notification marked as read."` (404 if not in the caller's audience) |
| POST | `/admin/notifications/read-all` | `notifications:read` | 200 `"All notifications marked as read."` `{ unreadCount: 0 }` |

Helper (BE-2): `backend/services/notifications.js` → `notify({ type, title, message, entity, entityId, recipientId? })` for Express. `backend/cloudflare/src/notifications.js` → `notify(env, ctx, {...})` for the Worker. They are best-effort and never fail the triggering request. Retention: 90 days (opportunistic cleanup). Per-admin read state: `notificationReads` `{ adminId, notificationId, readAt }` plus a per-admin `since` watermark for read-all. This mirrors `adminReads`.

---

## 9. Dashboard KPIs (BE-2) — additive

`GET /admin/dashboard?from&to` (`dashboard:read`). The existing `stats`, `statusCounts`, `revenueSeries` and `recentOrders` are **unchanged**. A new key is added:
```ts
kpis: {
  period: { from: string; to: string };   // default: last 30 days ending now; max range 366 days
  revenue: number;          // sum of totalAmount (fallback: parsed total) for orders created in period with fulfillmentStatus != cancelled and paymentStatus in (paid, partial)
  openOrders: number;       // fulfillmentStatus in (pending, processing, out_for_delivery)
  lowStockItems: number;    // active products with lowStock
  openVacancies: number;    // status open
  upcomingJobs: number;     // status in (unassigned, assigned) and scheduledAt within the next 7 days
}
```
Errors: `400 "from must be a valid date."`, `400 "to must be a valid date."`, `400 "Date range must be 366 days or fewer."`, `400 "from must be before to."`.
`revenueSeries` and `stats` continue to use the legacy definitions, so the Vite dashboard doesn't change.

---

## 10. D1 migrations & storage

### 10.1 Storage design (applies to both BE agents)
- New collections go in the existing **`records`** table (`collection`, `id`, `slug`, `data` JSON, `is_active`, `sort_order`). Add the names to `COLLECTIONS` (Worker `store.js`), the Express store model registry and the NotFound label maps. Names: `vacancies`, `categories`, `products`, `inventoryMovements`, `installationJobs`, `settings`, `notifications`, `notificationReads`.
- Uniqueness uses **unique partial indexes** on `records`. Writers must turn the constraint error into the contract's `409` (or the slug `-2` suffix retry).
  ```sql
  CREATE UNIQUE INDEX IF NOT EXISTS idx_records_vacancies_slug ON records (slug) WHERE collection = 'vacancies';
  CREATE UNIQUE INDEX IF NOT EXISTS idx_records_products_slug  ON records (slug) WHERE collection = 'products';
  CREATE UNIQUE INDEX IF NOT EXISTS idx_records_products_sku   ON records (lower(json_extract(data, '$.sku'))) WHERE collection = 'products';
  CREATE UNIQUE INDEX IF NOT EXISTS idx_records_categories_slug ON records (slug) WHERE collection = 'categories';
  ```
  Admin emails: `CREATE UNIQUE INDEX IF NOT EXISTS idx_records_admins_email ON records (lower(json_extract(data,'$.email'))) WHERE collection = 'admins';` (BE-1, 0007).
- Relationship lookups (`productId`, `orderId`, `engineerId`) use expression indexes, for example `ON records (json_extract(data,'$.orderId')) WHERE collection = 'installationJobs'`.
- Express Mongo: a new `flexibleSchema` model per collection, plus the same unique indexes (`ensureIndexes` at startup). JSON store: enforce uniqueness under the store lock.
- **Model name clash (BE-1 task 4):** `backend/models/{Order,User,...}.js` are unused typed models that clash with `store.js`. Delete them (or rename the registrations). `Vacancy.js` is deleted when vacancies move to the store. No module may import `backend/models/*` afterwards.

### 10.2 Numbering (strict)
| Range | Owner | Planned |
|---|---|---|
| `0001`–`0006` | existing | **never edit** |
| `0007` | BE-1 | `0007_admin_roles.sql`: normalise `super_admin`→`superadmin`, admins email unique index |
| `0008` | BE-1 | `0008_vacancies.sql`: vacancy slug unique index, status index |
| `0009` | BE-1 | reserved |
| `0010` | BE-2 | `0010_catalog.sql`: categories and products indexes |
| `0011` | BE-2 | `0011_orders_fulfilment.sql`: order backfill (§6.1) |
| `0012` | BE-2 | `0012_inventory_jobs.sql`: movement and job indexes |
| `0013` | BE-2 | `0013_settings_notifications.sql` |
| `0014+` | BE-2 | as needed |

Every migration is idempotent (`IF NOT EXISTS`, guarded `UPDATE ... WHERE`), has a header comment, and applies cleanly in order on a fresh DB **and** on a DB at `0006` that already holds seed data (`seed.sql`). A unique index migration must first check for duplicates and fail loudly rather than silently deleting data.

---

## 11. Express ↔ Worker parity rules

1. **Same routes:** identical method, path and `/api` alias for every endpoint in this contract. A route present in one runtime only is a failing parity check.
2. **Same status codes and the exact same `message` strings** for success and for every error listed here.
3. **Same body shape:** the same keys (including keys with `null` values; no `undefined`-dropped keys in one runtime only), the same types, the same sort order, and the same pagination numbers. Mongo `_id`/`__v` are never returned by new modules.
4. **Same validation order:** body validation → auth-independent checks → lookups → state checks. Auth (401) and capability (403) run **before** body validation for admin routes. Both runtimes do this already by routing through auth first.
5. **Shared logic lives in `backend/shared/`** as pure ESM with no Node or Worker globals: the capability map, rich-text sanitiser, enum and transition tables (`backend/shared/orders.js`, `jobs.js`, `vacancies.js`), and the order normalisation and derived `status` helper. Wrangler bundles it through relative imports. **Do not** duplicate those tables per runtime.
6. **Tests** (`node:test`):
   - Express: `backend/test/**/*.test.js` with supertest (or `fetch` against `app` on an ephemeral port) against the **JSON store** in a temp file (`JSON_STORE_PATH`). `app.js` must export `app` without calling `start()` when imported by tests (for example, `if (import.meta.url === pathToFileURL(process.argv[1]).href) start()`).
   - Worker: `backend/cloudflare/test/**/*.test.js`. It calls the default export's `fetch` with a D1 stand-in built on **`node:sqlite`** (`prepare/bind/first/all/run/batch` plus `meta.changes`), with migrations `0001`→latest applied in order.
   - Parity: `backend/test/parity/*.test.js` runs the same request script against both and deep-compares `status` and body after masking `id`, timestamps and tokens.
   - `backend/package.json` scripts: `"test": "node --test"`. That covers Express, the Worker and parity; Node ≥22.5 is needed for `node:sqlite` (`engines` field). CI uses Node 22.
7. Adding a capability, enum value, message or field means updating `backend/shared/*` **and** `backend/docs/API.md` in the same commit.

---

## 12. Frontend summary (read this if you are FE)
- Sign in: `POST /admin/auth/login` → `data.token`, `data.admin.{role,capabilities}`. Refresh with `GET /admin/auth/me`. Gate nav by `capabilities`. On `401`, clear the session and go to login. On `403`, refetch `/me` and show `message`.
- Send the token as `Authorization: Bearer <token>`. Never send `X-User-Role`/`X-User-Id`.
- Public vacancies: `GET /vacancies` (array, open only) and `GET /vacancies/:slug`. Admin vacancies: `/admin/vacancies` (paged, every status) plus `publish`/`unpublish`. `descriptionHtml` is already sanitised; still render it inside a scoped prose container.
- Public catalog: `GET /categories` (flat array, build the tree from `parentId`), `GET /products` (**paged**), `GET /products/:slug`. `/packages` is unchanged (it may add `items`).
- Orders: use `fulfillmentStatus`/`paymentStatus` (enums §6.1, transitions §6.2) and treat `status` as read-only. Mark paid: `POST /admin/orders/:id/mark-paid`. Engineer picker: `GET /admin/staff?role=engineer&isActive=true`. Handle `409` with `details` on the transition to `processing` (insufficient stock).
- Engineer mobile view: only `/admin/me/jobs*`. Other job ids return 404.
- Settings for the public site (payment toggle, business info): `GET /settings/public`.
- All new admin list endpoints are paged `{ items, page, limit, total }`. Existing lists (`/admin/orders`, `/admin/packages`, …) stay arrays.
- Until endpoints land, mock with exactly these shapes.

---

## 13. Clarifications log

### 2026-09-16: BE-1 roles milestone (confirmed by SUP-BE, binding)
1. **Read status.** `GET /admin/reads` and `POST /admin/reads/all` need no capability. They return only read timestamps and record keys, never record contents. `POST /admin/reads` requires `leads:read` for `contacts` and `orders:read` for `orders`.
2. **Check order for user changes:** capability (403) → body validation (400) → lookup (404) → escalation (403) → self (409) → last superadmin (409). A 403 is returned before either 409.
3. **Self-edit.** `PUT /admin/users/:id` on your own account is allowed, subject to the escalation rule. In practice only a superadmin can edit an admin or superadmin account, including their own. The self rule blocks only role changes and (de)activation.
4. **Invites** (`POST /admin/users`) are not rate limited. `users:manage` is trusted, and the store keeps at most 3 live reset tokens per email. An invite token has the normal 30-minute reset TTL. An invitee whose token expired uses `POST /admin/auth/request-password-reset` (FE-2: show this hint on the users page).
5. **Worker `ok`/`created` always include `data`** (`null` when there is no payload), matching Express. FE must not rely on `data` being absent.
6. **Last-superadmin guard** may be check-then-write this round. This is a known race that needs two superadmins demoting each other concurrently. Recovery is a temporary `ADMIN_TOKEN` plus `POST /admin/users/:id/reactivate` or `/role`. Document this in `docs/DEPLOYMENT.md`. A post-write recount-and-revert is recommended, not required.
7. **Parity exclusions.** Existing routes whose bodies depend on runtime-specific seed data (`/admin/orders`, `/admin/carts`, `/admin/packages`, `/admin/audit-logs`) may compare status and message only. **New modules (vacancies, catalog, inventory, orders fulfilment, jobs, staff, settings, notifications) must compare full masked bodies**, with identical fixtures created through the API in both runtimes.
8. **NotFound label** for `admins` is `"User"` (`"User not found."`) in both runtimes.

### 2026-09-16: round 3 rulings (binding)

**Sanitiser (§0.5): option (a).** `backend/shared/richText.js` (BE-1) is the only rich-text sanitiser. It is used for vacancies **and** products, with a single fixture file, `backend/shared/__fixtures__/richText.json`. §0.5 is **not** widened:
- Product descriptions don't need tables, code blocks, `tel:` links or relative links this round.
- A narrower allowlist is the safer default.
- Forcing `target="_blank"` with `rel=noopener` removes a class of tab-nabbing bugs.

BE-2 has already adopted it: `bd75e45` holds a byte-identical `richText.js` and fixtures, and `sanitizeHtml.js` does not exist on the branch. The `sanitizeHtml` alias export may stay until integration, but new code must import `sanitizeRichText`. Any future widening is a contract change: update §0.5 and the fixtures together, and apply it to every field.

**BE-1 vacancy interpretations:**
10. **Confirmed.** Any move out of `closed` (to `open` or `draft`) clears `closedAt`.
11. **Confirmed.** A `PUT` that changes `status` is audited with `vacancy.publish`, `vacancy.unpublish` or `vacancy.close`, and `changes` lists every changed field. A PUT that changes nothing is not written and not audited.
12. **Confirmed.** The public `department` filter is a case-insensitive exact match, and an invalid `employmentType` returns 400.
13. **Confirmed, and consistent with §0.4 and §10.1.** Slug collisions get a `-2`, `-3`… suffix instead of a 409, on create and on an explicit slug in PUT. Slugs never change when only the title changes. FE must read the saved slug from the response and never assume the slug it sent.
14. **Confirmed.** Rows in any hand-made standalone D1 `vacancies` table are not migrated, because it was never a numbered migration. Operators with such data re-create it through `POST /admin/vacancies`. BE-1 should add one line about this to `docs/DEPLOYMENT.md`.

**BE-2 catalog and inventory interpretations** (`docs/agents/be-ops.md`):
1. **Confirmed.** Low-stock recipients are `settings.notifications.lowStockEmails`, with the env fallback (`SMTP_FROM` in Express, `ADMIN_NOTIFY_EMAIL` in the Worker) when that list is empty. Nothing is sent when `lowStockAlertsEnabled` is false.
2. **Confirmed.** A new product's `reorderLevel` defaults to `settings.inventory.defaultReorderLevel`, which defaults to 0.
3. **Confirmed.** Public `GET /products?category=<unknown>` returns an empty page, not 404.
4. **Confirmed.** The public product list is sorted by name, and `PublicProduct` keeps `status` (always `active`).
5. **Confirmed.** `productId` in adjustments resolves by id, then slug, then SKU.
6. **Accepted.** Parity for package create is compared on `message` and `items`, lists with equal `updatedAt` are compared as sets, and concurrent steps are compared as sorted statuses. All other catalog and inventory steps compare full masked bodies.
7. **Accepted.** Express runs the low-stock digest every 24 hours per process, with an unref'd timer. A deployment running several Express instances sends one digest per instance, so document it in `docs/DEPLOYMENT.md` at integration.
8. **Confirmed.** Unknown body fields are ignored.

**Migration order.** `0012` exists before `0011`. That is allowed: wrangler applies unapplied migrations in name order, so a later `0011` still applies. `0011` must not depend on `0012` objects, and `0012` must not depend on `0011`.

### 2026-09-17: round 4 rulings on BE-2 items 9–26 (binding)
9. **Confirmed.** `stockCommittedAt` is set only when the move to `processing` actually changed stock.
10. **Confirmed.** Order writes are guarded on the stored `fulfillmentStatus`/`paymentStatus` (`assignedEngineerId` for assignment). Concurrent status changes get 409, and concurrent note edits are last-write-wins.
11. **Confirmed.** A cancel restores the net quantity of the order's `sale` minus `sale_reversal` movements. No separate commitment record is stored.
12. **Confirmed.** Admin order responses do not include `sortOrder` (FE-2 does not use it). The Worker's public `POST /order` response should drop it too (review L12).
13. **Confirmed.** The messages are `"Fulfilment status is not valid."`, `"Payment status is not valid."` and `"requiresInstallation must be true or false."`. A missing `engineerId` gets `"Assignee must be an active engineer."`.
14. **Confirmed.** `mark-paid` on a paid order and cancelling a cancelled order are 200 no-ops.
15. **Confirmed.** Express order routes are gated in `routes/admin.js`, and Worker order routes in `src/ops/orders.js`.
16. **Confirmed.** Assigning or reassigning works only on `unassigned` and `assigned` jobs, and other statuses get the transition 409. To move started work to someone else, cancel the job and create a new one.
17. **Confirmed.** The `note` on `POST /admin/jobs/:id/status` goes into the audit summary only.
18. **Confirmed.** The checklist-complete rule applies only to `/admin/me/jobs`. Admins with `jobs:assign` may complete a job regardless.
19. **Confirmed.** On job creation the order is checked for `requiresInstallation` first, then for being cancelled.
20. **Confirmed.** The staff list is sorted by name, `openJobs` counts jobs that are not completed or cancelled, the PUT ignores `role`/`isActive`, and edits are audited as `user.update`.
21. **Confirmed.** Notification read state is stored as `notificationReads` rows plus a `"<adminId>:*"` watermark, and reading one returns the notification with `read: true`.
22. **Confirmed.** `unreadCount` covers the caller's whole audience and ignores the `type` and `unread` filters (it is the badge count).
23. **Confirmed.** Vacancy emails are sent only when `vacancyEmails` is non-empty. There is no env fallback.
24. **Confirmed.** The Worker email sender moves to `src/email.js`, with the same behaviour.
25. **Confirmed.** Only `kpis.revenue` uses the period. `openOrders`, `lowStockItems`, `openVacancies` and `upcomingJobs` are current values. The defaults for a missing `from` or `to` are as documented in API.md.
26. **Confirmed.** The dashboard reads the `vacancies` collection, which BE-1's module writes.
