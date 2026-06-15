# Juwon Electric Backend API

Base URLs:

- Public: `/`
- Public alias: `/api`
- Admin: `/admin`
- Admin alias: `/api/admin`

Admin authentication:

- Seed the super admin with `SUPERADMIN_EMAIL` and `SUPERADMIN_PASSWORD`.
- Login with `POST /admin/auth/login` to receive an admin session token.
- Send `x-admin-token: <session-token>` or `Authorization: Bearer <session-token>`.
- `ADMIN_TOKEN` is still accepted as a static fallback token for scripts.

Auth endpoints:

- `POST /admin/auth/login`
- `POST /admin/auth/request-password-reset`
- `POST /admin/auth/reset-password`

Database:

- Set `MONGODB_URI` to use MongoDB.
- If the host environment cannot resolve Atlas TXT records for `mongodb+srv`, set `MONGODB_DIRECT_URI` to a standard `mongodb://host1,host2,host3/db?...` URI.
- If MongoDB is missing or unavailable, the backend falls back to `backend/data/db.json` unless `MONGODB_REQUIRED=true`.
- On first MongoDB connection, empty collections are seeded from the current package/service/portfolio data.

Cloudflare Workers runtime:

- A Worker-native implementation exists in `backend/cloudflare/`.
- It keeps the same public/admin API paths, including `/api` and `/api/admin` aliases.
- It uses Cloudflare D1 instead of MongoDB because Workers cannot run the current Express/Mongoose/Nodemailer server as-is.
- Gmail polling is not included in the Worker runtime yet.
- Deployment steps are in `backend/cloudflare/README.md`.

## Public Endpoints

### Packages

- `GET /packages`
- `GET /packages/:id`

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
- `GET /portfolio/:id`

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
  "message": "I need help with an inverter."
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

Set `INBOUND_EMAIL_WEBHOOK_SECRET` and send it as `x-webhook-secret` from the inbound email provider.

### Newsletter

- `POST /subscribe`

Body:

```json
{
  "emailAddress": "customer@example.com",
  "name": "Optional Name",
  "source": "client"
}
```

### Cart

- `POST /cart/quote`
- `POST /cart`

Quote body:

```json
{
  "items": [
    { "id": 0, "withSolar": "true", "quantity": 2 }
  ]
}
```

Saved cart body also requires a `sessionId`.

### Orders

- `POST /order`

The current frontend already sends this shape:

```json
{
  "name": "Customer Name",
  "phoneNumber": "08000000000",
  "emailAddress": "optional@example.com",
  "deliveryAddress": "Lagos",
  "order": [
    {
      "package": "1.1kva inverter with solar",
      "type": "Inverter + tubular",
      "kva": "1.1kva",
      "price": "₦1,150,000",
      "quantity": 1
    }
  ],
  "total": "₦1,150,000"
}
```

The order is persisted in `orders` with `status: "pending"` and `paymentStatus: "unpaid"`, then sent through the existing email template.

## Admin Endpoints

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
- `GET /admin/newsletter`
- `PUT /admin/newsletter/:id`
- `GET /admin/carts`
- `GET /admin/orders`
- `GET /admin/orders/:id`
- `PUT /admin/orders/:id`
