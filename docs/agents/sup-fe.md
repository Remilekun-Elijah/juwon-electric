# SUP-FE status (`agents/fe-supervisor`)

Base: `v3-agents-base` @ `d48b482`.

## Phase 1 — conventions and acceptance (done)
- `docs/agents/FE_CONVENTIONS.md`: layout and ownership, UI-kit split, tokens, verbatim shared `lib/config.ts` / `lib/cn.ts` / `lib/api/client.ts`, admin session facts (`je/admin-session`, `je/admin-user`, `x-admin-token`, 8 h / 2 h idle, login `data:{token, admin:{id,name,email,role}}`, body `{username,password}`), rendering rules.
- `docs/agents/FE_ACCEPTANCE.md`: checklist sections A–G.

## Corrections to the ledger (AGENT_WORKLOAD_SPLIT.md §5 FE-2)
- The admin session is sent as `x-admin-token`, not a bearer token.
- Carts and customer segments have backend routes but no Vite UI, so they are new builds, not ports.

## Next
- Phase 2: review FE-1 / FE-2 commits and write findings to `docs/agents/review-fe.md`.
- Phase 3: integration branch.
