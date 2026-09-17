# Commerce v2 — composed packages and in-store sales (contract §14 addendum)

Status: **binding** for this round · Branch `agents/v3-commerce` (= `agents/fe-storefront` + `agents/be-integration`) · Owner decisions recorded 2026-09-17.
Base contract: `docs/agents/API_CONTRACT_V3.md` (copied from `agents/be-supervisor`). Where this file conflicts with it, **this file wins**.

## 0. Owner decisions (verbatim intent)

1. **Sales reps create orders internally** (in the physical store) from the admin console. These orders sell **products**, not packages.
2. **Packages are built from products.** Each package option lists products and quantities. The option's **products total** is computed from current product prices and can't be edited. The **public price** = products total + a **fixed ₦ adjustment** (positive or negative). The public price is what customers pay and what the order records.
3. **Each option has its own product list** ("Without solar", "With solar", …), its own products total, and its own adjustment.
4. **In-store sale, the rep chooses one of:**
   - **Collected now:** stock is deducted immediately and the order is marked delivered.
   - **Deliver or install later:** a normal pending order; stock is deducted at processing.
5. **Rep pricing:** line prices come from the product. The rep can add an **order discount with a required reason**, which is recorded on the order and in the audit log.

## 1. Package options (replaces the §4.3 top-level `items` for pricing)

### 1.1 Stored option shape
```ts
type PackageOptionStored = {
  name: string;                         // 1–60, unique per package (case-insensitive)
  items?: { productId: string; quantity: number; note: string | null }[]; // ≤50; quantity integer 1–1000; note ≤200
  priceAdjustment?: number;             // integer ₦, -1_000_000_000..1_000_000_000, default 0 (only meaningful with items)
  price?: number | string;              // LEGACY manual price, used only when the option has no items
  kits?: string;                        // LEGACY free-text contents (≤300). Kept for the classic site
};
```
- **Composed option:** `items` has at least 1 entry. Its price is always computed (§1.2). A `price` sent for a composed option is ignored.
- **Legacy option:** no `items`, and it keeps its manual `price` (and `kits`). All 66 seeded packages start like this, so nothing breaks.
- **Package-level `items` (§4.3) is deprecated.**
  - On write, a top-level `items` with options that have no items is rejected with `400 "Add products to each option instead of the package."`.
  - On read, if stored data still has top-level `items` and an option has none, treat the top-level items as that option's items. This is a read-time migration. The next write persists it.

### 1.2 Computed option pricing (the same function in both runtimes: `backend/shared/packagePricing.js`)
```ts
type ComposedOption = {
  name: string;
  composed: boolean;
  productsTotal: number | null;   // Σ product.price × quantity using CURRENT product prices; null for legacy
  priceAdjustment: number;        // 0 for legacy
  price: number;                  // composed: productsTotal + priceAdjustment; legacy: parsed manual price
  available: boolean;             // false when a composed option references a missing or archived product, or price <= 0
  inStock: boolean;               // composed: every item product.stockQuantity >= item.quantity; legacy: true
  kits: string;                   // legacy kits text, or generated "1 × 5kVA Inverter, 4 × 200Ah Battery" for composed
  items: ComposedItem[];          // [] for legacy
};
type ComposedItem = {
  productId: string; quantity: number; note: string | null;
  name: string; slug: string; sku: string; brand: string | null;
  categoryId: string | null;
  attributes: Record<string, string | number | boolean>;   // the product's specs ("specs reflect on the package")
  unitPrice: number;              // ADMIN responses only
  lineTotal: number;              // ADMIN responses only
};
```
- **Hidden products** can be package components. **Archived or missing products** make the option `available:false`, and pricing, quoting and ordering reject it with the existing unavailable message.
- **Public responses** (`GET /packages`, `/packages/:id`) return `options[]` with `name, composed, price, available, inStock, kits, items[]`. They **omit** `productsTotal`, `priceAdjustment`, `unitPrice` and `lineTotal`, because the markup is internal. Top-level `items` is no longer returned publicly.
- **Admin responses** (`GET /admin/packages*`) return everything above, including `productsTotal`, `priceAdjustment`, `unitPrice` and `lineTotal`.
- **Admin writes** (`POST/PUT /admin/packages`):
  - Accept `options[]` in the stored shape.
  - Validate that every `productId` exists and is not archived: `400 "Product not found."`, `400 "Archived products can't be added to a package."`.
  - Reject a composed option whose computed price is ≤ 0: `400 "Option <name> price must be greater than 0."`.
  - Reject duplicate product ids in one option: `400 "Each product can appear once per option."`.
- **Product changes:** when a product's price changes, affected package prices change automatically, because they are computed at read time. Deleting a product used by any option returns `409 "Product is used by a package."`, the same as today but checked against option items. Archiving such a product is allowed and makes those options unavailable. The admin UI warns about this.
- **Cart and orders:** `/cart/quote` and `/order` price a package line with the option's computed `price`. The request payloads are **unchanged**.

### 1.3 Order line snapshot (fixes CO-01 and CO-04)
Every order line stores at creation time:
```ts
type OrderLineSnapshot = {
  type: "package" | "product";
  // package lines (website): existing fields (packageId, optionName, name, type, kva, volt, price string, quantity, unitPrice, lineTotal) plus:
  components?: { productId: string; sku: string; name: string; quantity: number; unitPrice: number }[]; // per 1 package; [] for legacy options
  productsTotal?: number | null; priceAdjustment?: number;
  // product lines (in-store):
  productId?: string; sku?: string; name: string; quantity: number; unitPrice: number; lineTotal: number;
};
```
- **Stock commit** (`pending → processing`, and "collected now") uses the **snapshot**:
  - package lines: `components[i].quantity × line.quantity`
  - product lines: `line.quantity`
  - legacy lines without `components` fall back to today's behaviour (the current package items), for orders placed before this change.
- **Cancel or reversal** keeps using movements (`reversalLines`). If a product no longer exists, **skip that product's restore**, write the order update anyway, and add a note to the audit summary: `"stock not restored for deleted product <sku>"`. Never 404. This fixes CO-01.
- Missing `type` on stored lines is read as `"package"`.

## 2. In-store orders (sales reps)

### 2.1 Capability
- New `orders:create` for `superadmin`, `admin` and `sales`. Add it to `backend/shared/capabilities.js` (and its test and parity fixtures).
- Update the frontend fallback map `lib/admin/capabilities.ts` to match.

### 2.2 Endpoint
`POST /admin/orders` · cap `orders:create` · 201 `"Order created."`
```ts
type InStoreOrderInput = {
  customer: { name: string; phoneNumber: string; emailAddress?: string | null; deliveryAddress?: string | null };
  lines: { productId: string; quantity: number }[];       // 1–50 lines, unique productId, quantity integer 1–1000
  discount?: { amount: number; reason: string } | null;    // amount integer ₦ ≥ 0 and ≤ subtotal; reason 3–200 required when amount > 0
  fulfilment: "collected" | "later";
  paymentStatus: "pending" | "partial" | "paid";
  requiresInstallation?: boolean;                          // only with "later"; else 400 "Installation requires a later fulfilment."
  deliveryAddressRequired?: never;                         // (deliveryAddress required when fulfilment = "later": 400 "Delivery address is required for later fulfilment.")
  note?: string | null;                                    // ≤500
};
```
- **Validation:** reuse the shared name, phone and email rules from public orders. Products must exist and not be archived; `hidden` is allowed. Errors: `400 "Product not found."`, `400 "Archived products can't be sold."`.
- **Pricing:**
  - `unitPrice = product.price` (current), `lineTotal = unitPrice × quantity`
  - `subtotal = Σ lineTotal`
  - `discountAmount = discount?.amount || 0`
  - `totalAmount = subtotal − discountAmount`. It may be 0 only if the discount equals the subtotal. It must be ≥ 0.
- **Stored order:**
  - Existing order fields (`name`, `phoneNumber`, `emailAddress`, `deliveryAddress`) come from `customer`.
  - `order: OrderLineSnapshot[]` (product lines).
  - `total` is a formatted string. Also `totalAmount`, `subtotal`, `discount: { amount, reason } | null`.
  - `channel: "in_store"` and `createdBy: { id, email }`.
  - `paymentStatus`, plus `paidAt` if paid.
  - `requiresInstallation` and `note`.
  - **fulfilment `later`:** `fulfillmentStatus:"pending"`, and no stock change.
  - **fulfilment `collected`:** in ONE atomic operation, commit stock for all lines (all-or-nothing, the same mechanism as `pending → processing`: `sale` movements referencing the order, and `stockCommittedAt`), then store `fulfillmentStatus:"delivered"`. On shortfall: `409 "Insufficient stock to process this order."` with `details: [{ productId, sku, required, available }]`, and **no order is created**.
  - Derived `status` follows the existing rule (`delivered` gives `completed`).
- **Website orders:** read-time default `channel: "website"`, and new website orders store `channel:"website"`.
- **Audit:** `order.create`, summary `In-store order for <name>: <n> items, ₦<total>` plus `; discount ₦<amount> (<reason>)` when a discount applies. For collected orders, also `order.fulfillment_change` from `pending` to `delivered`.
- **Notification:** the existing `new_order` notification, with `channel` in its data.
- **Listing:** `GET /admin/orders?channel=website|in_store` (invalid gives `400 "Channel is not valid."`). Order responses always include `channel`, `subtotal` (null for legacy), `discount` (null) and `createdBy` (null for website).
- **Later lifecycle:** in-store orders use the existing transitions, plus `delivered → cancelled` (returns; owner decision 2026-09-17, shared `allowedFulfillmentTransitions`). Cancelling restores stock through movements, and payment status is updated separately. Engineer assignment and jobs work when `requiresInstallation`.
- **Dashboard revenue:** unchanged (it uses `totalAmount`, so discounts are respected).

### 2.3 Parity and tests
- **Both runtimes:** Express (JSON store and Mongo code path) and the Worker (D1, with `applyStockChanges` creating the order record in the same batch, or CAS-inserting it) implement §1 and §2 identically.
- **Tests:** add parity scenarios for:
  - composed pricing (adjustment ±, archived product, price change propagates)
  - public response hiding markup fields
  - snapshot stock commit after the package is recomposed (CO-04)
  - cancel after the product is deleted (CO-01)
  - in-store collected success and shortfall 409 (no order created)
  - in-store later
  - discount validation
  - `orders:create` capability for each role
- **Docs:** update `backend/docs/API.md`.

## 3. Admin console (FE)

- **Packages editor** (`components/admin/content/ContentForms.tsx` / `ContentManager.tsx` package form). Each option gets:
  - a product picker: searchable list from `GET /admin/products?q=`, showing name, SKU, price, stock and status
  - rows of product, quantity and note, with remove
  - a live **Products total** (read-only, from current prices)
  - a **Price adjustment (₦)** input: signed, with a +/− toggle or a signed number
  - the resulting **Public price** in bold
  - an "In stock" or "Short: <sku>" hint
  An option with no products shows the legacy manual price field with the note "Add products to calculate the price automatically." This resolves AC-03.
- **Package list:** show public price per option, and a "Composed" or "Manual price" badge.
- **Products:** when editing the price of a product used in packages, show "Used in N package options. Their prices will update." Archiving a used product shows a confirm dialog explaining that those options become unavailable.
- **Orders: "New in-store sale"** button, visible with `orders:create`. It opens a full page `/admin/orders/new` (mobile friendly) with:
  - customer fields
  - a product search to add lines, showing price and stock
  - a quantity stepper
  - line totals and subtotal
  - a discount section (amount plus a required reason)
  - fulfilment radio: Collected now, or Deliver or install later (the later option reveals the delivery address and "Requires installation")
  - payment status select
  - a note
  - a sticky summary with the total, and submit
  **On 409:** show the shortage per product inline. **On success:** go to the order details.
- **Order details and list:** a channel badge ("In store" or "Website"), `createdBy`, product lines with SKU, subtotal, discount with reason, and a channel filter.
- **Capabilities fallback:** add `orders:create`.
- **Mocks:** if `lib/admin/mocks.ts` covers orders or packages, keep it compiling; no need to mock the new endpoint beyond types.

## 4. Storefront (new UI) and classic site

- **Package cards and detail** use `options[].price`, as now.
- **Package detail "What's included"** shows the **selected option's** `items`: quantity × product name (linked), brand, and 2–4 key specs from `attributes`, labelled with the category schema where available. Also:
  - an "In stock" or "Available to order" hint from `option.inStock`
  - options with `available:false` are hidden, and a package with no available options shows "Currently unavailable — contact us".
- **Classic site:** keeps working because `price` and `kits` are still present on every option.
- **Cart:** the add-to-cart mapping is unchanged. It still uses option index 0/1 (without/with solar). Composed options keep those names, and a package with other option names still maps by index, as today.

## 5. Docs (required every round, owner instruction)
- `PRODUCT_REQUIREMENTS.md`: add or modify the requirement sections for composed packages, pricing adjustment, in-store sales, the sales rep role capability, the storefront switch and realtime updates. Record changes in a "Change log" section at the end with the date.
- `docs/USER_GUIDE.md` ("How to use the Juwon Electric platform"): user stories and step-by-step guides per persona: Owner/Super admin, Admin, Sales rep, Inventory manager, Engineer, HR, Support, Customer. Keep it in plain language, and update it whenever features change.
