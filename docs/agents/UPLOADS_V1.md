# Image uploads v1: Cloudflare R2 with cost safeguards

Status: **binding**. Branch: `agents/v3-commerce`. Owner decisions, 2026-09-17:
- Store uploaded images in **Cloudflare R2** and keep usage inside the free tier. The free tier is 10 GB stored, 1M uploads/edits a month and 10M reads a month, and egress is free.
- **No banner, badge, percentage or usage display anywhere in the admin console.** The project will be handed to a client, so storage usage stays invisible to admins. Limits and alerts are developer-level configuration (environment variables), not admin Settings.
- A private alert email goes to the developer only. It's optional and configured by env.

## 1. Where files live
- **Worker (production):** R2 bucket binding `IMAGES` (bucket `juwon-electric-images`) in `backend/cloudflare/wrangler.toml` (`[[r2_buckets]] binding = "IMAGES"`, `bucket_name = "juwon-electric-images"`). Local `wrangler dev --local` simulates R2, so no Cloudflare account is needed for development.
- **Public URL:**
  - Env `IMAGES_PUBLIC_BASE_URL`, e.g. `https://images.juwonelectric.com` or the bucket's `r2.dev` URL, no trailing slash. The stored image URL is `${IMAGES_PUBLIC_BASE_URL}/${key}`.
  - When it isn't set (local dev), the Worker serves files itself at `GET /uploads/:key` and stores URLs as `${origin}/uploads/${key}`. Build the origin from the request URL.
  - The public `GET /uploads/:key` also works in production as a fallback. It sends `Cache-Control: public, max-age=31536000, immutable`, the stored content type and `X-Content-Type-Options: nosniff`.
- **Express (local and self-host):** store files under `backend/data/uploads/` (gitignored) and serve them at `GET /uploads/:key` with the same headers. It uses the same API contract, limits and records.

## 2. Upload API
Both runtimes expose these endpoints.
- **`GET /admin/uploads/config`**: authenticated, any capability. Returns `{ enabled: true, maxBytes: 2_000_000, accept: ["image/jpeg","image/png","image/webp"], maxDimension: 1600 }`. Nothing about usage or limits is exposed.
- **`POST /admin/uploads`**:
  - Access: requires at least one of `content:write`, `products:write` or `staff:write`; otherwise 403 with the standard message.
  - Body: raw bytes, not JSON. `Content-Type` is `image/jpeg`, `image/png` or `image/webp`, and there's an optional `?purpose=` for the key prefix: `products|categories|packages|services|portfolio|segments|reviews|clients|team|other` (default `other`). This route is exempt from the JSON-only 415 rule.
  - Validation:
    - Size 1 byte to 2 MB, otherwise `413 "Image must be 2 MB or smaller."`. Enforce this before reading the whole body: check `Content-Length` first and cap the read.
    - The magic bytes must match the declared type (JPEG `FF D8 FF`, PNG `89 50 4E 47`, WebP `RIFF....WEBP`), otherwise `415 "Upload a JPEG, PNG or WebP image."`. **SVG and every other type are rejected** (XSS risk).
  - Key: `${purpose}/${yyyy}/${mm}/${uuid}.${ext}`.
  - Storage cap (a safeguard hidden from the admin UI):
    - Before storing, check that the total stored bytes plus the new size is at most `IMAGE_STORAGE_LIMIT_BYTES`. That's an env var, default `9000000000` (9 GB); a value of `0` or unset means the default.
    - If it would be exceeded, refuse with `507 "Image uploads are unavailable right now. Please use an image link or try again later."`. The message is neutral and mentions no storage or limits.
  - Records: store the object, then create the record `uploads` → `{ id, key, url, contentType, size, purpose, uploadedBy: {id,email}, createdAt }`.
  - Response: `201 "Image uploaded."` with `data: { id, url, key, size, contentType }`.
  - Audit: `upload.create`.
  - Rate limit: 60 uploads per admin per 10 minutes, then `429`.
- **Total stored bytes:** the sum of `size` over `uploads` records. Keep a running total in a single record, `system/uploads-usage` → `{ totalBytes }`, updated atomically on create and delete (D1 CAS or batch, JSON store lock). A daily reconcile recomputes it from the records.

## 3. Cleanup (keeps storage lean)
- **Referenced images:** an upload is referenced if its `url` appears in any stored image field:
  - `products.images[]`
  - `categories.imageUrl`
  - `services.image`, `portfolio.image`, `customerSegments.image`
  - `testimonials.imageUrl`, `clients.logoUrl`, `teamMembers.photoUrl`
  - package `image` if present
  - any `descriptionHtml` / `answer` text containing the URL
  Keep this list in a shared `backend/shared/uploads.js` so new image fields get added in one place.
- **Daily sweep:** runs in the existing Worker `scheduled` cron and in the Express daily timer. It deletes uploads that are **unreferenced and older than 24 hours** (abandoned or replaced images): the R2 object, the record, and the usage total. It processes at most 500 per run and logs a count. It never deletes referenced files.
- **Immediate delete on replace or delete:** optional. The sweep is the source of truth, so no immediate delete is needed.

## 4. Private developer alert (invisible to admins)
- Env `STORAGE_ALERT_EMAIL` (optional) and `STORAGE_ALERT_BYTES` (default `8000000000`, 8 GB, which is 80% of the free 10 GB).
- The daily cron (and Express timer) checks `totalBytes`. When it's at or above `STORAGE_ALERT_BYTES` and an alert hasn't been sent in the last 7 days, it sends one plain email to `STORAGE_ALERT_EMAIL` via the existing mail path.
  - Subject: `Juwon Electric: image storage at X GB`.
  - Body: the usage, the free-tier note, and suggested actions.
  - It records `lastAlertAt` on `system/uploads-usage`.
- If uploads are refused at the cap, the same email is sent (throttled the same way).
- **Never** send this to `ADMIN_NOTIFY_EMAIL` or any admin, and never show it in the UI, notifications or audit log summaries visible to admins. A log line is fine.

## 5. Admin console: `ImageUpload` component
- **`components/admin/ImageUpload.tsx`** (single image) and **`ImageListUpload.tsx`** (products: up to 10, drag to reorder via ▲▼ buttons).
  - Choose-file button plus drag and drop.
  - **Client-side processing before upload:** decode, scale so the longest side is ≤ 1600 px, and export WebP at quality 0.82. Fall back to JPEG if the browser can't encode WebP. PNG logos with transparency stay PNG at ≤ 800 px.
  - Reject originals over 15 MB, and non-images, with an inline message.
  - Progress indicator, preview, **Replace** and **Remove**.
  - Errors come from the server message.
  - A secondary "Use an image link instead" disclosure keeps the existing URL field and validation (for existing records and when uploads are unavailable).
- **Use it** in the product form (`images`), category form (`imageUrl`), services, portfolio, customer segments, reviews (`imageUrl`), client logos (`logoUrl`, keeps PNG) and team (`photoUrl`), everywhere an image URL input exists today.
- **Config:** load `GET /admin/uploads/config` once. If the call fails, show only the link field.
- **No usage or limit information anywhere.**
- `lib/api/admin.ts`: `uploadImage(file: Blob, purpose)` sends raw bytes with `Content-Type`. It keeps the auth header and the storefront notify hook (not needed for uploads).

## 6. Storefront
- Images keep rendering through `SiteImage` or `next/image` with `unoptimized` for remote hosts. If any `next/image` needs `remotePatterns`, add the `IMAGES_PUBLIC_BASE_URL` host via `next.config.ts`, reading `NEXT_PUBLIC_IMAGES_HOST` optionally. Otherwise use unoptimized. Uploaded images must display on product, category, services, portfolio, reviews, logos and team.
- `proxy.ts` must not rewrite `/uploads/*` for the Next app. Uploads are served by the backend origin, not Next.

## 7. Settings
- Settings `uploads.provider` accepts `"url"` or `"r2"`, but it is **not shown** in the admin. Server behaviour depends on env only: uploads are enabled when the `IMAGES` binding exists (Worker) or always (Express).
- The existing settings UI must not add any upload or storage section.

## 8. Tests and docs
- **Parity scenarios:**
  - upload OK: key shape, record, public GET with correct headers
  - wrong type, spoofed type (PNG bytes declared as JPEG, SVG), oversize (413)
  - capability 403
  - cap exceeded (507) using a small `IMAGE_STORAGE_LIMIT_BYTES` in tests
  - sweep deletes unreferenced files older than 24 h and keeps referenced ones
  - usage total stays consistent
  - alert email sent once when over threshold, not to admin addresses, throttled for 7 days
- The Worker test helper needs an in-memory R2 stub.
- **Docs:**
  - `backend/docs/API.md`.
  - `docs/DEPLOYMENT.md`: create the bucket before deploy, set up the public domain, the env vars (`IMAGES_PUBLIC_BASE_URL`, `IMAGE_STORAGE_LIMIT_BYTES`, `STORAGE_ALERT_EMAIL`, `STORAGE_ALERT_BYTES`), and **deploying without the bucket fails**.
  - PRD and user guide via the owner rule. The user guide describes uploading images **without** any storage or limit content. Storage safeguards are documented only in the PRD non-functional section and `DEPLOYMENT.md` (developer-facing).
