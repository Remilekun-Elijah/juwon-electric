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
- Review 3: FE-2 @ 2cf7074 is **accepted for integration**.
  - FE2-1 to FE2-7 are fixed.
  - New modules pass capability, contract-shape, engineer-scope, and self-change checks.
  - FE2-9 (invite-expiry hint) is a follow-up that doesn't block. FE2-10 and FE2-11 are notes.
  - Trial merge with FE-1 @ 14f0b00 is green after 3 conflict resolutions (FE2-8 updated), including the `PublicCustomerSegment` rename in `lib/fallbacks/index.ts`.
  - The declared gaps (inventory category filter, movement filter reset, jobs created only from orders) don't block.
- Conventions: added the `NEXT_PUBLIC_ADMIN_PREVIEW` rule and the one-toaster rule.
- `FE_ACCEPTANCE.md` now carries per-item statuses.

## Review environment note
Turbopack refuses a symlinked `node_modules` that points outside the project root. Review worktrees are placed under this worktree's `frontend-next/` with an uncommitted `turbopack.root` override, and deleted after the build.

- Review 4: FE-1 @ 00ab5c3 accepted; FE-2 @ 6b8b544 (FE2-9 fixed).
  - Findings: FE4-1 stale sanitiser port (re-port `richText.js` @ ae917b4 before release) and FE4-2 contrast shades (ruled in FE_CONVENTIONS §2).
  - Follow-up FE4-3: CSP.
  - Open product issue FE4-5: the solar toggle doesn't update the kits text.

## Phase 3: integration (done)
- `agents/fe-integration` @ 28e0e1d = base + FE-1 00ab5c3 + FE-2 6b8b544.
- 5 conflicts resolved (see `docs/agents/fe-integration.md` on that branch).
- `tsc` 0, lint 0/0, build green.
- Smoke against BE-1 Express: HTTP routes plus 13/13 headless Chrome checks.

## Next
- Re-check FE4-1 and FE4-2 when FE-1 lands them (on `agents/fe-public`, then re-merge into `agents/fe-integration`).
- Live checks with `agents/be-integration` once BE-2 is merged.
- Phase 3: integration branch.
