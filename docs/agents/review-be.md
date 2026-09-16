# Backend Review

Reviewer: SUP-BE · Contract: `docs/agents/API_CONTRACT_V3.md` · Checklist and status table: `docs/agents/BE_ACCEPTANCE.md`

---

## Round 2 (2026-09-16): BE-1 roles and capabilities milestone

### Scope and method
- `agents/be-platform` commits: `c84ace9` (a superseded draft; its files were replaced, and nothing from it survives in the final tree), `7713bd5`, `ec6765b`, `391a979` (head). 32 files changed.
- `agents/be-ops`: **no commits** yet. Not reviewed.
- Verification I ran myself in a temporary worktree at `391a979` (with `node_modules` symlinked from BE-1's worktree, and removed afterwards):
  - `npm test` (`node --test`, Node 22.22.2): **18/18 pass.** About 14 of those are real tests. The rest are helper and scenario modules that `node --test` also loads (see L4).
  - `node app.js` (JSON store in a temp dir): **boots.** `GET /health` returned 200, and `GET /api/admin/auth/me` without a token returned 401.
  - `wrangler deploy --dry-run`: **builds** (145 KiB, D1 binding `DB`).
  - **Route matrix probe:** 44 requests as an `engineer` against both Express and the Worker, covering every existing admin route, the users routes, reads and the `/api` aliases. Every capability-gated route returned `403` with the contract message in both runtimes. `/admin/reads` (GET), `/admin/reads/all` and `/admin/auth/me` returned 200. The only difference was `GET /admin/Orders`, which is pre-existing (I1).
  - **Migration probe:** 0001–0006, then `seed.sql`, then a legacy `super_admin` row, then all migrations applied twice. The row count was unchanged, the role was rewritten to `superadmin`, a duplicate email differing only by case was rejected by `idx_records_admins_email`, and 0007 on a DB that already had duplicates failed loudly without deleting rows.
  - **Cc/Cf scan** of all 32 changed files: **0 hits** (G15).
  - Secrets: only obviously fake test values (`juwon.test`, and a static token and signing key of 32+ characters marked as test). No `.env` or `.dev.vars` files. No `Co-Authored-By` trailers.

### Findings, ranked by severity

No Critical or High findings. The capability map matches contract §1.2 exactly, and a test asserts it row by row. Authorisation reads the stored admin record in both runtimes (`middleware/capabilities.js` `actingAdmin`, Worker `requireAdmin` → `getById`). A deactivated account gets 401 in both runtimes: Express `verifyAdminToken` checks `isActive`, and the Worker checks `admin.isActive === false`. Sessions are revoked on deactivation.

**Medium**

- **M1 (G4, V1). `X-User-Role` authorisation is still live on this branch.** `backend/middleware/auth.js` and `app.use('/vacancies', vacanciesRouter)` (`backend/app.js`) are unchanged. The roles milestone doesn't make it worse, but the branch is not mergeable until V1 lands.
  *Fix:* the vacancies consolidation, which is next in BE-1's plan. Do not integrate `be-platform` before it.

**Low**

- **L1 (decision 6). Last-superadmin guard race.** `backend/shared/adminUsers.js` `checkUserChange` runs against a list read before the write (Express `controllers/adminUsers.js` `adminChangeUserRole`/`setActive`, Worker `cloudflare/src/adminUsers.js` role and deactivate branches). Two superadmins demoting each other concurrently can leave none. **Accepted for this round** (contract §13.6).
  *Recommended fix:* after the write, re-list admins. If no active superadmin remains, revert the patch and return the 409. Document the `ADMIN_TOKEN` recovery in `docs/DEPLOYMENT.md` (C6).
- **L2. Parity nit on repeated query params.** Express `queryFilters` rejects arrays (`?role=sales&role=admin` gives `400 "Role is not valid."`, and `?q=a&q=b` gives `400 "q must be text."`). The Worker's `URLSearchParams.get` takes the first value and returns 200.
  *Fix:* in the Worker, return the same 400 when `getAll(name).length > 1`, or in Express take the first value. Pick one and add it to the parity scenario. Do the same in every new paged endpoint.
- **L3. Read-type lookup is not own-property safe.** `READ_TYPE_CAPABILITY[req.body?.type]` (`backend/routes/admin.js`, `cloudflare/src/index.js` `handleReads`) resolves prototype keys (`constructor`, `toString`, `__proto__`). For non-superadmins those return 403 instead of `400 "Type must be contacts or orders."`. It fails closed and there is no crash (probed), but the error is wrong.
  *Fix:* `Object.hasOwn(READ_TYPE_CAPABILITY, type) ? READ_TYPE_CAPABILITY[type] : null`. Also use `Object.hasOwn(CAPABILITIES, capability)` in `shared/capabilities.js` `hasCapability`.
- **L4. `node --test` loads non-test modules.** `test/helpers/*.js`, `test/scenarios/*.js` and `cloudflare/test/helpers/*.js` are reported as passing "tests", which inflates the count and would run any top-level side effects.
  *Fix:* `"test": "node --test \"test/**/*.test.js\" \"cloudflare/test/**/*.test.js\""`.
- **L5 (P8). Mongo email uniqueness can silently degrade.** The unique index is created inside `ensureSecurityIndexes` (`backend/services/store.js`), whose failure `app.js` only warns about. With existing duplicates, uniqueness falls back to the non-atomic pre-check, because `prepare` runs outside a lock in Mongo mode.
  *Fix:* log a dedicated error naming the duplicate emails, or fail startup when `NODE_ENV=production`.
- **L6. Invite emails differ between runtimes.** Express sends the reset template with an `ADMIN_APP_URL` link. The Worker sends a plain-text token with no link (`cloudflare/src/adminUsers.js` invite `sendNotification`). Invite tokens expire in 30 minutes, and there is no resend endpoint.
  *Fix:* give the Worker the same subject and a link when `ADMIN_APP_URL` is set. Resending is covered by contract §13.4 (the invitee uses request-password-reset).

**Info**

- **I1. Pre-existing:** Express routing is case-insensitive (`/admin/Orders` gets 403 or 200), while the Worker returns 404. Out of scope.
- **I2.** The test harness polyfills `crypto.subtle.timingSafeEqual` for Node. That is fine, because workerd provides it natively.

### BE-1 decisions: SUP-BE rulings (recorded in contract §13)

| # | Decision | Ruling |
|---|---|---|
| 1 | Capabilities on the reads routes | **Confirmed.** GET reads and reads/all return only keys and timestamps. |
| 2 | 403 before the self and last-superadmin 409s | **Confirmed.** It avoids revealing state to unprivileged callers. |
| 3 | Admins can edit their own name and phone | **Confirmed,** still subject to escalation, so in practice only a superadmin edits admin-tier accounts. |
| 4 | Invites not rate limited | **Confirmed.** `users:manage` is trusted, and there is a cap of 3 live tokens per email. |
| 5 | Worker `data: null` | **Confirmed.** It fixes a parity bug, and FE is told not to rely on `data` being absent. |
| 6 | Non-transactional last-superadmin check | **Accepted for this round** (L1). The recount-and-revert fix is recommended, and the recovery must be documented. |
| 7 | Status and message only for orders, carts, packages and audit-logs parity | **Accepted for existing routes only.** New modules must compare full masked bodies. |
| 8 | Admin NotFound label changed to "User" | **Confirmed.** |

### BE-1 checklist status
See the table in `BE_ACCEPTANCE.md`.
- PASS: G1–G3, G5–G15, P1–P8, C3.
- PARTIAL: G4 (M1) and C4 (no `lint` script).
- Not started: V1–V9, C1, C2, C5, C6.
- **Not mergeable yet.** The open gate items are G4, V1–V4 and C2.

### BE-2
No commits on `agents/be-ops`. Every item is not started. Heads-up for BE-2:
- BE-1's `backend/shared/capabilities.js`, `middleware/capabilities.js` and `cloudflare/src/capabilities.js` are real (not shims). Rebasing onto or importing from `be-platform`'s versions avoids a merge conflict.
- Re-use `test/helpers/express.js`, `cloudflare/test/helpers/{d1,worker}.js` and the scenario and parity pattern.
- G15 is now a gate. Run a code-point scan after every edit to `backend/shared/fields.js` or any validator or sanitiser.

---

## Round 1 (2026-09-16): baseline

Neither branch had commits. I recorded the pre-existing defects in `v3-agents-base` @ d48b482 for the implementers. Status of each:

| # | Sev | Owner | Finding | Status after round 2 |
|---|---|---|---|---|
| 1 | Critical | BE-1 | `middleware/auth.js` trusts `X-User-Role` for vacancy writes (`routes/vacancies.js:12-14`) | Open (M1, V1) |
| 2 | Critical | BE-1 | `app.js` mounts `/vacancies` outside admin auth, with no `/api` alias | Open (V1) |
| 3 | Critical | BE-1 | Mass assignment and `X-User-Id` `postedBy` in `controllers/vacancies.js:78-79,89-90,103` | Open (V5) |
| 4 | Critical | BE-1 + BE-2 | No role checks on existing admin routes | **Fixed** in `7713bd5`, verified by probe in both runtimes |
| 5 | High | BE-1 | Public vacancy detail leaks drafts | Open (V3) |
| 6 | High | BE-1 | Vacancy JSON-store path broken (unknown collection, `open` default, soft delete keeps slug) | Open (V5, V7) |
| 7 | High | BE-1 | `d1-sync` signature check fails open when `SYNC_SECRET` is unset; `d1-write` has no auth | Open (C1) |
| 8 | High | BE-1 | Different sanitisers per runtime | Open (V4) |
| 9 | Medium | BE-1 | Seeders write `super_admin` | **Fixed** (seeders, normalisation, migration 0007) |
| 10 | Medium | BE-1 | No tests; `app.js` starts on import | **Fixed** (`npm test`, exported `app`) |
| 11 | Medium | BE-1 | Dead `routes/user.js`; `models/*` name clash | Open (C1, C2) |
| 12 | Medium | BE-2 | Order enums diverge (D4a) | Open (O1–O3) |
