# Commerce v3: installation crews, online product orders, package categories and admin input polish

Status: **binding** for this round.
Branch: `agents/v3-commerce`.
Owner requests: 2026-09-17.
Builds on `API_CONTRACT_V3.md` and `COMMERCE_V2.md`. If this file conflicts with either, **this file wins**.

## 0. Owner requests
1. More than one engineer can be assigned to an installation job.
2. An order can have only one installation job.
3. Scheduled time and estimated duration use proper pickers: date and time, and hours and minutes.
4. In-store sales: customer name and phone number are optional. Blank ones fall back to default text.
5. Product search lists products as soon as the search field is focused. This applies to the in-store sale page and the package option editor.
6. Customers can add **products** to the cart and order them on the public website, not just packages.
7. Packages reference the product catalogue **categories**.

## 1. Installation jobs: engineer crews and one job per order

### 1.1 Model (both runtimes; `backend/shared/jobs.js`)
- **Stored field:** `engineerIds: string[]`. Up to 10 unique ids, in order. The first id is the **lead** engineer.
- **Read-time migration:** a stored job without `engineerIds` reads as `engineerIds = engineerId ? [engineerId] : []`. The next write persists it.
- **Compatibility:** `engineerId` stays in responses as `engineerIds[0] ?? null`.
- **Response additions:**
  - `engineers: { id, name, email, phone }[]` in `engineerIds` order. Unknown or deleted admins are skipped.
  - `engineer` stays as the lead's object, or null.
- **Status:** `assigned` when `engineerIds` is non-empty and the job hasn't started; `unassigned` when empty. The existing rules apply otherwise, and only open, not-started jobs can be reassigned.

### 1.2 Endpoints
- **`POST /admin/jobs`**
  - Accepts `engineerIds?: string[]`. The legacy `engineerId?: string | null` is used only when `engineerIds` is absent.
  - Every id must be an **active admin with role `engineer`**, otherwise `400 "Assignee must be an active engineer."`.
  - Duplicate ids: `400 "Each engineer can be added once."`
  - More than 10: `400 "A job can have at most 10 engineers."`
  - **One job per order:** if the order already has a job whose status is not `cancelled`, return `409 "This order already has an installation job."` and create nothing.
  - The existing requirement for `requiresInstallation` stays.
- **`PUT /admin/jobs/:id`:** accepts `engineerIds` (or legacy `engineerId`) with the same validation and the reassignment rules.
- **Assign endpoint:** `POST /admin/jobs/:id/assign` (or whatever the existing assignment endpoint is; keep its path) accepts `{ engineerIds: string[] }` or legacy `{ engineerId }`. An empty array unassigns.
- **Filters:**
  - `GET /admin/jobs?engineerId=<id>` matches jobs where `engineerIds` includes the id.
  - `GET /admin/me/jobs*` and the engineer status and checklist endpoints treat a job as the engineer's when `engineerIds` includes the session admin id.
- **Notifications:** `job_assigned` goes to every engineer **newly added** by a create, update or assign. It isn't sent again to engineers who were already on the job.
- **Audit:** assignment summaries list the engineers' emails, e.g. `Job for <customer>: engineers a@x, b@y`.
- **Order-level engineer** (`orders/:id/assign-engineer`, `assignedEngineerId`): unchanged. When a job is created without `engineerIds`/`engineerId` and the order has `assignedEngineerId`, the job starts with `[assignedEngineerId]`.
- **Order detail:** `jobs: InstallationJobSummary[]` adds `engineerIds`.

## 2. In-store sales: optional name and phone

- `customer` is optional. `customer.name` and `customer.phoneNumber` are optional; blank (`""`, whitespace or missing) counts as not given.
- **Stored values:**
  - `name`: the trimmed value, or the default **`"Walk-in customer"`**
  - `phoneNumber`: the value, or `null`
  - email is unchanged (optional)
- If a phone number **is** given it must pass the existing phone rule. A given name is 1–100 characters, as today.
- `later` fulfilment still requires `deliveryAddress`.
- **Audit and notification text** use the stored name, e.g. "In-store order for Walk-in customer: …".
- **Admin UI** shows a missing phone as "No phone".

## 3. Online product orders

### 3.1 Request item shapes (`POST /cart/quote`, `POST /cart`, `POST /order`)
The items array (`items` for the cart and quote, `order` for orders) can now mix two kinds of item:
- **Package item:** the existing shape, unchanged and byte-identical. It is recognised when `type !== "product"`.
- **Product item:** `{ "type": "product", "productId": "<id>", "quantity": <integer 1–100> }`. Other fields are ignored. `productId` must be a non-empty string of at most 64 characters, otherwise the existing `"Invalid order item."` / `"Invalid cart item."` error.

### 3.2 Pricing and availability
- A product item prices at the product's current `price` only when the product exists, has status **`active`** (hidden and archived products aren't sold online), and has `stockQuantity >= quantity`.
- **`/cart/quote`:** mark the line unavailable in the same way as package lines today, and keep the existing 400 `UNAVAILABLE_ITEMS_MESSAGE` behaviour. The response shape per line is unchanged (`price`, `quantity`, `lineTotal`).
- **`/order`:** reject with the existing `400 "Some items in your cart are no longer available. Please refresh your cart."` if any product line fails these checks.
- **Stock:** placing the order still doesn't change it. Stock is committed at `processing` from the snapshot.

### 3.3 Stored order and defaults
- **Order line snapshot:** `{ type: "product", productId, sku, name, quantity, unitPrice, lineTotal }`. This is the same shape as in-store lines, and it gets `typeLabel: "Product"` for emails.
- **Totals:** these include product lines.
- **`requiresInstallation`:** new website orders get `true` when **at least one package line** is present, otherwise `false`. This refines the earlier decision so that product-only orders don't need installation.
- **Emails:** the order confirmation emails (Express `mail/_orderTemplate.js` and the Worker `emailTemplates.js`) list product lines as `<quantity> × <name> (SKU)` with prices.

## 4. Packages reference categories

- **Stored package field:** `categoryId: string | null`. It is optional and must exist, otherwise `400 "Category not found."`. The legacy string `category` field stays as it is.
- **Admin package responses** add `categoryId` and `categoryRef: { id, slug, name } | null`.
- **Public package responses** (`GET /packages`, `/packages/:id`) add the same `categoryId` and `categoryRef`, where `categoryRef` is null if the category is inactive. Existing fields don't change.
- **`GET /packages?category=<id|slug>`:** returns packages in that category **or its descendants**. An unknown category gives `[]`. Without the parameter the response is unchanged.
- **`DELETE /admin/categories/:id`:** also refuses when any package references the category, with the message `409 "Category has subcategories, products or packages."`.

## 5. Admin console

- **Product search** (`components/admin/catalog/ProductPicker.tsx`, and any other product search used by the in-store sale page and the package option editor):
  - Focusing the search field with an empty query lists the first 20 products straight away, sorted by name, with name, SKU, price, stock and status.
  - Typing filters as it does today.
  - The list must be keyboard-accessible (arrow keys and Enter, Esc closes), have a loading state, and never take over the whole page on mobile.
- **Job create and edit dialogs** (`CreateJobDialog`, `JobEditDialog`, `JobDrawer`):
  - **Engineers:** a multi-select for choosing one or more active engineers, with search, a chip per selected engineer and a remove button on each chip. The first engineer is marked **Lead**, and a chip can be made lead.
  - **Scheduled time:** a `DateTimePicker` component (`components/admin/ui-extra/DateTimePicker.tsx` or `components/admin/DateTimePicker.tsx`). It has a calendar popover (month grid, previous and next month, today highlighted, past dates allowed but marked as past), a time selector in 15-minute steps shown as `9:00 AM`-style labels in Lagos time, a display like `Thu 18 Sep 2026, 10:30 AM`, and a Clear button. It must be keyboard-accessible. Use Headless UI Popover (already installed). No new dependencies.
  - **Estimated duration:** a `DurationPicker` with hours (0–24) and minutes (0, 15, 30 or 45) as two selects or steppers, shown as `2 h 30 min`, with a Clear option. It stores `durationEstimateMinutes`, which must be ≥ 15 when set, per the existing backend rule.
- **Order details:**
  - When the order already has a non-cancelled job, hide or disable "Create job" with the note "This order already has an installation job." and link to the job.
  - Show every engineer on the job, lead first.
- **Jobs list and drawer:** show engineers as stacked avatars or names, lead first. Use the `engineerId` filter as today.
- **My jobs (engineer):** show crew members ("With: Name, Name").
- **In-store sale page:** the name and phone fields lose their required markers. Add the helper text "Leave blank for walk-in customers." The summary shows "Walk-in customer" when the name is blank.
- **Package editor:** add a **Category** select built from the category tree (indented, "No category" option). The package list shows the category name.

## 6. Public storefront

- **Product detail `/products/[slug]`:**
  - A quantity stepper (1 up to `min(10, stock)`) and **Add to cart**.
  - Show **Out of stock** with the button disabled when `inStock` is false. Keep "Ask about this product".
  - The toast after adding has a "View cart" action.
- **Product cards** (catalogue grid and home "Popular products"): a compact **Add to cart** button when `inStock`.
- **Cart storage:**
  - Product items live in a **separate** localStorage key, `je/cart-products`: `[{ productId, slug, name, sku, brand, image, price, quantity }]`.
  - Package items stay in `je/cart` in the classic shape, untouched, so the classic site keeps working and ignores product items.
  - New module `lib/cart/productStore.ts`, with the same patterns as `lib/cart/store.ts`: `useSyncExternalStore`, storage event sync and quantity clamps 1–100. The max lines limit is shared with package lines.
- **Cart count:** the header cart count includes product lines.
- **Cart page:** lists package lines and product lines together (product lines have image, name, SKU, stepper, remove and line total). The quote sends package items (unchanged mapping) followed by product items. Unavailable product lines are flagged like package lines.
- **Checkout:** the `/order` payload `order` array holds the package items (byte-identical mapping) followed by the product items `{ type: "product", productId, quantity }`. Package-only carts must produce exactly the same body as before. The success summary lists product lines too.
- **Package categories:**
  - The package detail breadcrumb and eyebrow show `categoryRef` when present.
  - `/products/category/[slug]` also lists the packages in that category, via `GET /packages?category=`, in a "Packages in <category>" section above the products when there are any.
  - Package cards may show the category name.

## 7. Tests and docs
- **Backend:** Express/Worker parity scenarios for:
  - multi-engineer create, update and assign, including validation and notifications to newly added engineers only
  - engineer scoping with a crew
  - one job per order, where a cancelled job allows a new one
  - optional in-store name and phone
  - product quote and order: active and in stock, hidden, short stock, mixed with packages, the `requiresInstallation` default and the snapshot
  - the package `categoryId` and category filter
  - category delete blocked by a package
- **Docs:** `backend/docs/API.md`, `PRODUCT_REQUIREMENTS.md` and `docs/USER_GUIDE.md` are updated in the same round (owner rule).
