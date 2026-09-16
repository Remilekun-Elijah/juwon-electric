# SUP-FE status (`agents/fe-supervisor`)

Base: `v3-agents-base` @ `d48b482`.

## Phase 1: conventions and acceptance (done, d894bad)
- `docs/agents/FE_CONVENTIONS.md`
- `docs/agents/FE_ACCEPTANCE.md`

## Conventions revision 2 (after FE-1 review and API_CONTRACT_V3)
- The admin token is sent as `Authorization: Bearer` (contract §12), not `x-admin-token`.
- Gating uses `capabilities` from `GET /admin/auth/me`, never `role`. `/me` is refetched on load and after any 403.
- FE-1's `lib/cn.ts` and `lib/api/client.ts` (b6e901d) are the shared originals, replacing the rev-1 verbatim snippets.
- FE-1's full UI-kit port is accepted. FE-2 copies it with `git checkout agents/fe-public -- …` and never ports kit files. FE-2 owns `lib/api/admin.ts` from now on.
- Fonts: the public body is Inter. Add the Inter, Sora, and Manrope helper classes and the `--diamond`/`--gold` variables. Admin uses `font-sans`.
- Tailwind v3 → v4 rename rules for ported markup.
- Package detail route is `packages/[id]` (backend `GET /packages/:id`).

## Phase 2: reviews
- Review 1: FE-1 @ b6e901d. See `review-fe.md`. Majors: FE1-1 (kit untyped for TSX), FE1-2 (font parity), FE1-3 (v3 → v4 utility drift).
- Review 2: FE-2 @ 6d07424 plus an FE-1 re-check @ 0e03b90.
  - FE-1: FE1-1 to FE1-8 are fixed and review 1 is closed.
  - FE-2 majors:
    - FE2-1: preview mocks must be opt-in through `NEXT_PUBLIC_ADMIN_PREVIEW`.
    - FE2-2: duplicate `<Toaster />` after the merge.
  - FE-2 minors: FE2-3 to FE2-6.
  - Trial merge FE-1 into FE-2: build green, lint 0 errors, 13 add/add conflicts with resolutions recorded (FE2-8).
- Conventions: added the `NEXT_PUBLIC_ADMIN_PREVIEW` rule and the one-toaster rule.
- `FE_ACCEPTANCE.md` now carries per-item statuses.

## Review environment note
Turbopack refuses a symlinked `node_modules` that points outside the project root. Review worktrees are placed under this worktree's `frontend-next/` with an uncommitted `turbopack.root` override, and deleted after the build.

## Next
- Review FE-2's uncommitted modules (catalog, inventory, jobs and the engineer view, staff, settings) once committed, including the contract check of their stubs.
- Re-check FE2-1 and FE2-2. Check the vacancies SSG conversion (FE-1).
- Phase 3: integration branch.
