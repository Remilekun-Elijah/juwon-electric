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
SUPERADMIN_PASSWORD=replace-with-a-strong-password
ADMIN_AUTH_SECRET=replace-with-a-long-random-session-secret
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

The dashboard uses `GET /admin/dashboard` for order count, order statuses, recent orders, and revenue trend data.

The login screen also supports password reset. In development, the reset endpoint returns the reset token so the flow can be tested end-to-end.

## Environment

Frontend backend URL:

```bash
VITE_BACKEND_URL=http://localhost:9000
```

If omitted in development, it defaults to:

```txt
http://localhost:9000
```

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
