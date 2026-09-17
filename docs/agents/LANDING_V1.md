# Landing v1: a richer home page with website content managed in the admin

Status: **binding** for this round.
Branch: `agents/v3-commerce`.
Owner request (2026-09-17): use the *structure and ideas* of a reference solar landing page (solarworldelectric.com), **with Juwon Electric's own data**. Build everything now, starting with **seeded sample data**.
Base contracts: `API_CONTRACT_V3.md`, `COMMERCE_V2.md`, `COMMERCE_V3.md`. Where they conflict, this file wins.

## 0. Ground rules
- **Never copy the reference site.** Its wording, images, logos, statistics, reviews, prices, office lists and financing numbers stay out. Copy the layout and ideas only.
- **Sample data is flagged.** Every seeded record and settings section carries `sample: true`.
  - The admin shows a **Sample** badge on those records and a warning banner.
  - The storefront shows a small **Sample** label on sample items: stats, reviews, client logos, case-study details, financing and the calculator notes.
  - When an admin **edits and saves** a sample record or section, the server stores `sample: false`, and it becomes real content.
  - Deleting sample records is allowed.
- **Seeds are local-only.** A seed script must refuse to run when `NODE_ENV=production`, and it's never wired into migrations, `seed.sql` or CI. The D1 seed file starts with a comment saying never to run it with `--remote`.
- **Claims:** "Why choose us" copy states only what the platform already guarantees (see §4.3). No invented warranties, years in business or client counts outside sample-flagged data.

## 1. New content collections (both runtimes)
All three collections follow the same rules:
- Admin CRUD at `/admin/<name>` needs `content:read` (GET) or `content:write` (POST, PUT, DELETE).
- Public reads return active items only, sorted by `sortOrder`, then `createdAt`.
- Audit entities: `faq`, `testimonial` and `client`, with actions `<entity>.create|update|delete`.
- Validation follows the existing shared field rules. Unknown fields are ignored.
- The response shape includes `id`, `sortOrder`, `isActive`, `sample`, `createdAt` and `updatedAt`.

### 1.1 FAQs: `faqs`
```ts
type Faq = { id; question: string /* 5–200 */; answer: string /* 1–2000, plain multiline text */;
  category: string | null /* ≤60, e.g. "Ordering", "Installation", "Products" */;
  sortOrder: number; isActive: boolean; sample: boolean; createdAt; updatedAt };
```
Public endpoint: `GET /faqs?category=` returns an array. Messages: `"FAQ created."`, `"FAQ updated."`, `"FAQ deleted."`, `"FAQ not found."`.

### 1.2 Customer reviews: `testimonials`
```ts
type TestimonialSource = "website" | "whatsapp" | "google" | "facebook" | "in_person";
type Testimonial = { id; name: string /* 1–100 */; context: string | null /* ≤150, e.g. "5kVA lithium system, Lekki" */;
  quote: string /* 10–1000 */; rating: 1|2|3|4|5 | null; source: TestimonialSource | null;
  imageUrl: string | null /* URL or site path "/..." */; sortOrder; isActive; sample; createdAt; updatedAt };
```
Public endpoint: `GET /testimonials` returns an array. The UI calls these "Reviews". Messages: `"Review created."`, `"Review updated."`, `"Review deleted."`, `"Review not found."`.

### 1.3 Client logos: `clients`
```ts
type Client = { id; name: string /* 1–100 */; logoUrl: string /* required: http(s) URL or site path starting with "/" */;
  website: string | null; sortOrder; isActive; sample; createdAt; updatedAt };
```
Public endpoint: `GET /clients` returns an array. Messages: `"Client created."`, `"Client updated."`, `"Client deleted."`, `"Client not found."`.

**Site paths:** image and logo fields in this contract accept either an absolute `http(s)` URL or a site path matching `^/[A-Za-z0-9._/-]{1,200}$`.

## 2. Portfolio case-study fields (additive)
The portfolio gains these optional fields:
- `category: string | null`: a customer-segment slug, ≤60
- `summary: string | null`: ≤500, plain text
- `location: string | null`: ≤100
- `system: string | null`: ≤200, e.g. "10kVA inverter, 8 × 200Ah lithium, 12 × 550W panels"
- `sample: boolean`

Admin and public portfolio responses include them, with `null` or `false` for older records. `GET /portfolio?category=` filters by category, and the existing `featured` filter keeps working.

## 3. Settings: new sections (shared `backend/shared/settings.js`)
Add these to `DEFAULT_SETTINGS`, merge them the same way, and validate on `PUT /admin/settings`. Saving a section sets its `sample` to `false`.

```ts
website: {
  stats: { label: string /* 1–40 */; value: string /* 1–20, e.g. "500+" */ }[];   // ≤4
  whatsappNumber: string | null;   // existing phone rule; shown as a WhatsApp link
  businessHours: string | null;    // ≤200, multiline, e.g. "Mon–Fri 8am–6pm\nSat 9am–3pm"
  sample: boolean;
}
financing: {
  enabled: boolean;
  depositPercent: number | null;       // integer 0–100
  termsMonths: number[];               // ≤6 unique integers 1–60, ascending
  monthlyRatePercent: number | null;   // 0–20, up to 2 decimals
  approvalTime: string | null;         // ≤60, e.g. "24–48 hours"
  note: string | null;                 // ≤300
  sample: boolean;
}
calculator: {
  enabled: boolean;
  appliances: { key: string /* ^[a-z0-9-]{1,40}$, unique */; label: string /* 1–40 */; watts: number /* int 1–10000 */;
    defaultHours: number /* 0–24, step 0.5 */; defaultQuantity: number /* int 0–20 */ }[];   // ≤40
  inverterHeadroomPercent: number;       // int 0–100 (default 25)
  batteryDepthOfDischargePercent: number;// int 10–100 (default 80)
  batteryVoltage: number;                // one of 12, 24, 48 (default 48)
  panelWatts: number;                    // int 100–1000 (default 550)
  peakSunHours: number;                  // 1–10, 1 decimal (default 4.5)
  generator: { fuelPricePerLitre: number /* int ₦ 0–100000 */; litresPerKvaHour: number /* 0–2, 2 decimals */; maintenancePerMonth: number /* int ₦ 0–10000000 */ };
  sample: boolean;
}
```
Defaults:
- `website`: `{ stats: [], whatsappNumber: null, businessHours: null, sample: false }`
- `financing`: `{ enabled: false, depositPercent: null, termsMonths: [], monthlyRatePercent: null, approvalTime: null, note: null, sample: false }`
- `calculator`: `{ enabled: false, appliances: [], inverterHeadroomPercent: 25, batteryDepthOfDischargePercent: 80, batteryVoltage: 48, panelWatts: 550, peakSunHours: 4.5, generator: { fuelPricePerLitre: 0, litresPerKvaHour: 0, maintenancePerMonth: 0 }, sample: false }`

**`GET /settings/public`** adds:
- `website`: every field.
- `financing`: every field when `enabled`, otherwise `{ enabled: false }`.
- `calculator`: every field when `enabled`, otherwise `{ enabled: false }`.

Notification emails and anything else sensitive stay private.

## 4. Seeds (local sample data)
### 4.1 Where the seeds live
- **Express:** `backend/scripts/seed-sample-website.mjs`, run as `npm run seed:sample`.
  - It uses the store layer, so it works with the JSON store and Mongo.
  - It refuses to run under `NODE_ENV=production`.
  - It's idempotent: sample records are recognised by fixed ids with the prefix `sample-`, then upserted.
- **Worker local D1:** `backend/cloudflare/seeds/sample-website.sql`, generated by `backend/cloudflare/scripts/export-sample-website-sql.mjs` from the same data module `backend/shared/sampleWebsite.js`.
  - Add the npm script `d1:seed:sample:local`, which runs `wrangler d1 execute juwon-electric --local --file seeds/sample-website.sql`.
  - The SQL upserts records and merges the settings sections without overwriting non-sample sections that already exist.
- **Shared data:** everything lives in `backend/shared/sampleWebsite.js`, and all of it is `sample: true`.

### 4.2 Content (plausible, clearly sample, Juwon-specific, never copied)
- **FAQs (8):** each answer must match how the platform actually works.
  - Do I pay to place an order? No; we call to confirm and arrange payment.
  - How long does installation take? (sample wording)
  - Can I buy a single battery or inverter? Yes, from Products.
  - What's the difference between tubular and lithium batteries?
  - Which states do you cover? (sample; the business serves all of Nigeria)
  - What happens after I order? The fulfilment steps.
  - Can I add solar panels later?
  - How do I choose a package size? The calculator, or talk to an engineer.
- **Reviews (6):** name like "Adaeze O." with context such as "3.5kVA lithium, Ikeja". Mixed sources, ratings 4–5, quotes tied to real features: call to confirm, installation, NEPA outages.
- **Clients (6):** fictional names with neutral text-logo SVGs, which the storefront agent adds at `frontend-next/public/samples/client-1.svg … client-6.svg`. Logo paths are `/samples/client-N.svg`.
- **Portfolio:** add sample `summary`, `location`, `system` and `category` (segment slugs from the existing customer segments) to the existing portfolio records by id, and set `sample: true` on them. Other fields stay unchanged.
- **`website.stats`:** 4 sample stats ("Installations", "Years in business", "Engineers", "Average install time"), plus a sample WhatsApp number `+2348000000000` and hours "Mon–Sat 8am–6pm".
- **`financing`:** enabled, with a 40% deposit, terms `[3, 6, 12]`, a 3.5% monthly rate, approval in "48 hours", and the note "Sample terms — not an offer."
- **`calculator`:** enabled, with 12 common appliances at typical wattages (fan 75W, LED bulb 10W, TV 120W, decoder 25W, laptop 65W, phone charging 10W, fridge 150W, freezer 200W, washing machine 500W, microwave 1000W, 1hp AC 900W, pumping machine 750W) and default parameters. The generator settings are fuel ₦1,000 per litre, 0.25 litres per kVA-hour, and ₦20,000 maintenance a month.

## 5. Revalidation
- `STORE_TAGS` gains `faqs`, `testimonials` and `clients` (portfolio and settings already exist).
- `tagsForAdminWrite` maps `/admin/faqs` → `faqs`, `/admin/testimonials` → `testimonials` and `/admin/clients` → `clients`.

## 6. Admin console
- **New "Website" nav group:**
  - **FAQs:** list with category filter and drag-free ▲▼ sort order.
  - **Reviews:** list with star rating display.
  - **Client logos:** grid with a logo preview.
  - Each has a create/edit drawer, active toggle and delete confirm, gated by `content:read/write`.
  - Records with `sample` show a **Sample** badge. A module that has sample records shows the banner "Sample content is showing on the website. Edit or replace it before launch."
- **Portfolio form:** adds Category (a customer-segment select), Summary, Location and System.
- **Settings page:** adds three sections or tabs.
  - **Website:** stats editor (up to 4 rows of label and value), WhatsApp number, business hours.
  - **Financing:** enabled switch, deposit %, terms chips (months), monthly rate %, approval time, note.
  - **Calculator:** enabled switch; an appliance table (label, watts, default hours, default quantity, add/remove/reorder); parameters; generator costs.
  - Each section shows the Sample badge while `sample` is true.
- Match the existing admin design and kit, and use everyday lucide icons only.

## 7. Storefront home and new pages
**Home section order.** Every section hides itself when it has no data.
1. Hero (existing).
2. **Stats band** (`website.stats`): up to 4 large figures.
3. **Client logos:** a responsive grid (up to 6 per row), greyscale until hover, alt text is the client name.
4. **Why choose us:** 4 static cards using verifiable claims only:
   - installed and tested by our own engineers
   - quality inverters, batteries and panels with specs shown for every product
   - no payment to place an order, and we call to confirm
   - live stock and prices on the website
5. **Solutions:** the customer segments ("Who we power") as cards linking to `/portfolio?category=<slug>`.
6. **Packages:** the existing finder. Package cards show up to 3 included products (from option items) and "What it powers".
7. **Size your system:** a teaser linking to `/calculator` (when enabled).
8. **Case studies:** up to 3 portfolio items that have a `summary`, with image, category badge, location, system, summary and a link.
9. **Reviews:** a card grid or horizontal scroller (no auto-rotation) with rating stars, name, context and source badge.
10. **How it works:** the existing timeline, extended to 6 steps: order or call → confirmation call → processing → delivery → installation → after-sales support.
11. **Financing** (when enabled): a terms table (deposit, terms, rate, approval time), a worked example on a sample package price computed live, the note, and calls to action.
12. **FAQ:** the first 6 as an accordion (`<details>`-based, accessible), plus a "See all questions" link to `/faq`.
13. **Final call to action:** a brand panel with Shop packages, Call, and WhatsApp (when a number is set).

**New pages:**
- **`/calculator`:**
  - Appliance rows with quantity and hours steppers, starting from the defaults, plus "Add appliance" (custom label and watts).
  - Live results:
    - total load (W)
    - recommended inverter kVA: `ceil((load × (1 + headroom)) / 0.8 / 1000 × 2) / 2` kVA, with power factor 0.8
    - daily energy (kWh)
    - battery capacity: `energy / DoD` in kWh, and Ah at the battery voltage
    - panels: `ceil(energy / (panelWatts × sunHours / 1000))`
  - **Matching packages:** available packages with kVA ≥ recommended, cheapest first, up to 3.
  - **Generator comparison:** monthly fuel = kVA × litresPerKvaHour × daily hours × 30 × fuel price, plus maintenance; compared with the cheapest matching package price as a simple payback in months.
  - Plain-language disclaimer: "Estimates only — an engineer confirms your size before installation."
  - A "Talk to an engineer" call to action. No data is stored.
- **`/faq`:** all FAQs grouped by category, with FAQPage JSON-LD.
- **`/portfolio`:** a category filter, and cards showing summary, location and system when present.

**Across the storefront:**
- A floating **WhatsApp** button (bottom right, 56 px, respects the safe area) when `website.whatsappNumber` is set. It links to `https://wa.me/<digits>` with the text "Hello Juwon Electric".
- The footer shows business hours and WhatsApp.
- Sample items show a small neutral "Sample" label.
- New data getters and tags: `faqs`, `testimonials`, `clients`.
- Add `/calculator` and `/faq` to the sitemap, plus a nav or footer link (the header nav can gain "Calculator" if space allows, otherwise footer only).

Design: follow the existing storefront tokens and brand colours, lucide everyday icons, mobile-first at 375/768/1280 px, no carousels that auto-rotate, no videos.

## 7a. Ownership
| Agent | Owns |
|---|---|
| Backend | `backend/**`; the `frontend-next/lib/api/types.ts` additions (commit FIRST); `lib/storefront/notify.ts` and the `STORE_TAGS` list in `lib/storefront/data.ts` (tags only) |
| Admin | `frontend-next/{app,components,lib}/admin/**`, `lib/api/admin.ts` |
| Storefront | `frontend-next/{app,components}/storefront/**`, `lib/storefront/**` except the tag list and notify, `lib/api/public.ts`, `app/sitemap.ts`, `public/samples/**` |
| Docs | `PRODUCT_REQUIREMENTS.md`, `docs/USER_GUIDE.md` |

## 8. Tests and docs
- **Backend parity scenarios:**
  - CRUD and public filtering for the 3 collections
  - portfolio fields
  - settings sections: validation, sample clearing on save, public exposure rules
  - the seed data module validates against the payload rules, with an Express seed dry run on a temp store
- **Docs:** update `backend/docs/API.md`. The PRD and user guide are updated per the owner rule, including a "Before launch: replace sample content" checklist.
