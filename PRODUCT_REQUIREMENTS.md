Juwon Electric — Product Requirements Document (PRD)

Title: Juwon Electric — Solar Commerce & Installation Platform
Prepared by: Juwon Electric Product Team
Date: 2026-09-16
Last updated: 2026-09-17, Team page and home redesign (see section 12, Change log)

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
- Online product purchase (added in Commerce v3, 2026-09-17): customers add individual active, in-stock products to the same cart as packages and order them on the website (§6.10)
- Installation crews: up to 10 engineers per installation job, one of them the lead, with one installation job per order (§6.3, §6.4)
- Package categories: a package can belong to a catalogue category and is listed on that category's storefront page (§6.1, §6.10)
- Website content managed in the admin (Landing v1, 2026-09-17): FAQs, customer reviews and client logos; case-study details on portfolio items; homepage stats, WhatsApp number and business hours; financing terms; and the solar calculator settings (§6.11)
- A richer home page built from that content, with every section hidden when it has no data, plus new public pages `/calculator` and `/faq`, a portfolio category filter and a floating WhatsApp button (§6.11)
- Clearly labelled sample content for local development and review, seeded locally only and replaced before launch (§6.11, §11 Before launch checklist)
- Team page (2026-09-17): team members managed in the admin (Website → Team) and a public "Meet the team" page at `/team` (§6.11)
- Home page redesign (2026-09-17): a transparent header over a full-bleed photo hero, hero stats, floating "Size your system" and WhatsApp buttons, a darker section rhythm, a dark footer, and storefront-wide motion that respects reduced motion (§6.10)

Out of scope (initial release)
- Complex promotions engine, loyalty, multi-currency pricing, advanced analytics
- Full-featured CI/CD beyond simple deployment pipeline
- Customer accounts and customer sign-in (website orders are placed without an account)
- Selling packages through in-store orders (in-store orders sell individual products only)
- ~~Buying individual products on the website~~: moved in scope in Commerce v3 (2026-09-17). Customers can now buy active, in-stock products online (§4, §6.10).
- Customer-facing stock reservation: placing a website order does not hold stock; stock is taken when staff move the order to processing
- File uploads (images and job photos are added as links)
- Online financing applications, credit checks or loan approval: the financing section only shows terms set in Settings; customers talk to the team to apply (Landing v1)
- Saving calculator results or collecting customer details from the calculator (Landing v1)
- Copying any wording, images, logos, statistics, reviews, prices, office lists or financing numbers from the reference site used for layout ideas (Landing v1)

5. User personas & user stories

Persona: Customer
- As a customer, I want to browse product packages and add items to a cart so I can buy a solar package.
- As a customer, I want to view package details and product specs so I can compare offerings.
- As a customer, I want to see exactly which products are included in each package option so I know what I am paying for.
- As a customer, I want to buy a single product (for example a replacement battery) online, on its own or together with a package, so I don't have to visit the store or buy a whole package. (Commerce v3)
- As a customer, I want to enter the appliances I use and how long I use them so I get an estimate of the inverter, battery and panels I need, see matching packages, and compare the cost with running a generator. (Landing v1)
- As a customer, I want to read common questions and answers, see reviews and past installations like mine, and message the team on WhatsApp so I can decide with confidence. (Landing v1)

Persona: Owner / Admin (website content, Landing v1)
- As the owner, I want to publish only real reviews from customers who agreed to be quoted, and remove the sample reviews, so the website stays honest.
- As the owner, I want to set the homepage stats, WhatsApp number, business hours, financing terms and calculator settings in Settings, and switch financing or the calculator off, so the website only shows what we actually offer.
- As the owner, I want every piece of sample content labelled in the admin and on the website so nothing made-up goes live by mistake.

Persona: Marketing / Admin (FAQs and website content, Landing v1)
- As a marketing or admin staff member (Admin or Sales role), I want to add, edit, reorder, group by category and hide FAQs so customers find answers without calling.
- As a marketing or admin staff member, I want to add client logos (with the client's permission) and case-study details to portfolio items so the home page shows real work.

Persona: Sales/Admin
- As an admin, I want to create and manage products and categories so the catalog stays accurate.
- As an inventory manager, I want to set reorder levels and receive alerts so we don’t run out of stock.

Persona: Sales rep (in-store sale)
- As a sales rep, I want to record a walk-in customer's purchase of products in the admin console so the sale, payment and stock are tracked with website orders.
- As a sales rep, I want to mark a sale as collected now so stock is deducted immediately and the order is closed as delivered.
- As a sales rep, I want to record a sale for later delivery or installation so it follows the normal fulfilment steps and can be assigned to an engineer.
- As a sales rep, I want to give a discount with a written reason so the owner can see why the price was reduced.
- As a sales rep, I want to record a sale for a walk-in customer who doesn't give a name or phone number so the sale and stock are still recorded without inventing details. (Commerce v3)

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
- As an engineer on a crew, I want to see who else is on the job and update it myself so the crew doesn't wait for the lead. (Commerce v3)

Persona: Admin (installation crews)
- As an admin, I want to assign a crew of engineers to an installation job and choose the lead so large installations are staffed and everyone on the crew knows the job. (Commerce v3)
- As an admin, I want an order to have only one active installation job so the same installation isn't booked twice. (Commerce v3)

Persona: HR
- As an HR admin, I want to create job vacancies with formatted descriptions and publish them so candidates can apply.

6. Features & requirements

6.1 Core commerce
- Products & Categories: CRUD, images, sanitized rich descriptions, attributes per category
  - A category can't be deleted while it has subcategories, products or packages ("Category has subcategories, products or packages."). (Packages added in Commerce v3.)
  - Products with status Active are sold on the website when in stock (§6.10). Hidden products are not sold online but can still be package components and in-store sale lines. Archived products are not sold anywhere.
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
  - Category (Commerce v3): a package can optionally belong to one catalogue category, chosen in the package editor's Category select (the category tree, indented, with a "No category" option). The category must exist ("Category not found."). The package list shows the category name. On the storefront the package page shows the category, and the category's page lists its packages (including packages in its subcategories) above its products. The older free-text package category field is kept unchanged.
  - Public package responses never reveal the markup: products total, price adjustment and per-product unit prices are admin-only. Customers see the option price, availability, stock hint and the included products with their specs.
  - Admin editor per option: product picker (name, SKU, price, stock, status; focusing the empty search lists the first 20 products by name straight away, and typing filters), rows of product/quantity/note, a read-only Products total, a Price adjustment (₦) input, the resulting Public price, and an "In stock" or "Short: <sku>" hint. The package list shows the public price per option and a "Composed" or "Manual price" badge.
  - Editing the price of a product used in packages shows "Used in N package options. Their prices will update."
  - Decision (2026-09-17): package editing stays with the `content:write` capability (Super admin, Admin and Sales). The inventory role does not compose or edit packages; inventory managers keep products, categories and stock accurate, and package prices follow those products automatically.
- Cart & Checkout: cart persistence, basic validation, toggle payment gateway visibility. Since Commerce v3 one cart holds packages and products together (§6.10).

6.2 Inventory
- Track stockQuantity per product
- reorderLevel per product and low-stock alerts (email)
- Inventory movements / adjustment records

6.3 Orders & Fulfillment
- Order schema storing items, amounts, paymentStatus, fulfillmentStatus
- Admin order view to change statuses and assign engineers
- If requiresInstallation, allow assignment of engineers and creation of InstallationJob
- One installation job per order (Commerce v3): an order can have only one installation job that isn't cancelled. Creating a second is refused with "This order already has an installation job." and nothing is created. Once the existing job is cancelled, a new job can be created. In order details the admin hides "Create job" while a job exists, shows the note "This order already has an installation job." and links to the job.
- Order details list every engineer on the order's job, lead first. The order-level "Assigned engineer" is unchanged; a job created without engineers on an order that has an assigned engineer starts with that engineer as its crew.
- Installation default (decision 2026-09-17, refined in Commerce v3): packages are sold with installation, so a new website order starts with "Requires installation" on when it contains at least one package. A website order containing only products starts with it off. Staff can turn it off (for example, the customer arranges their own installer) unless the order has open installation jobs. Orders placed earlier keep their setting. In-store orders choose it on the sale page.
- Fulfilment steps: pending → processing → out for delivery → delivered → installed (installed requires the order to be flagged for installation; the admin offers "Mark as installed" on every delivered order and, after confirmation, turns the flag on and moves the order in one update); cancelled from any step before delivery. In-store orders may also be cancelled after delivery (a walk-in customer returns the goods), which restores their committed stock (§6.9). Payment statuses: pending, partial, paid, failed, refunded.
- Order line snapshot (2026-09-17): every order line stores, at the time the order is placed, the prices and (for package lines) the component products and quantities of the chosen option, plus the products total and adjustment. In-store product lines, and website product lines since Commerce v3, store product, SKU, quantity, unit price and line total.
- Stock is committed (moving to processing, or an in-store "collected now" sale) from the snapshot, not from the package's current contents, so recomposing a package never changes stock for orders already placed. Orders placed before snapshots existed fall back to the package's current products.
- Stock commit is all-or-nothing: if any product would go below zero, nothing changes and staff see the shortfall per product.
- Cancelling an order whose stock was committed restores stock through reversal movements. If a product has since been deleted, its restore is skipped, the cancellation still succeeds, and the activity log notes "stock not restored for deleted product <sku>".
- Orders have a channel: `website` or `in_store` (orders placed before this change read as `website`). The orders list can be filtered by channel and shows a channel badge; order details show who created an in-store order, subtotal, and discount with reason.

6.4 Installation jobs
- Job assignment, scheduling, checklist, photo uploads, completion notes
- Engineer mobile-friendly UI showing assigned jobs and ability to update
- Crews (Commerce v3):
  - A job has a crew of 0 to 10 engineers, each listed once. Every crew member must be an active account with the Engineer role ("Assignee must be an active engineer."). Adding the same engineer twice is refused ("Each engineer can be added once."), and more than 10 is refused ("A job can have at most 10 engineers.").
  - The first engineer in the crew is the **lead**. Staff can make any crew member the lead.
  - A job with at least one engineer that hasn't started is Assigned; a job with no engineers is Unassigned. Only open jobs that haven't started can be reassigned; to change the crew of a started job, cancel it and create a new one.
  - Every crew member sees the job in My jobs and can update it (start, checklist, photos, notes, complete), not only the lead. My jobs shows the other crew members ("With: Name, Name").
  - The job-assigned notification goes to each engineer newly added to the crew (on create, edit or reassign). Engineers already on the job are not notified again.
  - The Installations list and job drawer show the crew, lead first, and the engineer filter matches any crew member. The activity log lists the crew's emails.
  - Jobs created before crews read as a crew of their single engineer (or none).
- Job dialog pickers (Commerce v3):
  - Scheduled for: a date-and-time picker with a month calendar (previous and next month, today highlighted, past dates allowed but marked as past), times in 15-minute steps shown in Lagos time (for example 9:00 AM), a display like "Thu 18 Sep 2026, 10:30 AM" and a Clear button. Keyboard accessible.
  - Estimated duration: an hours (0–24) and minutes (0, 15, 30, 45) picker shown as, for example, "2 h 30 min", with a Clear option. When set it must be at least 15 minutes.

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
| engineer | "My jobs" only: see jobs where they are on the crew (Commerce v3), start them, tick the checklist, add photos and completion notes, complete them |
| hr | Dashboard; view settings; view and edit staff profiles; create, edit, publish, close and delete vacancies |
| support | Dashboard; view settings; view packages, services, portfolio and products; view orders and carts; read and reply to messages and manage newsletter subscribers; view installation jobs |

- All roles receive the admin notifications relevant to them (new orders for roles that can see orders, low stock for roles that can see inventory, vacancy posted for HR/admin, job assigned for each engineer newly added to a job's crew). Only superadmin and admin can see the activity log, manage accounts and change settings.

6.7 Settings & Notifications
- System settings for payment gate toggles, notification emails, upload provider
- Notifications: low-stock, new order, vacancy posted (optional)
- Settings sections: Business (name, email, phone, address, website; shown on the public site), Notifications (email lists for new orders, low stock and vacancies, up to 10 each), Payments (accept online payments; Paystack or Flutterwave), Inventory (default reorder level; low-stock alerts on/off), Uploads (image URLs). Landing v1 adds Website, Financing and Calculator (§6.11).
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
- Product search (Commerce v3): focusing the empty search field lists the first 20 products by name straight away (name, SKU, price, stock and status); typing filters. The list works with arrow keys, Enter and Esc, shows a loading state and doesn't take over the whole screen on phones.
- Customer details (changed in Commerce v3): name, phone and email are all optional; delivery address is still required when fulfilment is "later". The fields show the helper text "Leave blank for walk-in customers."
  - A blank name is saved as "Walk-in customer", and the sale summary, order details, activity log and notifications use that name (for example "In-store order for Walk-in customer: …").
  - A blank phone is saved as no phone, and the admin shows "No phone".
  - A name that is given must be 1–100 characters; a phone number that is given must pass the usual phone check.
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
- ~~Home hero (2026-09-17): headline, "Shop packages" and "Talk to an engineer" calls to action, reassurance points (no payment to place an order, confirmation call, installation included), "Shop by battery type" shortcuts with live package counts, an installation photo with the live starting package price ("Complete packages from ₦…"), and a strip of three trust points.~~ Replaced by the home page redesign below (2026-09-17). The "Shop by battery type" shortcuts moved to the "Find your package" section header.
- Organisation: the storefront is built around the customer journeys in §5: discover packages (home, package finder, packages list with type and kVA filters and price sort), compare and understand options (package detail with option picker and "What's included" per option: quantity, product name, brand and key specs), browse products and specs (category navigation, search, specs table, "Included in these packages", "Ask about this product", and since Commerce v3 "Add to cart"), buy (one cart for packages and products, and checkout with the payment note), trust (services, customer segments, portfolio, and since 2026-09-17 the team page), careers (vacancies with filters and apply by email) and contact (form prefilled from a topic, business details from Settings, newsletter sign-up).
- Design: matches the admin console (same font, colours, cards, badges and components); plain everyday icons only; mobile-first and checked at phone, tablet and desktop widths.
- Default and switch: the new storefront is the default public site. Setting the environment variable `NEXT_PUBLIC_PUBLIC_UI=classic` serves the classic public UI instead. Both share the same public URLs, cart storage and order payloads, so a cart started in one works in the other.
- ~~Only packages are purchasable online~~ (replaced in Commerce v3). Products show price and stock status ("In stock" / "Out of stock"; low stock is never shown publicly), an enquiry link and the packages that include them, and can be bought online:
  - Product page: a quantity stepper (1 up to 10, or the stock if lower) and **Add to cart**. When the product is out of stock the page shows **Out of stock** and the button is disabled; "Ask about this product" stays. After adding, a message offers **View cart**.
  - Product cards (catalogue grid and the home page's popular products) show a compact **Add to cart** button when the product is in stock.
  - Only products with status Active and enough stock are sold online. Hidden and archived products are not.
  - One cart: package lines and product lines share the cart, the header cart count and the 50-line limit. Product lines show image, name, SKU, quantity stepper (1–100), remove and line total. Product lines are stored separately in the browser, so the classic public UI keeps working with package lines and ignores product lines.
  - Prices: product lines are quoted at the product's current price. A product that is no longer active or doesn't have enough stock for the quantity is flagged as unavailable in the cart, like package lines, and checkout rejects the order with "Some items in your cart are no longer available. Please refresh your cart."
  - Stock: placing an order doesn't change stock. Stock is taken when staff move the order to processing, from the order's recorded lines.
  - Orders: product lines are recorded with product, SKU, name, quantity, unit price and line total, and count in the order total. Orders with only products start with "Requires installation" off; orders with any package start with it on (§6.3).
  - Emails: order confirmation emails list product lines as "<quantity> × <name> (<SKU>)" with prices.
  - A cart with only packages sends exactly the same order as before this change.
- Package categories (Commerce v3): the package page shows the package's category in the breadcrumb and above the title when it has one. A category page lists "Packages in <category>" above its products when that category (or its subcategories) has packages. Package cards may show the category name.
- Realtime and revalidation:
  - Every successful admin change to packages, products, categories, inventory, orders, services, portfolio, vacancies or settings triggers on-demand revalidation of the affected storefront data, so the change appears on the next page view.
  - Open storefront pages refresh every 60 seconds while visible and when the tab regains focus (after at least 15 seconds), without interrupting a customer who is typing.
  - When the admin console and the storefront are open in the same browser, open storefront pages refresh immediately after an admin change.
  - Pages also revalidate on a 60-second time basis as a safety net. The revalidation endpoint accepts only a valid admin session.
- Outage behaviour: if the backend is unavailable, visitors keep getting the last good version of each page; a page never cached shows a friendly error with a retry button. Fallback content is never cached over real data.
- Accessibility: skip link, landmarks, one heading 1 per page, visible focus, labelled inputs, 44 px touch targets, announced cart count changes, and loading, empty and error states for every data view.
- SEO: canonical public URLs, sitemap and robots shared with the classic site, structured data (Product on product pages, JobPosting on vacancy pages when a location is given, Organization), and noindex on cart, checkout and confirmation pages.
- Checkout payment note follows Settings: with online payments off, "No payment now: we'll call to confirm and arrange payment"; with them on, "You'll receive a secure payment link after we confirm your order". Bot protection (Turnstile) applies to orders, contact and newsletter sign-up.

Home page redesign (added 2026-09-17)

Contract: docs/agents/TEAM_AND_MOTION_V1.md §5 and §7. The owner asked for a less white home page and a header area like a reference screenshot, with animations. We match the look and motion only. None of the reference's registration number, founding year, customer counts, city list, wording or photos are used.

- Colour: a gold accent scale taken from the Juwon Electric logo. Gold is used only as an accent on dark surfaces (slate-950, slate-900 or brand-950): highlighted headline words, stat numbers and primary buttons on dark. Text on gold buttons is dark (slate-950). Body text keeps a contrast of at least 4.5:1.
- Header:
  - On the home page, while the page is at the top (scrolled less than 24 px), the header is transparent over the hero: white nav links with a gold underline on the active item, the logo on a small white chip, a white phone link, a glass cart button and a gold **Get a quote** pill linking to `/contact?topic=Quote`. On phones the menu button is glass too.
  - After scrolling, and on every other page, it is the solid white header. The change fades over 250 ms. The header height never changes, and the hero reserves room for it, so nothing shifts.
  - This is the only scroll listener on the storefront (passive, at most one check per animation frame).
- Hero (full-bleed):
  - Edge to edge, about one screen tall (at least 640 px, at most 920 px), under the transparent header.
  - Background slideshow of 4 of our own installation photos. The first loads straight away; the others load later. Photos crossfade every 7 seconds, and the photo on screen zooms in slowly. Dark gradients keep the text readable on every photo.
  - Progress bars: 4 thin bars at the bottom centre. The current bar fills in gold over 7 seconds. Selecting a bar shows that photo. A visible pause/play button sits next to the bars ("Pause the photo slideshow" / "Play the photo slideshow"). The slideshow also pauses while the mouse is over the hero or keyboard focus is inside it.
  - Content: a glass pill "Inverter, battery & solar systems in Lagos" with a softly pulsing green dot; the headline "Reliable power for Lagos homes and **businesses**" with the last word in a gold gradient, each line rising into view; the lead paragraph; a gold **Shop packages** button and a glass **Chat on WhatsApp** button (when a WhatsApp number is set; otherwise **Talk to an engineer**, which calls).
  - Stats: up to 4 figures from Settings → Website stats, in large gold numbers that count up, with uppercase labels. A Sample label shows while the stats are sample. With no stats, the three reassurance ticks show instead (no payment to place an order, we call to confirm, installation included). The separate stats band below the hero is removed.
  - Glass price card: "Complete packages from ₦…" in gold with an arrow link to the packages, bottom right of the hero. It shows only on wide screens (1280 px and up, so it doesn't cover the stats or the floating buttons) and only when there is a priced package.
  - Scroll cue: "Scroll" with a gold dot sliding down a line, bottom left, on screens 640 px and wider. It scrolls to the next section. Hidden under reduced motion.
  - On load the pill, headline lines, lead, buttons, stats and price card appear one after another (about 100 ms apart). All of it is in the page HTML.
- Floating actions (replace the single floating WhatsApp button): a stack at the bottom right, clear of the phone's safe area.
  - **Size your system** (sub-label "Load calculator"): a gold pill linking to `/calculator`. Shown only when the calculator is switched on, and not on the calculator page itself.
  - **Chat on WhatsApp** (sub-label "We reply during business hours"): a brand-red pill opening WhatsApp. Shown only when a WhatsApp number is set.
  - Hidden on `/cart` and `/checkout`, so they never cover the order buttons.
  - They slide in from the right about 1.2 seconds after the page loads. On phones they are 56 px round buttons with an accessible name; on screens 640 px and wider they show the label and sub-label. While the footer is on screen they fade, so footer links stay readable.
  - No "online" status, no notification badge.
- Section rhythm (no two neighbouring sections share a white background), in page order:
  1. Hero: dark photo.
  2. Client logos: white; a slow marquee when there are more logos than fit.
  3. Why choose us: dark (slate-950), gold icon circles.
  4. Solutions ("Who we power"): light grey, image-led cards with the title on the photo.
  5. Find your package: white, with the "Shop by battery type" chips in the section header.
  6. Shop by category (restored): light grey.
  7. Popular products (restored; in-stock products with Add to cart): white.
  8. Size your system teaser: brand panel (brand-900) with a gold accent and a preview of calculator figures.
  9. Case studies: white, image cards.
  10. Reviews: light brand tint; stars fill one by one when the cards come into view.
  11. How it works: dark (slate-950), gold step numbers, the connecting line draws across.
  12. Financing (when switched on): white.
  13. FAQ: light grey; answers open smoothly.
  14. Careers teaser (restored; only when there are open vacancies): white, "We're hiring: N open roles" with up to 3 role titles and **See open roles**.
  15. Final call to action: brand red panel over an installation photo, eyebrow "Ready when you are", a gold **Shop packages** button, **Call**, and **Chat on WhatsApp** when set, followed by the business phone numbers, email, address and opening hours (the home page has no separate contact band).
  - Section eyebrows are gold on dark and brand red on light.
- Footer: dark (slate-950) on every storefront page, with white/70 text and gold hover links. Its Company column lists Services, Our work, **Meet the team**, Careers, FAQ and Contact us.

Motion and accessibility (storefront-wide, 2026-09-17)
- Built with CSS transitions and keyframes plus a small `IntersectionObserver` helper. No animation libraries and no scroll listeners (except the header check above).
- What moves: sections and card grids fade and slide in as they scroll into view (staggered, once); numbers count up (hero stats, team stats, the calculator teaser preview, the financing worked example); client logos marquee; cards lift, images zoom gently and arrows nudge on hover; buttons have a press state; How it works draws its line; review stars fill; FAQ answers open smoothly; calculator results tween; the header fades from transparent to solid; the floating actions slide in.
- Content stays visible without JavaScript and to search engines: everything is in the HTML and visible by default. The hidden "before" state is applied only after the page loads, and only to content that starts below the screen. Counting figures keep their final value in the markup; if scripts never run, the figures show within 3 seconds.
- Reduced motion (`prefers-reduced-motion: reduce`): no slideshow autoplay and no photo zoom (the bars still switch photos), no marquee (the static logo grid shows), no count-up (final values show at once), no entrance animations, no hover zoom or lift, no scroll cue. Fades are at most 150 ms.
- No layout shift: only `transform` and `opacity` animate, counting numbers reserve their final width, and the header height is fixed.
- Nothing flashes more than 3 times a second. Focus styles are unchanged and visible on dark surfaces.
- Honesty: no invented badges, counts, "online" status or claims. Figures come only from Settings or the data.

6.11 Website content and landing page (added 2026-09-17, Landing v1)

Contract: docs/agents/LANDING_V1.md.

Ground rules
- Ideas only, nothing copied: the home page follows the *structure and ideas* of a reference solar landing page. None of its wording, images, logos, statistics, reviews, prices, office lists or financing numbers are used. All content is Juwon Electric's own.
- Honest claims: the "Why choose us" cards state only what the platform already guarantees. No invented warranties, years in business or client counts, except in sample-flagged content that must be replaced before launch.
- Everything new is managed in the admin console. Nothing on the new home sections needs a developer to change.

Managed collections
- Three new collections under a new **Website** group in the admin menu: **FAQs**, **Reviews** and **Client logos**. A fourth, **Team**, was added on 2026-09-17 (see Team page below).
- Access: viewing needs `content:read` (Super admin, Admin, Inventory, Sales, Support); adding, editing, reordering and deleting need `content:write` (Super admin, Admin, Sales).
- Shared rules for all three:
  - Each item has a **Sort order** (lower shows first; ties show oldest first), an active switch (labelled **Show on the website** in the admin) and a **Sample** flag.
  - The website shows active items only. Inactive items stay in the admin.
  - Each screen has a create/edit drawer, the active switch and a delete confirmation.
  - Every create, update and delete is written to the activity log (`faq.*`, `testimonial.*`, `client.*`).
  - Image and logo fields accept a full `http(s)` link or a site path starting with `/` (letters, numbers, `.`, `_`, `-` and `/`, up to 200 characters), for example `/samples/client-1.svg`.
- FAQs:
  - Fields: Question (5–200 characters, required), Answer (1–2000 characters, plain text, line breaks kept, required), Category (optional, up to 60 characters, for example "Ordering", "Installation", "Products").
  - Admin list: category filter and **Move up** / **Move down** (▲▼) buttons to change the order (no drag and drop). The Category field suggests existing categories. Reviews and Client logos use the same Move up / Move down buttons.
  - Public: the home page shows the first 6; `/faq` shows all, grouped by category.
  - Messages: "FAQ created.", "FAQ updated.", "FAQ deleted.", "FAQ not found."
- Reviews (stored as testimonials):
  - Fields (admin labels): Customer name (1–100, required; for example "Adaeze O."), Context (optional, up to 150; for example "5kVA lithium system, Lekki"), Review (the quote, 10–1000, required), Rating (optional, 1–5 stars or No rating), Source (optional: Website, WhatsApp, Google, Facebook, In person), Photo URL (optional link or site path).
  - Rule: only real reviews from customers who agreed to be quoted. Don't edit a customer's meaning.
  - Admin list shows the star rating. Public: the home page reviews section (cards or a scroller that the customer moves; never auto-rotating) with stars, name, context and a source badge.
  - Messages: "Review created.", "Review updated.", "Review deleted.", "Review not found."
- Client logos (stored as clients):
  - Fields (admin labels): Client name (1–100, required; used as the logo's alt text), Logo (required link or site path), Website (optional).
  - Rule: only add a client's logo with the client's permission.
  - Admin shows a grid with a logo preview. Public: the home page client logos grid (up to 6 per row, greyscale until hovered).
  - Messages: "Client created.", "Client updated.", "Client deleted.", "Client not found."

Portfolio case-study fields
- Portfolio items gain four optional fields in the admin form: **Category** (a customer segment, chosen from a select; up to 60 characters), **Summary** (plain text, up to 500), **Location** (up to 100, for example "Lekki, Lagos") and **System** (up to 200, for example "10kVA inverter, 8 × 200Ah lithium, 12 × 550W panels").
- Older portfolio items show these as empty and keep working.
- An item counts as a **case study** when it has a Summary. The home page shows up to 3 case studies with image, category badge, location, system, summary and a link.
- `/portfolio` gains a category filter (`/portfolio?category=<segment>`), and cards show summary, location and system when present. The existing "Featured on the home page" setting keeps working.

Settings sections (Super admin and Admin change them; other staff view)
- Website:
  - Stats: up to 4 rows (**Add stat**), each a Label (1–40 characters) and a Figure (the value, 1–20, for example "500+"). Saved with **Save website**.
  - WhatsApp number: optional, same phone rule as the business phone.
  - Business hours: optional, up to 200 characters, several lines (for example "Mon–Fri 8am–6pm" on one line and "Sat 9am–3pm" on the next).
  - Public: all of it. Stats appear in the home hero (the separate stats band was removed on 2026-09-17, §6.10); WhatsApp and business hours in the footer; WhatsApp also drives the floating **Chat on WhatsApp** button, the hero button and the final call to action.
- Financing (off by default):
  - Fields: Enabled switch (**Show financing on the website**); Deposit (%) (whole number 0–100); Terms (months) (up to 6 different month counts, 1–60, shown in ascending order as chips); Monthly rate (%) (0–20, up to 2 decimals); Approval time (up to 60 characters, for example "24–48 hours"); Note (up to 300 characters). Saved with **Save financing**.
  - Public: every field only when Enabled is on. When off, the website receives nothing but "not enabled" and the financing section is hidden.
  - Financing on the website describes terms only. Customers can't apply or be approved online; they talk to the team.
- Calculator (off by default):
  - Enabled switch (**Show the calculator on the website**). Saved with **Save calculator**.
  - Appliances: up to 40 rows (**Add appliance**), each with a Key (lower-case letters, numbers and `-`, up to 40, unique; not typed by staff in the admin), Label (admin label **Appliance**, 1–40), Watts (whole number 1–10,000), Default hours a day (**Hours a day**, 0–24 in half-hour steps) and Default quantity (**Quantity**, whole number 0–20). Rows can be added, removed and reordered.
  - Parameters (admin group **Sizing assumptions**; defaults in brackets): Inverter headroom (%) (25; whole number 0–100), Battery depth of discharge (%) (80; 10–100), Battery voltage (48 V; 12 V, 24 V or 48 V), Panel watts (W) (550; 100–1000), Peak sun hours (4.5; 1–10, one decimal).
  - Generator costs: Fuel price per litre (₦) (whole number 0–100,000), Litres per kVA-hour (0–2, two decimals), Maintenance per month (₦) (whole number 0–10,000,000).
  - Public: every field only when Enabled is on. When off, `/calculator` and the home teaser are not shown.
- Notification emails and other private settings are never public.
- Each new section shows a **Sample** badge while it holds sample values.

Home page (section order; updated 2026-09-17 for the home page redesign, §6.10)
Every section hides itself when it has no data, so an empty collection or unset setting leaves no blank block (the fixed "Why choose us" and "How it works" always show).
1. Hero (§6.10), with up to 4 stats from Website stats. ~~Stats band: up to 4 large figures from Website stats.~~ The separate stats band was removed; the stats now show in the hero.
2. Client logos.
3. Why choose us: 4 fixed cards stating only verifiable claims: installed and tested by our own engineers; quality inverters, batteries and panels with specs shown for every product; no payment to place an order, and we call to confirm; live stock and prices on the website.
4. Solutions ("Who we power"): the customer segments as cards linking to `/portfolio?category=<segment>`.
5. Packages ("Find your package"): the existing package finder, with "Shop by battery type" chips in the header; package cards show up to 3 included products and "What it powers".
6. Shop by category (restored 2026-09-17): top-level catalogue categories.
7. Popular products (restored 2026-09-17): up to 8 in-stock products with Add to cart.
8. Size your system: a teaser linking to `/calculator` (only when the calculator is enabled).
9. Case studies: up to 3 portfolio items with a Summary.
10. Reviews.
11. How it works: 6 steps: order or call → confirmation call → processing → delivery → installation → after-sales support.
12. Financing (only when enabled): a terms table (deposit, terms, monthly rate, approval time), a worked example calculated live on the cheapest available package, the note, and calls to action. Worked example: deposit = price × deposit % (rounded to the naira); balance = price − deposit; interest is flat = balance × monthly rate % × months; monthly instalment = (balance + interest) ÷ months, rounded up to the naira; one row per term.
13. FAQ: the first 6 FAQs as an accessible accordion, and "See all questions" linking to `/faq`.
14. Careers teaser (restored 2026-09-17; only when there are open vacancies).
15. Final call to action: Shop packages, Call, and WhatsApp (only when a WhatsApp number is set), then the business phone numbers, email, address and opening hours.

`/calculator` page (only when the calculator is enabled)
- The customer starts with the appliance rows from Settings at their default quantity and hours, changes quantity and hours with steppers, and can **Add appliance** with their own label and watts.
- Results update as they type:
  - Total load (W) = Σ watts × quantity.
  - Recommended inverter (kVA) = load × (1 + headroom % ÷ 100) ÷ 0.8 (power factor) ÷ 1000, rounded **up** to the next 0.5 kVA. Formula: `ceil((load × (1 + headroom)) / 0.8 / 1000 × 2) / 2`.
  - Daily energy (kWh) = Σ watts × quantity × hours a day ÷ 1000.
  - Battery capacity (kWh) = daily energy ÷ (depth of discharge % ÷ 100); also shown in Ah at the battery voltage (kWh × 1000 ÷ voltage).
  - Solar panels = daily energy ÷ (panel watts × peak sun hours ÷ 1000), rounded up to a whole panel.
- Matching packages: available packages whose kVA is at least the recommended size, cheapest first, up to 3.
- Generator comparison: monthly generator cost = recommended kVA × litres per kVA-hour × generator hours a day × 30 × fuel price per litre, plus maintenance per month. **Generator hours a day** is a stepper on the page (1–24); it starts at the longest hours of any appliance row and the customer can change it. It is compared with the cheapest matching package's price as a simple payback in months (package price ÷ monthly generator cost), shown as "Pays for itself in about …". The comparison is only shown when there is a load and both the fuel price and litres per kVA-hour are above 0.
- Disclaimer, always shown in plain words: "Estimates only — an engineer confirms your size before installation."
- A "Talk to an engineer" call to action. Nothing the customer enters is stored or sent.
- Worked example (default parameters): load 1,000 W → 1,000 × 1.25 ÷ 0.8 ÷ 1000 = 1.5625 → **2 kVA**; daily energy 5 kWh → battery 5 ÷ 0.8 = 6.25 kWh ≈ 130 Ah at 48 V; panels 5 ÷ (550 × 4.5 ÷ 1000 = 2.475) = 2.02 → **3 panels**. With fuel ₦1,000/litre, 0.25 litres per kVA-hour, 8 hours a day and ₦20,000 maintenance: 2 × 0.25 × 8 × 30 × ₦1,000 + ₦20,000 = **₦140,000 a month**; a ₦1,400,000 package pays back in **10 months**.

`/faq` page, portfolio filter and WhatsApp
- `/faq`: all active FAQs grouped by category, with FAQPage structured data for search engines.
- `/portfolio`: category filter and case-study details, as above.
- Floating **WhatsApp** button on every storefront page when a WhatsApp number is set: bottom right, 56 px, clear of the phone's safe area. It opens `https://wa.me/<digits>` with the message "Hello Juwon Electric". No number, no button. (2026-09-17: now part of the floating actions, with **Size your system**, and hidden on the cart and checkout; §6.10.)
- The footer shows business hours and WhatsApp when set. `/calculator` and `/faq` are in the sitemap and linked from the footer (and the header when there is room).
- FAQs, reviews, client logos and team member changes reach the storefront the same way as other admin changes (§6.10, realtime and revalidation).

Team page (added 2026-09-17)

Contract: docs/agents/TEAM_AND_MOTION_V1.md §1–§4. The owner asked for a team page with placeholder pictures. The idea (grouped headshot cards) comes from a reference site; none of its names, photos or structure are copied.

Team members collection
- A fourth collection in the admin's **Website** group: **Team** (`/admin/team`), described as "The people shown on the website's Meet the team page, in groups." Same access as the other Website collections: viewing needs `content:read`; adding, editing, reordering and deleting need `content:write` (Super admin, Admin, Sales).
- Fields (admin labels):
  - **Name** (required, 1–100 characters).
  - **Role** (required, 1–80), for example "Lead installation engineer".
  - **Group** (required, 1–60, free text): the heading the member is listed under on the website. The field suggests existing groups first, then "Leadership", "Engineering & installations", "Sales & customer care" and "Operations".
  - **Bio** (optional, up to 300 characters, one line of plain text; line breaks become spaces). The admin shows a character count.
  - **Photo URL** (optional): an `http(s)` link or a site path starting with `/`, as for other Website images. The drawer shows a square preview; with no usable photo it shows the member's initials ("No photo yet. The website shows their initials instead.").
  - **LinkedIn URL** (optional): an `https` link.
  - **Show on the website** switch ("Hidden team members stay here but aren't shown on the team page.").
  - Sort order and the Sample flag, as for the other collections.
- Admin list ("All team members"): a round photo (initials when there is none), name and role, group, status, a Sample badge, a **Filter by group** select ("All groups" or one group), **Move up** / **Move down** (▲▼) buttons, and edit and delete (with confirmation). **Add team member** opens the drawer. The Sample banner shows while any member is sample.
- Rules: the same shared rules as FAQs, Reviews and Client logos (sort order, active switch, sample flag cleared on save, activity log entries `team_member.create`, `team_member.update`, `team_member.delete`). Moving a sample member up or down, or hiding it, keeps the Sample flag; editing and saving clears it.
- Messages: "Team retrieved.", "Team member created.", "Team member updated.", "Team member deleted.", "Team member not found."; field errors such as "LinkedIn URL must be an https URL." and "Photo URL must be an http(s) URL or a path starting with /."
- Public read: `GET /team` returns active members only, sorted by sort order, then oldest first. Groups show on the website in the order in which each group first appears in that list, so moving a member to the top of the list also moves their group up.
- Sample data: 12 fictional members with made-up Nigerian names across the 4 groups above (Leadership 2, Engineering & installations 4, Sales & customer care 3, Operations 3), with one-sentence bios about real kinds of work (sizing systems, installations, after-sales). Photos are illustrated placeholder portraits `/samples/team/member-1.svg` to `member-12.svg` (abstract head-and-shoulders drawings, no real faces, no text). LinkedIn is empty. Seeded with the same local-only sample seeds as Landing v1 (fixed ids starting `sample-team-`).
- Changes reach the storefront through the `team` revalidation tag (admin path `/admin/team`).

`/team` page ("Meet the team")
- Intro: eyebrow "Our people", title "Meet the team", and "The engineers, installers and customer care staff behind every Juwon Electric system." Page title "Meet the team", with a canonical URL, a loading state and a sitemap entry.
- Stats: worked out from the list only, and counting up when shown: **Team members** (how many), **Teams** (how many groups) and **Engineers and installers** (members of groups whose name contains "Engineer" or "Install"; left out when there are none). A Sample label shows when every member is sample. No invented figures.
- Groups: one section per group, with the group name as a heading and a card grid of 2 columns on phones, 3 from 768 px and 4 from 1280 px.
- Card: a square photo with rounded corners (or the initials on a soft background), name and role, and a Sample pill on sample members.
  - On devices that can hover: on hover or keyboard focus the card lifts, the photo zooms gently and a brand-red gradient slides up showing the bio and a **LinkedIn** link (when set; opens in a new tab). A card with a bio but no link can take keyboard focus so keyboard users can read it.
  - On touch devices (no hover): no overlay; the bio and LinkedIn link show under the role.
  - Cards reveal in a stagger as they scroll into view.
- No members: "Our team page is being updated" with a **Contact us** button.
- Join-us band: "Want to join us?" with **See open roles** linking to `/vacancies`.
- Structured data: an `Organization` with `employee` entries (name and job title) for **non-sample members only**. With only sample members, no team structured data is output.

Header and footer navigation (2026-09-17)
- Desktop header nav: Packages, Products, Calculator, Services, Our work, **Team**, Contact. **Team replaces Careers** in the desktop nav.
- Careers stays in the mobile menu (right after Team) and in the footer's Company column. The footer also links **Meet the team**.


Sample content
- Flagged: every seeded record and settings section carries a sample flag.
- Labelled in the admin: a **Sample** badge on each sample record and settings section; the edit form notes "Saving your changes turns this into real content and removes the Sample badge."; and on FAQs, Reviews, Client logos, Team (added 2026-09-17) and Portfolio, while they have sample records, the banner "Sample content is showing on the website. Edit or replace it before launch."
- Labelled on the website: a small neutral "Sample" label on sample stats, reviews, client logos, case-study details, financing, the calculator notes and (2026-09-17) sample team member cards and the team stats when every member is sample. Sample FAQs are not labelled on the website, so they must be checked in the admin.
- Cleared on save: when staff change a sample record or settings section and save, it becomes real content (the flag is cleared). ~~even if no value changed~~ Corrected 2026-09-17 to match the system: saving without changing any content, moving an item up or down, or switching **Show on the website** on or off keeps the Sample flag. Deleting sample records is allowed.
- Seeded locally only: `npm run seed:sample` (backend) and `npm run d1:seed:sample:local` (Worker, local D1) load the same sample data. The seed refuses to run when `NODE_ENV=production`, is never part of migrations, `seed.sql` or CI, and the D1 seed file warns never to run it with `--remote`. Running it again updates the same sample records (fixed ids starting `sample-`) and never overwrites settings sections that already hold real content.
- Production must never show sample content (§11 Before launch checklist).

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
- Crew assignment (Commerce v3): an admin creates a job with engineers A, B and C; the job shows A as Lead and all three in Installations and order details; A, B and C each see it in My jobs with "With:" listing the other two, and each can start it and tick the checklist; each of A, B and C gets the job-assigned notification. Making C the lead and adding D sends the notification to D only. Adding an 11th engineer, the same engineer twice, or a non-engineer account is rejected with the matching message.
- One job per order (Commerce v3): with a job on the order that isn't cancelled, "Create job" is hidden in order details with the note "This order already has an installation job.", and a create request is refused with "This order already has an installation job."; after that job is cancelled, a new job can be created.
- Job pickers (Commerce v3): Scheduled for offers a calendar and times in 15-minute steps in Lagos time, shows for example "Thu 18 Sep 2026, 10:30 AM", and Clear empties it; Estimated duration set to 2 hours 30 minutes saves 150 minutes and shows "2 h 30 min", and a duration under 15 minutes is not accepted.
- In-store walk-in (Commerce v3): a sales rep records a collected-now sale with name and phone left blank; the order is created with customer "Walk-in customer", order details show "No phone", and the activity log reads "In-store order for Walk-in customer: …". A phone number that is given but invalid is still rejected. "Deliver or install later" without a delivery address is still rejected.
- Product search on focus (Commerce v3): on the in-store sale page and in the package option editor, clicking into the empty product search lists up to 20 products by name before anything is typed; typing filters the list.
- Online product purchase (Commerce v3): a customer adds 2 × an active product with 5 in stock from its product page and checks out; the order records a product line at the current price, the total includes it, "Requires installation" is off, stock stays 5 until the order is moved to processing (then 3), and the confirmation email lists "2 × <name> (<SKU>)". A product with 0 stock shows Out of stock with Add to cart disabled and no card button. If the product is hidden or its stock drops below the cart quantity before checkout, the cart flags the line and the order is rejected with "Some items in your cart are no longer available. Please refresh your cart." A cart with a package and a product creates one order with both lines and "Requires installation" on; a package-only cart sends the same order as before.
- Package category (Commerce v3): assigning a package to the category Inverters shows "Inverters" on the package page and lists the package under "Packages in Inverters" above the products on that category page (and on its parent category's page); deleting Inverters is refused with "Category has subcategories, products or packages."; a package with "No category" appears on no category page.
- Admin edit reflected on the storefront: changing a product price (or a package adjustment) in the admin console shows the new price on the next storefront page view; an already open storefront page in the same browser updates immediately, and in another browser within about a minute.
- FAQs (Landing v1): a Sales account adds an FAQ with category "Installation", moves it up with ▲ and saves; it appears in that position on the home page (if among the first 6) and under "Installation" on `/faq` on the next page view, and FAQPage structured data lists it. Switching it inactive hides it from both. A question under 5 characters is rejected. A Support account can view FAQs but has no add, edit or delete buttons, and the server refuses changes with "You do not have permission to perform this action."
- Reviews (Landing v1): an admin adds a review with rating 5 and source WhatsApp; it shows in the home reviews section with 5 stars, name, context and a WhatsApp badge, and the section never rotates by itself. A quote under 10 characters or a rating outside 1–5 is rejected. With no active reviews, the reviews section is not shown.
- Client logos (Landing v1): a logo saved with a site path such as `/logos/acme.svg` or an `https://` link appears in the client logos grid with the client name as alt text; a logo value that is neither is rejected; with no active clients, the section is not shown.
- Case studies (Landing v1): adding Category, Summary, Location and System to a portfolio item shows it among the home case studies (up to 3) and on `/portfolio?category=<segment>` with those details; a portfolio item without a Summary is not shown as a case study; older items without the new fields still display.
- Website settings (Landing v1): saving 4 stats shows the stats band with 4 figures (in the hero since 2026-09-17); a fifth stat is rejected; with no stats the band is hidden (the hero shows the reassurance ticks instead). Setting a WhatsApp number shows the floating WhatsApp button on every storefront page (except the cart and checkout since 2026-09-17), the footer link and the WhatsApp call to action, opening `https://wa.me/<digits>` with "Hello Juwon Electric"; clearing it removes all three. Business hours show in the footer with their line breaks.
- Financing (Landing v1): with Enabled off, the home financing section is hidden and the public settings contain only "not enabled"; with it on and deposit 40%, terms 3, 6 and 12 months, rate 3.5% and approval "48 hours", the section shows those terms, a worked example and the note. Terms with more than 6 values, duplicates or a value above 60 are rejected.
- Calculator (Landing v1): with Enabled off, `/calculator` and the home teaser are not shown. With it on and the default parameters, a load of 1,000 W recommends 2 kVA; 5 kWh a day gives a 6.25 kWh (about 130 Ah at 48 V) battery and 3 × 550 W panels; with fuel ₦1,000, 0.25 litres per kVA-hour, 8 hours a day and ₦20,000 maintenance the generator costs ₦140,000 a month, and a ₦1,400,000 matching package shows a 10-month payback. Matching packages list at most 3 available packages of at least 2 kVA, cheapest first. The disclaimer "Estimates only — an engineer confirms your size before installation." is always visible, and nothing entered is stored.
- Home page order (Landing v1): with all content present the sections appear in the §6.11 order; removing the data behind any section hides that section without leaving an empty heading or gap.
- Sample content (Landing v1): after running the local seed, every seeded record and settings section shows a Sample badge in the admin, the banner "Sample content is showing on the website. Edit or replace it before launch." shows on screens with sample records, and the website shows "Sample" labels on sample stats, reviews, client logos, case-study details, financing and calculator notes. Editing and saving a sample record or section removes its badge and label. The seed refuses to run with `NODE_ENV=production`.
- No sample content visible before launch (Landing v1): on the production website at launch, no "Sample" label appears on any page, no FAQ, review, client logo, team member (added 2026-09-17), portfolio item or settings section in the admin shows a Sample badge, no screen shows the sample banner, the WhatsApp link does not use `+2348000000000`, and no files under `/samples/` are referenced. Every item in the §11 Before launch checklist is ticked.
- Team members admin (2026-09-17): a Sales account opens **Website → Team**, selects **Add team member**, enters Name, Role, Group "Engineering & installations", a Bio, a Photo URL such as `/team/ada.jpg` and a LinkedIn URL, leaves **Show on the website** on and saves; the member appears in the list with a round photo and in that group on `/team` on the next page view. A LinkedIn URL that isn't `https`, a Photo URL that is neither a link nor a path starting with `/`, or a Bio over 300 characters is rejected. Switching **Show on the website** off removes the member from `/team` and from `GET /team`. A Support account can view Team but has no add, edit, move or delete buttons, and the server refuses changes with "You do not have permission to perform this action."
- Team order and groups (2026-09-17): moving the first member of "Operations" to the top of the list with ▲ makes "Operations" the first group on `/team`. **Filter by group** shows only that group's members.
- Team page (2026-09-17): with the 12 sample members, `/team` shows "Meet the team", stats of 12 team members, 4 teams and 4 engineers and installers counting up, 4 group sections in seed order with 2 cards a row at 375 px, 3 at 768 px and 4 at 1280 px, a Sample pill on every card, and "Want to join us?" linking to `/vacancies`. On a mouse device, hovering or tabbing to a card zooms the photo and shows the bio overlay; on a touch device the bio shows under the role with no overlay. A member with no photo shows their initials. The page's structured data lists no sample members; after one member is edited and saved as real content, the `Organization` `employee` list contains exactly that member's name and job title. With no active members the page shows "Our team page is being updated" and no stats.
- Header navigation (2026-09-17): at 1280 px the desktop header shows Team and no Careers; the mobile menu lists Careers right after Team; the footer's Company column links both **Meet the team** and Careers; `/team` is in the sitemap.
- Home header and hero (2026-09-17): on the home page at the top, the header is transparent with white links and a gold **Get a quote** pill; after scrolling 24 px it turns solid white, and on every other page it is always solid, with no change in page layout. The hero photos crossfade every 7 seconds while the gold progress bar fills; selecting a bar shows that photo; the pause button stops the bar and the photos, and play resumes; hovering over the hero or tabbing into it also pauses. With 4 website stats the hero shows 4 gold figures that count up to exactly the saved values (for example "500+"); with none it shows the three reassurance ticks. The glass price card shows at 1280 px and wider only.
- Reduced motion (2026-09-17): with the operating system's reduce-motion setting on, the home hero stays on the first photo with no zoom (the bars still switch photos) and has no pause button, client logos don't scroll, every count-up figure shows its final value straight away, hover zoom and lift are off, the scroll cue is hidden, and no content waits for an animation to appear.
- No JavaScript (2026-09-17): with JavaScript disabled, the home page, team page and all sections show their full content and final figures straight away, with the first hero photo. If scripts are on but fail to start, counting figures still show their final values within 3 seconds.
- Layout at 375 px (2026-09-17): on a 375 px wide screen, the home page, `/team`, `/calculator`, `/faq`, the catalogue and the cart have no horizontal scroll, and no animation causes layout shift (Cumulative Layout Shift from animations is 0).
- Floating actions (2026-09-17): with the calculator on and a WhatsApp number set, every storefront page except the calculator page shows **Size your system** and **Chat on WhatsApp** at the bottom right (round buttons on phones, labelled pills from 640 px); the calculator page shows only WhatsApp; `/cart` and `/checkout` show neither. With the calculator off and no WhatsApp number, no floating buttons show. Neither button shows an "online" status or a badge.

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

Commerce v3 round (2026-09-17)
- Installation crews and one installation job per order
- Date-and-time and duration pickers in the job dialogs
- Optional customer name and phone for in-store sales; product search lists products on focus
- Online product purchase with one cart for packages and products
- Package categories on the storefront

Landing v1 round (2026-09-17)
- FAQs, Reviews and Client logos managed in a new Website admin group; portfolio case-study fields
- Website, Financing and Calculator settings sections
- Richer home page, `/calculator`, `/faq`, portfolio category filter and WhatsApp button
- Local-only sample content, and the Before launch checklist (§11)

Team page and home redesign round (2026-09-17)
- Team members in the admin Website group and the public `/team` page; Team replaces Careers in the desktop nav
- Home page redesign: transparent header, full-bleed photo hero with stats, floating actions, darker section rhythm and dark footer
- Storefront motion system that respects reduced motion

10. Risks & mitigation

- Rich-text security: sanitize server-side and limit allowed tags/attributes. Use `sanitize-html` and disallow scripts.
- Migration risk for Next.js: keep the Vite app until Next.js validated, migrate incrementally
- Email reliability: use well-tested SMTP provider and implement retries
- Package prices change when product prices change: staff are warned when editing a product used in packages, and every price change is audited.
- Discount misuse: discounts require a reason and are recorded against the staff member in the activity log.
- Storefront regressions: the classic public UI stays available behind `NEXT_PUBLIC_PUBLIC_UI=classic`.
- Online product orders for stock that runs out before processing: checkout checks current stock, and processing is all-or-nothing with a per-product shortfall, so staff call the customer before moving the order on.
- Walk-in sales without contact details can't be followed up: reps are encouraged to take a phone number for delivered or installed sales, and a delivery address is still required for "later" fulfilment.
- Calculator estimates taken as a quote or guarantee (Landing v1): results depend on typical wattages, assumed sun hours and the customer's own entries, and real loads (motor start-up, air conditioners, pumps) can need a bigger inverter. Mitigation: the disclaimer "Estimates only — an engineer confirms your size before installation." is always shown, results are rounded up, "Talk to an engineer" is offered, generator figures are labelled as a simple comparison, and the owner reviews the appliance wattages and parameters before switching the calculator on.
- Financing terms read as an offer (Landing v1): a deposit, rate or approval time on the website can be taken as a promise of credit. Mitigation: financing is off by default and hidden when off; switch it on only when real terms are agreed with the business (and any finance partner); use the Note to state that terms are subject to approval; the worked example is labelled an example; sample terms carry "Sample terms — not an offer." and a Sample label and must be replaced or switched off before launch.
- Sample or unapproved content going live (Landing v1): sample stats, reviews, logos or terms could be mistaken for real claims. Mitigation: seeds run locally only and refuse production, sample items are labelled in the admin and on the website, and the §11 Before launch checklist must be completed.
- Reviews and logos used without permission (Landing v1): only publish reviews and logos the customer or client agreed to; delete or deactivate at once if permission is withdrawn.

11. Appendix
- Link to technical plan: /PLATFORM_PLAN.md
- Vacancy schema example and sanitization guidance included in PLATFORM_PLAN.md
- API contract: docs/agents/API_CONTRACT_V3.md; commerce addenda: docs/agents/COMMERCE_V2.md and docs/agents/COMMERCE_V3.md; storefront spec: docs/agents/fe-storefront.md; landing page and website content: docs/agents/LANDING_V1.md; team page, home redesign and motion: docs/agents/TEAM_AND_MOTION_V1.md
- Staff user guide: docs/USER_GUIDE.md (website content: chapter 10A)

Before launch checklist (Landing v1)
Complete every item before the website goes live. The local seed never runs in production, but if sample data was copied to a live database, or real content was entered by editing sample records, check each item. Replace means edit with real content and save (this clears the Sample flag); delete means remove the record. When done, no Sample badge or banner shows anywhere in the admin, and no "Sample" label shows on the website.
- [ ] FAQs (8 sample): replace or delete each one, and check every answer matches how we really work:
  - "Do I pay to place an order?"
  - "How long does installation take?"
  - "Can I buy a single battery or inverter?"
  - "What's the difference between tubular and lithium batteries?"
  - "Do you install outside Lagos?"
  - "What happens after I order?"
  - "Can I add solar panels later?"
  - "How do I choose a package size?"
  - Sample FAQs have no "Sample" label on the website, so check them in the admin (Website → FAQs).
- [ ] Reviews (6 sample, made-up names such as "Adaeze O."): delete all; add only real reviews from customers who agreed to be quoted.
- [ ] Client logos (6 sample, fictional clients using `/samples/client-1.svg` to `/samples/client-6.svg`): delete all; add only real clients who gave permission, with their own logo files or links.
- [ ] Team members (12 sample, fictional names such as "Adebayo Ogunleye", with illustrated placeholder portraits `/samples/team/member-1.svg` to `member-12.svg`, added 2026-09-17): in **Website → Team**, delete every sample member and add the real team, or replace each one's Name, Role, Group, Bio and Photo URL with real details and save. Use real photos only with each person's agreement, and add LinkedIn links only if the person agrees. Check that no card on `/team` shows a Sample pill and no photo path starts with `/samples/team/`.
- [ ] Portfolio case-study details: for each portfolio item marked Sample, replace Category, Summary, Location and System with the real project details, or clear them.
- [ ] Settings → Website:
  - [ ] Stats (4 sample: Installations, Years in Lagos, Engineers, Average install time): enter true figures or remove the rows.
  - [ ] WhatsApp number (sample `+2348000000000`): enter the real business WhatsApp number or clear it.
  - [ ] Business hours (sample "Mon–Sat 8am–6pm"): enter the real hours or clear them.
  - [ ] Save the section.
- [ ] Settings → Financing (sample: enabled, 40% deposit, 3/6/12 months, 3.5% a month, "48 hours", note "Sample terms — not an offer."): enter real, approved terms and save, or switch **Show financing on the website** off and save.
- [ ] Settings → Calculator (sample: enabled, 12 appliances, default parameters, fuel ₦1,000 per litre, 0.25 litres per kVA-hour, ₦20,000 maintenance a month): check each appliance's watts and default hours and quantity, the parameters and the current fuel price and maintenance cost, then select **Save calculator**; or switch **Show the calculator on the website** off and save.
- [ ] Walk through the website (home, `/calculator`, `/faq`, `/portfolio`, `/team`, footer) on a phone and a computer and confirm no "Sample" label remains.

Open items for owner review
- Storefront delivery claim: the cart ("Delivery within Lagos: Free" in the order summary and "Free delivery within Lagos." below it) and the order confirmation ("Delivery within Lagos is free.") say delivery within Lagos is free. This is not confirmed by the business. Status: to be reviewed later (owner, 2026-09-17). Keep or remove once confirmed.

12. Change log

2026-09-17 (Team page and home redesign)
- §4: in scope: the team page and the home page redesign.
- §6.10: the earlier home hero is replaced by the home page redesign: gold accent from the logo (dark surfaces only), a transparent home header that turns solid on scroll with a **Get a quote** pill, a full-bleed photo slideshow hero with gold progress bars and a pause button, a gold headline accent, hero stats from Settings with count-up, a glass price card, a scroll cue, floating **Size your system** and **Chat on WhatsApp** buttons (hidden on cart and checkout), the darker section rhythm with shop by category, popular products and the careers teaser restored, a final call to action with full contact details, and a dark footer. Added storefront-wide motion and accessibility rules (CSS and `IntersectionObserver` only, visible without JavaScript, reduced motion, no layout shift, no invented badges or status).
- §6.11: new Team page section (team members collection, fields, rules, public `GET /team`, sample flag, 12 sample members with placeholder portraits, the `/team` page, JSON-LD for non-sample members only) and header and footer navigation (Team replaces Careers in the desktop nav; Careers stays in the mobile menu and footer). Home section order updated (stats in the hero; shop by category, popular products and careers teaser restored). Website settings stats now show in the hero; the floating WhatsApp button is part of the floating actions. Team added to sample labels and banners.
- §6.11 correction: saving a sample record or section without changing its content, reordering it or showing/hiding it keeps the Sample flag (the system has worked this way since the "keep sample labels" fix); only a real content change clears it.
- §7: added acceptance criteria for the team admin, team order and groups, the team page, header navigation, the home header and hero, reduced motion, no JavaScript, no horizontal scroll at 375 px, and floating actions; the "no sample content before launch" criterion now covers team members.
- §9: added the Team page and home redesign milestone.
- §11: added the link to the TEAM_AND_MOTION_V1 contract, sample team members to the Before launch checklist, and `/team` to the final walk-through.

2026-09-17 (Landing v1)
- §4: in scope: website content managed in the admin, the richer home page with `/calculator`, `/faq`, the portfolio filter and WhatsApp button, and labelled local-only sample content; out of scope: online financing applications, saving calculator results, and copying anything from the reference site.
- §5: added stories for a customer sizing a system with the calculator and reading FAQs, reviews and case studies, an owner publishing real reviews and setting website, financing and calculator settings, and marketing or admin staff editing FAQs, client logos and case studies.
- §6.7: listed the new Website, Financing and Calculator settings sections.
- §6.11: new section, Website content and landing page (ground rules, FAQs, Reviews, Client logos, portfolio case-study fields, new settings and what is public, home section order and hide-when-empty, `/calculator` formulas, generator comparison and disclaimer, `/faq`, portfolio filter, WhatsApp button, sample content rules and local-only seeds).
- §7: added acceptance criteria for FAQs, reviews, client logos, case studies, website settings, financing, the calculator, home section order, sample content and "no sample content visible before launch".
- §9: added the Landing v1 milestone.
- §10: added risks for calculator estimates, financing terms read as an offer, sample content going live, and reviews or logos used without permission.
- §11: added the link to the Landing v1 contract and the Before launch checklist.

2026-09-17 (Commerce v3)
- §4: online product purchase, installation crews and package categories are now in scope; buying individual products on the website moved out of "Out of scope"; noted that placing a website order doesn't hold stock.
- §5: added stories for a customer buying a single product online, a sales rep recording a sale for an anonymous walk-in, an admin assigning a crew and one job per order, and an engineer on a crew.
- §6.1: categories can't be deleted while packages use them; which product statuses are sold online; packages can belong to a catalogue category; product search lists the first 20 products on focus; one cart for packages and products.
- §6.3: one installation job per order (a cancelled job allows a new one; "Create job" hidden while a job exists); order details show the crew; website orders with only products start with "Requires installation" off; website product lines are snapshotted.
- §6.4: crews of up to 10 engineers with a lead, crew-wide My jobs access and updates, notifications to newly added engineers, and the date-and-time and duration pickers.
- §6.9: customer name, phone and email are optional ("Walk-in customer", "No phone", helper text); product search on focus.
- §6.10: customers buy products online (product page stepper and Add to cart, card button, one cart, availability checks, stock at processing, emails); package categories on the package and category pages.
- §7: added acceptance criteria for crews, one job per order, job pickers, walk-in sales, product search on focus, online product purchase and package categories.
- §6.6: engineers see jobs where they are on the crew; the job-assigned notification goes to each newly added crew member.
- §9–§11: added the Commerce v3 milestone, two risks and the link to the Commerce v3 contract.

2026-09-17 (home hero)
- §6.10: redesigned home hero with battery-type shortcuts, live starting price and trust strip.

2026-09-17 (installation default)
- §6.3: new website orders start with "Requires installation" on; staff can turn it off; earlier orders unchanged.

2026-09-17 (installed step and menu)
- §6.3: delivered orders (website and in-store) can be marked installed from the admin even if installation wasn't flagged; confirming turns the flag on.
- §6.9: the in-store sale page is reached from the Orders page ("New in-store sale") and is not listed in the sidebar.

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
