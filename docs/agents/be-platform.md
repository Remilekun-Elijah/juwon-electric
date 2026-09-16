# BE-1 status: Platform, Security & Infrastructure (`agents/be-platform`)

Base: `v3-agents-base` @ `d48b482`. Contract: `docs/agents/API_CONTRACT_V3.md` (c737453, `agents/be-supervisor`).

## Milestone 1: roles and capabilities (D4, contract §1-2): done

For BE-2: the files at the contract's paths are real, not shims. Import them as they are.

| Contract item | Where |
| --- | --- |
| Capability map, roles, `normalizeRole`, `capabilitiesFor`, `hasCapability` (plus `canManageRole`, `adminSelf`, `adminUser`, `emptyStaffProfile`, `STATIC_ADMIN`, `FORBIDDEN_MESSAGE`) | `backend/shared/capabilities.js` |
| Express `requireCapability(...caps)` (plus `actingAdmin(req)`) | `backend/middleware/capabilities.js` |
| Worker `requireCapability(admin, ...caps)` | `backend/cloudflare/src/capabilities.js` |
| Every existing admin route gated (§1.2) | `backend/routes/admin.js`, `backend/cloudflare/src/index.js` `handleAdmin` |
| `GET /admin/auth/me`, `AdminSelf` in login | both runtimes |
| `/admin/users` list (paged) / get / create (invite) / update / role / deactivate / reactivate, audited | `backend/controllers/adminUsers.js`, `backend/cloudflare/src/adminUsers.js`, shared rules in `backend/shared/adminUsers.js` |
| Migration `0007_admin_roles.sql` (legacy role rewrite, unique `lower(email)` index) | `backend/cloudflare/migrations/` |
| Admin email uniqueness in Express | Mongo unique index at startup (`ensureSecurityIndexes`), and a check under the JSON store lock |
| Paging parser moved into a shared helper (§0.3) | `backend/services/pagination.js` (the Worker keeps `validation.js` `pageParams`) |
| `app.js` exports `app` and starts only when run directly | `backend/app.js` |
| Tests (`npm test` in `backend/`) | `backend/test/capabilities.test.js`, `backend/test/adminUsers.test.js`, `backend/cloudflare/test/adminUsers.test.js` (node:sqlite D1 stand-in), `backend/test/parity/adminUsers.parity.test.js` |

Reusable test harness: `backend/test/helpers/express.js` (`startExpress(env)` → `{ request, close }`), `backend/cloudflare/test/helpers/worker.js` (`createWorkerClient(env)` → `{ env, request }`), `backend/cloudflare/test/helpers/d1.js` (`createD1`, `applyMigrations(d1, { upTo })`). Both `request(method, path, { token, body })` calls resolve `{ status, body }` after background work (audit, email) settles.

## Milestone 2: vacancies consolidation (D1, contract §3, V1-V9): done

| Item | Where |
| --- | --- |
| V1: `middleware/auth.js` (X-User-Role), `routes/vacancies.js`, the `/vacancies` mount and `models/Vacancy.js` removed. Writes exist only under `/admin/vacancies` with `vacancies:write` | `backend/routes/admin.js`, `backend/routes/public.js` |
| V2: Worker module plus migration `0008_vacancies.sql` (unique slug partial index, status index) | `backend/cloudflare/src/vacancies.js` |
| V3: public list and detail are open-only, and a draft or closed slug or id returns 404. Served at `/api` too | both runtimes |
| V4: `backend/shared/richText.js` (`sanitizeRichText`), with fixtures in `backend/shared/__fixtures__/richText.json` (30 cases) run by `backend/test/richText.test.js` and `backend/cloudflare/test/richText.test.js` (including Worker end to end) | shared |
| V5: validated fields only, contract limits, default `draft`, `createdBy` from the session | `backend/shared/vacancies.js` plus runtime field readers |
| V6: publish/unpublish, the transition table, `postedAt`/`closedAt`, audit actions | shared `statusChange` |
| V7: hard delete frees the slug (tested), and D1 unique index | |
| V8: paged admin list, every status, `status` and `q` filters | |
| V9: `// TODO(integration): notify vacancy_posted` at the first-publish call site (BE-2's `notify()` is not on this branch) | |
| Parity: full masked bodies (contract §13.7) | `backend/test/parity/vacancies.parity.test.js` |

### Sanitiser alignment with BE-2
`agents/be-ops` has `backend/shared/sanitizeHtml.js` (`sanitizeHtml`) for product `descriptionHtml`. It differs from contract §0.5: it allows `span`, `code`, `pre`, `hr`, `sub`/`sup`/`small`, `h5`/`h6` and tables, accepts `tel:`, `#` and site-relative hrefs, keeps `title`/`colspan`/`start` attributes, keeps `target` only when it is `_blank`, and decodes and re-escapes text entities. `backend/shared/richText.js` follows §0.5 exactly and reuses the same linear, allowlist parsing approach, with implied end tags added so stored markup renders as written. It also exports `sanitizeHtml` as an alias, so BE-2 can switch the import path without renaming call sites. **At integration `richText.js` is canonical: BE-2 should import it and delete `sanitizeHtml.js`, or SUP-BE should widen §0.5 if products need the extra tags.**

### Vacancy interpretations
10. **Leaving `closed` clears `closedAt`**, for both `closed→open` (contract: reopening clears) and `closed→draft`, which the contract does not specify.
11. A `PUT` that changes `status` is audited with the status action (`vacancy.publish`/`unpublish`/`close`) and lists every changed field. A `PUT` without a status change is `vacancy.update`. A `PUT` that changes nothing writes nothing and is not audited.
12. The public `department` filter is a case-insensitive exact match. `employmentType` must be valid (400).
13. Slugs never change on a title edit. A sent slug that is taken gets the `-2` suffix (the same as on create), rather than a 409.
14. Rows in a manually created standalone D1 `vacancies` table (from `backend/d1-schemas/vacancies.sql`) are not migrated. That table was never part of the numbered migrations.

## Review round 2 fixes (review-be.md, 3b295ed)

| Finding | Fix |
| --- | --- |
| M1 | Closed by milestone 2 (V1): `middleware/auth.js` and the `/vacancies` mount are gone. |
| L1 | After a write that removes an active superadmin (role change or deactivation), both runtimes recount. If none remain, they restore the account's previous value and return the same 409, and deactivation revokes sessions only after the recount passes. Tested with 10 rounds of concurrent cross-demotions per runtime (`runLastSuperadminRace`). `ADMIN_TOKEN` recovery is documented in `docs/DEPLOYMENT.md` (C6). |
| L2 | Repeated query parameters return the Express 400 in the Worker too (`cloudflare/src/query.js` passes arrays to the shared parsers; `pageQuery` rejects a repeated page or limit). This covers `/admin/users`, `/admin/vacancies` and public `/vacancies`, and the cases are in both parity scenarios. The users filter parsing moved to shared `parseUserFilters`. |
| L3 | `Object.hasOwn` is used in `hasCapability` and in the read-type lookup in both runtimes. `__proto__`, `constructor` and `toString` now return `400 "Type must be contacts or orders."` (in the parity scenario). |
| L4 | `npm test` uses explicit globs: `test/**/*.test.js` and `cloudflare/test/**/*.test.js`. |
| L5 | The Mongo unique indexes (admin email, vacancy slug) moved to `ensureUniqueIndexes()`. If one cannot be built, startup logs an error naming the duplicate values, and **exits when `NODE_ENV=production`**; other environments continue with a loud error. This path was not exercised against a live MongoDB here, because no Mongo instance is available locally. |
| L6 | A shared `backend/shared/adminInviteEmail.js` produces the subject, HTML and text, including the `ADMIN_APP_URL` link. Express uses it through nodemailer (`sendMail` now also sends `text`), and the Worker through Resend (`env.ADMIN_APP_URL`). A Worker test captures the Resend payload. |

## Interpretations and deviations (SUP-BE please confirm)

1. **`/admin/reads*` checks.** `POST /admin/reads` checks the record type (`contacts` → `leads:read`, `orders` → `orders:read`). `GET /admin/reads` and `POST /admin/reads/all` need no capability, because they return only read timestamps and never record contents.
2. **Check order for users writes:** capability → body validation → lookup (404) → escalation `403` → self `409` → last-superadmin `409`. So a non-superadmin `admin` changing their own role gets `403` (privileged target) before the self rule.
3. **Self rule scope.** Only role changes and (de)activation are blocked for your own account. `PUT /admin/users/:id` (name, phone) on yourself is allowed.
4. **Invites.** `POST /admin/users` creates the account with `passwordHash: null` and emails a reset token in the background (Express: nodemailer with the existing reset template; Worker: Resend text email). Admin-initiated invites are not rate limited. The invitee uses `POST /admin/auth/reset-password`, and nothing else changed in login or reset. Invited accounts are checked against the dummy hash at login, so timing matches an unknown account.
5. **Worker `ok`/`created` now default `data` to `null`**, matching Express (`{ success, message, data: null }`). Before, the Worker dropped `data` on responses without a payload (for example `"Password reset successful."`). This was found by the parity test.
6. **Last-superadmin guard** is check-then-write (not transactional). Two superadmins demoting each other concurrently could both succeed. This is accepted for now.
7. **Parity exclusions.** The admin-users parity test compares every `/admin/users` and auth body. For `/admin/orders`, `/admin/carts`, `/admin/packages` and `/admin/audit-logs` it compares only status and message. Those bodies already differ between runtimes because of seed data (the Express JSON store seeds a catalog) and audit `ip`/`userAgent` (no `CF-Connecting-IP` in the harness).
8. **Test harness notes.** `crypto.subtle.timingSafeEqual` (a workerd-only API) is polyfilled in `cloudflare/test/helpers/worker.js`. `node --test` also loads the helper and scenario modules as (empty) test files, which is harmless.
9. **NotFound label** `admins` changed from `"Admin"` to `"User"` in both runtimes (contract §2 `"User not found."`).

## Remaining BE-1 work (not started)

- Cleanup C1 (`workers/d1-write`, `backend/d1-sync`, `backend/d1-schemas`, `routes/user.js`, `TODO_SANITIZE.md`) and C2 (the `backend/models/*` clash).
- C4 `lint` script, C5 CI (Node 22, wrangler deploy on `v3`/main with migrations first), C6 `docs/DEPLOYMENT.md` env matrix.
