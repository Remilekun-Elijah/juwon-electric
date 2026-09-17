Juwon Electric — Product Requirements Document (PRD)

Title: Juwon Electric — Solar Commerce & Installation Platform
Prepared by: Juwon Electric Product Team
Date: 2026-09-16
Last updated: 2026-09-17 (see section 12, Change log)

1. Executive summary

Juwon Electric is an integrated solar commerce and installation platform that enables customers to discover, purchase, and schedule installation for solar and electrical products and packages. The platform also equips administrators and field staff with inventory management, order fulfillment, installation workflow, and hiring (vacancies) tools.

2. Objectives

- Launch an e-commerce storefront tailored to solar/electrical products and packages
- Provide admin tools for inventory, orders, staff/engineer assignment, and notifications
- Support installation jobs with assignment, scheduling, and completion reporting
- Offer a public-facing vacancies module with rich-text job descriptions and CRUD for HR
- Migrate frontend to Next.js to improve SEO for public pages and enable SSG for packages and vacancies
- Let sales reps record in-store sales in the same system as website orders, so stock, revenue and installations stay in one place (added 2026-09-17)
- Price packages from the products they contain, so a product price change never leaves a package price out of date (added 2026-09-17)

3. Stakeholders

- Business owner / admins
- Inventory managers
- Sales agents (including in-store sales reps)
- Engineers / field staff
- Customer support staff
- Customers (consumers/SMBs seeking solar packages)
- HR team
- Developers / DevOps

4. Scope — In scope

- Product catalog: categories, products, package bundles
- Shopping cart and checkout (toggle for real payment gateway)
- Orders: lifecycle and basic payment status
- Inventory: stock tracking, reorder level, low-stock alerts
- Staff & engineer management and job assignment
- Installation job workflow (basic checklist and photo attachments)
- Vacancies module with rich-text job descriptions (admin CRUD + public listing)
- Admin dashboard & reporting (basic KPIs)
- Port frontend to Next.js (public pages SSG)
- In-store (sales rep) orders: product sales recorded from the admin console, collected now or delivered/installed later, with an optional discount that requires a reason (§6.9)
- Composed package pricing: package options built from products and quantities, with a computed products total, a fixed ₦ price adjustment and a public price (§6.1)
- New public storefront in the admin design language, on by default, with an environment switch back to the classic public UI (§6.10)
- Near-realtime catalogue updates: admin changes appear on the storefront on the next page view, and open pages refresh within about a minute (§6.10)

Out of scope (initial release)
- Complex promotions engine, loyalty, multi-currency pricing, advanced analytics
- Full-featured CI/CD beyond simple deployment pipeline
- Customer accounts and customer sign-in (website orders are placed without an account)
- Selling packages through in-store orders (in-store orders sell individual products only)
- Buying individual products on the website (products are a catalogue with specs and stock status; customers enquire or buy a package that includes them)
- File uploads (images and job photos are added as links)

5. User personas & user stories

Persona: Customer
- As a customer, I want to browse product packages and add items to a cart so I can buy a solar package.
- As a customer, I want to view package details and product specs so I can compare offerings.
- As a customer, I want to see exactly which products are included in each package option so I know what I am paying for.

Persona: Sales/Admin
- As an admin, I want to create and manage products and categories so the catalog stays accurate.
- As an inventory manager, I want to set reorder levels and receive alerts so we don’t run out of stock.

Persona: Sales rep (in-store sale)
- As a sales rep, I want to record a walk-in customer's purchase of products in the admin console so the sale, payment and stock are tracked with website orders.
- As a sales rep, I want to mark a sale as collected now so stock is deducted immediately and the order is closed as delivered.
- As a sales rep, I want to record a sale for later delivery or installation so it follows the normal fulfilment steps and can be assigned to an engineer.
- As a sales rep, I want to give a discount with a written reason so the owner can see why the price was reduced.

Persona: Inventory manager (composes packages from products)
- As an inventory manager, I want to build each package option from products and quantities so its price and contents always match the catalogue.
- As an inventory manager, I want to see whether each option's products are in stock so I know which packages we can deliver now.
- As an inventory manager, I want to be warned before I archive a product used in packages so I don't make options unavailable by accident.

Persona: Support
- As a support agent, I want to read and reply to customer messages from the admin console so replies are tracked against the enquiry.
- As a support agent, I want to look up orders, carts and installation jobs so I can answer customer questions without changing them.
- As a support agent, I want to see which messages are new so nothing is missed.

Persona: Owner (sets package markup)
- As the owner, I want to set a fixed ₦ adjustment (up or down) on each package option so I control the public price without editing every product.
- As the owner, I want package prices to follow product price changes automatically so margins stay predictable.
- As the owner, I want every discount and price change recorded in the activity log so I can review them.

Persona: Engineer
- As an engineer, I want to see assigned installation jobs and update status so the business can track progress.

Persona: HR
- As an HR admin, I want to create job vacancies with formatted descriptions and publish them so candidates can apply.

6. Features & requirements

6.1 Core commerce
- Products & Categories: CRUD, images, sanitized rich descriptions, attributes per category
- Packages (composed pricing; replaces "group multiple products as bundles with a single price", 2026-09-17):
  - Each package has up to 10 options (for example "Without solar" and "With solar"). Each option has its own list of products and quantities (up to 50 lines, quantity 1–1000, optional note) and its own adjustment.
  - Products total = Σ (current product price × quantity). It is computed at read time and cannot be edited.
  - Price adjustment: a fixed whole-naira amount, positive or negative, per option (default ₦0).
  - Public price = products total + price adjustment. It must be greater than ₦0. The public price is what the cart quotes, what the customer is charged and what the order records.
  - Product price changes flow through to every package option that uses the product, automatically, with no package edit.
  - A product can appear once per option. Hidden products may be components. Archived or deleted products cannot be added.
  - If a component product is later archived (or missing), the option becomes unavailable: it is hidden on the storefront and cannot be quoted or ordered. A package with no available option shows "Currently unavailable — contact us". Deleting a product used by any option is blocked ("Product is used by a package."); archiving is allowed after a warning.
  - Each option reports whether all its products are in stock for one package ("In stock" / "Available to order" on the storefront).
  - Legacy manual-price options (no products) stay supported, with their manual price and contents text, until they are composed. Existing packages keep working unchanged.
  - Package-level product lists are deprecated in favour of per-option products.
  - Public package responses never reveal the markup: products total, price adjustment and per-product unit prices are admin-only. Customers see the option price, availability, stock hint and the included products with their specs.
  - Admin editor per option: product picker (name, SKU, price, stock, status), rows of product/quantity/note, a read-only Products total, a Price adjustment (₦) input, the resulting Public price, and an "In stock" or "Short: <sku>" hint. The package list shows the public price per option and a "Composed" or "Manual price" badge.
  - Editing the price of a product used in packages shows "Used in N package options. Their prices will update."
  - Decision (2026-09-17): package editing stays with the `content:write` capability (Super admin, Admin and Sales). The inventory role does not compose or edit packages; inventory managers keep products, categories and stock accurate, and package prices follow those products automatically.
- Cart & Checkout: cart persistence, basic validation, toggle payment gateway visibility

6.2 Inventory
- Track stockQuantity per product
- reorderLevel per product and low-stock alerts (email)
- Inventory movements / adjustment records

6.3 Orders & Fulfillment
- Order schema storing items, amounts, paymentStatus, fulfillmentStatus
- Admin order view to change statuses and assign engineers
- If requiresInstallation, allow assignment of engineers and creation of InstallationJob
- Fulfilment steps: pending → processing → out for delivery → delivered → installed (installed only when installation is required); cancelled from any step before delivery. In-store orders may also be cancelled after delivery (a walk-in customer returns the goods), which restores their committed stock (§6.9). Payment statuses: pending, partial, paid, failed, refunded.
- Order line snapshot (2026-09-17): every order line stores, at the time the order is placed, the prices and (for package lines) the component products and quantities of the chosen option, plus the products total and adjustment. In-store product lines store product, SKU, quantity, unit price and line total.
- Stock is committed (moving to processing, or an in-store "collected now" sale) from the snapshot, not from the package's current contents, so recomposing a package never changes stock for orders already placed. Orders placed before snapshots existed fall back to the package's current products.
- Stock commit is all-or-nothing: if any product would go below zero, nothing changes and staff see the shortfall per product.
- Cancelling an order whose stock was committed restores stock through reversal movements. If a product has since been deleted, its restore is skipped, the cancellation still succeeds, and the activity log notes "stock not restored for deleted product <sku>".
- Orders have a channel: `website` or `in_store` (orders placed before this change read as `website`). The orders list can be filtered by channel and shows a channel badge; order details show who created an in-store order, subtotal, and discount with reason.

6.4 Installation jobs
- Job assignment, scheduling, checklist, photo uploads, completion notes
- Engineer mobile-friendly UI showing assigned jobs and ability to update

6.5 Vacancies (Jobs) module — HR
- Admin CRUD for vacancies with fields: title, department, location, employmentType, salaryRange, description (rich-text), requirements[], responsibilities[], status (draft/open/closed)
- Public listing page and vacancy detail page rendering sanitized HTML
- Role-based access: only HR/admin roles can CRUD vacancies
- Acceptance: create/edit/delete/publish a vacancy; public can view listings and details

6.6 Users & Roles
- Roles (as implemented, 2026-09-17): superadmin, admin, inventory, sales, engineer, hr, support. The earlier `customer` role is not an admin role: customers have no accounts in this release.
- Admin pages gated by role; engineer views limited to assigned jobs
- Access is granted by capabilities attached to each role; the server enforces every capability and the admin console hides what a role cannot use. A missing capability returns "You do not have permission to perform this action."
- Only a super admin can create or change Super admin and Admin accounts. No one can change their own role or deactivate themselves, and the last active super admin cannot be demoted or deactivated. Deactivating an account signs it out everywhere.
- Capability summary per role:

| Role | What the role can do |
|---|---|
| superadmin (owner) | Everything, including capabilities added later; manage Super admin and Admin accounts |
| admin | Everything except the engineer "My jobs" view; cannot manage Super admin or Admin accounts |
| inventory | Dashboard; view settings; view packages, services and portfolio; create and edit products and categories; view and adjust stock and run the low-stock check; view orders and carts |
| sales | Dashboard; view settings; create and edit packages, services, portfolio and customer segments; view products and stock; view orders and carts; create in-store orders (`orders:create`); update order payment, fulfilment and engineer; read and reply to messages and newsletter; view and assign installation jobs; view staff |
| engineer | "My jobs" only: see own assigned jobs, start them, tick the checklist, add photos and completion notes, complete them |
| hr | Dashboard; view settings; view and edit staff profiles; create, edit, publish, close and delete vacancies |
| support | Dashboard; view settings; view packages, services, portfolio and products; view orders and carts; read and reply to messages and manage newsletter subscribers; view installation jobs |

- All roles receive the admin notifications relevant to them (new orders for roles that can see orders, low stock for roles that can see inventory, vacancy posted for HR/admin, job assigned for the assigned engineer). Only superadmin and admin can see the activity log, manage accounts and change settings.

6.7 Settings & Notifications
- System settings for payment gate toggles, notification emails, upload provider
- Notifications: low-stock, new order, vacancy posted (optional)
- Settings sections: Business (name, email, phone, address, website; shown on the public site), Notifications (email lists for new orders, low stock and vacancies, up to 10 each), Payments (accept online payments; Paystack or Flutterwave), Inventory (default reorder level; low-stock alerts on/off), Uploads (image URLs).
- In-store orders raise the same new-order notification as website orders, with the channel recorded.

6.8 Non-functional requirements
- Security: sanitize rich text, protect admin endpoints with auth and role checks
- Performance: SSG for public pages (packages, vacancies) using Next.js
- Maintainability: modular backend models and clear API contracts
- Accessibility: admin forms and public pages meet basic a11y standards
- Admin sessions last at most 8 hours and end after 2 hours without activity.

6.9 In-store sales (added 2026-09-17)
- Who: accounts with the `orders:create` capability (superadmin, admin, sales). The Orders screen shows a "New in-store sale" button that opens a full, mobile-friendly page.
- What is sold: products only (active or hidden; archived products cannot be sold). 1–50 lines, each product once, quantity 1–1000.
- Customer details: name and phone required (same rules as website orders); email optional; delivery address required when fulfilment is "later".
- Pricing: each line is priced from the catalogue (current product price × quantity); reps cannot type prices. Subtotal = Σ line totals.
- Discount: optional whole-naira amount from ₦0 up to the subtotal. A discount above ₦0 requires a reason (3–200 characters). Total = subtotal − discount. The discount and reason are stored on the order, shown in order details, and written to the activity log ("In-store order for <name>: <n> items, ₦<total>; discount ₦<amount> (<reason>)").
- Fulfilment, chosen by the rep:
  - Collected now: in one all-or-nothing operation, stock is deducted for every line (sale movements linked to the order) and the order is saved as delivered. If any product is short, no order is created and the rep sees "Insufficient stock to process this order." with required and available quantities per product.
  - Deliver or install later: the order is saved as pending with no stock change and follows the normal fulfilment steps (§6.3). "Requires installation" is available only for this option, and engineer assignment and installation jobs work as for website orders.
- Payment status at creation: pending, partially paid or paid (paid records the paid date).
- Optional internal note (up to 500 characters).
- Records: channel `in_store` and the creating staff member. The website channel is `website`. The orders list filters by channel.
- Orders list display: fulfilment status and payment status are shown in separate labelled columns (on narrower screens both appear under the customer name, payment as a labelled "Payment:" line). Payment labels shown to staff: Unpaid (pending), Part-paid (partial), Paid, Failed, Refunded. A cancelled order whose payment is Paid or Part-paid is flagged "Refund due" in the list and in the order details until payment is set to Refunded.
- Returns (decision 2026-09-17): an in-store order can be cancelled even after it is delivered (for example a walk-in customer returns the goods). Cancelling restores the stock taken for it through Sale reversed movements and is written to the activity log. Payment status is not changed automatically; if money is given back, staff set the payment status to Refunded. Website orders still cannot be cancelled once delivered.
- Dashboard revenue uses order totals, so discounts are reflected.

6.10 Public storefront (added 2026-09-17)
- Organisation: the storefront is built around the customer journeys in §5: discover packages (home, package finder, packages list with type and kVA filters and price sort), compare and understand options (package detail with option picker and "What's included" per option: quantity, product name, brand and key specs), browse products and specs (category navigation, search, specs table, "Included in these packages", "Ask about this product"), buy (cart and checkout with the payment note), trust (services, customer segments, portfolio), careers (vacancies with filters and apply by email) and contact (form prefilled from a topic, business details from Settings, newsletter sign-up).
- Design: matches the admin console (same font, colours, cards, badges and components); plain everyday icons only; mobile-first and checked at phone, tablet and desktop widths.
- Default and switch: the new storefront is the default public site. Setting the environment variable `NEXT_PUBLIC_PUBLIC_UI=classic` serves the classic public UI instead. Both share the same public URLs, cart storage and order payloads, so a cart started in one works in the other.
- Only packages are purchasable online; products show price and stock status ("In stock" / "Out of stock"; low stock is never shown publicly) and lead to an enquiry or to packages that include them.
- Realtime and revalidation:
  - Every successful admin change to packages, products, categories, inventory, orders, services, portfolio, vacancies or settings triggers on-demand revalidation of the affected storefront data, so the change appears on the next page view.
  - Open storefront pages refresh every 60 seconds while visible and when the tab regains focus (after at least 15 seconds), without interrupting a customer who is typing.
  - When the admin console and the storefront are open in the same browser, open storefront pages refresh immediately after an admin change.
  - Pages also revalidate on a 60-second time basis as a safety net. The revalidation endpoint accepts only a valid admin session.
- Outage behaviour: if the backend is unavailable, visitors keep getting the last good version of each page; a page never cached shows a friendly error with a retry button. Fallback content is never cached over real data.
- Accessibility: skip link, landmarks, one heading 1 per page, visible focus, labelled inputs, 44 px touch targets, announced cart count changes, and loading, empty and error states for every data view.
- SEO: canonical public URLs, sitemap and robots shared with the classic site, structured data (Product on product pages, JobPosting on vacancy pages when a location is given, Organization), and noindex on cart, checkout and confirmation pages.
- Checkout payment note follows Settings: with online payments off, "No payment now: we'll call to confirm and arrange payment"; with them on, "You'll receive a secure payment link after we confirm your order". Bot protection (Turnstile) applies to orders, contact and newsletter sign-up.

7. Acceptance criteria (selected)

- Product CRUD: create a product with images and rich-text description; product appears on public catalog
- Vacancies: admin can create a vacancy with React Quill; status open shows on public listing; detail page renders formatted description safely
- Inventory alerts: when stockQuantity <= reorderLevel, system sends email to configured addresses
- Order lifecycle: admin can update order status; if installation required, an installation job can be created and assigned
- Next.js migration: public pages for packages and vacancies are served statically and match content from the Vite site
- Composed pricing: an option with 1 × product A (₦500,000) and 4 × product B (₦200,000) and an adjustment of +₦50,000 shows products total ₦1,300,000 and public price ₦1,350,000 in admin; the storefront, cart quote and new order all use ₦1,350,000; public package responses contain no products total or adjustment. Changing product B's price to ₦210,000 changes the public price to ₦1,390,000 without editing the package. A negative adjustment lowers the price; an adjustment that makes the price ₦0 or less is rejected. Archiving product A makes the option unavailable on the storefront and in the cart.
- Order snapshot: after an order is placed, recomposing the package and then moving the order to processing deducts the quantities recorded on the order, not the new composition. Cancelling a processed order whose product was since deleted succeeds and notes the skipped restore in the activity log.
- In-store sale, collected now: a sales rep records 2 × a product with 5 in stock as collected now; the order is created as delivered with channel In store, stock drops to 3, and a Sale movement references the order.
- In-store sale, later: the same sale with "Deliver or install later" and a delivery address creates a pending order with no stock change; with "Requires installation" an engineer can be assigned and a job created.
- In-store sale, stock shortfall: a collected-now sale of 6 against 5 in stock shows "Insufficient stock to process this order." with required 6 and available 5, creates no order and changes no stock.
- In-store return: cancelling a delivered in-store order (collected now) sets it to cancelled, restores its stock with Sale reversed movements and records the change in the activity log; cancelling a delivered website order is rejected.
- Discount reason: a discount above ₦0 without a reason (or with fewer than 3 characters) is rejected; a discount greater than the subtotal is rejected; a valid discount reduces the total and appears with its reason on the order and in the activity log.
- Capability: an inventory, engineer, HR or support account cannot create an in-store order (no button, and the server returns "You do not have permission to perform this action.").
- Storefront toggle: with `NEXT_PUBLIC_PUBLIC_UI` unset the new storefront is served at the public URLs; with `NEXT_PUBLIC_PUBLIC_UI=classic` the classic site is served at the same URLs; `/storefront/...` URLs redirect to the public path in both modes.
- Admin edit reflected on the storefront: changing a product price (or a package adjustment) in the admin console shows the new price on the next storefront page view; an already open storefront page in the same browser updates immediately, and in another browser within about a minute.

8. Metrics & success criteria

- Time to publish a vacancy: <10 minutes for admins
- Percentage of orders with scheduled installation properly assigned: >90% after rollout
- Reduction in stock-outs for tracked SKUs: 80% fewer incidents within 3 months (measured vs baseline)
- Page load improvement for public pages after Next.js migration: 20% faster first contentful paint (target)
- Share of in-store sales recorded in the system (vs paper): target set by the owner after the first month
- Package prices out of line with product prices: zero (composed options)

9. Release plan & milestones

Sprint 0 (setup)
- Create project branch, add models skeleton, configure roles

Sprint 1 (MVP)
- Product & categories CRUD
- Vacancies admin CRUD and public listing
- Basic cart & checkout toggle

Sprint 2
- Inventory basics and low-stock email alerts
- Orders admin view, assign engineers

Sprint 3
- Installation job flow and engineer mobile UI
- Reports & dashboard basics

Sprint 4
- Next.js migration of public pages and deploy to Vercel
- Polishing, tests, and documentation

Commerce v2 round (2026-09-17)
- Composed package pricing and order line snapshots
- In-store sales for sales reps
- New public storefront with classic switch and near-realtime updates
- PRD and user guide (docs/USER_GUIDE.md) updated with every feature change

10. Risks & mitigation

- Rich-text security: sanitize server-side and limit allowed tags/attributes. Use `sanitize-html` and disallow scripts.
- Migration risk for Next.js: keep the Vite app until Next.js validated, migrate incrementally
- Email reliability: use well-tested SMTP provider and implement retries
- Package prices change when product prices change: staff are warned when editing a product used in packages, and every price change is audited.
- Discount misuse: discounts require a reason and are recorded against the staff member in the activity log.
- Storefront regressions: the classic public UI stays available behind `NEXT_PUBLIC_PUBLIC_UI=classic`.

11. Appendix
- Link to technical plan: /PLATFORM_PLAN.md
- Vacancy schema example and sanitization guidance included in PLATFORM_PLAN.md
- API contract: docs/agents/API_CONTRACT_V3.md; commerce addendum: docs/agents/COMMERCE_V2.md; storefront spec: docs/agents/fe-storefront.md
- Staff user guide: docs/USER_GUIDE.md

Open items for owner review
- Storefront order confirmation says "Delivery within Lagos is free." This is not confirmed by the business. Status: to be reviewed later (owner, 2026-09-17). Keep or remove once confirmed.

12. Change log

2026-09-17 (orders list)
- §6.9: orders list shows fulfilment and payment in separate labelled columns, payment labels Unpaid/Part-paid, and a "Refund due" flag on cancelled paid or part-paid orders.

2026-09-17 (later)
- §6.1: recorded the owner's decision that the inventory role does not edit packages (package editing stays with Super admin, Admin and Sales).
- §6.3, §6.9, §7: in-store orders can be cancelled after delivery (returns), restoring stock; payment status is updated separately; added the acceptance criterion.
- §11 Open items: added the "Delivery within Lagos is free" storefront message, to be reviewed by the owner.

2026-09-17
- §2, §3: added objectives for in-store sales and composed package pricing; added support staff as a stakeholder.
- §4: added in-store (sales rep) orders, composed package pricing, the new storefront with the classic switch, and near-realtime catalogue updates; clarified out-of-scope items (customer accounts, in-store package sales, online product purchase, file uploads).
- §5: added personas Sales rep, Inventory manager (composing packages), Support and Owner (package markup), and a customer story for package contents.
- §6.1: rewrote Packages for composed pricing (products total, fixed ₦ adjustment, public price, automatic price flow, archived components, legacy manual prices, markup hidden publicly); recorded the open item on package editing permission for the inventory role.
- §6.3: added order line snapshots, snapshot-based stock commit, cancel restoring stock when a product was deleted, fulfilment and payment statuses, and order channel.
- §6.6: replaced the role list with the implemented roles (no customer role) and added a capability summary per role.
- §6.7: listed Settings sections; in-store orders raise the new-order notification.
- §6.8: recorded admin session limits.
- §6.9: new section, In-store sales.
- §6.10: new section, Public storefront.
- §7: added acceptance criteria for composed pricing, order snapshots, in-store sales (collected now, later, stock shortfall), discount reason, capability, storefront switch and admin edits reaching the storefront.
- §8–§11: added metrics, the Commerce v2 release milestone, risks and links to the contract documents and user guide.

2026-09-16
- First version.


End of PRD
