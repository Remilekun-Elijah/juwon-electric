# Deployment

This file covers the three deployable parts, their environment variables and secrets, the CI/CD pipeline, and operational recovery. **It contains names only, never values.** Real values live in the hosting providers' secret stores (Cloudflare, Vercel, the Express host) and in GitHub Actions secrets.

| Part | Source | Runtime | Role |
| --- | --- | --- | --- |
| Worker API | `backend/cloudflare` | Cloudflare Workers + D1 | **Production API** (ledger D1) |
| Express API | `backend` | Node 22 + MongoDB (or JSON file store) | Local development and self-hosting, kept at route and response parity with the Worker |
| Frontend | `frontend-next` | Next.js (App Router) on Vercel | Public site and admin portal |

---

## 1. Environment and secrets matrix

Legend:
- **Req**: required in production. **Opt**: optional. **Dev**: local development or tests only; never set in production.
- **Secret**: store it as a secret (`wrangler secret put`, Vercel encrypted env, host secret store). **Var**: a plain setting.
- **n/a**: not read by that runtime.

### 1.1 Admin authentication

| Name | Express | Worker | Kind | Notes |
| --- | --- | --- | --- | --- |
| `ADMIN_AUTH_SECRET` | Req | Req | Secret | HMAC key for admin session tokens, at least 32 characters (`openssl rand -base64 48`). Missing or weak: admin sign-in and admin routes return 500 in production (Express outside production uses a random per-process key). Rotating it signs every admin out. |
| `SUPERADMIN_EMAIL` | Req | Req | Var | Seeds the first `superadmin` if no admin with this email exists. Express seeds at startup; the Worker seeds on first sign-in or reset request. |
| `SUPERADMIN_PASSWORD` | Req | Req | Secret | 12-128 characters and must not contain the email name, otherwise seeding is skipped. Used only for seeding; change the password afterwards through the reset flow. |
| `SUPERADMIN_NAME` | Opt | Opt | Var | Display name for the seeded account. |
| `ADMIN_USERNAME`, `ADMIN_PASSWORD` | Opt | Opt | Var / Secret | Legacy aliases of `SUPERADMIN_EMAIL` / `SUPERADMIN_PASSWORD`. |
| `ADMIN_TOKEN` | Opt | Opt | Secret | Static token that acts as `superadmin`. It never expires and cannot be revoked, so **leave it unset** except for break-glass recovery (§4). At least 32 characters. |
| `ADMIN_APP_URL` | Opt | Opt | Var | Public admin console URL, linked from password reset (Express) and admin invite (both) emails. Only absolute `http(s)` URLs are linked. |
| `DEV_EXPOSE_RESET_TOKEN` | Dev | Dev | Var | `true` returns reset tokens in the API response for `localhost`/`127.0.0.1` requests. Ignored in Express when `NODE_ENV=production`. **Never set it on a deployed Worker.** |

### 1.2 HTTP, CORS and bot protection

| Name | Express | Worker | Kind | Notes |
| --- | --- | --- | --- | --- |
| `ALLOWED_ORIGINS` | Req | Req | Var | Comma-separated exact origins (the Vercel production domain and any preview domains you allow). Empty means `*`, with a warning. |
| `TURNSTILE_SECRET_KEY` | Req | Req | Secret | Cloudflare Turnstile secret for `POST /contact`, `/order`, `/subscribe` and `/cart`. Missing: those routes return 503 (Express in production, and always in the Worker). |
| `TURNSTILE_DISABLED` | Dev | Dev | Var | `true` skips Turnstile. Use it only before the widget is live, and remove it afterwards. |
| `TURNSTILE_HOSTNAMES` | Opt | Opt | Var | Hostnames the token must be solved on. Defaults to the `ALLOWED_ORIGINS` hosts. |
| `TURNSTILE_VERIFY_URL` | Dev | n/a | Var | Test stub for siteverify. |
| `TRUST_PROXY` | Opt | n/a | Var | Express behind a proxy: the hop count (for example `1` on Render). The Worker uses `CF-Connecting-IP`. |
| `NODE_ENV` | Req (`production`) | n/a | Var | Turns on the production fail-closed behaviour: auth secret, Turnstile, Mongo required, unique indexes. |
| `PORT` | Opt | n/a | Var | Default `9000`. |

### 1.3 Storage

| Name | Express | Worker | Kind | Notes |
| --- | --- | --- | --- | --- |
| `DB` (D1 binding) | n/a | Req | Binding | `wrangler.toml` → `[[d1_databases]] binding = "DB"`, database `juwon-electric`. |
| `MONGODB_URI` / `MONGODB_DIRECT_URI` | Req (self-host) | n/a | Secret | `MONGODB_DIRECT_URI` wins. Without either, Express uses the JSON file store (development). |
| `MONGODB_REQUIRED` | Opt | n/a | Var | `true` exits on a failed connection outside production too. |
| `JSON_STORE_PATH` | Dev | n/a | Var | JSON store location (tests and throwaway copies). |

### 1.4 Email

| Name | Express | Worker | Kind | Notes |
| --- | --- | --- | --- | --- |
| `SMTP_USER`, `SMTP_SECRET`, `SMTP_FROM` | Req for email | n/a | Secret (`SMTP_SECRET`) / Var | Nodemailer (Gmail). If any is empty, no email is sent: invites, resets and notifications are skipped with a warning, and admin replies return 502. |
| `MAIL_BCC` | Opt | n/a | Var | BCC on every Express email. |
| `RESEND_API_KEY` | Opt | Req for email | Secret | The Worker sends email through Resend. Express uses it only to fetch inbound reply bodies. |
| `MAIL_FROM` | n/a | Req for email | Var | The Worker sender, for example `Name <address>`. |
| `MAIL_REPLY_TO` | n/a | Opt | Var | Must be the inbound address for contact reply threading. |
| `ADMIN_NOTIFY_EMAIL` | n/a | Opt | Var | Recipient of new order, contact and subscriber notifications. |
| `INBOUND_EMAIL_WEBHOOK_SIGNING_SECRET` | Opt | Opt | Secret | Svix/Resend `whsec_…` secret for `POST /webhooks/contact-reply` (preferred). |
| `INBOUND_EMAIL_WEBHOOK_SECRET` | Opt | Opt | Secret | Legacy shared secret (`x-webhook-secret`), used only when the signing secret is empty. With neither set, the webhook returns 401. |

### 1.5 Frontend (Vercel, `frontend-next`)

| Name | Kind | Notes |
| --- | --- | --- |
| `NEXT_PUBLIC_BACKEND_URL` | Var (public, build time) | API base URL: the Worker's production URL (custom domain or `*.workers.dev`). It is inlined at build time, so redeploy after changing it. Never put secrets in `NEXT_PUBLIC_*`. |
| `NEXT_PUBLIC_TURNSTILE_SITE_KEY` | Var (public) | **Planned (FE-1):** the Turnstile site key that pairs with the API's `TURNSTILE_SECRET_KEY`. |

Set the Vercel project root to `frontend-next` and deploy it through Vercel's repository integration. GitHub Actions only lints and builds it as a check; it never deploys the frontend.

### 1.6 GitHub Actions secrets

| Name | Used by | Notes |
| --- | --- | --- |
| `CLOUDFLARE_API_TOKEN` | `deploy-worker` job | API token scoped to Workers Scripts:Edit and D1:Edit on the account. |
| `CLOUDFLARE_ACCOUNT_ID` | `deploy-worker` job | Cloudflare account id. |

Put both in the repository (or the `production` environment) secrets. The deploy job runs in the `production` environment, so required reviewers can be added there.

---

## 2. CI/CD (`.github/workflows/ci.yml`)

| Job | Trigger | What it does |
| --- | --- | --- |
| `backend` | every push and PR | Node 22: `npm ci`, `npm run lint` (ESLint plus the control/format character check), `npm test` (Express, Worker on a `node:sqlite` D1 stand-in, and Express↔Worker parity) |
| `worker` | every push and PR | `wrangler deploy --dry-run` bundles the Worker, including `backend/shared` |
| `frontend` | every push and PR | `frontend-next`: `npm ci`, `npm run lint`, `npm run build` |
| `deploy-worker` | **push to `v3` or `main` only**, after `backend` and `worker` pass | `wrangler d1 migrations apply juwon-electric --remote`, **then** `wrangler deploy`. There is no deploy from other branches or pull requests, and deploys never run in parallel. |

Migrations run before the deploy. Every migration is idempotent and additive (indexes, guarded `UPDATE`s), so the previous Worker version keeps working against the migrated database while the new one rolls out.

### Manual Worker deploy (same order)

```bash
cd backend/cloudflare
npm ci
npx wrangler d1 migrations apply juwon-electric --remote
npx wrangler deploy
```

Set Worker secrets with `npx wrangler secret put <NAME>` (in `backend/cloudflare`). Plain vars can go in the Cloudflare dashboard or under `[vars]` in `wrangler.toml` (never secrets).

### Migrations that can stop a deploy

- `0007_admin_roles.sql` creates a unique index on lowercase admin email.
- `0008_vacancies.sql` creates a unique index on vacancy slug. It only covers vacancies stored in `records` (collection `vacancies`). **Rows in any hand-made standalone D1 `vacancies` table (for example from the retired `backend/d1-schemas/vacancies.sql`) are not migrated by 0008.** Re-create them through `POST /admin/vacancies` if they are still needed.

If the production data already has duplicates, the migration fails without deleting anything and the deploy stops before `wrangler deploy`. Find the duplicates, fix them by hand, and re-run the job:

```bash
npx wrangler d1 execute juwon-electric --remote --command \
  "SELECT lower(json_extract(data,'$.email')) AS email, COUNT(*) FROM records WHERE collection='admins' GROUP BY 1 HAVING COUNT(*) > 1"
npx wrangler d1 execute juwon-electric --remote --command \
  "SELECT slug, COUNT(*) FROM records WHERE collection='vacancies' GROUP BY 1 HAVING COUNT(*) > 1"
```

### Express (self-host)

- Run `npm ci --omit=dev && NODE_ENV=production node app.js` in `backend`, or build `backend/Dockerfile` from the repository root (`docker build -f backend/Dockerfile .`; Node 22, runs as the `node` user), with the §1 variables. The JSON file store is for development only: use MongoDB when self-hosting in production.
- With MongoDB in production, startup **exits** if the unique indexes for admin email or vacancy slug cannot be built. The log names the duplicate values; fix them, then restart.

---

## 3. First production setup checklist

1. Cloudflare: create the D1 database (`wrangler d1 create juwon-electric`), put its id in `backend/cloudflare/wrangler.toml`, and set the Worker secrets from §1.1-1.4 (`ADMIN_AUTH_SECRET`, `SUPERADMIN_PASSWORD`, `TURNSTILE_SECRET_KEY`, `RESEND_API_KEY`, the webhook secret) and the vars (`SUPERADMIN_EMAIL`, `ALLOWED_ORIGINS`, `MAIL_FROM`, `ADMIN_NOTIFY_EMAIL`, `ADMIN_APP_URL`).
2. GitHub: add `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID`, and create the `production` environment.
3. Push to `v3` or `main`: CI applies migrations and deploys.
4. Vercel: import `frontend-next` and set `NEXT_PUBLIC_BACKEND_URL` to the Worker URL.
5. Sign in as the seeded superadmin, change its password through the reset flow, then create staff accounts under `/admin/users` (invites are emailed).
6. Make sure `ADMIN_TOKEN`, `TURNSTILE_DISABLED` and `DEV_EXPOSE_RESET_TOKEN` are **unset** in production.

---

## 4. Recovery: no usable superadmin

The API refuses to demote or deactivate the last active `superadmin`, and it re-checks after every such write (a concurrent change is rolled back with `409 "At least one active superadmin is required."`). If an account is still locked out (a lost password with no mailbox access, or data edited by hand), use break-glass access:

1. Generate a token: `openssl rand -base64 48`.
2. Set it as `ADMIN_TOKEN`:
   - Worker: `npx wrangler secret put ADMIN_TOKEN` (takes effect without a redeploy).
   - Express: set the environment variable and restart.
3. Call the API with `Authorization: Bearer <token>`. The token acts as `superadmin`, and every action is audited as `static-token`.
   - `GET /admin/users?role=superadmin` to find the account.
   - `POST /admin/users/:id/reactivate` and/or `POST /admin/users/:id/role` with `{ "role": "superadmin" }`.
   - The account owner then sets a new password with `POST /admin/auth/request-password-reset`.
4. **Remove `ADMIN_TOKEN` straight away** (`npx wrangler secret delete ADMIN_TOKEN`, or unset it and restart Express). It never expires while set.

Other recovery paths:
- A new superadmin can also be seeded by setting `SUPERADMIN_EMAIL`/`SUPERADMIN_PASSWORD` to an email that has **no** existing admin account. Seeding never changes existing accounts.
- To sign every admin out, rotate `ADMIN_AUTH_SECRET`.
