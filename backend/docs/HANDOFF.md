# Backend Handoff

## Current Goal

Build a solid backend for Juwon Electric that can serve the existing client frontend and a future admin frontend. The requested modules are:

- Packages
- Newsletter
- Services
- Portfolio
- Contact
- Cart
- Orders

## What Exists Now

The backend is an Express app in `backend/`. Before this work, it only handled:

- `POST /contact`
- `POST /subscribe`
- `POST /order`

Those legacy public endpoints still exist and keep the same response style, so the current React frontend should not break.

## What Was Added

### Routing

Public routes:

- `backend/routes/public.js`

Admin routes:

- `backend/routes/admin.js`

Both are mounted in `backend/app.js`:

- Public: `/` and `/api`
- Admin: `/admin` and `/api/admin`

### Controllers

- `backend/controllers/packages.js`
- `backend/controllers/newsletter.js`
- `backend/controllers/services.js`
- `backend/controllers/portfolio.js`
- `backend/controllers/contact.js`
- `backend/controllers/cart.js`
- `backend/controllers/orders.js`

### Services and Middleware

- `backend/services/store.js`: JSON-backed persistence layer.
- `backend/services/database.js`: MongoDB connection and first-run seed.
- `backend/services/validators.js`: request validation helpers.
- `backend/services/errors.js`: API error helper.
- `backend/services/http.js`: response helpers.
- `backend/services/asyncHandler.js`: async route wrapper.
- `backend/middleware/adminAuth.js`: optional admin token guard.

### Seed Data

- `backend/data/seed.js`

The backend seeds Services and Portfolio from the same text/assets used by the current frontend.

Packages seed from:

- `frontend/src/utils/plans.json`

If `MONGODB_URI` is configured, the backend connects to MongoDB and seeds empty collections from the current local seed data.

If the environment cannot resolve Atlas TXT records for a `mongodb+srv` URI, provide `MONGODB_DIRECT_URI`; it takes precedence over `MONGODB_URI`.

If MongoDB is unavailable, the backend falls back to JSON storage unless `MONGODB_REQUIRED=true`.

If `MONGODB_URI` is missing, the store falls back to:

- `backend/data/db.json`

That file becomes the local development database.

## Storage Notes

The backend now uses MongoDB when `MONGODB_URI` is present. JSON file storage remains as a fallback for local development without database credentials.

Persistence is intentionally isolated behind `backend/services/store.js`.

To replace MongoDB with another database later:

1. Keep the controller method signatures the same.
2. Replace functions in `store.js` with model calls.
3. Preserve response shapes from `backend/docs/API.md`.
4. Migrate `backend/data/db.json` records into collections.

Suggested collections:

- `packages`
- `newsletters`
- `services`
- `customerSegments`
- `portfolio`
- `contacts`
- `carts`
- `orders`

## Frontend Compatibility Notes

The existing client frontend currently hard-codes:

- Packages: `frontend/src/utils/plans.json`
- Services: arrays inside `frontend/src/pages/Services/Services.jsx`
- Portfolio: arrays inside `frontend/src/pages/Home/Portfolio.jsx` and `frontend/src/pages/Portfolio.jsx`

Existing frontend API posts are in:

- `frontend/src/features/user.js`

Current posts:

- `/subscribe`
- `/contact`
- `/order`

The new backend preserves those endpoints.

When wiring the frontend to read backend data:

1. Replace package import from `plans.json` with `GET /packages`.
2. Replace Services page arrays with `GET /services`.
3. Replace Portfolio arrays with `GET /portfolio` and `GET /portfolio?featured=true`.
4. Keep public asset paths unchanged because the backend returns paths like `/offer-1.svg`.

## Admin Frontend Contract

Set `SUPERADMIN_EMAIL`, `SUPERADMIN_PASSWORD`, and `ADMIN_AUTH_SECRET` in production. The backend seeds a super admin account from those values on startup.

The admin frontend logs in through:

- `POST /admin/auth/login`

The returned session token should be sent as one of:

- `x-admin-token: <token>`
- `Authorization: Bearer <token>`

`ADMIN_TOKEN` remains accepted as a static fallback token for scripts.

Admin routes support CRUD for content and status updates for operational records. See `backend/docs/API.md`.

## Environment Variables

Recommended backend `.env`:

```bash
NODE_ENV=development
PORT=9000
ADMIN_TOKEN=replace-with-a-long-random-token
ADMIN_AUTH_SECRET=replace-with-a-long-random-session-secret
SUPERADMIN_EMAIL=admin@example.com
SUPERADMIN_PASSWORD=replace-with-a-strong-password
SUPERADMIN_NAME=Super Admin
SMTP_USER=
SMTP_SECRET=
SMTP_FROM=
MONGODB_URI=
MONGODB_DIRECT_URI=
MONGODB_REQUIRED=false
```

Email still uses the existing Nodemailer Gmail transport in `backend/mail/mail.js`.

## Verification Performed

Commands run:

```bash
cd backend
node --check app.js
npm install
npm start
```

Verified with local requests:

```bash
curl -s http://127.0.0.1:9000/
curl -s http://127.0.0.1:9000/packages
curl -s http://127.0.0.1:9000/services
curl -s 'http://127.0.0.1:9000/portfolio?featured=true'
curl -s -X POST http://127.0.0.1:9000/cart/quote \
  -H 'Content-Type: application/json' \
  -d '{"items":[{"id":0,"withSolar":"true","quantity":2}]}'
curl -s http://127.0.0.1:9000/admin/orders
```

All returned successful JSON responses.

## Known Follow-Ups

- Add real automated tests for controllers and store behavior.
- Decide whether `backend/data/db.json` should be committed or ignored as a fallback-only local store.
- Run `npm audit` and upgrade backend dependencies carefully.
- If MongoDB Atlas `mongodb+srv` DNS TXT lookup fails locally, generate a standard/direct connection string from Atlas and place it in `MONGODB_DIRECT_URI`.
- Wire the client frontend to GET backend data instead of hard-coded arrays.
- Build the admin frontend on top of the `/admin` API.
- Improve `backend/mail/mail.js` so it does not log config and can fail gracefully if SMTP credentials are missing.

## Cloudflare Workers Backend

A Worker-native backend now exists in:

- `backend/cloudflare/`

This is separate from the Express backend because Cloudflare Workers do not run the current Node server stack as-is. The Worker uses:

- Cloudflare Workers for runtime
- Cloudflare D1 for persistence
- Web Crypto for admin password/session security
- Optional Resend HTTP API for email delivery

Gmail API polling is intentionally not implemented yet.

Deployment notes are in:

- `backend/cloudflare/README.md`

Important files:

- `backend/cloudflare/src/index.js`: Worker API implementation
- `backend/cloudflare/migrations/0001_records.sql`: D1 schema
- `backend/cloudflare/scripts/export-seed-sql.mjs`: exports public content seed SQL
- `backend/cloudflare/seed.sql`: generated seed data for packages/services/portfolio only
- `backend/cloudflare/wrangler.toml`: Cloudflare deployment config

When deploying the frontend against Cloudflare Workers, set:

```bash
VITE_BACKEND_URL=https://juwon-electric-api.<your-subdomain>.workers.dev
```
