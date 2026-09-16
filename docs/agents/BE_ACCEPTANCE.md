# Backend Acceptance Checklist (v3)

Owner: SUP-BE. Sources: PRD §6–7, ledger §4 (D1–D6, D4a) and §5 (BE-1, BE-2), and `docs/agents/API_CONTRACT_V3.md` (below, "contract").
Grading: each item is **PASS**, **PARTIAL**, **FAIL** or **N/A** in `docs/agents/review-be.md`. Items marked **[gate]** block integration: a branch with any gate item below PASS is not merged into `agents/be-integration`.

## Current status (round 2, 2026-09-16)

`–` = not started. Evidence and findings are in `review-be.md`.

| Item | BE-1 `agents/be-platform` @ 391a979 | BE-2 `agents/be-ops` (no commits) |
|---|---|---|
| G1 | PASS | – |
| G2 | PASS | – |
| G3 | PASS (users module plus every existing route, probed in both runtimes) | – |
| G4 | PARTIAL: roles are clean, but `middleware/auth.js` (`X-User-Role`) still exists until V1 | – |
| G5 | PASS (users) | – |
| G6 | PASS (users full-body parity; existing routes compare status and message only, accepted) | – |
| G7 | PASS (`npm test` 18/18 re-run by SUP-BE; about 14 real tests plus helper modules) | – |
| G8 | PASS (0007 re-verified: seeded DB at 0006, idempotent, fails loudly on duplicates) | – |
| G9 | PASS | – |
| G10 | PASS | – |
| G11 | PASS | – |
| G12 | PASS | – |
| G13 | PASS | – |
| G14 | PASS | – |
| G15 | PASS (32 changed files, 0 hits) | – |
| P1–P7 | PASS | n/a |
| P8 | PASS (Mongo index failure is only warned; see L5) | n/a |
| V1–V9 | – | n/a |
| C1, C2, C5, C6 | – | n/a |
| C3 | PASS | n/a |
| C4 | PARTIAL (`test` and `engines` done; `lint` missing) | n/a |
| K*, I*, O*, J*, S*, D1 | n/a | – |

## G — General (both implementers)

- [ ] G1 [gate] Branch cut from `v3-agents-base`. It has no commits to `v3`/`v2`, no `Co-Authored-By` trailers, and small focused commits.
- [ ] G2 [gate] No secrets committed: no real tokens, API keys, `.dev.vars`, `.env`, or passwords in seeds or tests. Test secrets are generated or obviously fake, and at least 32 characters where a policy applies.
- [ ] G3 [gate] Every new or changed admin route requires a session (`adminAuth` / `requireAdmin`) **and** `requireCapability` with the capability from contract §1.2. There is a test for 401 (no token) and for 403 (a wrong role) on at least one read and one write per module.
- [ ] G4 [gate] Authorisation never trusts client input: no `X-User-Role`/`X-User-Id` headers, no body `role` used for authorisation, and the token payload role is never used. The role comes from the stored admin record.
- [ ] G5 [gate] No mass assignment. Records are built from validated fields only, never by spreading `req.body` or `body`.
- [ ] G6 [gate] Express ↔ Worker parity (contract §11): the same paths including `/api` aliases, the same status codes, `message` strings and body keys. Parity tests exist for the module.
- [ ] G7 [gate] `npm test` (`node --test`) in `backend/` passes locally on Node 22, covering Express, Worker (a `node:sqlite` D1 stand-in) and parity.
- [ ] G8 [gate] Migrations use only the owner's numbers (BE-1 `0007`–`0009`, BE-2 `0010+`), are idempotent, and apply on a fresh DB and on a DB at `0006` with `seed.sql`. `0001`–`0006` are unmodified.
- [ ] G9 Envelope and error shapes match `services/http.js`/`errors.js`. 5xx never leaks internal messages. New entities are added to NotFound label maps and `AUDIT_ENTITIES` in both runtimes.
- [ ] G10 Every state-changing admin action is audited with the contract's action names. Audit `changes` hold field names only, never values.
- [ ] G11 `backend/docs/API.md` is updated for every new or changed endpoint, enum and message.
- [ ] G12 Shared logic (capability map, enums/transitions, sanitiser, order normalisation) lives in `backend/shared/` and is not duplicated per runtime.
- [ ] G13 Status file `docs/agents/<agent-id>.md` is kept up to date, with deviations from the contract recorded.
- [ ] G14 Pagination endpoints follow contract §0.3 (validation messages, cap 100, `{items,page,limit,total}`).
- [ ] G15 [gate] **Cc/Cf scan is clean.** No file changed on the branch contains raw control characters (Cc other than TAB/LF/CR, C1 controls) or format characters (Cf: zero-width, bidi overrides, BOM, soft hyphen), or raw U+2028/U+2029. Such characters must be written as escapes (`\u200B`) in source, never as raw bytes. **The Edit and Write tools turn `\uXXXX` escapes into raw characters.** Write these regexes and strings with a shell heredoc, or build them from `String.fromCharCode`/`new RegExp(...)`, and re-run the scan after every edit to a validator or sanitiser. Reviewer command: `git diff --name-only v3-agents-base..<branch>` piped to a code-point scanner that flags `cp<32 && ![9,10,13]`, `127..159`, `\p{Cf}`, `0x2028`, `0x2029`.

## BE-1 — Platform, security & infrastructure (`agents/be-platform`)

### Roles (PRD §6.6, D4)
- [ ] P1 [gate] `backend/shared/capabilities.js` implements the §1.2 table exactly. `superadmin` is a wildcard, and an unknown role gets no capabilities.
- [ ] P2 [gate] Legacy `super_admin` is normalised to `superadmin` on read in both runtimes. Migration `0007` rewrites D1 rows, and seeders write `superadmin`.
- [ ] P3 [gate] Login returns `admin.role` and `admin.capabilities`. `GET /admin/auth/me` exists in both runtimes.
- [ ] P4 [gate] **All existing admin routes** (dashboard, audit-logs, packages, services, portfolio, contacts, newsletter, carts, orders, reads) are capability-gated per §1.2.
- [ ] P5 [gate] Admin users endpoints (§2) work: list/get/create (invite email)/update/role/deactivate/reactivate. Deactivate revokes sessions, and a deactivated user's token gets 401 on the next request.
- [ ] P6 [gate] Escalation rules: a non-superadmin cannot create or modify admin/superadmin, a user cannot change their own role or status (409), and the last active superadmin is protected (409). Tests cover all three.
- [ ] P7 A role change takes effect on the next request (tested). The static token acts as superadmin.
- [ ] P8 Admin email uniqueness is enforced (409), including a D1 unique index.

### Vacancies (PRD §6.5, §7, D1)
- [ ] V1 [gate] `middleware/auth.js` is deleted, the `/vacancies` write routes are gone, and writes live only under `/admin/vacancies` with `vacancies:write`.
- [ ] V2 [gate] Vacancies module in the Worker (`records` collection `vacancies`) plus migration `0008`, at parity with Express.
- [ ] V3 [gate] Public `GET /vacancies` and `/vacancies/:slug` return `open` only. A draft or closed slug gets 404. Served at `/api` too.
- [ ] V4 [gate] `descriptionHtml` is sanitised server-side through `backend/shared/richText.js` in both runtimes, and the fixture suite (§0.5) passes in both.
- [ ] V5 All fields from PRD §6.5 are validated with the contract limits. Default `draft` everywhere. `createdBy` comes from the session.
- [ ] V6 Publish and unpublish with the transitions from §3, `postedAt`/`closedAt` semantics, and audit actions.
- [ ] V7 Hard delete frees the slug (tested: delete, then recreate with the same slug). Slug uniqueness holds under the D1 unique index.
- [ ] V8 Admin list is paged, includes every status, and supports a `status` filter.
- [ ] V9 The first publish calls `notify('vacancy_posted')`, or leaves the documented TODO when BE-2's helper is absent.

### Cleanup, CI & docs
- [ ] C1 `workers/d1-write`, `backend/d1-sync`, `backend/d1-schemas`, `routes/user.js` (plus its mount and `controllers/user.js` if unused) and `TODO_SANITIZE.md` are removed. Nothing references them.
- [ ] C2 [gate] Mongoose model name clash is resolved: unused `backend/models/*` are removed or renamed, and nothing imports them (`grep -r "models/" backend --include=*.js`).
- [ ] C3 `app.js` exports `app` without starting the server on import, so tests can load it.
- [ ] C4 `backend/package.json` has real `test` and `lint` scripts and `engines.node >=22`.
- [ ] C5 CI: Node 22, backend lint and test, frontend-next build and lint. Worker deploy uses `wrangler deploy` from `backend/cloudflare`, only on `v3`/main, with `CLOUDFLARE_API_TOKEN`/`CLOUDFLARE_ACCOUNT_ID` secrets, and runs `wrangler d1 migrations apply --remote` first. No deploy on other branches or PRs.
- [ ] C6 `docs/DEPLOYMENT.md` has an env and secrets matrix for Express, the Worker and Vercel, with names only (no values).

## BE-2 — Commerce & operations (`agents/be-ops`)

### Catalog (PRD §6.1, §7 "Product CRUD", D5)
- [ ] K1 [gate] Categories CRUD (§4.1): parent validation, cycle prevention, delete blocked when in use, public list/detail showing active only.
- [ ] K2 [gate] Products CRUD (§4.2): SKU unique case-insensitively (409, D1 partial unique index on `lower(json_extract(sku))`), slug unique, sanitised `descriptionHtml` (shared sanitiser), attributes validated, image URLs validated, status enum.
- [ ] K3 [gate] Public `GET /products` (paged, active only, no `costPrice`/`stockQuantity`/`reorderLevel`) and `GET /products/:id`. **PRD §7: a product created with images and a rich-text description appears on the public catalog** (end-to-end test).
- [ ] K4 Packages accept optional `items[]` referencing products. `/packages` responses are unchanged for packages without items (a snapshot test against the pre-change response). Deleting a referenced product gets 409.
- [ ] K5 Stock is not writable through product PUT (400 when it differs). Create with `stockQuantity>0` writes an `initial` movement.

### Inventory (PRD §6.2, §7 "Inventory alerts")
- [ ] I1 [gate] `POST /admin/inventory/adjustments` writes the movement (reason, change, before/after, user) and updates stock atomically. Below zero gets 409. A concurrency test shows no lost update: N parallel adjustments give the exact final stock, in both runtimes.
- [ ] I2 [gate] Movement history is paged and filterable. The inventory view shows `lowStock` flags.
- [ ] I3 [gate] **Low-stock email:** when `stockQuantity <= reorderLevel` (a crossing), an email goes to `settings.notifications.lowStockEmails` (Express nodemailer, Worker Resend), plus a `low_stock` notification. Tested with a mocked transport. Email failure does not fail the adjustment.
- [ ] I4 `POST /admin/inventory/low-stock-check` sends a digest. The optional Worker cron is documented.

### Orders & fulfilment (PRD §6.3, §7 "Order lifecycle", D4a)
- [ ] O1 [gate] Enums are exactly those in contract §6.1. Every admin order response carries `fulfillmentStatus`, `paymentStatus`, `requiresInstallation`, `assignedEngineerId`, `paidAt` and `stockCommittedAt`, with defaults applied at read time.
- [ ] O2 [gate] Backfill: D1 migration `0011` plus Express read-normalisation follow the §6.1 tables (`unpaid→pending` with `legacyPaymentStatus`, `partial` kept, `completed→delivered`). Legacy `status` is derived and kept in sync. Public `POST /order` stores `pending/pending/pending`.
- [ ] O3 [gate] Transition tables (§6.2) are enforced for fulfilment and payment, with 409 messages. Same-value no-op. `status` in a PUT is accepted only when unchanged.
- [ ] O4 [gate] **Stock decrements on `pending → processing`** (not on `POST /order`). It is all-or-nothing, with 409 plus `details` on insufficient stock. `cancelled` after a commit restores stock with `sale_reversal`. Tested in both runtimes.
- [ ] O5 [gate] Mark paid sets `paidAt`. Assign engineer requires `requiresInstallation` and an active `engineer` role. Everything is audited with the §6.4 action names, including the `order.status_change` alias.
- [ ] O6 `new_order` notification on public order placement. The order delete is blocked by active jobs.

### Installation jobs, engineer & staff (PRD §6.4, §6.6 "engineer views limited to assigned jobs")
- [ ] J1 [gate] Job CRUD (§7.2) with order validation (`requiresInstallation`, not cancelled), assign/unassign, the transition table, and delete rules.
- [ ] J2 [gate] `/admin/me/jobs*` is scoped to the caller: another engineer's job gets **404**. An engineer can only do `assigned→in_progress→completed`, toggle checklist `done`, set photo URLs and completion notes, and gets **403** on `/admin/jobs`, `/admin/orders` and `/admin/products` (tested).
- [ ] J3 Completing the last job on a `delivered` order moves the order to `installed`. Completion requires the checklist to be done.
- [ ] J4 Staff endpoints (§7.4): profile validation (`areaCoverage`, `certifications`), `?role=engineer&isActive=true` filter. Role and activation are not editable via staff.

### Settings & notifications (PRD §6.7)
- [ ] S1 [gate] `GET/PUT /admin/settings` (single document `global`, section merge, validation). `GET /settings/public` never exposes notification emails.
- [ ] S2 Payment gateway toggle present (`payments.gatewayEnabled`), with no gateway integration (out of scope).
- [ ] S3 [gate] Notifications: the `notify()` helper exists in both runtimes. Audience filtering is server-side (a `job_assigned` notification is visible only to its recipient, `low_stock` only to `inventory:read`, and so on). Per-admin read state and read-all work. Paged plus `unreadCount`.

### Dashboard
- [ ] D1 `GET /admin/dashboard` keeps the existing keys unchanged and adds `kpis` (revenue for the period, open orders, low-stock items, open vacancies, upcoming jobs) with the §9 definitions and date validation.

## Integration (SUP-BE, `agents/be-integration`)
- [ ] X1 Merge `be-platform` then `be-ops`. The capability shims are replaced by BE-1's files, and the `notify('vacancy_posted')` TODO is wired.
- [ ] X2 Migrations `0001`→latest apply in order on a fresh `node:sqlite` DB and on a seeded DB.
- [ ] X3 `npm test` is green, and the parity suite is green.
- [ ] X4 Express smoke run (JSON store): boot, `/health`, login as the seeded superadmin, `/admin/auth/me`, create a vacancy, publish it and see it in `/vacancies`, create a category, a product and an adjustment, place an order (Turnstile disabled locally), move it to processing, create a job, assign an engineer, and read the engineer's `/admin/me/jobs`.
- [ ] X5 No remaining references to deleted modules. `grep` for `X-User-Role`, `requireAdminOrHR`, `d1-sync` and `d1-write` returns nothing.
