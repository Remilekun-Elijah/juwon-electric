# Juwon Electric Cloudflare Worker Backend

This folder contains the Cloudflare Workers version of the backend.

It is intentionally separate from the existing Express backend because Workers do not run Node-only dependencies like Express middleware, Mongoose TCP connections, or Nodemailer SMTP transports in the same way a Node server does.

## Runtime

- API runtime: Cloudflare Workers
- Database: Cloudflare D1
- Email: optional HTTP provider through Resend
- Gmail polling worker: not included for now

## API Compatibility

The Worker keeps the same frontend-facing route shape:

- `GET /packages`
- `GET /services`
- `GET /portfolio`
- `POST /contact`
- `POST /subscribe`
- `POST /order`
- `POST /cart/quote`
- `POST /cart`
- `POST /admin/auth/login`
- `POST /admin/auth/request-password-reset`
- `POST /admin/auth/reset-password`
- `GET /admin/dashboard`
- Admin CRUD routes for packages, services, portfolio, contacts, newsletter, carts, and orders

The `/api` and `/api/admin` prefixes are also supported.

## First Deploy

From this folder:

```bash
npm install
npx wrangler login
npx wrangler d1 create juwon-electric
```

Copy the returned D1 `database_id` into `wrangler.toml`.

Apply the schema:

```bash
npm run d1:migrate
```

Generate and apply public content seed data:

```bash
npm run d1:seed
npx wrangler d1 execute juwon-electric --remote --file seed.sql
```

Set secrets:

```bash
npx wrangler secret put ADMIN_AUTH_SECRET
npx wrangler secret put SUPERADMIN_EMAIL
npx wrangler secret put SUPERADMIN_PASSWORD
npx wrangler secret put SUPERADMIN_NAME
```

Optional email delivery through Resend:

```bash
npx wrangler secret put RESEND_API_KEY
npx wrangler secret put MAIL_FROM
npx wrangler secret put MAIL_REPLY_TO
npx wrangler secret put ADMIN_NOTIFY_EMAIL
```

Deploy:

```bash
npm run deploy
```

## Frontend

Set the frontend production variable to the Worker URL:

```bash
VITE_BACKEND_URL=https://juwon-electric-api.<your-subdomain>.workers.dev
```

Then rebuild/redeploy the frontend.

## Notes

- D1 starts empty until migrations and seed SQL are applied.
- The super admin is seeded on first auth use from `SUPERADMIN_EMAIL` and `SUPERADMIN_PASSWORD`.
- Password hashes in this Worker use Web Crypto PBKDF2 with 100,000 iterations, not the Node backend's `scrypt` hash. That is fine because D1 is a separate production database.
- If admin login ever fails during first seed, delete the affected admin row from D1 and log in again so the Worker can reseed it.
- Contact replies are recorded in D1. Actual outbound email requires `RESEND_API_KEY`, `MAIL_FROM`, and `MAIL_REPLY_TO`.
- Gmail API polling is deliberately excluded and can be added later as a separate Worker Cron Trigger or Queue consumer.
