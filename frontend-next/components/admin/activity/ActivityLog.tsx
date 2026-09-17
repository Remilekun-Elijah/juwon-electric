"use client";

import { useState } from "react";
import { History, SearchX, X } from "lucide-react";
import { useAdminQuery } from "@/components/admin/AdminContext";
import { AdminPage } from "@/components/admin/AdminPage";
import {
  Badge,
  Button,
  ErrorState,
  ListCardHeader,
  Pagination,
  Select,
  Skeleton,
  TBody,
  TD,
  TH,
  THead,
  TR,
  Table,
  TableEmpty,
} from "@/components/ui";
import { auditActionOptions, auditEntityOptions, getAuditActionLabel, getAuditActionTone, getAuditEntityLabel } from "@/lib/admin/audit";
import { formatDateTime } from "@/lib/admin/format";
import { getAuditLogs } from "@/lib/api/admin";
import type { AuditLogEntry } from "@/lib/api/types";

const PAGE_SIZE = 50;

const actionFilterOptions = [{ value: "", label: "All actions" }, ...auditActionOptions];
const entityFilterOptions = [{ value: "", label: "All record types" }, ...auditEntityOptions];

const headers = [
  { label: "Time" },
  { label: "Admin", className: "hidden md:table-cell" },
  { label: "Action" },
  { label: "Record", className: "hidden lg:table-cell" },
  { label: "Summary", className: "hidden sm:table-cell" },
];
const colSpan = headers.length;

type AdminFilter = { id: string; email: string };

const changesOf = (item: AuditLogEntry) =>
  Array.isArray(item.changes) ? item.changes.filter((change): change is string => typeof change === "string") : [];

/** Admin audit log: GET /admin/audit-logs with server-side filters and pagination. */
export function ActivityLog() {
  const [page, setPage] = useState(1);
  const [action, setAction] = useState("");
  const [entity, setEntity] = useState("");
  const [adminFilter, setAdminFilter] = useState<AdminFilter | null>(null);

  const params = { page, limit: PAGE_SIZE, action, entity, adminId: adminFilter?.id };
  const q = useAdminQuery(`audit-logs|${JSON.stringify(params)}`, async () => {
    const data = (await getAuditLogs(params)).data;
    return {
      items: Array.isArray(data?.items) ? data.items : [],
      total: Number(data?.total) || 0,
      page: Number(data?.page) || page,
      limit: Number(data?.limit) || PAGE_SIZE,
    };
  });

  const result = q.data;
  const loading = q.loading;
  const error = loading ? "" : q.error;
  const filtersActive = Boolean(action || entity || adminFilter);
  const clearFilters = () => {
    setAction("");
    setEntity("");
    setAdminFilter(null);
    setPage(1);
  };

  const items = result?.items || [];

  const renderRows = () => {
    if (error) {
      return (
        <TableEmpty colSpan={colSpan}>
          <ErrorState title="Activity couldn’t be loaded" description={error} onRetry={q.reload} retrying={loading} />
        </TableEmpty>
      );
    }

    if (loading && !result) {
      return Array.from({ length: 6 }, (_, index) => (
        <TR key={index}>
          <TD colSpan={colSpan}>
            <Skeleton className="h-9 w-full" />
          </TD>
        </TR>
      ));
    }

    if (!items.length) {
      return filtersActive ? (
        <TableEmpty
          colSpan={colSpan}
          icon={SearchX}
          title="No activity matches your filters"
          description="Try a different action, record type or admin."
          action={
            <Button size="sm" variant="outline" onClick={clearFilters}>
              Clear filters
            </Button>
          }
        />
      ) : (
        <TableEmpty
          colSpan={colSpan}
          icon={History}
          title="No activity yet"
          description="Sign-ins and changes made in the admin will be listed here."
        />
      );
    }

    return items.map((item, index) => {
      const changes = changesOf(item);
      const adminId = item.adminId;
      const filterByAdmin =
        adminId && !adminFilter
          ? () => {
              setAdminFilter({ id: adminId, email: item.adminEmail || adminId });
              setPage(1);
            }
          : undefined;
      return (
        <TR key={item.id || `${item.createdAt}-${index}`} className={loading ? "opacity-60" : undefined}>
          <TD className="whitespace-nowrap align-top tabular-nums">{formatDateTime(item.createdAt)}</TD>
          <TD className="hidden max-w-[220px] align-top md:table-cell">
            {filterByAdmin ? (
              <button
                type="button"
                className="max-w-full truncate text-left text-slate-900 underline-offset-4 hover:text-brand-700 hover:underline"
                title="Show only this admin’s activity"
                onClick={filterByAdmin}
              >
                {item.adminEmail || "—"}
              </button>
            ) : (
              <p className="truncate text-slate-900">{item.adminEmail || "—"}</p>
            )}
          </TD>
          <TD className="align-top">
            <Badge tone={getAuditActionTone(item.action)}>{getAuditActionLabel(item.action)}</Badge>
            <p className="mt-1 truncate text-xs text-slate-500 md:hidden">{item.adminEmail}</p>
          </TD>
          <TD className="hidden max-w-[220px] align-top lg:table-cell">
            {item.entity ? (
              <>
                <p className="text-slate-900">{getAuditEntityLabel(item.entity)}</p>
                {item.entityId && <p className="truncate font-mono text-xs text-slate-500">{item.entityId}</p>}
              </>
            ) : (
              "—"
            )}
          </TD>
          <TD className="hidden max-w-[420px] align-top sm:table-cell">
            <p className="break-words text-slate-700">{item.summary || "—"}</p>
            {changes.length > 0 && (
              <p className="mt-1 break-words text-xs text-slate-500">Changed: {changes.join(", ")}</p>
            )}
          </TD>
        </TR>
      );
    });
  };

  return (
    <AdminPage module="activity">
      <Table
        aria-label="Admin activity"
        aria-busy={loading || undefined}
        header={
          <ListCardHeader title="All activity" count={result ? result.total : undefined}>
            <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
              <Select
                aria-label="Filter by action"
                className="sm:w-[240px]"
                value={action}
                options={actionFilterOptions}
                onChange={(event) => {
                  setAction(event.target.value);
                  setPage(1);
                }}
              />
              <Select
                aria-label="Filter by record type"
                className="sm:w-[200px]"
                value={entity}
                options={entityFilterOptions}
                onChange={(event) => {
                  setEntity(event.target.value);
                  setPage(1);
                }}
              />
              {adminFilter && (
                <Badge tone="brand" className="max-w-full gap-1 self-start sm:self-center">
                  <span className="truncate">Admin: {adminFilter.email}</span>
                  <button
                    type="button"
                    className="-mr-1 rounded-full p-0.5 hover:bg-brand-100"
                    aria-label={`Remove admin filter ${adminFilter.email}`}
                    onClick={() => {
                      setAdminFilter(null);
                      setPage(1);
                    }}
                  >
                    <X aria-hidden="true" className="h-3 w-3" />
                  </button>
                </Badge>
              )}
              {filtersActive && (
                <Button variant="ghost" onClick={clearFilters}>
                  Clear
                </Button>
              )}
            </div>
          </ListCardHeader>
        }
        footer={
          result &&
          !error && (
            <Pagination
              page={result.page}
              totalItems={result.total}
              pageSize={result.limit}
              onChange={setPage}
              itemLabel="entries"
            />
          )
        }
      >
        <THead>
          {headers.map((header) => (
            <TH key={header.label} className={header.className}>
              {header.label}
            </TH>
          ))}
        </THead>
        <TBody>{renderRows()}</TBody>
      </Table>
    </AdminPage>
  );
}
