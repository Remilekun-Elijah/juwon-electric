# Juwon Electric Frontends

The project currently has two frontend experiences inside the same Vite React app.

## Client Frontend

URL:

```txt
http://localhost:5174/
```

Routes:

- `/`
- `/services`
- `/portfolio`
- `/packages`
- `/contact`
- `/cart`

Backend-powered reads:

- Packages: `GET /packages`
- Services: `GET /services`
- Home portfolio: `GET /portfolio?featured=true`
- Full portfolio: `GET /portfolio`

Checkout:

- When the checkout opens (and whenever the cart changes while it is open) the client calls `POST /cart/quote` with the same item fields it sends to `POST /order`. The summary shows the server's line prices and total, and the stored cart prices are updated from the quote.
- If the server can't price some lines, they are shown as unavailable with a Remove button and the order can't be placed until they are removed.
- If the quote fails (network, 5xx, rate limit), the checkout falls back to the stored prices with a short note; the order is still allowed and the server prices it.
- The order confirmation shows the `total` returned by `POST /order`.
- Turnstile actions: `contact`, `order`, `subscribe`.

The client still has local fallbacks for packages, services, and portfolio so the site can render if the backend is unavailable.

## Admin Frontend

URL:

```txt
http://localhost:5174/admin
```

The admin frontend logs in with the seeded super admin username/password.

Backend seed environment:

```bash
SUPERADMIN_EMAIL=admin@example.com
SUPERADMIN_PASSWORD=   # 12-128 characters; placeholder values are rejected
ADMIN_AUTH_SECRET=     # at least 32 characters, e.g. openssl rand -base64 48
```

The admin frontend stores the login session token in:

```txt
localStorage["je/admin-session"]
```

Backend admin routes are called under:

```txt
/admin
```

Managed modules:

- Dashboard
- Packages
- Services
- Portfolio
- Orders
- Contact messages
- Newsletter subscribers

Orders, contact messages and newsletter subscribers can be deleted from their lists (`DELETE /admin/orders/:id`, `/admin/contacts/:id`, `/admin/newsletter/:id`) after a confirmation.

Any admin request that returns 401 signs the admin out (clears `je/admin-session` and `je/admin-user`).

The dashboard uses `GET /admin/dashboard` for order count, order statuses, recent orders, and revenue trend data.

The login screen also supports password reset. The reset token is emailed; it is only returned in the response (and filled in automatically) when the backend runs on localhost with `DEV_EXPOSE_RESET_TOKEN=true`.

## Environment

Frontend backend URL:

```bash
VITE_BACKEND_URL=http://localhost:9000
```

If omitted in development, it defaults to:

```txt
http://localhost:9000
```

Security headers for the deployed site are set in `vercel.json` (CSP, HSTS without `includeSubDomains`, `Cross-Origin-Opener-Policy: same-origin`, and others). The CSP `connect-src` lists the API origins the browser may call. If `VITE_BACKEND_URL` changes to a new origin, add that origin to `connect-src` in `vercel.json`, or every API call from the deployed site will be blocked.

## Run

Backend:

```bash
cd backend
npm start
```

Frontend:

```bash
cd frontend
npm run dev
```
