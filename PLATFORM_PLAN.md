Juwon Electric — Platform Design, DB Schemas, Admin Roadmap, and Next.js Porting Plan

Overview

This document defines:
- Database (Mongoose) schemas for the core modules (inventory, product, category, orders, users/roles, staff, vacancies, settings, notifications, installation jobs)
- A full admin feature roadmap (pages, privileges, acceptance criteria, phased priorities)
- A concrete plan to port the current React + Vite frontend to Next.js (file mapping, steps, dependency notes, SSR considerations, and integration tips for React Quill)

Goals

- Provide a consistent, production-ready data model for the Express/Mongoose backend
- Produce an admin roadmap that is actionable for implementation sprints
- Provide a low-risk, step-by-step migration path from Vite/React Router to Next.js (app or pages router)

---

1) Database — Mongoose schemas (recommended)

Notes:
- The backend currently uses Mongoose. Schemas below use Mongoose types and reference patterns.
- Where appropriate, embed small subdocuments (order items) and reference larger entities (User, Product).
- Store rich text as sanitized HTML (or markdown) in fields named `descriptionHtml` or `descriptionMarkdown`. When accepting HTML, sanitize server-side using a library like `sanitize-html`.

User
- Purpose: authentication + roles + staff metadata
- Collection: users

Fields (example):
- _id: ObjectId
- name: String
- email: { type: String, required: true, unique: true, lowercase: true }
- passwordHash: String
- role: { type: String, enum: ['superadmin','admin','inventory','sales','engineer','hr','customer','support'], default: 'customer' }
- phone: String
- address: String
- profile: { avatarUrl: String, certifications: [String], bio: String }
- createdAt, updatedAt

Role/Permission (optional)
- If granular permissions needed, add a `roles` collection storing capabilities. Otherwise use role strings on user.

Category
- Collection: categories
- Fields:
  - _id
  - name: String (required)
  - slug: String (unique)
  - parent: ObjectId (ref: 'Category') // optional
  - description: String
  - imageUrl: String
  - active: Boolean
  - createdAt, updatedAt

Product
- Collection: products
- Fields:
  - _id
  - sku: { type: String, unique: true }
  - name: String
  - slug: String
  - category: { type: ObjectId, ref: 'Category' }
  - brand: String
  - descriptionHtml: String // sanitized rich text
  - attributes: Map // category-specific key/values (powerRating, capacity, voltage, etc.)
  - price: Number
  - costPrice: Number
  - currency: String
  - stockQuantity: { type: Number, default: 0 }
  - reorderLevel: { type: Number, default: 0 }
  - images: [String]
  - status: { type: String, enum: ['active','hidden','archived'], default: 'active' }
  - tags: [String]
  - createdAt, updatedAt

Inventory (optional separate collection)
- If you need advanced stock movement tracking, create `inventoryMovements` collection
- Fields: productId, change (positive/negative), reason (sale, restock, adjustment), referenceId, source, createdBy, createdAt

Package
- Collection: packages
- Fields: name, slug, descriptionHtml, items: [{ product: ObjectId, qty: Number, note }], price, images, status

Order
- Collection: orders
- Fields:
  - _id
  - orderNumber: String (unique, formatted)
  - customer: { id: ObjectId, name, email, phone } // denormalize some customer data
  - items: [{ product: ObjectId, name, sku, unitPrice, qty, totalPrice, attributes }]
  - subtotal, tax, shipping, total
  - paymentStatus: { type: String, enum: ['pending','paid','failed','refunded'] }
  - fulfillmentStatus: { type: String, enum: ['pending','processing','out_for_delivery','delivered','installed','cancelled'] }
  - requiresInstallation: Boolean
  - assignedEngineer: { type: ObjectId, ref: 'User' }
  - shippingAddress: Object
  - notes: String
  - createdAt, updatedAt

InstallationJob (for installations)
- Collection: jobs
- Fields: order: ObjectId, engineer: ObjectId, scheduledAt, durationEstimate, status (assigned, in_progress, completed, cancelled), checklist (array), photos (urls), notes, createdAt, updatedAt

Vacancy (Jobs module)
- Collection: vacancies
- Fields:
  - title: String (required)
  - slug: String (unique)
  - department: String
  - location: String
  - employmentType: { type: String, enum:['full-time','part-time','contract','internship','temporary'] }
  - salaryRange: String
  - descriptionHtml: String  // rich text sanitized
  - requirements: [String]
  - responsibilities: [String]
  - status: { type: String, enum:['draft','open','closed'], default: 'draft' }
  - postedBy: ObjectId (ref: 'User')
  - postedAt, updatedAt

Settings
- Collection: settings (or use a single-document config store)
- Key-value pairs for system-level options, e.g., paymentGatewayEnabled, lowStockNotificationEmails, uploadProvider, etc.

Notification
- Collection: notifications
- Fields: user: ObjectId, type, payload, read: Boolean, createdAt

Audit logs (recommended)
- Track critical actions: stock changes, role changes, order status changes. Very useful for compliance and debugging.

Indexes and constraints
- Index frequently queried fields: product.sku, product.slug, category.slug, vacancy.slug, order.orderNumber
- TTL indexes for ephemeral data (if any)

Data sanitization
- Sanitize rich text using `sanitize-html` or convert markdown server-side to safe HTML.
- For image uploads referenced by rich text, use an upload host (S3) and whitelist image hosts in sanitizer.

---

2) Admin feature roadmap (full)

Principles
- Role-based access: only allow pages/actions based on user role and capability
- Modular UI: separate dashboards for Inventory, Orders, Users, Staff/Engineers, Vacancies, Settings
- Mobile-first admin UI useful for field staff
- Progressive rollout in phases

Phases & priorities

Phase A (MVP — high priority)
- Auth + Roles: login, role management (superadmin, admin, inventory, sales, engineer, hr)
- Products & Categories: list, create, edit, delete, product images, attributes
- Inventory basics: stock qty on product, manual adjustments, reorderLevel
- Orders: list, view details, change statuses, mark as paid
- Vacancies (Jobs): CRUD UI with React Quill for description, public listing page
- Settings: basic config (business info, backend urls, notification emails)

Phase B (Operations)
- Low-stock automation: background job to email admins when stock < reorderLevel
- Staff management: user profiles with role=engineer, assign to orders/jobs
- Installation jobs: create/assign/schedule jobs, engineer mobile UI
- Notifications center (admin & engineer)

Phase C (Commerce & Growth)
- Payment integration and toggles (enable/disable gateways)
- Promotions, tags, featured products
- Packages & bundle management
- Reporting and dashboards (sales, stock, engineer productivity)

Phase D (Polish & Scale)
- Audit logs and advanced permissions
- Test coverage, CI for backend endpoints
- Image upload service (S3), CDN, and signed uploads
- Internationalization and multi-currency

Admin pages & features (per module)

- Dashboard
  - KPI cards: revenue (period), open orders, low stock items, open vacancies, upcoming jobs

- Products
  - List (filters: category, status, stock level)
  - Create/Edit (rich descriptionHtml via React Quill, attribute map, images)
  - Variant support (if needed)

- Categories
  - Tree view, CRUD, active/inactive

- Inventory
  - Product stock view
  - Inventory adjustments (reason, qty, user)
  - Movements history

- Orders
  - List, filters (status/date/engineer)
  - Detail view: customer, items, payments, shipment, install status
  - Actions: change status, assign engineer, generate invoice email

- Vacancies (Jobs)
  - List (draft/open/closed)
  - Create/Edit (React Quill for description, requirements/responsibilities arrays)
  - Publish/unpublish, apply email notifications
  - Public listing page + detail page

- Staff (Engineers)
  - List employees, assign roles, contact info, area coverage, certifications
  - Engineer dashboard: assigned jobs, job status updates

- Settings
  - General, payment toggles, email templates, low-stock thresholds

- Users & Roles
  - List users, create admin users, change roles, deactivate/reactivate

Acceptance criteria (example for Vacancies)
- Admin can create a vacancy with formatted description via React Quill
- Vacancy is persisted, slug generated, and appears in public listing when status=open
- Admin can edit, publish, unpublish, and delete vacancies
- Public can view vacancy detail page rendering the rich text safely

---

3) Porting the frontend to Next.js — plan & checklist

Goal: migrate Vite + React Router app to Next.js for better routing, SEO for public pages (packages, vacancies), and easier deployment (Vercel). Keep as much of the component code and business logic as possible.

High-level approach
- Use Next.js (latest stable). Prefer the Pages Router for simpler migration; App Router is modern but has different data fetching patterns — choose based on team familiarity. This plan assumes Pages Router for predictable mapping but notes App Router differences where relevant.

Repository layout suggestion
- Create frontend-next/ or replace frontend/ with a Next.js app. If replacing, keep a branch and keep the Vite app until migration verified.

Key dependencies to install (examples):
- next react react-dom
- tailwindcss postcss autoprefixer (already in project)
- react-redux @reduxjs/toolkit (keep existing store)
- axios
- react-quill (React Quill) + dynamic import to avoid SSR issues

Steps
1. Create new Next app scaffolding
   - npx create-next-app@latest frontend-next --use-npm --example "default" (or manual)
2. Copy public assets from existing `public/` into Next's `public/`
3. Copy Tailwind config & styles (tailwind.config.js, postcss.config.js, src/index.css -> styles/globals.css)
4. Move shared components into `components/` and pages mapping:
   - src/pages/index.jsx <= LandingPage
   - src/pages/services.jsx <= Services
   - src/pages/portfolio.jsx <= Portfolio
   - src/pages/packages/index.jsx <= Packages listing
   - src/pages/packages/[slug].jsx <= Package detail (dynamic route)
   - src/pages/contact.jsx <= Contact
   - src/pages/cart.jsx <= Cart
   - src/pages/admin/* <= Admin pages
   - src/pages/vacancies/index.jsx <= Public vacancies listing
   - src/pages/vacancies/[slug].jsx <= Vacancy detail
5. Routing
   - Replace React Router usage: move route components into Next pages and convert link usage to next/link
6. Redux
   - Keep the store; initialize in _app.jsx using Provider. If using SSR for some pages, set up next-redux-wrapper later.
7. Environment variables
   - Rename VITE_BACKEND_URL -> NEXT_PUBLIC_BACKEND_URL and update config import to read from process.env.NEXT_PUBLIC_BACKEND_URL
8. React Quill integration
   - React Quill depends on window; use dynamic import to load only on client-side: const ReactQuill = dynamic(() => import('react-quill'), { ssr: false });
   - Include Quill css in component via import 'react-quill/dist/quill.snow.css'
9. API calls
   - Continue to call backend Express server. Alternatively, for some server-side fetching use Next API routes as a proxy if needed for auth or to keep secrets server-side.
10. Auth and cookies
   - If tokens stored in local storage, keep client-side login. If switching to cookie-based session, adapt accordingly.
11. Images and Upload
   - Update image imports and ensure public paths match Next's public folder
12. Deploy
   - Configure Vercel (if used): set build command `next build`, output `next start` or static export if decided

SSR & SEO considerations
- Public pages like packages and vacancies can use getStaticProps/getStaticPaths (SSG) for best performance and SEO.
- Keep sensitive admin pages client-only or protect via server-side auth checks in getServerSideProps.

Testing & Validation
- Run the Next app locally and compare pages to the Vite site
- Ensure Cart functionality and client-side store actions work
- Check React Quill editing and sanitize output on the backend

Rollback plan
- Keep Vite app in a branch until Next app fully validated
- Migrate incrementally: start with public pages (Packages, Vacancies) while leaving admin in Vite (or reverse)

Developer checklist (concrete)
- [ ] scaffold Next.js app
- [ ] copy tailwind and global styles
- [ ] move components and utils
- [ ] configure env vars
- [ ] integrate redux store into _app.jsx
- [ ] replace react-router code with next/link and page components
- [ ] implement React Quill with dynamic import for admin forms
- [ ] implement vacancy pages and product pages with SSG where possible
- [ ] smoke-test cart/checkout flows
- [ ] update CI/CD config and deploy preview

Estimated effort (rough)
- Scaffolding + copying components: 1–2 days
- Routing & page conversion: 2–4 days
- Quill integration & admin forms: 1 day
- QA, fixups, deploy: 1–2 days
Total: ~1 week for a single developer to complete a careful migration

---

Next steps and recommended immediate tasks
1. Add Mongoose models on backend for Vacancy, Product, Category, Inventory movement, Order, and Job (installation) — implement sanitization middleware
2. Implement Vacancies admin CRUD and public listing (React Quill on admin). This is lower risk and delivers public-facing value quickly.
3. Scaffold Next.js app in a `frontend-next/` folder and migrate the public listing pages (Packages & Vacancies) first to validate routing and SSG flows
4. Implement low-stock notification job and staff assignment for installation orders

If helpful, the next action can be:
- Create the Mongoose model files and route stubs (backend)
- Scaffold the Next.js repo and add one migrated page (vacancies list)
- Create admin wireframes or a more granular sprint plan

---

Appendix — Example Mongoose schema snippet (Vacancy)

const mongoose = require('mongoose');

const VacancySchema = new mongoose.Schema({
  title: { type: String, required: true },
  slug: { type: String, required: true, unique: true },
  department: String,
  location: String,
  employmentType: { type: String, enum: ['full-time','part-time','contract','internship','temporary'] },
  salaryRange: String,
  descriptionHtml: String, // sanitize before saving
  requirements: [String],
  responsibilities: [String],
  status: { type: String, enum: ['draft','open','closed'], default: 'draft' },
  postedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  postedAt: { type: Date, default: Date.now },
}, { timestamps: true });

module.exports = mongoose.model('Vacancy', VacancySchema);

---

End of document.
