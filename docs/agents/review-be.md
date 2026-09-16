# Backend Review

Reviewer: SUP-BE · Contract: `docs/agents/API_CONTRACT_V3.md` · Checklist and status table: `docs/agents/BE_ACCEPTANCE.md`

---

## Round 3 (2026-09-16): BE-1 scope complete; BE-2 catalog and inventory

### Method
Temporary worktrees inside the supervisor worktree were checked out at `agents/be-platform` 8e29aec and `agents/be-ops` bd75e45, with `node_modules` symlinked (nothing installed). Both were removed afterwards. Probe scripts lived only in those temporary worktrees.

### BE-1 `agents/be-platform` (01b22f3, 9e21528, be41b72, dba5f27, 9743509, 8e29aec)

**BE-1's claims, re-verified:**
- `npm test`: **32/32 pass.**
- `npm run lint`: **clean** (ESLint, then `check-chars: 107 files clean`).
- `node app.js`: **boots.** `/health` returns 200 and `/api/admin/auth/me` returns 401.
- `wrangler deploy --dry-run`: **builds** (174 KiB).

**Coordinator checks:**
- **M1 closed.** `middleware/auth.js`, `routes/vacancies.js` and the `/vacancies` mount are deleted. A branch-wide search for `X-User`, `requireAdminOrHR` and `req.header(` finds only docs and the tests that assert legacy `POST/PUT/DELETE /vacancies` with `X-User-Role: admin` return 404. `backend/test/cleanup.test.js` guards against regressions.
- **Vacancies match contract §3.**
  - Express `controllers/vacancies.js` and Worker `cloudflare/src/vacancies.js` both delegate rules and shapes to `shared/vacancies.js`: transitions, `postedAt`/`closedAt`, list validation and views.
  - Every admin route is capability-gated, and `createdBy` comes from the session.
  - Public routes return `open` only, including detail by slug or id.
  - Delete is a hard delete.
  - Parity (`test/parity/vacancies.parity.test.js`) compares **full masked bodies** for every vacancy step. Only the login, user-seeding and audit-list steps are status-only, which matches contract §13.7.
- **Migration 0008.**
  - On a DB at 0006 with `seed.sql`, plus a vacancy and a *package* sharing its slug: applied twice, row count unchanged, and no cross-collection clash thanks to the partial index.
  - A duplicate vacancy slug is rejected.
  - The status index is used (`SEARCH records USING INDEX idx_records_vacancies_status`).
  - On a DB with duplicate slugs it fails loudly and keeps both rows.
- **Sanitiser (§0.5).**
  - `shared/richText.js` passes its 30 fixtures in both runtimes, which run the same fixture file.
  - 31 hostile inputs all produce safe output: entity- or whitespace-obfuscated `javascript:`, `data:`, `vbscript:`, `on*`, quote-breaking attributes, `<scr<script>ipt>`, svg/math, `noscript` mutation XSS, unterminated comments and CDATA, and `target`/`rel` overrides.
  - Output is idempotent across all 60 fixtures (BE-1's and BE-2's).
- **CI** (`.github/workflows/ci.yml`), read in full:
  - Node 22 throughout.
  - `backend` runs `npm ci`, then lint, then test. `worker` runs `wrangler deploy --dry-run`. `frontend` runs lint and build.
  - `deploy-worker` depends on `backend` and `worker` and has `if: github.event_name == 'push' && (github.ref == 'refs/heads/v3' || github.ref == 'refs/heads/main')`. It uses the `production` environment and a non-cancelling concurrency group, fails fast without `CLOUDFLARE_API_TOKEN`/`CLOUDFLARE_ACCOUNT_ID`, and runs migrations before `wrangler deploy`.
  - `permissions: contents: read`.
  - The Worker test suite imports only `node:*` modules, so the `backend` job needs no `backend/cloudflare` install.
  - Structure is valid by inspection. BE-1 ran `@action-validator/cli`, but no YAML parser was available here to re-run it.
- **`docs/DEPLOYMENT.md`:** names only. The only literal strings are `openssl rand` commands and duplicate-finding SQL. No values, keys or tokens. It includes break-glass `ADMIN_TOKEN` recovery (L1).
- **Cleanup vs BE-2.** A search of `agents/be-ops` for `models/`, `d1-sync`, `d1-write`, `d1-schemas`, `sanitize-html`, `routes/user`, `middleware/auth.js` and `controllers/user` finds hits only in **base files that BE-1 deletes or rewrites**: the old `app.js` user-router import, old `controllers/vacancies.js`, `routes/user.js`, `routes/vacancies.js`, `TODO_SANITIZE.md`, README, and the old CI `workers/d1-write` step. No BE-2 module imports anything BE-1 removed. The Worker (`cloudflare/src`) has no such imports on either branch.
- **G15:** 0 hits across 83 changed files, confirmed with a second, PCRE-based search at the branch head.

**Findings (BE-1)** — no Critical, High or Medium.
- **L7. Sanitiser worst-case CPU.** Found by timing probes on 100 KB inputs.
  - Timings: `"<a" × 50 000` takes about 300 ms and `'<a "' × 25 000` about 360 ms (other patterns under 20 ms). The sticky `TAG_PATTERN` rescans up to about 2 048 attribute units from every unmatched `<`.
  - Only authenticated `vacancies:write` or `products:write` users can send such input, so the risk is low. On the Workers free plan (10 ms CPU) this would fail the request, though not other requests.
  - *Fix:* before running `TAG_PATTERN`, find the next `>` with `indexOf`. If there is none, or the span to it exceeds a character cap (for example 4 096), treat the `<` as text and continue. Add a timing test (100 KB in under 50 ms). Not a gate.
- **L8. Silent slug rename (ruled acceptable, contract §13, item 13).** A PUT with an explicit slug that is taken returns 200 with a `-2` slug. FE must use the response slug.
- **I3. Expected merge conflicts.** `git merge-tree` of be-platform then be-ops reports 14 conflicted files: `app.js`, both `package.json`, Worker `index.js`/`store.js`, `test/helpers/d1.js`, `routes/public.js`, `services/errors.js`, `services/store.js`, and add/add on `shared/capabilities.js`, `shared/richText.js`, the fixtures and both `richText.test.js`. The richText, fixtures and capabilities files are identical or near-identical on both branches, so those conflicts are mechanical. BE-2 merging `agents/be-platform` into `agents/be-ops` now would shrink integration work.

**BE-1 status:** every BE-1 checklist item is PASS (see `BE_ACCEPTANCE.md`). The remaining open items are integration checks, not branch defects:
- the Mongo `ensureUniqueIndexes` production exit (no Mongo instance here);
- the `frontend` CI job;
- a real GitHub Actions run, including non-interactive `wrangler d1 migrations apply --remote`;
- wiring `notify('vacancy_posted')` at the two `TODO(integration)` call sites.

**BE-1 is ready for integration.**

### BE-2 `agents/be-ops` (a8da77f, 68e2c5c, 05498dd, bd75e45)

**Verified:**
- `npm test` (Node 22): **13/13 test files pass** at bd75e45. At 05498dd, 49/49 passed once `sanitize-html` was present. At bd75e45 BE-2 dropped it along with the base vacancy controller's use of it.
- **Capability probe.** In both runtimes, as engineer, sales, hr and inventory across all 13 catalog and inventory admin routes plus the `/api` alias, every status and message is identical between Express and the Worker and matches §1.2:
  - engineer and hr: 403 everywhere;
  - sales: reads 200, writes and adjust 403;
  - inventory: full access (400 or 404 on empty bodies).
- **Safety probe** (both runtimes identical):
  - a `javascript:` image URL is rejected with 400;
  - `descriptionHtml` is stored sanitised (`onclick`, `<script>` and the `javascript:` href are removed);
  - a SKU differing only in case gets `409 "Another product already uses SKU pnl-2."`;
  - the public product exposes no `costPrice`, `stockQuantity`, `reorderLevel` or `lowStock` (it has `inStock`);
  - a hidden product gets 404 on the public detail route and is absent from the public list;
  - adjusting below zero gets `409 "Stock cannot go below zero."`;
  - manual reason `sale` gets `400 "Reason is not valid."`.
- **Sanitiser:** bd75e45 carries BE-1's `richText.js` and fixtures **byte-identical** (empty diff), so ruling (a) is already implemented.
- **Capabilities and test helpers** are BE-1's files. There are no shims.
- **Migrations:** `0010_catalog.sql` (slug and case-insensitive SKU unique partial indexes) and `0012_inventory_jobs.sql` (`batch_guard` plus movement and job indexes) are idempotent and within BE-2's range.
- **Atomic stock:**
  - Worker `ops/stock.js` issues one D1 batch with a compare-and-set UPDATE per product, each followed by `INSERT INTO batch_guard SELECT changes()`. A `CHECK (ok = 1)` failure rolls the batch back, and it retries up to 5 times before a 409.
  - The pattern is sound, and the node:sqlite stand-in tests rollback, retry and 12-way concurrency. It relies on `changes()` behaving per statement inside a real D1 batch, which is **an integration check** (`wrangler dev --local` or a staging D1).
- **Low-stock:**
  - The digest includes only `active` products and skips sending when there are no lines.
  - The Worker cron is `0 7 * * *`. Express uses an unref'd 24-hour timer.
  - The crossing alert is emailed. The `low_stock` notification waits for §8.
- **G15:** 0 hits at bd75e45 (PCRE code-point search across `backend` and `docs`).

**Findings (BE-2):**
- **M2 (Medium, blocks CI). `npm run lint` fails with 2 ESLint errors at bd75e45:**
  - `backend/cloudflare/src/index.js:1617`: `no-useless-assignment` on `path`, in the fetch entry. BE-1 fixed the same pre-existing line in dba5f27, and BE-2's version of `index.js` re-introduced it.
  - `backend/shared/inventory.js:8`: unused import `oneOf` (`no-unused-vars`).

  Because `lint` is `eslint . && node scripts/check-chars.mjs`, the G15 check never runs on this branch either.
  *Fix:* apply BE-1's `let path = null` → `let path;` change (or merge be-platform), and remove `oneOf`. Keep `npm run lint` green on every commit.
- **L9. Test suite depends on a removed package mid-transition.** At 05498dd the Express suite failed without `sanitize-html` installed, because the base `controllers/vacancies.js` imported it. bd75e45 fixed this by switching that controller to the shared sanitiser. No action is needed beyond taking BE-1's controller at integration.
- **L10. Express digest per instance** (ruled acceptable, contract §13 BE-2 item 7). Document it in DEPLOYMENT.md at integration.
- **I4.** Parity exclusions for package create, list ties and concurrent steps are accepted (§13 BE-2 item 6). All other catalog and inventory steps compare full masked bodies.

**BE-2 status:**
- PASS: G1–G7, G9–G14, K1–K5, I1, I2, I4.
- PARTIAL: G8 (0011 and 0013 are pending), G15 (the content is clean, but lint doesn't reach the check), I3 (notification pending).
- Not started: O1–O6, J1–J4, S1–S3, D1.
- **Not ready for integration.** Fix M2 and finish §6–§9.

### Rulings made this round (contract §13)
- **Sanitiser: option (a).** `richText.js` is the only sanitiser, used for products too. §0.5 is not widened. BE-2 has already complied.
- **BE-1 items 10–14:** all confirmed. The `-2` slug suffix is consistent with §0.4 and §10.1, and FE must use the response slug.
- **BE-2 items 1–8:** confirmed or accepted, as recorded in §13.

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
