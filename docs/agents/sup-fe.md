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
- FE-2: no commits yet.

## Review environment note
Turbopack refuses a symlinked `node_modules` that points outside the project root. Review worktrees are placed under this worktree's `frontend-next/` with an uncommitted `turbopack.root` override, and deleted after the build.

## Next
- Re-review FE-1 fixes. Review FE-2's first commits.
- Phase 3: integration branch.
