# FE-2 — Admin portal (`agents/fe-admin`)

Status: **in progress**. Last updated 2026-09-16.

Sources: `AGENT_WORKLOAD_SPLIT.md` §5 FE-2, `agents/fe-supervisor:docs/agents/FE_CONVENTIONS.md` (d894bad),
`agents/be-supervisor:docs/agents/API_CONTRACT_V3.md` (c737453).

## Progress

| Item | State |
| --- | --- |
| 1. Build fix | Done on base (d48b482) |
| Foundation: shared lib files, admin types, capabilities, transitions, contract mocks, typed API functions | Done (checkpoint) |
| 2. Auth: layout shell, `/admin/login`, `/admin/reset-password`, session, 401/403 handling | Not started |
| 3. Port of existing admin screens | Not started |
| 4. Vacancies admin | Not started |
| 5. New module UIs | Not started |
| 6. Dashboard KPIs | Not started |

## Files owned here

- `lib/api/admin.ts`: session storage, `adminFetch`, and one typed function per admin endpoint.
- `lib/api/types.ts`: the admin section, with contract shapes.
- `lib/admin/capabilities.ts`: the contract §1.2 role → capability table.
- `lib/admin/transitions.ts`: status enums, labels and transitions (contract §3, §6.2, §7.1).
- `lib/admin/mocks.ts`: in-memory contract mocks.
- `lib/config.ts`, `lib/cn.ts`, `lib/api/client.ts`: verbatim copies from FE_CONVENTIONS §3.3.
- `components/ui/**`: taken unchanged from FE-1 (`agents/fe-public` b6e901d). Not re-ported.

## Deviations and decisions (for SUP-FE / SUP-BE)

1. **Bearer header.** `adminFetch` sends `Authorization: Bearer <token>`, as API_CONTRACT_V3 §12 requires, not `x-admin-token` as FE_CONVENTIONS §3.5 says. The coordinator ruled that the contract wins. Both backends accept either header, and CORS allows `Authorization`.
2. **Capabilities come from the contract.** Navigation and actions are gated on `admin.capabilities` from login or `GET /admin/auth/me`. The role map in `lib/admin/capabilities.ts` is only a fallback for a backend that doesn't return `capabilities` yet. On a 403, `adminFetch` calls a registered handler that refetches `/admin/auth/me`.
3. **Mock fallback (`TODO(contract)`).**
   - **How it works:** each new-module function calls the real contract endpoint first. It falls back to `lib/admin/mocks.ts` only when the backend answers `404 "Route not found."`.
   - **What stays real:** a missing record (`404 "<Label> not found."`), validation errors and network errors are never mocked.
   - **Visibility:** when a fallback runs, the area is flagged and the admin shell shows a "preview data" notice.
   - **Removal:** delete the fallback and `mocks.ts` after backend integration.
   - **Order changes:** fulfilment, payment and engineer-assignment changes made in mock mode are laid over the real `/admin/orders` data in memory only.
4. **FE-1's `lib/api/admin.ts`.** FE-1's b6e901d also adds `lib/api/admin.ts` (a small `adminRequest`). This branch owns that file (FE_CONVENTIONS §1). Keep FE-2's version at integration. FE-1's `lib/api/index.ts` should not re-export an admin client.
5. **Dependencies.** `@headlessui/react`, `lucide-react`, `sonner`, `clsx` and `tailwind-merge` are exactly what FE-1 added in b6e901d. They are needed by the UI kit: Headless UI for Dialog, Drawer and Menu, lucide icons, and sonner for toasts. `package.json` and `package-lock.json` are taken from FE-1's branch, so the files are identical adds. No other dependencies have been added.
6. **Assets.** `public/logo.svg` and `public/panel-4.webp` are copied from the Vite `frontend/`. The admin sign-in panel and shell use them. FE-1 owns `public/`, so if FE-1 adds the same files they are byte-identical.

## Stubs waiting for backend endpoints

These are all mocked through the fallback: `/admin/auth/me`, `/admin/vacancies*`, `/admin/categories*`, `/admin/products*`, `/admin/inventory*`, `/admin/orders/:id/{fulfillment,mark-paid,assign-engineer}`, `/admin/jobs*`, `/admin/me/jobs*`, `/admin/users*`, `/admin/staff*`, `/admin/settings`, `/admin/notifications*`, and dashboard `kpis`.

`agents/be-platform` and `agents/be-ops` had no commits when this was checked.
