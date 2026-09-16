/* eslint-disable react/prop-types */
import { useCallback, useEffect, useRef, useState } from "react";
import { History, SearchX } from "lucide-react";
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
} from "../../../components/ui";
import { adminRequest } from "../../../utils/api";
import {
  auditActionOptions,
  auditEntityOptions,
  getAuditActionLabel,
  getAuditEntityLabel,
} from "../constants/adminConstants";
import { formatDateTime } from "../utils/adminFormatters";
import AdminPage from "./AdminPage";

const PAGE_SIZE = 50;

const actionFilterOptions = [{ value: "", label: "All actions" }, ...auditActionOptions];
const entityFilterOptions = [{ value: "", label: "All record types" }, ...auditEntityOptions];

const actionTone = (action = "") => {
  if (action === "auth.login_failed" || action.endsWith(".delete")) return "danger";
  if (action.endsWith(".create")) return "success";
  if (action.startsWith("auth.")) return "info";
  return "neutral";
};

const headers = [
  { label: "Time" },
  { label: "Admin", className: "hidden md:table-cell" },
  { label: "Action" },
  { label: "Record", className: "hidden lg:table-cell" },
  { label: "Summary", className: "hidden sm:table-cell" },
];

/** Admin audit log: GET /admin/audit-logs with server-side filters and pagination. */
const ActivityLog = ({ refreshKey = 0, onUnauthorized }) => {
  const [page, setPage] = useState(1);
  const [action, setAction] = useState("");
  const [entity, setEntity] = useState("");
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [retryKey, setRetryKey] = useState(0);
  const requestId = useRef(0);

  useEffect(() => {
    const currentRequest = ++requestId.current;
    const query = new URLSearchParams({ page: String(page), limit: String(PAGE_SIZE) });
    if (action) query.set("action", action);
    if (entity) query.set("entity", entity);

    setLoading(true);
    setError("");
    adminRequest(`/audit-logs?${query}`)
      .then((response) => {
        if (currentRequest !== requestId.current) return;
        const data = response.data || {};
        setResult({
          items: Array.isArray(data.items) ? data.items : [],
          total: Number(data.total) || 0,
          page: Number(data.page) || page,
          limit: Number(data.limit) || PAGE_SIZE,
        });
      })
      .catch((event) => {
        if (currentRequest !== requestId.current) return;
        if (event.status === 401) {
          onUnauthorized?.();
          return;
        }
        setError(event.message || "Couldn’t load activity.");
      })
      .finally(() => {
        if (currentRequest === requestId.current) setLoading(false);
      });
  }, [page, action, entity, refreshKey, retryKey, onUnauthorized]);

  const retry = useCallback(() => setRetryKey((key) => key + 1), []);
  const filtersActive = Boolean(action || entity);
  const clearFilters = () => {
    setAction("");
    setEntity("");
    setPage(1);
  };

  const items = result?.items || [];
  const colSpan = headers.length;

  const renderRows = () => {
    if (error && !loading) {
      return (
        <TableEmpty colSpan={colSpan}>
          <ErrorState title="Activity couldn’t be loaded" description={error} onRetry={retry} retrying={loading} />
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
          description="Try a different action or record type."
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

    return items.map((item, index) => (
      <TR key={item.id || `${item.createdAt}-${index}`} className={loading ? "opacity-60" : undefined}>
        <TD className="whitespace-nowrap align-top tabular-nums">{formatDateTime(item.createdAt)}</TD>
        <TD className="hidden max-w-[220px] align-top md:table-cell">
          <p className="truncate text-slate-900">{item.adminEmail || "—"}</p>
        </TD>
        <TD className="align-top">
          <Badge tone={actionTone(item.action)}>{getAuditActionLabel(item.action)}</Badge>
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
          {Array.isArray(item.changes) && item.changes.length > 0 && (
            <p className="mt-1 break-words text-xs text-slate-500">Changed: {item.changes.join(", ")}</p>
          )}
        </TD>
      </TR>
    ));
  };

  return (
    <AdminPage module="activity" showLoadError={false}>
      <Table
        aria-label="Admin activity"
        aria-busy={loading || undefined}
        header={
          <ListCardHeader title="All activity" count={result ? result.total : undefined}>
            <div className="flex flex-col gap-3 sm:flex-row">
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
};

export default ActivityLog;
