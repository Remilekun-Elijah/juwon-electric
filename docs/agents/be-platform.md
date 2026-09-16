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
| Tests (`npm test` = `node --test` in `backend/`, 18 passing) | `backend/test/capabilities.test.js`, `backend/test/adminUsers.test.js`, `backend/cloudflare/test/adminUsers.test.js` (node:sqlite D1 stand-in), `backend/test/parity/adminUsers.parity.test.js` |

Reusable test harness: `backend/test/helpers/express.js` (`startExpress(env)` → `{ request, close }`), `backend/cloudflare/test/helpers/worker.js` (`createWorkerClient(env)` → `{ env, request }`), `backend/cloudflare/test/helpers/d1.js` (`createD1`, `applyMigrations(d1, { upTo })`). Both `request(method, path, { token, body })` calls resolve `{ status, body }` after background work (audit, email) settles.

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

- Vacancies consolidation (contract §3, checklist V1-V9), including `backend/shared/richText.js` and fixtures, and migration `0008`.
- Cleanup C1 (`workers/d1-write`, `backend/d1-sync`, `backend/d1-schemas`, `routes/user.js`, `TODO_SANITIZE.md`) and C2 (the `backend/models/*` clash).
- C4 `lint` script, C5 CI (Node 22, wrangler deploy on `v3`/main with migrations first), C6 `docs/DEPLOYMENT.md` env matrix.
