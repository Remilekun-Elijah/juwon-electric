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
- `POST /admin/auth/logout`
- `GET /health`
- `GET /admin/dashboard`
- `GET /admin/audit-logs`
- `GET /admin/reads`, `POST /admin/reads`, `POST /admin/reads/all` (per-admin read status, migration 0006)
- Admin CRUD routes for packages, services, portfolio, contacts, newsletter, carts, and orders (including `DELETE /admin/orders/:id`, `DELETE /admin/contacts/:id`, `DELETE /admin/newsletter/:id`)

The `/api` and `/api/admin` prefixes are also supported.

## First Deploy

From this folder:

```bash
npm install
npx wrangler login
npx wrangler d1 create juwon-electric
```

Copy the returned D1 `database_id` into `wrangler.toml`.

Apply the schema (runs every file in `migrations/` that has not been applied yet, including `0002_rate_limits.sql`, `0004_admin_security.sql`, `0005_hardening.sql` and `0006_admin_reads.sql`):

```bash
npm run d1:migrate
# equivalent to: npx wrangler d1 migrations apply juwon-electric --remote
```

Existing deployments must apply `migrations/0002_rate_limits.sql` before (or right after) deploying the rate-limited Worker. Use the same command above; for local development use `npm run d1:migrate:local`. Until the table exists the Worker logs a warning and skips rate limiting (fails open) instead of rejecting requests.

Generate and apply public content seed data:

> **Warning:** `seed.sql` uses `INSERT OR REPLACE`. Running it against a database that is already in use overwrites every catalog row it contains (packages, services, customer segments, portfolio), including edits made in the admin. Only run it on a fresh database, or when you really want to reset the catalog.

```bash
npm run d1:seed
npx wrangler d1 execute juwon-electric --remote --file seed.sql
```

Set secrets. `ADMIN_AUTH_SECRET` is **required before deploying**: without a value of at least 32 characters (placeholders such as `replace-with...`, `change-me...` or `example...` are rejected), admin login and every admin route return 500 "Admin authentication is not configured.". Generate one with `openssl rand -base64 48`. `SUPERADMIN_PASSWORD` must be 12-128 characters and must not contain the email name; otherwise the super admin is not seeded (a warning is logged).

```bash
npx wrangler secret put ADMIN_AUTH_SECRET   # openssl rand -base64 48
npx wrangler secret put SUPERADMIN_EMAIL
npx wrangler secret put SUPERADMIN_PASSWORD
npx wrangler secret put SUPERADMIN_NAME
```

Security settings (see "Security hardening" below):

```bash
npx wrangler secret put ALLOWED_ORIGINS                        # e.g. https://juwonelectric.com,https://www.juwonelectric.com
npx wrangler secret put TURNSTILE_SECRET_KEY                   # or TURNSTILE_DISABLED=true until the frontend widget is live
npx wrangler secret put TURNSTILE_HOSTNAMES                    # optional, e.g. juwonelectric.com,www.juwonelectric.com
npx wrangler secret put INBOUND_EMAIL_WEBHOOK_SIGNING_SECRET   # whsec_... from the Resend webhook
```

Optional email delivery through Resend:

```bash
npx wrangler secret put RESEND_API_KEY
npx wrangler secret put MAIL_FROM
npx wrangler secret put MAIL_REPLY_TO      # must be the inbound (Resend receiving) address so customer replies reach the webhook
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
- Password hashes in this Worker use Web Crypto PBKDF2-SHA256 with 100,000 iterations, not the Node backend's `scrypt` hash. 100,000 is the highest iteration count the Workers runtime allows, so it cannot be raised; the login attempt limits below keep online guessing slow. That is fine because D1 is a separate production database.
- If admin login ever fails during first seed, delete the affected admin row from D1 and log in again so the Worker can reseed it.
- Contact replies require Resend (`RESEND_API_KEY`, `MAIL_FROM`; `MAIL_REPLY_TO` optional). If the email is not configured or fails to send, the reply endpoint returns 502 and the reply is not recorded (same as the Express backend).
- Rate limits (D1 table `rate_limits`, keyed by the client IP from `CF-Connecting-IP`: IPv4 as-is, IPv4-mapped IPv6 as IPv4, other IPv6 by its /64 prefix): admin login 20 per 15 minutes per IP; password reset request 3 per hour per IP and 3 per hour per email; password reset confirm 10 per hour per IP; `/cart/quote` 60 per 10 minutes per IP; public writes (`/contact`, `/subscribe`, `/order`, `/cart`) 30 per 10 minutes per IP **per route**. Exceeding a limit returns 429 with a `Retry-After` header and a message such as "Too many requests. Please try again in 10 minutes.". Expired rows are cleaned up opportunistically. See "Round 2 hardening" for the login attempt counters.
- Order prices and totals are recomputed from active D1 packages; client-sent `price`/`total` are ignored. Each order item must identify a package by `id` (public/legacy id, with optional `type`/`name`/`kva` checks) or by `type` + `name` + `kva` (+ `volt`), plus `withSolar` or `optionName` to pick the option. Unmatched items return 400.
- `ADMIN_AUTH_SECRET` (32+ characters) is required and is the only token signing key; `ADMIN_TOKEN` is never used for signing. Missing or rejected: admin login and admin routes return 500 "Admin authentication is not configured.".
- `POST /webhooks/contact-reply`: see "Inbound reply webhook" below.
- Password reset tokens are emailed to the admin (requires Resend configuration). They are only returned in the API response when `DEV_EXPOSE_RESET_TOKEN=true` (e.g. in `.dev.vars`) AND the request host is `localhost` or `127.0.0.1` (i.e. `wrangler dev`). `NODE_ENV` has no effect on this.
- Gmail API polling is deliberately excluded and can be added later as a separate Worker Cron Trigger or Queue consumer.

## Catalog seed and package id fix (migration 0003)

- `npm run d1:seed` (`scripts/export-seed-sql.mjs`) builds `seed.sql` from `frontend/src/utils/plans.json` + `backend/data/seed.js`, the same default catalog the Express store uses. It only writes packages, services, customer segments and portfolio rows. It never reads `backend/data/db.json`, which is gitignored because it holds admin password hashes and customer data.
- Record uuids and timestamps come from `backend/data/catalog-ids.json` (packages are keyed by public id, everything else by slug), so re-running the seed replaces existing rows instead of duplicating them. New catalog entries get a uuid that the script adds to that file, so commit it along with `seed.sql`. The script fails if two packages share a public id.
- `migrations/0003_fix_duplicate_package_ids.sql` gives the second package with each duplicated public id a new id: tubular Premium 3.5 kVA 7 -> 135, hybrid lithium Diamond 20 kVA 57 -> 136, hybrid lithium Diamond 30 kVA 56 -> 137. It is idempotent. Apply it to an already-seeded database with:

```bash
npx wrangler d1 migrations apply juwon-electric --remote
```

## Security hardening (migration 0004)

Code layout: `src/index.js` (routes), `src/http.js` (body cap, CORS, security headers), `src/validation.js` (limits, phone/URL/enum rules), `src/security.js` (crypto, Turnstile, Svix signatures), `src/auth.js` (sessions, lockout, rate limits), `src/audit.js` (audit log), `src/store.js` (D1 records).

### Deploying this change

`migrations/0004_admin_security.sql` adds `admin_sessions`, `login_failures`, `audit_logs` and `webhook_events`. **Apply it before deploying the new Worker**:

```bash
npx wrangler d1 migrations apply juwon-electric --remote
npm run deploy
```

Admin sessions are required: until `admin_sessions` exists, admin login returns a generic 500. The login lockout fails open (with a warning) if its table is missing, like the rate limiter. Tokens issued before this deploy have no session id, so every admin has to sign in again once.

### Environment variables

| Variable | Purpose | When unset |
|---|---|---|
| `ALLOWED_ORIGINS` | Comma-separated exact origins (compared case-insensitively), e.g. `https://juwonelectric.com,https://www.juwonelectric.com,http://localhost:5173`. Listed origins are reflected in `Access-Control-Allow-Origin` (with `Vary: Origin`) and their preflight gets 204 with `Access-Control-Max-Age: 600`; any request (including preflight) from an unlisted origin gets 403 "Origin not allowed.". Requests without `Origin` (server-to-server) are unaffected. | `Access-Control-Allow-Origin: *` and a one-time `console.warn`. |
| `TURNSTILE_SECRET_KEY` | Cloudflare Turnstile secret. `POST /contact`, `/order`, `/subscribe`, `/cart` (and `/api/...`) must send `turnstileToken`. The widget `action` must be `contact`, `order`, `subscribe` or `cart` respectively. Missing/invalid token, wrong action or hostname: 400 "Please complete the security check and try again."; siteverify unreachable (5 s timeout) or a secret/internal error code: 503. The token is never stored. | Requests to those routes fail closed with 503 (logged), unless `TURNSTILE_DISABLED=true`. |
| `TURNSTILE_DISABLED` | `true` skips Turnstile (one-time warning). Use it in `.dev.vars` for `wrangler dev`, or temporarily when deploying before the frontend widget is live. | Turnstile is enforced. |
| `TURNSTILE_HOSTNAMES` | Comma-separated hostnames the siteverify `hostname` must match. | Hostnames of `ALLOWED_ORIGINS`; if that is unset too, the hostname is not checked. |
| `DEV_EXPOSE_RESET_TOKEN` | `true` returns password reset tokens in the API response, but only for requests to `localhost`/`127.0.0.1`. Local development only. | Tokens are only emailed. |
| `INBOUND_EMAIL_WEBHOOK_SIGNING_SECRET` | Svix/Resend signing secret (`whsec_...`) for `POST /webhooks/contact-reply` (required; the static `x-webhook-secret` fallback was removed 2026-09-19). | Without it, or with a bad signature, the webhook returns 401. |
| `ADMIN_TOKEN` | Legacy static admin token (32+ characters, no placeholder; otherwise ignored with a warning). Still works (no session) but logs a warning; audit entries show `static-token`; logout returns "Static admin tokens cannot be signed out; remove ADMIN_TOKEN to revoke access.". Remove it once admin accounts are in use. | - |

Local development: put these in `.dev.vars` (never commit it).

### Limits and validation

- Request bodies are capped at 100 KB (Content-Length and the bytes actually read): 413 "Request body is too large.". Invalid JSON or a non-object body: 400.
- String limits (after trim): person name 100, phone 20, email 254, contact message 5000, delivery address 500, source 50, reply subject 200, reply message / inbound message 10000, note 2000, package name 100 / type 50 / load 1000 / kva 20 / volt 20, option name 100 / kits 500, service title 150 / subtitle 500 / ctaLabel 50, portfolio name 150, URLs 2048, slug 120, reset token 256, password 12-128 on reset. Objects/arrays where a string is expected are rejected.
- Order items max 50, cart items max 50, package options max 10; quantity is an integer 1-100; option price greater than 0 and at most 1,000,000,000 (see also "Round 2 hardening").
- Phone numbers: digits, spaces, `-`, `(`, `)` and one leading `+`, with 10-15 digits. Stored as entered (trimmed).
- URL fields (`image`, `link`, `ctaUrl`, including customer segment images): a `/path` (not `//`, no backslashes/whitespace/control characters) or an `https://` URL.
- Enums (writes only; a stored legacy value may be sent back unchanged): order `status` pending|completed|cancelled, `paymentStatus` unpaid|partial|paid|refunded, contact `status` new|contacted|completed, newsletter `status` new|active|inactive; `isActive` must be a boolean.

### Admin sessions, lockout and password policy

- Tokens last 8 hours and carry a session id (`sid`). Each login writes an `admin_sessions` row (id: 256-bit random base64url, IP, user agent truncated to 256). A token is accepted only while its session exists, is not revoked, has not expired and belongs to the same admin. `last_seen_at` is updated at most every 5 minutes. Expired sessions are deleted opportunistically.
- `POST /admin/auth/logout` (auth required) revokes the current session: `{ success: true, message: "Signed out." }`.
- A password reset revokes all of that admin's sessions.
- Login limits: superseded by "Round 2 hardening" below (per IP, per email + IP, and per email attempt counters).
- New passwords must be 12-128 characters and must not equal the email or contain its local part (when 4+ characters). Existing passwords still log in.
- `POST /admin/auth/request-password-reset` returns the same 200 response whether or not the account exists.

### Inbound reply webhook

With `INBOUND_EMAIL_WEBHOOK_SIGNING_SECRET` set, the raw body is verified before parsing, following Svix's manual verification (the scheme Resend uses): signed content `${svix-id}.${svix-timestamp}.${rawBody}`, HMAC-SHA256 with the base64-decoded secret after `whsec_`, compared in constant time against every `v1,<base64>` entry in `svix-signature`. The timestamp must be within 5 minutes. Processed `svix-id`s are kept for 24 hours (`webhook_claims` since migration 0005; see "Round 2 hardening"); a duplicate gets 200 "Webhook already processed." without reprocessing. If processing fails the claim is released so the sender's retry is handled.

The body can be the simple shape (`fromEmail`/`from`, `subject`, `text`/`body`/`message`) or a Resend `email.received` event. Resend events carry no body, so the Worker fetches it from `GET https://api.resend.com/emails/receiving/{email_id}` using `RESEND_API_KEY`.

### Security headers

Every response (including OPTIONS, errors and 404) sends `X-Content-Type-Options: nosniff`, `Referrer-Policy: no-referrer`, `X-Frame-Options: DENY`, `Content-Security-Policy: default-src 'none'; frame-ancestors 'none'`, `Cross-Origin-Resource-Policy: same-site` (only enforced on no-cors requests, so the frontend's CORS fetches are unaffected), `X-Request-Id` and, over HTTPS, `Strict-Transport-Security: max-age=31536000` (no `includeSubDomains`). Everything under `/admin` and `/api/admin` also sends `Cache-Control: no-store`.

### Audit log

Admin actions are written to `audit_logs` in `ctx.waitUntil` (a failed write is logged and never fails the action): `auth.login`, `auth.login_failed`, `auth.logout`, `auth.password_reset_requested`, `auth.password_reset`, `package|service|portfolio|customerSegment.create|update|delete`, `contact.update`, `contact.reply`, `contact.delete`, `order.status_change`, `order.update`, `order.delete`, `newsletter.update`, `newsletter.delete`. Actions taken with the static `ADMIN_TOKEN` are recorded with admin id/email `static-token`. `changes` lists field names only. Entries older than 180 days are deleted opportunistically.

`GET /admin/audit-logs?page=1&limit=50&action=&entity=&adminId=` (auth required) returns `{ success, message, data: { items, page, limit, total } }`, newest first. `limit` is capped at 100; `page` must be a whole number from 1 to 100000 and `limit` a positive whole number, otherwise 400.

## Round 2 hardening (migration 0005)

### Deploying this change

Order matters:

1. Set `ADMIN_AUTH_SECRET` (32+ random characters, `openssl rand -base64 48`) if it is not set or is shorter. Rotating it signs every admin out.
2. Decide on Turnstile: set `TURNSTILE_SECRET_KEY` (and optionally `TURNSTILE_HOSTNAMES`) once the frontend sends `turnstileToken` with the right `action`; until then set `TURNSTILE_DISABLED=true`, because without either the public forms return 503.
3. Apply migrations (`0004` if not yet applied, then `0005_hardening.sql`), then deploy:

```bash
npx wrangler d1 migrations apply juwon-electric --remote
npm run deploy
```

4. Deploy the frontend (checkout quote, Turnstile `action`, admin delete buttons), then set `TURNSTILE_SECRET_KEY` and remove `TURNSTILE_DISABLED`.

`0005_hardening.sql` adds `webhook_claims` (copying already-processed ids from `webhook_events`) and an index on `records (collection, created_at)`. The inbound webhook returns 500 until it is applied.

For local development, put `TURNSTILE_DISABLED=true` (and optionally `DEV_EXPOSE_RESET_TOKEN=true`) in `.dev.vars` and run `npm run d1:migrate:local`.

### Behaviour

- **Login:** after body validation (400), checks run in this order, each counted atomically in D1 before any password hashing:
  1. 20 attempts per 15 minutes per IP (429 "Too many sign-in attempts. Try again in N minutes.");
  2. more than 5 attempts per email + IP within 15 minutes locks that pair for 15 minutes;
  3. more than 30 attempts per email from all IPs within 15 minutes locks the email for 15 minutes.

  Both locks return 429 "Too many failed sign-in attempts. Try again in N minutes." with `Retry-After`, identical for existing and unknown accounts. A successful login clears the pair and email counters. Failed logins write at most 5 audit rows per IP per 15 minutes. Counters live in `login_failures` (keys `pair:<email>|<ip>` and `email:<email>`). The old per IP + email limiter was removed.
- **Sessions:** 8 hour absolute lifetime and a 2 hour idle timeout.
- **Password reset request:** always answers immediately with the same 200 body; the lookup, token, audit entry and email happen in the background (`ctx.waitUntil`). Tokens are stored as SHA-256 hashes; up to 3 unused tokens (30 minutes each) are valid at once. Confirming a token marks it used, changes the password and revokes all sessions in one D1 batch, so concurrent confirms with the same token succeed exactly once.
- **Validation:**
  - Order/cart items are shape-checked (short strings or numbers only) before any matching.
  - String fields must be JSON strings ("<Label> must be text.") and may not contain control or invisible format characters.
  - Numeric admin fields accept numbers or plain decimal strings.
  - Option `price` > 0, `kits` required.
  - `legacyId` is a unique whole number (409 "Another package already uses id N.").
  - `sortOrder` 0-1,000,000; audit-log paging `page` 1-100000.
  - POST/PUT/PATCH bodies must be `application/json` (415), except the webhook.
  - Emails use the shared regex from the fix plan.
- **Records:**
  - Updates apply only the changed fields to the latest stored document (compare-and-set with retries; 409 if it keeps changing), and appends (`replies`, `inboundReplies`) use a single `json_insert` update.
  - Only catalog records (packages, services, portfolio, customer segments) have slugs, which are normalized and unique per collection.
  - New catalog items sort last.
  - `POST /cart` updates the cart with the same `sessionId`.
  - `POST /subscribe` answers "You're subscribed." for new (201) and existing (200) addresses without duplicating them.
  - `POST /cart/quote` prices each line separately: unpriceable lines come back as `{ available: false, message }` and their indexes are listed in `data.unavailable`.
- **Webhook:**
  - A malformed signing secret gives 500 "Webhook is not configured correctly.", and every signature/timestamp failure gives 401 "Invalid webhook signature." (the HMAC covers the raw bytes).
  - Deliveries are claimed in `webhook_claims`: a finished id gets 200 "Webhook already processed."; one still processing gets 409 (so the sender retries), unless the claim is older than 2 minutes.
  - Unsupported events, invalid `email_id`s, oversized emails, unknown senders and replies whose sender differs from the tagged contact get 200 "Webhook ignored." and a log line.
  - Long subjects and messages are truncated (`truncated: true`) instead of rejected.
  - The `[JE-CONTACT:<id>]` tag matches record ids only.
- **Health and tracing:** `GET /health` returns `{ success: true, status: "ok" }`, or 503 `{ success: false, status: "unavailable" }` when D1 is unreachable. Every response has `X-Request-Id`, which is echoed when the client sends a valid one and included in server error logs. `HEAD` works on every `GET` route.
- **Logs:** email provider failures log only the HTTP status or error name/message, never bodies or recipients.

## Admin read status (migration 0006)

### Deploying this change

1. Apply the migration, then deploy the Worker:

```bash
npx wrangler d1 migrations apply juwon-electric --remote
npm run deploy
```

2. Deploy the frontend that uses `/admin/reads`.

`0006_admin_reads.sql` is idempotent and adds `admin_read_state (admin_id, since, updated_at)` and `admin_reads (admin_id, record_key, read_at)` (primary key `(admin_id, record_key)`, plus an index on `record_key`). Until it is applied the three read-status routes return 500 "Something went wrong." (the error is logged) and the admin console keeps read status in the browser; deleting a contact or order still works and logs "Failed to delete read status". For local development run `npm run d1:migrate:local`.

### Behaviour

Read status is stored per admin (`admin.id`, or `static-token` for `ADMIN_TOKEN`) and never touches the records, so it creates no audit entries and no compare-and-set conflicts. Record keys are `contacts:<id>` / `orders:<id>`; times are epoch milliseconds. Activity is `receivedAt` (or `createdAt`), and for contacts also `lastInboundReplyAt` and every `inboundReplies[].receivedAt`, whichever is newest (invalid dates count as 0). The routes are not audited or rate limited, send `Cache-Control: no-store`, and POST bodies must be `application/json` (415).

- `GET /admin/reads`: creates the admin's row with `since = now` on first use, removes item rows with `read_at <= since`, and returns `{ since, items: { "<key>": readAt } }` ("Read status retrieved.").
- `POST /admin/reads` `{ type, id }`: 400 "Type must be contacts or orders." / "Id is required." (non-empty string, at most 64 characters), 404 "Contact not found." / "Order not found." (`id` is resolved like the admin get-by-id routes). Stores `max(now, activity)` with `ON CONFLICT ... DO UPDATE SET read_at = MAX(admin_reads.read_at, excluded.read_at)` and returns `{ key, readAt }` with the stored value ("Marked as read.").
- `POST /admin/reads/all`: body ignored. Moves `since` to `max(stored since, now, newest activity across all contacts and orders)`, removes the rows it covers and returns `{ since, items }` ("All marked as read.").
- `DELETE /admin/contacts/:id` and `DELETE /admin/orders/:id` also remove that record's read rows for every admin (best effort).
