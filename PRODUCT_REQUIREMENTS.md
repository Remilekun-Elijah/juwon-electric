Juwon Electric — Product Requirements Document (PRD)

Title: Juwon Electric — Solar Commerce & Installation Platform
Prepared by: Juwon Electric Product Team
Date: 2026-09-16

1. Executive summary

Juwon Electric is an integrated solar commerce and installation platform that enables customers to discover, purchase, and schedule installation for solar and electrical products and packages. The platform also equips administrators and field staff with inventory management, order fulfillment, installation workflow, and hiring (vacancies) tools.

2. Objectives

- Launch an e-commerce storefront tailored to solar/electrical products and packages
- Provide admin tools for inventory, orders, staff/engineer assignment, and notifications
- Support installation jobs with assignment, scheduling, and completion reporting
- Offer a public-facing vacancies module with rich-text job descriptions and CRUD for HR
- Migrate frontend to Next.js to improve SEO for public pages and enable SSG for packages and vacancies

3. Stakeholders

- Business owner / admins
- Inventory managers
- Sales agents
- Engineers / field staff
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

Out of scope (initial release)
- Complex promotions engine, loyalty, multi-currency pricing, advanced analytics
- Full-featured CI/CD beyond simple deployment pipeline

5. User personas & user stories

Persona: Customer
- As a customer, I want to browse product packages and add items to a cart so I can buy a solar package.
- As a customer, I want to view package details and product specs so I can compare offerings.

Persona: Sales/Admin
- As an admin, I want to create and manage products and categories so the catalog stays accurate.
- As an inventory manager, I want to set reorder levels and receive alerts so we don’t run out of stock.

Persona: Engineer
- As an engineer, I want to see assigned installation jobs and update status so the business can track progress.

Persona: HR
- As an HR admin, I want to create job vacancies with formatted descriptions and publish them so candidates can apply.

6. Features & requirements

6.1 Core commerce
- Products & Categories: CRUD, images, sanitized rich descriptions, attributes per category
- Packages: group multiple products as bundles with a single price
- Cart & Checkout: cart persistence, basic validation, toggle payment gateway visibility

6.2 Inventory
- Track stockQuantity per product
- reorderLevel per product and low-stock alerts (email)
- Inventory movements / adjustment records

6.3 Orders & Fulfillment
- Order schema storing items, amounts, paymentStatus, fulfillmentStatus
- Admin order view to change statuses and assign engineers
- If requiresInstallation, allow assignment of engineers and creation of InstallationJob

6.4 Installation jobs
- Job assignment, scheduling, checklist, photo uploads, completion notes
- Engineer mobile-friendly UI showing assigned jobs and ability to update

6.5 Vacancies (Jobs) module — HR
- Admin CRUD for vacancies with fields: title, department, location, employmentType, salaryRange, description (rich-text), requirements[], responsibilities[], status (draft/open/closed)
- Public listing page and vacancy detail page rendering sanitized HTML
- Role-based access: only HR/admin roles can CRUD vacancies
- Acceptance: create/edit/delete/publish a vacancy; public can view listings and details

6.6 Users & Roles
- Roles with minimum granularity: superadmin, admin, inventory, sales, engineer, hr, customer
- Admin pages gated by role; engineer views limited to assigned jobs

6.7 Settings & Notifications
- System settings for payment gate toggles, notification emails, upload provider
- Notifications: low-stock, new order, vacancy posted (optional)

6.8 Non-functional requirements
- Security: sanitize rich text, protect admin endpoints with auth and role checks
- Performance: SSG for public pages (packages, vacancies) using Next.js
- Maintainability: modular backend models and clear API contracts
- Accessibility: admin forms and public pages meet basic a11y standards

7. Acceptance criteria (selected)

- Product CRUD: create a product with images and rich-text description; product appears on public catalog
- Vacancies: admin can create a vacancy with React Quill; status open shows on public listing; detail page renders formatted description safely
- Inventory alerts: when stockQuantity <= reorderLevel, system sends email to configured addresses
- Order lifecycle: admin can update order status; if installation required, an installation job can be created and assigned
- Next.js migration: public pages for packages and vacancies are served statically and match content from the Vite site

8. Metrics & success criteria

- Time to publish a vacancy: <10 minutes for admins
- Percentage of orders with scheduled installation properly assigned: >90% after rollout
- Reduction in stock-outs for tracked SKUs: 80% fewer incidents within 3 months (measured vs baseline)
- Page load improvement for public pages after Next.js migration: 20% faster first contentful paint (target)

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

10. Risks & mitigation

- Rich-text security: sanitize server-side and limit allowed tags/attributes. Use `sanitize-html` and disallow scripts.
- Migration risk for Next.js: keep the Vite app until Next.js validated, migrate incrementally
- Email reliability: use well-tested SMTP provider and implement retries

11. Appendix
- Link to technical plan: /PLATFORM_PLAN.md
- Vacancy schema example and sanitization guidance included in PLATFORM_PLAN.md


End of PRD
