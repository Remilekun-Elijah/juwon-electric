# Backend Review — Round 1

Reviewer: SUP-BE · Date: 2026-09-16 · Contract: `docs/agents/API_CONTRACT_V3.md` (c737453) · Checklist: `docs/agents/BE_ACCEPTANCE.md` (e26866d)

## Branch state at review time

| Branch | Commits beyond `v3-agents-base` (d48b482) | Uncommitted work visible in worktree | Tests run |
|---|---|---|---|
| `agents/be-platform` (BE-1) | **none** (branch still points at `a8d6574`, the previous base, so it must rebase or reset onto `d48b482` before starting) | none (`backend/shared`, `docs/agents` absent) | n/a (nothing to run) |
| `agents/be-ops` (BE-2) | **none** | none | n/a |

Neither implementer has committed work, so every checklist item is **FAIL (not started)** for this round. That includes the gate items G1–G14, P1–P8, V1–V9 and C1–C6 for BE-1, and G1–G14, K1–K5, I1–I4, O1–O6, J1–J4, S1–S3 and D1 for BE-2. I'll re-review when commits appear.

To give implementers a head start, below are the **pre-existing defects in the base** that the checklist requires them to fix. They are ranked by severity, with the owner in brackets.

## Baseline findings (`v3-agents-base` @ d48b482)

### Critical

1. **[BE-1] Vacancy writes are authorised by a client-supplied header.** `backend/middleware/auth.js:7-11` trusts `X-User-Role`, and `backend/routes/vacancies.js:12-14` uses it for POST, PUT and DELETE. Anyone can create, edit or delete vacancies with `X-User-Role: admin`.
   *Fix:* delete `middleware/auth.js` and the write routes. Add `/admin/vacancies*` behind `adminAuth` + `requireCapability("vacancies:write")` (contract §3, checklist V1, G4).
2. **[BE-1] The vacancy router bypasses the admin stack and the `/api` alias.** `backend/app.js:86` mounts `app.use('/vacancies', vacanciesRouter)` outside `adminRouter`, so it has no session, no `no-store`, and no `/api/vacancies`.
   *Fix:* put public reads on the public router (served at `/` and `/api`) and admin routes inside `routes/admin.js` after `router.use(adminAuth)` (contract §0.1).
3. **[BE-1] Mass assignment in the vacancy controller.** `backend/controllers/vacancies.js:78,89,103` spreads `req.body` into the stored record, so a caller can set `status`, `postedAt`, `_id`, `isActive` or `postedBy`. `postedBy` is taken from the `X-User-Id` header at lines 79 and 90.
   *Fix:* build the record from validated fields only, and take `createdBy` from `req.admin` (contract §0.4, §3; checklist G5).
4. **[BE-1 + BE-2] Existing admin routes have no role checks.** `backend/routes/admin.js:60` only requires a session, and the Worker's `handleAdmin` behaves the same way. Once non-superadmin roles exist, every role can do everything, including deleting orders and customer data.
   *Fix:* gate every existing admin route per contract §1.2 (checklist P4). BE-2 gates its own new routes with the shim.

### High

5. **[BE-1] Public vacancy detail leaks drafts.** `controllers/vacancies.js` `getVacancy` (Mongo `findOne({ slug })`, JSON `getCollectionItem`) has no status filter.
   *Fix:* return 404 `"Vacancy not found."` unless the status is `open` (contract §3, V3).
6. **[BE-1] The vacancy JSON-store path cannot work.** `vacancies` is not a known collection in `services/store.js`, and the controller swallows every error into `500 "Server error"` (a non-contract message), so failures are invisible. The JSON path also defaults `status` to `open` (line 89) while Mongo defaults to `draft`. Soft delete (line 135) keeps the slug taken.
   *Fix:* add `vacancies` to the store, default to `draft`, use a hard delete, and use `asyncHandler` + `ApiError` (contract §3, V5, V7).
7. **[BE-1] Fail-open signature check in `backend/d1-sync/index.js:24-26`.** Verification is skipped when `SYNC_SECRET` is unset. `workers/d1-write` also has no auth on `POST /write/vacancies`.
   *Fix:* retire both, as D1 decides (checklist C1). Do not patch them.
8. **[BE-1] The sanitiser differs across runtimes.** Express uses `sanitize-html` with `img` allowed (`controllers/vacancies.js:72,105`), and the Worker has no sanitiser.
   *Fix:* use the shared pure-JS `backend/shared/richText.js` with the fixture suite in both runtimes (contract §0.5, V4).

### Medium

9. **[BE-1] Legacy role value.** The seeders write `role: "super_admin"` (`services/adminAuthService.js:396`, `cloudflare/src/auth.js:342,395`), but D4 names the role `superadmin`.
   *Fix:* use `normalizeRole` on read, migration `0007`, and write `superadmin` in the seeders (P2).
10. **[BE-1] No tests, and `npm test` exits 1** (`backend/package.json:6`). `app.js` calls `start()` on import, so it cannot be tested.
    *Fix:* use `node --test`, export `app`, and guard `start()` (C3, C4, G7).
11. **[BE-1] Dead code and model clash.** `app.js:83` mounts the unreachable `routes/user.js`. `backend/models/{Order,User}.js` clash with the `store.js` registrations (C1, C2).
12. **[BE-2] Order enums diverge from the plan.** `controllers/orders.js` uses `ORDER_STATUSES`/`PAYMENT_STATUSES` with `unpaid|partial|paid|refunded`, and the Worker mirrors it.
    *Fix:* apply contract §6.1 (D4a settled: keep `partial`, `unpaid→pending` with `legacyPaymentStatus`, `completed→delivered`, derived `status`), backfill in migration `0011`, and update `backend/docs/API.md` (O1–O3).

## Next review
Triggered when either branch has commits. I'll run `npm test` in a temporary worktree with `node_modules` symlinked, and grade each item in `BE_ACCEPTANCE.md`.
