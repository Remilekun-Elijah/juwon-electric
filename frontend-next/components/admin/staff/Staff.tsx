"use client";

import { useEffect, useState } from "react";
import { SearchX, UserPlus, Users } from "lucide-react";
import { toast } from "sonner";
import { AdminPage } from "@/components/admin/AdminPage";
import { useAdmin, useAdminQuery } from "@/components/admin/AdminContext";
import {
  Avatar,
  Badge,
  Button,
  ConfirmDialog,
  ErrorState,
  Field,
  ListCardHeader,
  Pagination,
  SearchInput,
  Select,
  Skeleton,
  TBody,
  TD,
  TH,
  THead,
  TR,
  Table,
  TableEmpty,
  Tabs,
  type TabItem,
} from "@/components/admin/kit";
import { normalizeRole, roleLabels, roleOptions } from "@/lib/admin/capabilities";
import { errorMessage, formatDateTime } from "@/lib/admin/format";
import { getStaff, getUsers, setUserActive } from "@/lib/api/admin";
import type { AdminUser, Paged, Role } from "@/lib/api/types";
import { StaffProfileDrawer } from "./StaffProfileDrawer";
import { EditUserDialog, InviteUserDialog, RoleDialog } from "./UserDialogs";

const PAGE_SIZE = 20;
const COLUMNS = 6;

type TabId = "team" | "accounts";
type ActiveFilter = "" | "true" | "false";

const roleFilterOptions = [{ value: "", label: "All roles" }, ...roleOptions];
const activeOptions = [
  { value: "", label: "Any status" },
  { value: "true", label: "Active" },
  { value: "false", label: "Deactivated" },
];

const roleLabel = (role: unknown) => {
  const normalized = normalizeRole(role);
  return normalized ? roleLabels[normalized] : "No role";
};

const replaceUser = (user: AdminUser) => (current: Paged<AdminUser> | undefined) =>
  current && { ...current, items: current.items.map((item) => (item.id === user.id ? { ...item, ...user } : item)) };

export function Staff() {
  const { admin, can } = useAdmin();
  const canReadUsers = can("users:read");
  const canManage = can("users:manage");

  const [tab, setTab] = useState<TabId>("team");
  const [role, setRole] = useState<Role | "">("");
  const [active, setActive] = useState<ActiveFilter>("");
  const [search, setSearch] = useState("");
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);

  const [profileId, setProfileId] = useState<string | null>(null);
  const [profileOpen, setProfileOpen] = useState(false);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [editing, setEditing] = useState<AdminUser | null>(null);
  const [roleTarget, setRoleTarget] = useState<AdminUser | null>(null);
  const [statusTarget, setStatusTarget] = useState<AdminUser | null>(null);
  const [statusBusy, setStatusBusy] = useState(false);

  const activeTab: TabId = tab === "accounts" && canReadUsers ? "accounts" : "team";

  useEffect(() => {
    const timer = setTimeout(() => setQ(search.trim()), 300);
    return () => clearTimeout(timer);
  }, [search]);

  const query = { role, isActive: active === "" ? ("" as const) : active === "true", q, page, limit: PAGE_SIZE };
  const key = JSON.stringify(query);
  const team = useAdminQuery(`staff|${key}`, () => getStaff(query), { enabled: activeTab === "team" });
  const accounts = useAdminQuery(`users|${key}`, () => getUsers(query), { enabled: activeTab === "accounts" });
  const list = activeTab === "team" ? team : accounts;

  const items = list.data?.items ?? [];
  const total = list.data?.total ?? 0;
  const filtersActive = Boolean(role || active || q);

  const tabItems: TabItem<TabId>[] = [
    { value: "team", label: "Team" },
    ...(canReadUsers ? [{ value: "accounts" as const, label: "Accounts" }] : []),
  ];

  const clearFilters = () => {
    setRole("");
    setActive("");
    setSearch("");
    setQ("");
    setPage(1);
  };

  const userUpdated = (user: AdminUser) => {
    accounts.setData(replaceUser(user));
    team.setData(replaceUser(user));
    list.reload();
  };

  const openProfile = (user: AdminUser) => {
    setProfileId(user.id);
    setProfileOpen(true);
  };

  const toggleActive = async () => {
    if (!statusTarget) return;
    setStatusBusy(true);
    try {
      const updated = await setUserActive(statusTarget.id, !statusTarget.isActive);
      toast.success(updated.isActive ? "User reactivated." : "User deactivated.");
      userUpdated(updated);
    } catch (error) {
      toast.error(errorMessage(error));
    } finally {
      setStatusBusy(false);
      setStatusTarget(null);
    }
  };

  const renderRows = () => {
    if (list.initialLoading) {
      return Array.from({ length: 5 }, (_, index) => (
        <TR key={index}>
          <TD colSpan={COLUMNS}>
            <Skeleton className="h-9 w-full" />
          </TD>
        </TR>
      ));
    }

    if (!list.data && list.error) {
      return (
        <TableEmpty colSpan={COLUMNS}>
          <ErrorState
            title={activeTab === "team" ? "Staff couldn’t be loaded" : "Accounts couldn’t be loaded"}
            description={list.error}
            onRetry={list.reload}
            retrying={list.loading}
          />
        </TableEmpty>
      );
    }

    if (!items.length) {
      return filtersActive ? (
        <TableEmpty
          colSpan={COLUMNS}
          icon={SearchX}
          title="No one matches your filters"
          description="Try a different role, status or search."
          action={
            <Button size="sm" variant="outline" onClick={clearFilters}>
              Clear filters
            </Button>
          }
        />
      ) : (
        <TableEmpty
          colSpan={COLUMNS}
          icon={Users}
          title="No accounts yet"
          description={canManage ? "Invite someone to give them access to the admin." : undefined}
        />
      );
    }

    return items.map((user) => {
      const self = user.id === admin.id;
      const areas = user.profile?.areaCoverage ?? [];
      return (
        <TR
          key={user.id}
          interactive={activeTab === "team"}
          selected={activeTab === "team" && profileOpen && profileId === user.id}
          onClick={activeTab === "team" ? () => openProfile(user) : undefined}
        >
          <TD className="max-w-[260px]">
            <div className="flex items-center gap-3">
              <Avatar name={user.name || user.email} src={user.profile?.avatarUrl} size="sm" decorative />
              <div className="min-w-0">
                <p className="truncate font-medium text-slate-900">
                  {user.name || "Unnamed"}
                  {self && <span className="ml-1.5 text-xs font-normal text-slate-500">(you)</span>}
                </p>
                <p className="truncate text-sm text-slate-500">{user.email}</p>
              </div>
            </div>
          </TD>
          <TD className="whitespace-nowrap">
            <Badge tone={normalizeRole(user.role) ? "brand" : "neutral"}>{roleLabel(user.role)}</Badge>
          </TD>
          <TD>
            <Badge tone={user.isActive ? "success" : "neutral"} dot>
              {user.isActive ? "Active" : "Deactivated"}
            </Badge>
          </TD>
          <TD className="hidden whitespace-nowrap md:table-cell">{user.phone || "—"}</TD>
          {activeTab === "team" ? (
            <TD className="hidden max-w-[220px] lg:table-cell">
              {areas.length ? <span className="line-clamp-2 text-sm">{areas.join(", ")}</span> : "—"}
            </TD>
          ) : (
            <TD className="hidden whitespace-nowrap lg:table-cell">
              {user.lastLoginAt ? formatDateTime(user.lastLoginAt) : "Never"}
            </TD>
          )}
          <TD align="right">
            {activeTab === "team" ? (
              <Button
                variant="outline"
                size="sm"
                onClick={(event) => {
                  event.stopPropagation();
                  openProfile(user);
                }}
              >
                Profile<span className="sr-only"> for {user.name || user.email}</span>
              </Button>
            ) : (
              canManage && (
                <div className="flex flex-col items-end gap-1">
                  <div className="flex flex-wrap justify-end gap-2">
                    <Button variant="outline" size="sm" onClick={() => setEditing(user)}>
                      Edit<span className="sr-only"> {user.name || user.email}</span>
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={self}
                      aria-describedby={self ? `self-${user.id}` : undefined}
                      onClick={() => setRoleTarget(user)}
                    >
                      Change role<span className="sr-only"> for {user.name || user.email}</span>
                    </Button>
                    <Button
                      variant={user.isActive ? "soft-danger" : "secondary"}
                      size="sm"
                      disabled={self}
                      aria-describedby={self ? `self-${user.id}` : undefined}
                      onClick={() => setStatusTarget(user)}
                    >
                      {user.isActive ? "Deactivate" : "Reactivate"}
                      <span className="sr-only"> {user.name || user.email}</span>
                    </Button>
                  </div>
                  {self && (
                    <p id={`self-${user.id}`} className="text-xs text-slate-500">
                      You can’t change your own role or status.
                    </p>
                  )}
                </div>
              )
            )}
          </TD>
        </TR>
      );
    });
  };

  return (
    <AdminPage
      module="staff"
      previewAreas={["users", "staff"]}
      error={list.data ? list.error : ""}
      onRetry={list.reload}
      retrying={list.loading}
      actions={
        canManage && (
          <Button icon={<UserPlus aria-hidden="true" />} onClick={() => setInviteOpen(true)}>
            Invite user
          </Button>
        )
      }
    >
      <Table
        aria-label={activeTab === "team" ? "Team members" : "Admin accounts"}
        header={
          <ListCardHeader
            title={activeTab === "team" ? "Team" : "Accounts"}
            count={list.data ? total : undefined}
            description={
              activeTab === "team"
                ? "Open a profile to see coverage, certifications and open jobs."
                : "Sign-in accounts for the admin. Roles decide what each person can do."
            }
          >
            <div className="flex flex-col gap-3">
              {tabItems.length > 1 && (
                <Tabs
                  aria-label="Staff views"
                  value={activeTab}
                  onChange={(value) => {
                    setTab(value);
                    setPage(1);
                  }}
                  items={tabItems}
                  className="w-full sm:w-auto"
                />
              )}
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,2fr)_auto] lg:items-end">
                <Field label="Role">
                  <Select
                    value={role}
                    options={roleFilterOptions}
                    onChange={(event) => {
                      setRole(event.target.value as Role | "");
                      setPage(1);
                    }}
                  />
                </Field>
                <Field label="Status">
                  <Select
                    value={active}
                    options={activeOptions}
                    onChange={(event) => {
                      setActive(event.target.value as ActiveFilter);
                      setPage(1);
                    }}
                  />
                </Field>
                <Field label="Search" className="sm:col-span-2 lg:col-span-1">
                  <SearchInput
                    placeholder="Search by name or email"
                    value={search}
                    maxLength={100}
                    onChange={(event) => {
                      setSearch(event.target.value);
                      setPage(1);
                    }}
                  />
                </Field>
                {filtersActive && (
                  <Button variant="ghost" onClick={clearFilters}>
                    Clear
                  </Button>
                )}
              </div>
            </div>
          </ListCardHeader>
        }
        footer={
          list.data && (
            <Pagination page={page} totalItems={total} pageSize={PAGE_SIZE} onChange={setPage} itemLabel="people" />
          )
        }
      >
        <THead>
          <TH>Name</TH>
          <TH>Role</TH>
          <TH>Status</TH>
          <TH className="hidden md:table-cell">Phone</TH>
          <TH className="hidden lg:table-cell">{activeTab === "team" ? "Areas" : "Last sign-in"}</TH>
          <TH align="right" srOnly>
            Actions
          </TH>
        </THead>
        <TBody>{renderRows()}</TBody>
      </Table>

      <StaffProfileDrawer
        staffId={profileId}
        open={profileOpen}
        onClose={() => setProfileOpen(false)}
        onSaved={userUpdated}
      />

      {canManage && (
        <>
          <InviteUserDialog
            open={inviteOpen}
            onClose={() => setInviteOpen(false)}
            onCreated={() => {
              setTab("accounts");
              accounts.reload();
            }}
          />
          <EditUserDialog user={editing} onClose={() => setEditing(null)} onSaved={userUpdated} />
          <RoleDialog user={roleTarget} onClose={() => setRoleTarget(null)} onSaved={userUpdated} />
        </>
      )}

      <ConfirmDialog
        open={Boolean(statusTarget)}
        onClose={() => setStatusTarget(null)}
        onConfirm={toggleActive}
        loading={statusBusy}
        loadingText={statusTarget?.isActive ? "Deactivating…" : "Reactivating…"}
        tone={statusTarget?.isActive ? "danger" : "warning"}
        title={statusTarget?.isActive ? "Deactivate account" : "Reactivate account"}
        description={
          statusTarget?.isActive
            ? `${statusTarget.name || statusTarget.email} will be signed out everywhere and won’t be able to sign in until the account is reactivated.`
            : `${statusTarget?.name || statusTarget?.email || "This person"} will be able to sign in again with their current role.`
        }
        confirmLabel={statusTarget?.isActive ? "Deactivate" : "Reactivate"}
      />
    </AdminPage>
  );
}
