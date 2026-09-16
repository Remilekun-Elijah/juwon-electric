"use client";

import { useMemo, useState } from "react";
import { Mails, SearchX, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useAdmin, useAdminQuery } from "@/components/admin/AdminContext";
import { AdminPage } from "@/components/admin/AdminPage";
import {
  Alert,
  Button,
  ConfirmDialog,
  ErrorState,
  ListCardHeader,
  Pagination,
  SearchInput,
  Skeleton,
  StatusBadge,
  Switch,
  TBody,
  TD,
  TH,
  THead,
  TR,
  Table,
  TableEmpty,
  Tabs,
  paginate,
} from "@/components/admin/kit";
import { formatDate, getRecordDate, matchesQuery } from "@/lib/admin/format";
import { ApiError, adminFetch } from "@/lib/api/admin";
import { NEWSLETTER_STATUSES, pickAllowed } from "./leadStatus";

const PAGE_SIZE = 20;

export type Subscriber = {
  id: string;
  emailAddress?: string;
  name?: string;
  source?: string;
  status?: string;
  note?: string;
  isActive?: boolean;
  createdAt?: string;
  receivedAt?: string;
  [key: string]: unknown;
};

type ActiveStatus = "active" | "inactive";

const statusOptions: { value: ActiveStatus; label: string }[] = [
  { value: "active", label: "Active" },
  { value: "inactive", label: "Inactive" },
];

const getStatus = (item: Subscriber): ActiveStatus => (item.isActive === false ? "inactive" : "active");

const headers = [
  { label: "Subscriber" },
  { label: "Source", className: "hidden md:table-cell" },
  { label: "Subscribed", className: "hidden md:table-cell" },
  { label: "Status" },
];
const colSpan = headers.length + 1;

const loadSubscribers = async () => {
  const response = await adminFetch<Subscriber[]>("/newsletter");
  return Array.isArray(response.data) ? response.data : [];
};

const describeDelete = (item: Subscriber) =>
  `Are you sure you want to delete “${item.emailAddress || "this subscriber"}”? Their subscription record will be permanently removed. To only stop emails, turn their subscription off instead. This can’t be undone.`;

/** Newsletter subscribers (port of the Vite admin Operations `newsletter` view). */
export function Newsletter() {
  const { can } = useAdmin();
  const canWrite = can("leads:write");
  const q = useAdminQuery("newsletter", loadSubscribers);

  const [updatingId, setUpdatingId] = useState("");
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [pendingDelete, setPendingDelete] = useState<Subscriber | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const firstLoad = q.data === undefined;
  const items = useMemo(() => q.data ?? [], [q.data]);

  const statusCounts = useMemo(
    () =>
      items.reduce<Record<string, number>>((counts, item) => {
        const status = getStatus(item);
        return { ...counts, [status]: (counts[status] || 0) + 1 };
      }, {}),
    [items]
  );

  const visibleItems = useMemo(
    () =>
      items.filter(
        (item) =>
          (statusFilter === "all" || getStatus(item) === statusFilter) &&
          matchesQuery(query, item.emailAddress, item.name, item.source)
      ),
    [items, statusFilter, query]
  );

  const pageData = paginate(visibleItems, page, PAGE_SIZE);
  const filtersActive = Boolean(query.trim()) || statusFilter !== "all";

  const toggleSubscriber = async (item: Subscriber, isActive: boolean) => {
    setError("");
    setUpdatingId(item.id);
    try {
      // The update endpoint overwrites these fields with defaults when omitted.
      await adminFetch<unknown>(`/newsletter/${encodeURIComponent(item.id)}`, {
        method: "PUT",
        body: {
          status: pickAllowed(item.status || "new", NEWSLETTER_STATUSES),
          note: typeof item.note === "string" ? item.note : undefined,
          isActive,
        },
      });
      toast.success(isActive ? `${item.emailAddress} resubscribed` : `${item.emailAddress} unsubscribed`);
      q.reload();
    } catch (caught) {
      const message = `Couldn’t update ${item.name || item.emailAddress || "this subscriber"}. ${caught instanceof Error ? caught.message : ""}`.trim();
      setError(message);
      toast.error(message);
    } finally {
      setUpdatingId("");
    }
  };

  const requestDelete = (item: Subscriber) => {
    setPendingDelete(item);
    setConfirmOpen(true);
  };

  const removeItem = async () => {
    if (!pendingDelete) return;
    const item = pendingDelete;
    setDeleting(true);
    setError("");
    try {
      await adminFetch<unknown>(`/newsletter/${encodeURIComponent(item.id)}`, { method: "DELETE" });
    } catch (caught) {
      // 404: already gone, so drop the row anyway.
      if (!(caught instanceof ApiError && caught.status === 404)) {
        setConfirmOpen(false);
        setDeleting(false);
        const message = `Couldn’t delete ${item.name || item.emailAddress || "this subscriber"}. ${caught instanceof Error ? caught.message : ""}`.trim();
        setError(message);
        toast.error(message);
        return;
      }
    }
    q.setData((current) => current?.filter((subscriber) => subscriber.id !== item.id));
    toast.success("Subscriber deleted");
    setConfirmOpen(false);
    setDeleting(false);
  };

  const clearFilters = () => {
    setQuery("");
    setStatusFilter("all");
    setPage(1);
  };

  const tabItems = [
    { value: "all", label: "All", count: firstLoad ? undefined : items.length },
    ...statusOptions.map((option) => ({
      value: option.value as string,
      label: option.label,
      count: firstLoad ? undefined : statusCounts[option.value] || 0,
    })),
  ];

  const renderRows = () => {
    if (firstLoad && q.error) {
      return (
        <TableEmpty colSpan={colSpan}>
          <ErrorState
            title="Subscribers couldn’t be loaded"
            description={q.error}
            onRetry={q.reload}
            retrying={q.loading}
          />
        </TableEmpty>
      );
    }

    if (firstLoad) {
      return Array.from({ length: 5 }, (_, index) => (
        <TR key={index}>
          <TD colSpan={colSpan}>
            <Skeleton className="h-9 w-full" />
          </TD>
        </TR>
      ));
    }

    if (!items.length) {
      return (
        <TableEmpty
          colSpan={colSpan}
          icon={Mails}
          title="No subscribers yet"
          description="People who sign up for updates in the site footer will appear here."
        />
      );
    }

    if (!visibleItems.length) {
      return (
        <TableEmpty
          colSpan={colSpan}
          icon={SearchX}
          title="No subscribers match your filters"
          description="Try a different search or status."
          action={
            <Button size="sm" variant="outline" onClick={clearFilters}>
              Clear filters
            </Button>
          }
        />
      );
    }

    return pageData.items.map((item) => (
      <TR key={item.id}>
        <TD className="max-w-[280px]">
          <p className="truncate font-medium text-slate-900">{item.emailAddress}</p>
          {item.name && <p className="truncate text-sm text-slate-500">{item.name}</p>}
        </TD>
        <TD className="hidden whitespace-nowrap md:table-cell">
          {item.source ? item.source.charAt(0).toUpperCase() + item.source.slice(1) : "—"}
        </TD>
        <TD className="hidden whitespace-nowrap md:table-cell">{formatDate(getRecordDate(item))}</TD>
        <TD>
          <StatusBadge type="newsletter" status={item.isActive !== false} />
        </TD>
        <TD align="right">
          {canWrite && (
            <div className="flex items-center justify-end gap-2">
              <Switch
                aria-label={`Subscribed: ${item.emailAddress}`}
                checked={item.isActive !== false}
                disabled={updatingId === item.id}
                onChange={(value) => void toggleSubscriber(item, value)}
              />
              <Button
                variant="ghost"
                size="icon-sm"
                className="hover:bg-red-50 hover:text-red-700"
                aria-label={`Delete ${item.name || item.emailAddress || "subscriber"}`}
                title="Delete"
                disabled={updatingId === item.id}
                onClick={() => requestDelete(item)}
              >
                <Trash2 aria-hidden="true" />
              </Button>
            </div>
          )}
        </TD>
      </TR>
    ));
  };

  return (
    <AdminPage module="newsletter" error={firstLoad ? undefined : q.error} onRetry={q.reload} retrying={q.loading}>
      {error && (
        <Alert tone="danger" onDismiss={() => setError("")}>
          {error}
        </Alert>
      )}

      <Table
        aria-label="All subscribers"
        header={
          <ListCardHeader title="All subscribers" count={firstLoad ? undefined : items.length}>
            <div className="flex flex-col gap-3 xl:flex-row xl:items-center">
              <Tabs
                aria-label="Filter subscribers by status"
                value={statusFilter}
                onChange={(value) => {
                  setStatusFilter(value);
                  setPage(1);
                }}
                items={tabItems}
                className="w-full sm:w-auto"
              />
              <div className="flex gap-2 xl:ml-auto xl:w-[320px]">
                <SearchInput
                  aria-label="Search subscribers"
                  placeholder="Search subscribers"
                  value={query}
                  onChange={(event) => {
                    setQuery(event.target.value);
                    setPage(1);
                  }}
                />
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
          !firstLoad && (
            <Pagination
              page={pageData.page}
              totalItems={visibleItems.length}
              pageSize={PAGE_SIZE}
              onChange={setPage}
              itemLabel="subscribers"
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
          <TH align="right" srOnly>
            Actions
          </TH>
        </THead>
        <TBody>{renderRows()}</TBody>
      </Table>

      <ConfirmDialog
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        onConfirm={() => void removeItem()}
        loading={deleting}
        loadingText="Deleting…"
        title="Delete subscriber"
        description={pendingDelete ? describeDelete(pendingDelete) : ""}
        confirmLabel="Delete subscriber"
        confirmIcon={<Trash2 aria-hidden="true" />}
      />
    </AdminPage>
  );
}
