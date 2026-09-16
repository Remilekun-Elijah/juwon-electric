# Juwon Electric Backend API

Base URLs:

- Public: `/`
- Public alias: `/api`
- Admin: `/admin`
- Admin alias: `/api/admin`
- Health: `GET /health` (and `/api/health`): `200 { "success": true, "status": "ok" }` when the store answers (MongoDB ping, or the JSON store reads), otherwise `503 { "success": false, "status": "unavailable" }`. No version or environment details.

Every response carries `X-Request-Id`: the incoming `X-Request-Id` when it matches `^[A-Za-z0-9-]{8,64}$`, otherwise a generated id. Server error logs include it.

Admin authentication:

- Seed the super admin with `SUPERADMIN_EMAIL` and `SUPERADMIN_PASSWORD`. The password must meet the password policy below and must not be a `replace-with...` placeholder, otherwise seeding is skipped with a warning.
- Login with `POST /admin/auth/login` to receive an admin session token (valid for 8 hours, and ended after 2 hours without activity).
- Send `x-admin-token: <session-token>` or `Authorization: Bearer <session-token>`.
- Session tokens are signed with `ADMIN_AUTH_SECRET` only (at least 32 characters; generate with `openssl rand -base64 48`). `ADMIN_TOKEN` is never used as a signing key.
  - `NODE_ENV=production` without a valid `ADMIN_AUTH_SECRET`: `POST /admin/auth/login` and admin routes return `500` `"Admin authentication is not configured."` (a valid static `ADMIN_TOKEN` still works).
  - Other environments: a random per-process key is used with a loud startup warning (sessions end on restart).
- `ADMIN_TOKEN` is still accepted as a static token for scripts. It never expires and cannot be revoked, so a warning is logged while it is set; remove it once scripts use session logins. Values shorter than 32 characters or starting with `replace-with`, `change-me` or `example` are ignored (warning logged). Actions made with it are audited with `adminId`/`adminEmail` `"static-token"`.

Auth endpoints:

- `POST /admin/auth/login` (body `{ "username", "password" }`)
- `POST /admin/auth/logout` (auth required) revokes the current session and returns `200 { "success": true, "message": "Signed out." }`. With the static `ADMIN_TOKEN` it returns `200` `"Static admin tokens cannot be signed out; remove ADMIN_TOKEN to revoke access."`.
- `POST /admin/auth/request-password-reset` (body `{ "username" }`)
- `POST /admin/auth/reset-password` (body `{ "username", "token", "password" }`)

Sessions:

- Every login creates a server-side session (`sessions` collection: `id`, `adminId`, `createdAt`, `expiresAt`, `lastSeenAt`, `revokedAt`, `ip`, `userAgent`). The token carries the session id (`sid`); a token is only accepted while its session exists, belongs to the admin, is not revoked, has not expired and was seen within the last 2 hours.
- `lastSeenAt` is updated at most once every 5 minutes. Expired sessions are deleted opportunistically.
- Logging out revokes the session; resetting a password revokes all of that admin's sessions.

Login: order of checks for `POST /admin/auth/login`. Counters are incremented atomically before any password hashing.

1. Body: `username` must be a valid email (≤254), `password` required (≤128). Otherwise `400`.
2. Per-IP limiter: 20 attempts / 15 min per IP prefix → `429` `"Too many sign-in attempts. Try again in N minutes."` + `Retry-After`.
3. Per (email, IP prefix) counter: more than 5 attempts in 15 min locks that pair for 15 min → `429` `"Too many failed sign-in attempts. Try again in N minutes."` + `Retry-After`.
4. Per email counter (all IPs): more than 30 attempts in 15 min locks the email for 15 min → the same `429`. This limits distributed guessing without letting a single IP lock the real admin out.
5. Password verification (unknown or inactive accounts do the same scrypt work against a dummy hash).
6. Success: the pair and email counters are cleared, a session is created, `auth.login` is audited.
7. Failure: `401` `"Invalid username or password."`. `auth.login_failed` is audited at most 5 times per IP prefix per 15 minutes.

The `429` bodies are identical whether the account exists and whether the password is right. The earlier IP+username limiter (5 / 15 min) and per-email failure lockout were replaced by steps 2-4. A password reset clears every login counter for that email.

Passwords are hashed with async scrypt (`scrypt$32768$8$3$<salt>$<hash>`, N=32768, r=8, p=3, 16-byte salt, 64-byte key). Older `salt:hash` hashes still sign in and are upgraded transparently after a successful login.

Password policy (reset and seed): 12-128 characters, must not equal the email address and must not contain the email's local part when it is 4+ characters. Existing passwords still sign in.

Password reset:

- `request-password-reset`: body validation (`400`) → 3 requests / hour per IP prefix → 3 requests / hour per email → `200` `"If the account exists, a password reset token has been sent."` with `data: { "email" }`. Over either limit: `429` `"Too many password reset requests. Try again in N minutes."`.
  - The response is sent immediately; the account lookup, token creation, email and audit entry happen in the background, so timing and body are the same whether or not the account exists.
  - When the account exists, the token is emailed (Node: SMTP via `SMTP_*`; the email links `ADMIN_APP_URL` when set). Tokens expire after 30 minutes and are single-use. Up to 3 unused tokens are valid at once (a new request does not invalidate earlier ones; the oldest is dropped beyond 3). Tokens are stored as SHA-256 hashes.
  - Local development only: when `DEV_EXPOSE_RESET_TOKEN=true`, the request's `Host` is `localhost` or `127.0.0.1`, and `NODE_ENV` is not `production`, the work is done before responding and `data` also includes the raw `resetToken` (existing accounts only). It is never exposed in production.
- `reset-password`: body validation (email, password policy, token ≤256) → 10 requests / hour per IP prefix (`429` `"Too many requests. Please try again in N minutes."`) → the token is consumed with a compare-and-set before the password changes, so concurrent requests with the same token produce exactly one `200` `"Password reset successful."`; the others (and any invalid, used or expired token) get `400` `"Invalid or expired reset token."`.

IP addresses: rate-limit and lockout keys use the client IP prefix: IPv4 as-is, IPv4-mapped IPv6 (`::ffff:1.2.3.4`) as `1.2.3.4`, IPv6 as its /64 (`2001:db8:0:0::/64`). Audit logs store the full normalized IP. Turnstile receives the full client IP.

Rate limiting (Node backend, fixed window; stored in MongoDB `rateLimits` when connected so limits are shared across instances, otherwise in process memory):

| Endpoint | Limit | Key |
| --- | --- | --- |
| `POST /admin/auth/login` | 20 / 15 min, plus the per (email, IP) 5 and per email 30 lockouts above | IP prefix |
| `POST /admin/auth/request-password-reset` | 3 / hour, and 3 / hour | IP prefix, email |
| `POST /admin/auth/reset-password` | 10 / hour | IP prefix |
| `POST /contact`, `/subscribe`, `/order`, `/cart` | 30 / 10 min per route | IP prefix |
| `POST /cart/quote` | 60 / 10 min | IP prefix |

All counted attempts count (not just failures), and `/api` aliases share the same buckets. Exceeding a limit returns `429` with a `Retry-After` header (seconds); public routes use `"Too many requests. Please try again in N minutes."`. With in-memory storage, limits reset when the process restarts (a warning is logged at startup). If a MongoDB call fails the request falls back to memory; the limiter never fails a request.

Proxies: set `TRUST_PROXY` to the number of reverse-proxy hops in front of the app (`TRUST_PROXY=1` on Render) or an Express trust-proxy value such as `loopback` or a CIDR list, so the client IP comes from `X-Forwarded-For`. `TRUST_PROXY=true` (trust every hop) is not supported: it would let clients pick their IP, so it is treated as `1` with a warning. Leave it empty when clients connect directly; if requests arrive with `X-Forwarded-For` while it is empty, a warning is logged once.

## Security

Order of checks for public writes (`/contact`, `/order`, `/subscribe`, `/cart`): body validation (types, lengths, enums, phone, email, item shapes; no database reads) → per-route rate limit → Turnstile → database reads, pricing and writes. A request that fails validation never uses its Turnstile token. `/cart/quote`: validation → rate limit → pricing (no Turnstile).

Request limits:

- `POST`/`PUT`/`PATCH` requests with a body must be `Content-Type: application/json` (parameters such as `charset` allowed); otherwise `415` `"Content-Type must be application/json."`. The inbound webhook is exempt (it verifies the raw body).
- Request bodies are limited to **100 KB**; larger bodies return `413` `"Request body is too large."`. Invalid JSON returns `400`.
- Text fields must be JSON strings: anything else returns `400` `"<Label> must be text."`. Values are trimmed; over-long values return `400`, e.g. `"Message must be 5000 characters or fewer."`.
- Control characters are rejected in single-line fields; multi-line fields (contact `message`, reply `message`, `deliveryAddress`, `note`, package `load`, option `kits`) allow only tab, line feed and carriage return. Format characters (zero-width space, BOM, bidi overrides, ...) are rejected everywhere, except the zero-width joiner and non-joiner (U+200D, U+200C) used by emoji and some scripts. Error: `400` `"<Label> contains invalid characters."`. Inbound email content is cleaned instead of rejected.
- Email addresses use one shared rule (also in the Worker and frontend): `^[A-Za-z0-9.!#$%&'*+/=?^_`{|}~-]{1,64}@[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?(?:\.[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?)*\.[A-Za-z]{2,63}$`, at most 254 characters, no leading, trailing or consecutive dots in the local part. They are trimmed and lowercased before storing.

| Field | Max characters |
| --- | --- |
| `name` (person: contact, order, subscriber, cart) | 100 |
| `phoneNumber` | 20 |
| `emailAddress` / `email` | 254 |
| contact `message` | 5000 |
| `deliveryAddress` | 500 |
| `source` | 50 |
| admin reply `subject` | 200 |
| reply `message` | 10000 |
| order/contact `note` | 2000 |
| package `name` 100, `type`/`category` 50, `load` 1000, `kva` 20, `volt` 20 | |
| package option `name` 100, `kits` 500 (required) | |
| service/customer segment `title` 150, `subtitle` 500; service `ctaLabel` 50 | |
| portfolio `name` | 150 |
| URL fields (`image`, `link`, `ctaUrl`) | 2048 |
| `slug` | 120 |
| cart `sessionId` | 256 |
| password (reset) | 12-128 |
| reset `token` | 256 |
| `turnstileToken` | 2048 |

- Order items: at most 50 (`"An order can have at most 50 items."`). Cart items: at most 50 (`"A cart can have at most 50 items."`). Package options: at most 10 (`"A package can have at most 10 options."`).
- Order/cart/quote items are shape-checked before any matching: `kva`, `volt`, `type`, `name`, `optionName`, `option` must be strings or numbers of at most 50 characters; `package` at most 600; `id`, `packageId`, `legacyId` at most 64; `withSolar` a boolean or `"true"`/`"false"`. Otherwise `400` `"Invalid order item."` / `"Invalid cart item."`.
- Item `quantity`: a JSON integer or a digits-only string from 1 to 100 (1 when omitted); otherwise `400` `"Quantity must be a whole number from 1 to 100."` (`""` included).
- Numeric admin fields (`kva`, `volt`, `sortOrder`, `legacyId`, option `price`) accept a JSON number or a string of digits with an optional decimal part (`"12"`, `"12.5"`). Hex, exponents, blanks and padded strings return `"<Label> must be a number."` (labels `kVA`, `Volt`, `Sort order`, `legacyId`, `Option price`).
  - `kva` is required and must be > 0; `volt` must be > 0 when present (send `null` to clear it).
  - `sortOrder`: 0 to 1,000,000.
  - `legacyId`: a whole number from 0 to 1,000,000,000, unique among packages; a duplicate returns `409` `"Another package already uses id N."`.
  - Option `price`: greater than 0 and at most 1,000,000,000.
- Cart `phoneNumber` and `emailAddress` are optional but validated when present.
- Phone numbers may contain digits, spaces, `-`, `(`, `)` and one leading `+`, with 10-15 digits in total; otherwise `400` `"Enter a valid phone number."`. The trimmed original is stored.
- URL fields (`image` on portfolio/services/customer segments, `link` on portfolio, `ctaUrl` on services) must be a site-relative path starting with a single `/` (no `//`, backslashes, whitespace or control characters) or an absolute `https://` URL; otherwise `400` `"<Field> must be an https:// URL or a path starting with /."`.
- Slugs exist only on packages, services, portfolio items and customer segments. A sent slug is normalized (lowercase, `&` → `and`, other characters → `-`); a UUID-shaped slug returns `400` `"Slug must not look like an id."`; an empty slug is derived from the name/title (packages: `name-type-kva`), or a short random id; collisions get `-2`, `-3`, ... Updates and deletes resolve `:id` by id, then slug, then `legacyId`, and then write strictly by the resolved record id.
- Paging (`/admin/audit-logs`): `page` must be a whole number from 1 to 100000 and `limit` a positive whole number (capped at 100); otherwise `400`.

Status values (validated on write; stored legacy values remain readable, and a stored legacy value sent back unchanged is accepted, since the admin UI sends the current status with each update):

| Field | Allowed |
| --- | --- |
| order `status` | derived and read-only: `pending`, `completed`, `cancelled` (see "Orders and fulfilment" below) |
| order `fulfillmentStatus` | `pending`, `processing`, `out_for_delivery`, `delivered`, `installed`, `cancelled` |
| order `paymentStatus` | `pending`, `partial`, `paid`, `failed`, `refunded` (`unpaid` is accepted as an input alias for `pending`) |
| contact `status` | `new`, `contacted`, `completed` |
| newsletter `status` | `new`, `active`, `inactive` (`isActive` is a boolean) |

Bot protection (Cloudflare Turnstile):

- `POST /contact`, `/order`, `/subscribe` and `/cart` (and `/api/...` aliases) require a `turnstileToken` body field. The token is verified with Cloudflare siteverify (5 s timeout, full client IP as `remoteip`) and never stored.
- The siteverify `action` must match the route: `contact`, `order`, `subscribe`, `cart`. The `hostname` must be in `TURNSTILE_HOSTNAMES` (comma list) when set, otherwise one of the `ALLOWED_ORIGINS` hostnames when that is set; otherwise it is not checked.
- Missing, invalid or mismatched token: `400` `"Please complete the security check and try again."`. Cloudflare unreachable, or `error-codes` containing `missing-input-secret`, `invalid-input-secret` or `internal-error` (logged loudly): `503` `"Security check is temporarily unavailable. Please try again."`. `error-codes` are always logged.
- `TURNSTILE_SECRET_KEY` unset: with `TURNSTILE_DISABLED=true` verification is skipped (warning logged once); otherwise `NODE_ENV=production` fails closed with `503`, and other environments skip with a warning.

CORS:

- `ALLOWED_ORIGINS` (comma-separated exact origins, compared case-insensitively): listed origins get `Access-Control-Allow-Origin: <origin>` and `Vary: Origin`. Any request (including preflights) with an unlisted `Origin` returns `403` `"Origin not allowed."`. Requests without an `Origin` header are unaffected.
- Unset: `Access-Control-Allow-Origin: *` with a startup warning.
- Allowed preflights return `204` with an empty body and `Access-Control-Max-Age: 600`. Allowed request headers: `Content-Type`, `Authorization`, `X-Admin-Token`. Exposed: `Retry-After`, `X-Request-Id`.

Response headers (every response, including errors, `404` and `OPTIONS`):

- `X-Content-Type-Options: nosniff`, `Referrer-Policy: no-referrer`, `X-Frame-Options: DENY`, `Content-Security-Policy: default-src 'none'; frame-ancestors 'none'`, `Cross-Origin-Resource-Policy: same-site`, `X-Request-Id`.
- `Strict-Transport-Security: max-age=31536000` on HTTPS requests (behind a proxy this needs `TRUST_PROXY`).
- `/admin/*` and `/api/admin/*` responses (any letter case) also send `Cache-Control: no-store`.
- `X-Powered-By` is not sent.

Error status summary: `400` validation, `401` auth/webhook signature, `403` origin not allowed, `404` not found (`"<Label> not found."`: Package, Service, Portfolio item, Customer segment, Order, Contact, Subscriber, Admin), `409` duplicate package id or webhook still being processed, `413` body too large, `415` not JSON, `429` rate limit or login lockout (with `Retry-After`), `500` admin auth or webhook secret misconfigured, `502` reply email not delivered or inbound email not fetchable, `503` Turnstile unavailable or database unavailable (`"Service temporarily unavailable."`).

Email:

- SMTP needs `SMTP_USER`, `SMTP_SECRET` and `SMTP_FROM`. When any is missing no connection is attempted: emails are skipped, a warning is logged once, and admin replies return `502`.
- `MAIL_BCC` (optional, comma-separated) adds BCC recipients to every Node email. No BCC is sent by default.
- Logs never include provider error bodies, recipients or message bodies (only error name, code and message).

Database:

- Set `MONGODB_URI` to use MongoDB.
- If the host environment cannot resolve Atlas TXT records for `mongodb+srv`, set `MONGODB_DIRECT_URI` to a standard `mongodb://host1,host2,host3/db?...` URI.
- When `MONGODB_URI` is set and `NODE_ENV=production` or `MONGODB_REQUIRED=true`, a failed connection at startup exits the process with a non-zero code (no JSON fallback). In development the backend falls back to `backend/data/db.json` with a loud warning.
- The store is chosen once at startup. If MongoDB disconnects later, requests return `503` `"Service temporarily unavailable."` until it reconnects; the JSON file is never used mid-run.
- On first MongoDB connection, empty collections are seeded from the current package/service/portfolio data.
- Security collections: `sessions`, `auditLogs`, `webhookEvents` (JSON store and MongoDB), plus `rateLimits` (MongoDB only, TTL index on `resetAt`; never written to the JSON file).
- Read status collections: `adminReadState` (`{ adminId, since, updatedAt }`, unique `adminId`) and `adminReads` (`{ adminId, recordKey, readAt }`, unique `(adminId, recordKey)`), in the JSON store (written under the store lock) and MongoDB. Mongo upserts use `$max`, retried once on a duplicate key error. Indexes are created at startup.
- `JSON_STORE_PATH` optionally points the JSON store at another file.
- JSON store backups: at every startup an existing store file is copied to `backups/db-<timestamp>.json` next to it (`backend/data/backups/` by default, git-ignored); the newest 5 are kept.
- Updates write only the sent fields against the freshly loaded record (Mongo `$set`), and contact reply threads are appended atomically (Mongo `$push`).

Shutdown: on `SIGTERM`/`SIGINT` the server stops accepting connections, lets in-flight requests and pending background writes (audit log, store writes, emails, password-reset work) finish for up to 10 seconds, then exits.

Cloudflare Workers runtime:

- A Worker-native implementation exists in `backend/cloudflare/`.
- It keeps the same public/admin API paths, including `/api` and `/api/admin` aliases.
- It uses Cloudflare D1 instead of MongoDB because Workers cannot run the current Express/Mongoose/Nodemailer server as-is.
- Gmail polling is not included in the Worker runtime yet.
- Deployment steps are in `backend/cloudflare/README.md`.

## Public Endpoints

### Packages

- `GET /packages`
- `GET /packages/:id` (`:id` is the id, slug or public `legacyId`; inactive packages return `404` `"Package not found."`)

Returns package plans in the shape the existing React packages/cart UI expects:

```json
{
  "success": true,
  "message": "Packages retrieved.",
  "data": [
    {
      "id": 0,
      "_id": "backend-uuid",
      "slug": "basic",
      "type": "tubular",
      "category": "tubular",
      "name": "Basic",
      "load": "2 fans...",
      "kva": 1.1,
      "volt": null,
      "options": [
        { "name": "Without solar", "price": 700000, "kits": "1 battery..." }
      ]
    }
  ]
}
```

### Services

- `GET /services`

Returns:

```json
{
  "data": {
    "offerings": [],
    "customerSegments": []
  }
}
```

The image fields intentionally use the same public asset paths as the client frontend, such as `/offer-1.svg` and `/panel-1.webp`.

### Portfolio

- `GET /portfolio`
- `GET /portfolio?featured=true`
- `GET /portfolio/:id` (inactive items return `404` `"Portfolio item not found."`)

Portfolio image fields use the existing frontend public assets, such as `/image-1.svg` and `/portfolio-5.svg`.

### Contact

- `POST /contact`
- `POST /webhooks/contact-reply`

Body:

```json
{
  "name": "Customer Name",
  "phoneNumber": "08000000000",
  "emailAddress": "optional@example.com",
  "message": "I need help with an inverter.",
  "turnstileToken": "token-from-the-turnstile-widget"
}
```

The request is persisted in `contacts` and then sent through the existing email template.

Inbound contact reply webhook:

```json
{
  "fromEmail": "customer@example.com",
  "subject": "Re: Your message",
  "text": "Customer reply body"
}
```

`fromEmail`/`from`/`sender` may be `"Name <address>"`; the address is extracted. The body is read from `text`, `body` or `message`.

Resend `email.received` events are also accepted: `{ "type": "email.received", "data": { "email_id", "from", "subject", ... } }`. That event carries no message body, so the backend fetches it from `GET https://api.resend.com/emails/receiving/:email_id` with `RESEND_API_KEY` (10 s timeout; `text`, or `html` stripped to text). If that fetch fails the webhook returns `502` `"Unable to fetch the inbound email."` and the svix id is released so Resend retries.

Inbound handling (after authentication and JSON parsing):

- Only `email.received` events and the legacy payload (no `type`) are processed. Any other `type`, an `email_id` that is not a UUID (`^[0-9a-fA-F-]{36}$`), a sender that does not parse as `local@domain`, or an empty body returns `200` `"Webhook ignored."` (logged, not stored) so the provider does not retry.
- Inbound content is never rejected for length: the message is truncated to 10,000 characters and the subject to 998, and the stored reply gets `truncated: true`. Control and format characters are stripped. Fetched `text`/`html` is capped at 200,000 characters (a Resend response over 1 MB is ignored); HTML is converted to text with linear-time processing.
- Threading: a `[JE-CONTACT:<id>]` subject tag is looked up by contact id only, and the sender must equal the contact's email (case-insensitive); otherwise the event is ignored. Without a tag, the reply goes to the most recent contact with that email; none → ignored.
- The reply is appended atomically to `inboundReplies` (and `lastInboundReplyAt` set), then the contact status becomes `contacted`. Response: `200` `"Inbound reply recorded."` with the contact.
- Replies only thread when customers reply to the address in `MAIL_REPLY_TO`, so that must be the inbound (Resend receiving) address.

Authentication, in order of preference:

1. `INBOUND_EMAIL_WEBHOOK_SIGNING_SECRET` (Svix/Resend `whsec_...`): the request must carry `svix-id`, `svix-timestamp` and `svix-signature`. The server computes HMAC-SHA256 over `${svix-id}.${svix-timestamp}.${rawBody}` using the base64-decoded secret (the part after `whsec_`) and accepts the request if any space-separated `v1,<base64>` signature matches (constant-time compare) and the timestamp is within 5 minutes of the server clock. The raw body bytes are verified before JSON parsing. A malformed secret (not `whsec_` followed by base64) returns `500` `"Webhook is not configured correctly."`; any signature or timestamp problem returns `401` `"Invalid webhook signature."`. Processed `svix-id`s are remembered for 24 hours (`webhookEvents` collection, with `status` `processing`/`done` and `claimedAt`): a repeated id that is `done` returns `200` `"Webhook already processed."`; one still `processing` returns `409` `"Webhook is already being processed."` unless the claim is older than 2 minutes, in which case it is taken over and processed. Invalid JSON is rejected with `400` before the id is recorded, and if processing fails (e.g. `502`) the claim is released so the provider's retry is processed again.
2. Otherwise `INBOUND_EMAIL_WEBHOOK_SECRET`, sent as the `x-webhook-secret` header.
3. With neither configured, or a missing/wrong secret or signature, the webhook returns `401`.

### Newsletter

- `POST /subscribe`

Body:

```json
{
  "emailAddress": "customer@example.com",
  "name": "Optional Name",
  "source": "client",
  "turnstileToken": "token-from-the-turnstile-widget"
}
```

One record per email address: a new address returns `201`, an existing one `200` (reactivated if it was inactive). Both return `{ "success": true, "message": "You're subscribed.", "data": { "emailAddress" } }`, so the response does not reveal whether the address was already subscribed. The admin notification email is only sent for new subscribers.

### Cart

- `POST /cart/quote`
- `POST /cart`

Quote body:

```json
{
  "items": [
    {
      "id": 0,
      "name": "Basic",
      "type": "tubular",
      "kva": 1.1,
      "volt": null,
      "withSolar": "true",
      "quantity": 2
    }
  ]
}
```

Quote response (`200`): `data: { "items", "total", "unavailable" }`. `items` has the same length and order as the request. A line that can be priced has `packageId`, `legacyId`, `name`, `type`, `kva`, `volt`, `optionName`, `kits`, numeric `price`, `unitPrice`, `quantity`, `lineTotal` and `available: true`. A line that can't (inactive, removed or unmatched package/option) is `{ "available": false, "message": "This item is no longer available." }`. `total` sums the available lines and `unavailable` lists the indexes of the others. Validation errors (types, lengths, quantity, more than 50 items) still return `400`.

Saved cart (`POST /cart`) also requires a `sessionId` and a `turnstileToken` (action `cart`). A cart with the same `sessionId` is updated (items, total, and name/phone/email when sent) and returns `200` `"Cart saved."`; otherwise a new cart is created with `201` `"Cart saved."`. Any unavailable item returns `400` `"Some items in your cart are no longer available. Please refresh your cart."`. Carts not updated for 30 days are deleted opportunistically. Cart items may also reference a package by its internal `packageId`.

Prices are always computed on the server from the active package catalog (see "Package resolution" below); any client-sent `price` is ignored.

### Orders

- `POST /order`

Checkout item shape:

```json
{
  "name": "Customer Name",
  "phoneNumber": "08000000000",
  "emailAddress": "optional@example.com",
  "deliveryAddress": "Lagos",
  "order": [
    {
      "id": 0,
      "name": "Basic",
      "type": "Inverter + tubular",
      "kva": "1.1kva",
      "volt": null,
      "withSolar": true,
      "optionName": "With solar",
      "package": "1.1kva inverter with 2 panels, 1 battery & installation kits",
      "price": "₦1,150,000",
      "quantity": 1
    }
  ],
  "total": "₦1,150,000",
  "turnstileToken": "token-from-the-turnstile-widget"
}
```

Client-sent `price` and `total` are ignored. The server resolves each item to an active package, takes the unit price of the selected option, and stores:

- per item: `package`, `type`, `kva` (display strings), `price` (`"₦1,150,000"`), `quantity`, plus `name`, `packageId`, `legacyId`, `optionName`, numeric `unitPrice` and `lineTotal`;
- on the order: `total` (`"₦…"` string) and numeric `totalAmount`.

If any item cannot be resolved the request fails with `400` and `"Some items in your cart are no longer available. Please refresh your cart."`. Quantities must be whole numbers from 1 to 100.

Package resolution (identical in the Node backend and the Cloudflare Worker):

1. Active packages whose public id (`legacyId`) equals the item `id`; if the item also carries `type`/`name`/`kva`, those must match too (case-insensitive, trimmed). Display strings are normalized first: `"Inverter + tubular"` → `tubular`, `"Hybrid inverter + lithium"` → `hybrid lithium`, `"3.5kva + 48volt"` → kva `3.5`, volt `48`.
2. Otherwise match `type` + `name` + `kva`, plus `volt` when the item includes it (an explicit `"volt": null` requires a package with no volt).

Option selection: `optionName`/`option` → `withSolar` (`true`/`"true"` = "With solar", otherwise "Without solar") → the kits text at the end of `package`. An explicit option name that doesn't exist falls back to `withSolar` and then the kits text; if neither is given or matches, the item is unavailable. With none of the three given, the first option is used.

The order is persisted in `orders` with `status: "pending"`, `paymentStatus: "pending"`, `fulfillmentStatus: "pending"`, `requiresInstallation: false` and `assignedEngineerId: null`, then sent through the existing email template using the server-computed values. Placing an order never changes stock (stock is committed when the order moves to `processing`).

## Admin Endpoints

Audit log:

- `GET /admin/audit-logs?page=1&limit=50&action=&entity=&adminId=`

Returns `{ "success": true, "message", "data": { "items", "page", "limit", "total" } }`, newest first. `page` must be a whole number from 1 to 100000 (`400` `"page must be a whole number from 1 to 100000."`) and `limit` a positive whole number (`400` `"limit must be a positive whole number."`); `limit` defaults to 50 and is capped at 100. `action`, `entity` and `adminId` are exact-match filters.

Each entry: `id`, `createdAt`, `adminId`, `adminEmail`, `action`, `entity`, `entityId`, `summary`, `changes` (changed field names only, never values), `ip`, `userAgent`.

Actions: `auth.login`, `auth.login_failed` (email only, `adminId` null), `auth.logout`, `auth.password_reset_requested`, `auth.password_reset`, `<entity>.create`, `<entity>.update`, `<entity>.delete`, `contact.reply`, `order.status_change` (when `status` changes; other order edits are `order.update`), `newsletter.update`, `order.delete`, `contact.delete`, `newsletter.delete`. Entities: `package`, `service`, `portfolio`, `customerSegment`, `order`, `contact`, `newsletter`.

Audit writes are best-effort and never fail the admin action. Entries older than 180 days are deleted opportunistically. Requests made with the static `ADMIN_TOKEN` are logged with `adminId` and `adminEmail` `"static-token"`.

Read status (per admin):

Admins mark messages (contacts) and orders as read. The state is stored per admin on the server (so it follows the admin across browsers and devices) and never changes the contact or order records. These routes are not audited and not rate limited. The admin id is the signed-in admin's `id`, or `"static-token"` for the static `ADMIN_TOKEN`. Record keys are `"<type>:<record id>"` with type `contacts` or `orders`. All times are epoch milliseconds.

A record's activity is its `receivedAt` (or `createdAt`); for contacts also `lastInboundReplyAt` and every `inboundReplies[].receivedAt`, whichever is newest. Invalid or missing dates count as 0. The frontend treats a record as read when its activity is at or before `since`, or at or before its `items` entry.

- `GET /admin/reads`: `200` `"Read status retrieved."` with `data: { since, items: { "contacts:<id>": readAt, "orders:<id>": readAt } }`. The first call creates the admin's baseline (`since` = now). Item rows with `readAt <= since` are removed.
- `POST /admin/reads` (body `{ "type": "contacts" | "orders", "id": "<record id>" }`; other fields are ignored): `200` `"Marked as read."` with `data: { key, readAt }`. `id` is resolved like the admin get-by-id routes and the key uses the record's `id`. `readAt` is `max(now, activity)`, and the stored value never goes back (`readAt` in the response is the stored value). Errors: `400` `"Type must be contacts or orders."`, `400` `"Id is required."` (missing, blank, not a string, or over 64 characters), `404` `"Contact not found."` / `"Order not found."`.
- `POST /admin/reads/all` (body `{}` or none; ignored): `200` `"All marked as read."` with `data: { since, items }`. `since` becomes `max(stored since, now, newest activity across all contacts and orders)` and every item row it covers is removed, so `items` is normally `{}`.

Deleting a contact or order also removes its read rows for every admin (best effort; failures are logged and do not fail the delete).

Dashboard:

- `GET /admin/dashboard`

Returns dashboard stats, order status counts, revenue trend points, and recent orders for the admin dashboard.

Packages:

- `GET /admin/packages`
- `POST /admin/packages`
- `PUT /admin/packages/:id`
- `DELETE /admin/packages/:id`

Services:

- `GET /admin/services`
- `POST /admin/services`
- `PUT /admin/services/:id`
- `DELETE /admin/services/:id`
- `POST /admin/services/customer-segments`
- `PUT /admin/services/customer-segments/:id`
- `DELETE /admin/services/customer-segments/:id`

Portfolio:

- `GET /admin/portfolio`
- `POST /admin/portfolio`
- `PUT /admin/portfolio/:id`
- `DELETE /admin/portfolio/:id`

Leads and orders:

- `GET /admin/contacts`
- `PUT /admin/contacts/:id`
- `DELETE /admin/contacts/:id` (`200` `"Message deleted."` with the deleted record; audited as `contact.delete`)
- `POST /admin/contacts/:id/reply` (body: `{ "subject", "message" }`; returns `502` if the email could not be delivered, in which case the reply is not recorded)
- `GET /admin/newsletter`
- `PUT /admin/newsletter/:id`
- `DELETE /admin/newsletter/:id` (`200` `"Subscriber deleted."`; audited as `newsletter.delete`)
- `GET /admin/carts`
- `GET /admin/orders`
- `GET /admin/orders/:id`
- `PUT /admin/orders/:id`
- `DELETE /admin/orders/:id` (`200` `"Order deleted."`; audited as `order.delete`)

`PUT` on contacts, newsletter and orders only changes the fields present in the body (`status`, `note`, `paymentStatus`, `isActive`); omitted fields keep their current values and are not written. Catalog `PUT`s (packages, services, portfolio, customer segments) keep their required fields required; optional fields that are omitted, `null` or blank keep their stored values (except `volt: null`, which clears it). New catalog items without `sortOrder` are placed last.

The deletion endpoints remove customer data permanently; the audit log (kept 180 days) records who deleted what.

## Commerce and operations (v3)

The binding definition is `docs/agents/API_CONTRACT_V3.md` §4–9. This section lists what is implemented, in both Express and the Worker, with any interpretation of the contract. Every admin route below requires the listed capability (`403` `"You do not have permission to perform this action."`). Paged responses are `{ items, page, limit, total }` with the audit-log paging rules.

### Catalog: categories and products

Public:

- `GET /categories`: `200` `"Categories retrieved."`, an array of active categories ordered by `sortOrder`, then `name`.
- `GET /categories/:id`: by id or slug. `404` `"Category not found."` when inactive.
- `GET /products?category&q&page&limit` (paged): active products ordered by name. `category` is an id or slug and includes descendants; an unknown category gives an empty page. `q` matches name, SKU, brand or tag (case-insensitive).
- `GET /products/:id`: by id or slug. `404` `"Product not found."` unless `status` is `active`.

Admin:

- `GET /admin/categories` (`products:read`): array.
- `POST /admin/categories`, `PUT /admin/categories/:id` (partial), `DELETE /admin/categories/:id` (`products:write`). Delete answers `409` `"Category has subcategories or products."` when the category is referenced.
- `GET /admin/products?category&status&stock=low|out&q&page&limit` (`products:read`, paged): ordered by `updatedAt` descending.
- `GET /admin/products/:id` (`products:read`): by id, slug or SKU.
- `POST /admin/products`, `PUT /admin/products/:id` (partial), `DELETE /admin/products/:id` (`products:write`). Delete answers `409` `"Product is used by a package."`.

Categories:

- Fields: `name` (1–100), `slug`, `parentId`, `description` (≤1000), `imageUrl`, `attributes` (≤30 `{ key, label, type: text|number|boolean, unit }`), `isActive`, `sortOrder`.
- `400` `"Parent category not found."` and `400` `"A category cannot be its own ancestor."`.

Products:

- **SKU:** 1–64 characters, `[A-Za-z0-9][A-Za-z0-9._-]*`, stored as sent and unique regardless of case (`409` `"Another product already uses SKU <sku>."`).
- **Required on create:** `name` (1–150) and `price` (>0, ≤1,000,000,000).
- **Optional:** `brand` (≤100), `costPrice`, `images` (≤10 URLs), `tags` (≤20) and `status` (`active`, `hidden`, `archived`).
- **Attributes:** up to 50 keys; each value is a string of at most 200 characters, a number or a boolean.
- **`descriptionHtml`:** sanitised by `shared/richText.js`, at most 50,000 characters after sanitising.
- **`reorderLevel`:** 0–1,000,000. It defaults to `settings.inventory.defaultReorderLevel`, which is 0.
- **`stockQuantity`:** can only be set on create (0–1,000,000), where it is written as an `initial` movement. A `PUT` with a different value answers `400` `"Use an inventory adjustment to change stock."`.
- **Responses:** add `lowStock` (`stockQuantity <= reorderLevel`). Public products omit `costPrice`, `stockQuantity`, `reorderLevel` and `lowStock`, and add `inStock` and `category`.

Packages accept `items: [{ productId, quantity (1–1000), note (≤200) }]` (≤50). Every product must exist, otherwise `400` `"Product not found."`. Public `GET /packages` and `GET /packages/:id` are unchanged for packages without items. With items, they add `items: [{ productId, quantity, note, name, slug, sku }]`.

Audit actions: `category.create|update|delete`, `product.create|update|delete`.

### Inventory

- `GET /admin/inventory?stock=all|low|out&category&q&page&limit` (`inventory:read`, paged): `200` `"Inventory retrieved."`. Rows are `{ productId, sku, name, categoryId, stockQuantity, reorderLevel, lowStock, status, updatedAt }`, low stock first, then by name.
- `POST /admin/inventory/adjustments` (`inventory:adjust`), body `{ productId, change, reason, note? }`: `201` `"Stock adjusted."` with `data: { movement, product }`.
  - `productId` can also be a slug or SKU.
  - `change` is a non-zero whole number with an absolute value of at most 1,000,000 (`400` `"Change must be a non-zero whole number."`).
  - `reason` is `restock`, `adjustment`, `damage`, `return` or `correction` (`400` `"Reason is not valid."`). `note` is at most 500 characters.
  - `409` `"Stock cannot go below zero."`.
- `GET /admin/inventory/movements?productId&reason&from&to&page&limit` (`inventory:read`, paged): `200` `"Movements retrieved."`. Newest first; movements written together are ordered by SKU. Invalid dates answer `400` `"from must be a valid date."` or `"to must be a valid date."`.
- `POST /admin/inventory/low-stock-check` (`inventory:adjust`): `200` `"Low-stock check complete."` with `data: { lowStock, emailed }`. It emails a digest of all active low-stock products. The Worker also runs it once a day from a cron trigger (`wrangler.toml`). Express runs it from a 24-hour timer started in `start()`, and that timer runs **once per Express instance**: with several instances behind a load balancer, each one sends its own digest.

Movement: `{ id, productId, sku, productName, change, stockBefore, stockAfter, reason, referenceType, referenceId, note, createdBy: { id, email } | null, createdAt }`. Reasons written by the system are `initial`, `sale` and `sale_reversal`.

**Atomicity.** The stock update and its movement are never written separately:

- **JSON store:** one locked read-modify-write.
- **Mongo:** a conditional `$inc` (`stockQuantity >= -change`), and every step that already ran is undone if a later one fails.
- **D1:** one `batch` (a transaction). Each product `UPDATE` compares the stored JSON document and is followed by `INSERT INTO batch_guard (ok) SELECT changes()`. A guard row of 0 violates `CHECK (ok = 1)` and rolls back the whole batch, which then retries on fresh rows (up to 5 times, then `409`). Migration `0012` creates `batch_guard`.

**Low-stock alert.** It fires when a movement takes stock from above the reorder level to at or below it, provided the level is above 0 or the stock reaches 0. It emails `settings.notifications.lowStockEmails`; when that list is empty it falls back to `SMTP_FROM` (Express) or `ADMIN_NOTIFY_EMAIL` (Worker). Nothing is sent when `settings.inventory.lowStockAlertsEnabled` is false. Email never fails the adjustment.

Audit action: `inventory.adjust` (entity `product`).

### Orders and fulfilment

Enums, transitions and stock rules: contract §6. Every admin order response is normalised at read time, so legacy and new orders look the same:

- **Legacy payment status:** `unpaid` reads as `pending` with `legacyPaymentStatus: "unpaid"`. A missing or unknown value reads as `pending` with `legacyPaymentStatus` set to the original value or `null`.
- **Legacy status:** `completed` reads as `fulfillmentStatus: "delivered"`, `cancelled` as `cancelled`, and anything else as `pending`.
- **Defaults:** `requiresInstallation: false`; `assignedEngineerId`, `paidAt` and `stockCommittedAt` are `null`.
- **`status`:** always derived from `fulfillmentStatus`.
- **Persistence:** D1 migration `0011_orders_fulfilment.sql` writes the same values, and Express writes them on the next change.
- **Removed field:** the internal `sortOrder` is no longer part of order responses.

Endpoints:

- `GET /admin/orders?fulfillmentStatus&paymentStatus&engineerId&requiresInstallation&from&to` (`orders:read`): array. `from` and `to` filter on `receivedAt`, falling back to `createdAt`.
- `GET /admin/orders/:id` (`orders:read`): the order plus `jobs: [{ id, status, engineerId, scheduledAt }]`.
- `PUT /admin/orders/:id` (`orders:update`): `200` `"Order updated."`. Body `{ note?, isActive?, requiresInstallation?, paymentStatus?, fulfillmentStatus?, status? }`.
  - `status` must equal the current derived value, otherwise `400` `"Use fulfillmentStatus to change the order status."`.
  - Setting `requiresInstallation: false` while non-cancelled jobs exist answers `409` `"Order has installation jobs."`.
- `POST /admin/orders/:id/fulfillment` (`orders:update`), body `{ status, note? }`: `200` `"Fulfilment status updated."`. A missing or invalid `status` answers `400` `"Fulfilment status is not valid."`.
- `POST /admin/orders/:id/mark-paid` (`orders:update`), body `{ note? }`: `200` `"Order marked as paid."`. An already-paid order is a no-op.
- `POST /admin/orders/:id/assign-engineer` (`orders:update`), body `{ engineerId: string | null }`: `200` `"Engineer assigned."` or `"Engineer unassigned."`.
  - `400` `"Assignee must be an active engineer."`, checked before `409` `"Order does not require installation."`.
  - No job is created.
- `DELETE /admin/orders/:id` (`orders:delete`): `409` `"Order has installation jobs."` when non-cancelled jobs exist.

Transition errors: `409` `"Cannot change fulfilment status from <from> to <to>."`, `409` `"Cannot change payment status from <from> to <to>."` and `409` `"Order does not require installation."` (for `installed`). Sending the current value is a no-op (`200`). Entering `paid` sets `paidAt` when it is null.

Stock:

- **`pending → processing`:** every order line whose `packageId` resolves to a package with `items` decrements `item.quantity × line.quantity` per product. These are `sale` movements with `referenceType: "order"`. It is all-or-nothing: a shortfall answers `409` `"Insufficient stock to process this order."` with `details: [{ productId, sku, required, available }]` ordered by SKU, and nothing is written. `stockCommittedAt` is set only when stock actually moved.
- **`→ cancelled` with `stockCommittedAt` set:** `sale_reversal` movements restore the net quantity of the order's `sale` movements, and `stockCommittedAt` becomes `null`.
- **Write safety:** the stock changes and the order update are one atomic write. It is guarded by the order's stored `fulfillmentStatus` and `paymentStatus` (`assignedEngineerId` for assignment). A concurrent status change answers `409` `"This record was changed by another request. Please try again."`, so stock is never committed twice.

Audit actions:

- `order.update`: note, isActive or requiresInstallation changes.
- `order.fulfillment_change`: the summary shows `from → to`.
- `order.status_change`: written in addition when the derived `status` changes.
- `order.payment_change`, `order.assign_engineer`, `order.delete`.

### Installation jobs, engineer endpoints and staff

Job shape and transitions: contract §7.1. `order` and `engineer` (including `engineer.phone`) are joined at read time. `address` defaults to the order's `deliveryAddress`.

Admin jobs:

- `GET /admin/jobs?status&engineerId&orderId&from&to&page&limit` (`jobs:read`, paged): `"Jobs retrieved."`. Ordered by `scheduledAt` ascending with unscheduled jobs last, then `createdAt` descending. `from` and `to` filter `scheduledAt`.
- `GET /admin/jobs/:id` (`jobs:read`): `"Job retrieved."`, or `404` `"Job not found."`.
- `POST /admin/jobs` (`jobs:assign`), body `{ orderId, engineerId?, scheduledAt?, durationEstimateMinutes?, address?, checklist?: string[], notes? }`: `201` `"Job created."`.
  - Checks run in this order: body validation (`"Order is required."`, `"Scheduled time must be a valid date."`, duration 15–10,080), then `404` `"Order not found."`, then `400` `"Assignee must be an active engineer."`, then `409` `"Order does not require installation."` or `"Order is cancelled."`.
  - The job starts `assigned` when an engineer is given, otherwise `unassigned`.
  - Assigning an engineer also sets the order's `assignedEngineerId` when it is empty.
- `PUT /admin/jobs/:id` (`jobs:assign`), body `{ scheduledAt?, durationEstimateMinutes?, address?, checklist?, notes? }`: `"Job updated."`. Only the sent fields change.
  - The checklist is replaced. String entries become new items; `{ id, label }` entries with a known id keep `done`, `doneAt` and `doneBy`.
  - A closed job answers `409` `"Job is closed."`.
- `POST /admin/jobs/:id/assign` (`jobs:assign`), body `{ engineerId | null }`: `"Job assigned."` (status `assigned`) or `"Job unassigned."` (status `unassigned`). Only unassigned or assigned jobs can be assigned; any other status answers `409` `"Cannot change job status from <from> to <to>."`.
- `POST /admin/jobs/:id/status` (`jobs:assign`), body `{ status, note? }`: `"Job status updated."`. The allowed moves are `unassigned → cancelled`, `assigned → in_progress | cancelled` and `in_progress → completed | cancelled`. `assigned` and `unassigned` only come from assign. The same status is a no-op. The status sets `startedAt`, `completedAt` or `cancelledAt`, and the note goes into the audit summary.
- `DELETE /admin/jobs/:id` (`jobs:assign`): `"Job deleted."`. Only for `unassigned`, `assigned` or `cancelled` jobs; otherwise `409` `"Job cannot be deleted once started."`.

Engineer endpoints (`jobs:update-own`). Every lookup is scoped to the signed-in admin's id, and another engineer's job answers `404` `"Job not found."`:

- `GET /admin/me/jobs?status&page&limit`: open jobs only, unless `status` is given.
- `GET /admin/me/jobs/:id`.
- `POST /admin/me/jobs/:id/status`, body `{ status: "in_progress" | "completed" }`.
  - Any other value answers `400` `"Status is not valid."`.
  - Invalid moves answer `409` `"Cannot change job status from <from> to <to>."`.
  - Completing with unfinished checklist items answers `409` `"Complete the checklist first."`.
- `PUT /admin/me/jobs/:id`, body `{ checklist?: [{ id, done }], photos?: string[] (≤20 URLs), completionNotes? (≤5000) }`.
  - Checking an item sets `doneAt` and `doneBy`; unchecking clears them.
  - An unknown item id answers `400` `"Checklist item not found."`.
  - Jobs that are not `assigned` or `in_progress` answer `409` `"Job is closed."`.

When a job becomes `completed` and its order is `delivered`, and every non-cancelled job of that order is completed, the order moves to `installed`. The move is audited as `order.fulfillment_change` by the acting admin.

Staff:

- `GET /admin/staff?role&area&isActive&q&page&limit` (`staff:read`, paged `AdminUser`, ordered by name). `area` matches an `areaCoverage` entry regardless of case. An invalid role answers `400` `"Role is not valid."`.
- `GET /admin/staff/:id` (`staff:read`): `"Staff member retrieved."`, with `AdminUser` plus `openJobs` (the engineer's jobs that are not completed or cancelled). `404` `"User not found."`.
- `PUT /admin/staff/:id` (`staff:write`), body `{ phone?, profile?: { areaCoverage?, certifications?, bio?, avatarUrl? } }`: `"Staff member updated."`. Sent profile keys replace the stored ones, and the other keys are kept. Role and activation are ignored here. Audited as `user.update`.

Audit actions: `job.create`, `job.update`, `job.assign`, `job.status_change`, `job.delete` (entity `job`).
