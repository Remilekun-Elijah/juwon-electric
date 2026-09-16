"use client";

import { useEffect, useMemo, useState } from "react";
import { MessageSquareText, SearchX, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useAdmin, useAdminQuery } from "@/components/admin/AdminContext";
import { AdminPage } from "@/components/admin/AdminPage";
import {
  Alert,
  Badge,
  Button,
  ConfirmDialog,
  Drawer,
  ErrorState,
  ListCardHeader,
  Pagination,
  SearchInput,
  Select,
  Skeleton,
  StatusBadge,
  TBody,
  TD,
  TH,
  THead,
  TR,
  Table,
  TableEmpty,
  Tabs,
  getStatusMeta,
  paginate,
} from "@/components/admin/kit";
import { formatDate, getRecordDate, matchesQuery } from "@/lib/admin/format";
import type { Contact } from "@/lib/admin/useAdminNotifications";
import { ApiError, adminFetch } from "@/lib/api/admin";
import { ContactDetails } from "./ContactDetails";
import { CONTACT_STATUSES, contactStatusOptions, getContactStatus, pickAllowed } from "./leadStatus";

const PAGE_SIZE = 20;

const headers = [
  { label: "From" },
  { label: "Message", className: "hidden lg:table-cell" },
  { label: "Received", className: "hidden md:table-cell" },
  { label: "Status" },
];
const colSpan = headers.length + 1;

const loadContacts = async () => {
  const response = await adminFetch<Contact[]>("/contacts");
  return Array.isArray(response.data) ? response.data : [];
};

const describeDelete = (item: Contact) =>
  `Are you sure you want to delete the message from “${item.name || item.emailAddress || "this sender"}”? The message and its reply history will be permanently removed. This can’t be undone.`;

/** Messages from the contact form (port of the Vite admin Operations `contacts` view). */
export function Contacts() {
  const { can, notifications, refreshKey } = useAdmin();
  const { poll, markSeen, unread } = notifications;
  const canWrite = can("leads:write");
  const q = useAdminQuery("contacts", loadContacts);

  const [removedIds, setRemovedIds] = useState<Set<string>>(() => new Set());
  const [selectedContactId, setSelectedContactId] = useState<string | null>(null);
  const [contactDrawerOpen, setContactDrawerOpen] = useState(false);
  const [updatingId, setUpdatingId] = useState("");
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [pendingDelete, setPendingDelete] = useState<Contact | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // The header refresh reloads the query; refresh the polled list (and unread markers) with it.
  useEffect(() => {
    if (refreshKey) void poll();
  }, [refreshKey, poll]);

  const source = notifications.contacts ?? q.data;
  const firstLoad = source === undefined;
  const items = useMemo(() => (source ?? []).filter((item) => !removedIds.has(item.id)), [source, removedIds]);
  const selectedContact = items.find((item) => item.id === selectedContactId) || null;

  const statusCounts = useMemo(
    () =>
      items.reduce<Record<string, number>>((counts, item) => {
        const status = getContactStatus(item);
        return { ...counts, [status]: (counts[status] || 0) + 1 };
      }, {}),
    [items]
  );

  const visibleItems = useMemo(
    () =>
      items.filter(
        (item) =>
          (statusFilter === "all" || getContactStatus(item) === statusFilter) &&
          matchesQuery(query, item.name, item.emailAddress, item.phoneNumber, item.message)
      ),
    [items, statusFilter, query]
  );

  const pageData = paginate(visibleItems, page, PAGE_SIZE);
  const filtersActive = Boolean(query.trim()) || statusFilter !== "all";

  const refreshLists = async () => {
    q.reload();
    await poll();
  };

  const updateStatus = async (item: Contact, status: string) => {
    setError("");
    setUpdatingId(item.id);
    try {
      // The update endpoint overwrites these fields with defaults when omitted.
      await adminFetch<unknown>(`/contacts/${encodeURIComponent(item.id)}`, {
        method: "PUT",
        body: {
          status: pickAllowed(status, CONTACT_STATUSES),
          note: typeof item.note === "string" ? item.note : undefined,
        },
      });
      toast.success(
        `${item.name || "Record"} marked as ${getStatusMeta("contact", status).label.toLowerCase()}`
      );
      await refreshLists();
    } catch (caught) {
      const message = `Couldn’t update ${item.name || item.emailAddress || "this message"}. ${caught instanceof Error ? caught.message : ""}`.trim();
      setError(message);
      // Also toast so the failure is visible while the detail drawer covers the page.
      toast.error(message);
    } finally {
      setUpdatingId("");
    }
  };

  const requestDelete = (item: Contact) => {
    setPendingDelete(item);
    setConfirmOpen(true);
  };

  const removeItem = async () => {
    if (!pendingDelete) return;
    const item = pendingDelete;
    setDeleting(true);
    setError("");
    try {
      await adminFetch<unknown>(`/contacts/${encodeURIComponent(item.id)}`, { method: "DELETE" });
    } catch (caught) {
      // 404: already gone, so drop the row anyway.
      if (!(caught instanceof ApiError && caught.status === 404)) {
        setConfirmOpen(false);
        setDeleting(false);
        const message = `Couldn’t delete ${item.name || item.emailAddress || "this message"}. ${caught instanceof Error ? caught.message : ""}`.trim();
        setError(message);
        toast.error(message);
        return;
      }
    }
    if (selectedContactId === item.id) setContactDrawerOpen(false);
    setRemovedIds((current) => new Set(current).add(item.id));
    q.setData((current) => current?.filter((contact) => contact.id !== item.id));
    toast.success("Message deleted");
    setConfirmOpen(false);
    setDeleting(false);
    void refreshLists();
  };

  const openContact = (item: Contact) => {
    markSeen("contacts", item);
    setSelectedContactId(item.id);
    setContactDrawerOpen(true);
  };

  const clearFilters = () => {
    setQuery("");
    setStatusFilter("all");
    setPage(1);
  };

  const tabItems = [
    { value: "all", label: "All", count: firstLoad ? undefined : items.length },
    ...contactStatusOptions.map((option) => ({
      value: option.value as string,
      label: option.label,
      count: firstLoad ? undefined : statusCounts[option.value] || 0,
    })),
  ];

  const renderActions = (item: Contact) => (
    <div className="flex items-center justify-end gap-2" onClick={(event) => event.stopPropagation()}>
      {canWrite && (
        <Select
          aria-label={`Update status for ${item.name || "message"}`}
          className="hidden w-[140px] sm:block"
          selectClassName="h-8 text-xs"
          value={getContactStatus(item)}
          options={contactStatusOptions}
          disabled={updatingId === item.id}
          onChange={(event) => void updateStatus(item, event.target.value)}
        />
      )}
      <Button variant="outline" size="sm" onClick={() => openContact(item)}>
        Open
        <span className="sr-only"> {item.name}</span>
      </Button>
      {canWrite && (
        <Button
          variant="ghost"
          size="icon-sm"
          className="hover:bg-red-50 hover:text-red-700"
          aria-label={`Delete ${item.name || item.emailAddress || "message"}`}
          title="Delete"
          disabled={updatingId === item.id}
          onClick={(event) => {
            event.stopPropagation();
            requestDelete(item);
          }}
        >
          <Trash2 aria-hidden="true" />
        </Button>
      )}
    </div>
  );

  const renderRows = () => {
    if (firstLoad && q.error) {
      return (
        <TableEmpty colSpan={colSpan}>
          <ErrorState title="Messages couldn’t be loaded" description={q.error} onRetry={q.reload} retrying={q.loading} />
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
          icon={MessageSquareText}
          title="No messages yet"
          description="Enquiries from the contact form will appear here."
        />
      );
    }

    if (!visibleItems.length) {
      return (
        <TableEmpty
          colSpan={colSpan}
          icon={SearchX}
          title="No messages match your filters"
          description="Try a different search or status."
          action={
            <Button size="sm" variant="outline" onClick={clearFilters}>
              Clear filters
            </Button>
          }
        />
      );
    }

    return pageData.items.map((item) => {
      const unreadKind = unread.contacts.get(item.id) ?? null;
      return (
        <TR
          key={item.id}
          selected={contactDrawerOpen && selectedContactId === item.id}
          interactive
          onClick={() => openContact(item)}
        >
          <TD className="max-w-[240px]">
            <p className="flex items-center gap-2 font-medium text-slate-900">
              <span className="truncate">{item.name || "Unnamed"}</span>
              {unreadKind && (
                <Badge tone="brand" dot className="shrink-0">
                  {unreadKind === "reply" ? "New reply" : "New"}
                </Badge>
              )}
            </p>
            <p className="truncate text-sm text-slate-500">{item.emailAddress || item.phoneNumber}</p>
          </TD>
          <TD className="hidden max-w-[360px] lg:table-cell">
            <p className="line-clamp-2 text-sm text-slate-600">{item.message}</p>
          </TD>
          <TD className="hidden whitespace-nowrap md:table-cell">{formatDate(getRecordDate(item))}</TD>
          <TD>
            <StatusBadge type="contact" status={getContactStatus(item)} />
          </TD>
          <TD align="right">{renderActions(item)}</TD>
        </TR>
      );
    });
  };

  return (
    <AdminPage
      module="contacts"
      error={firstLoad ? undefined : q.error}
      onRetry={q.reload}
      retrying={q.loading}
    >
      {error && (
        <Alert tone="danger" onDismiss={() => setError("")}>
          {error}
        </Alert>
      )}

      <Table
        aria-label="All messages"
        header={
          <ListCardHeader title="All messages" count={firstLoad ? undefined : items.length}>
            <div className="flex flex-col gap-3 xl:flex-row xl:items-center">
              <Tabs
                aria-label="Filter messages by status"
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
                  aria-label="Search messages"
                  placeholder="Search messages"
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
              itemLabel="messages"
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

      <Drawer
        className="font-sans antialiased"
        open={contactDrawerOpen && Boolean(selectedContact)}
        onClose={() => setContactDrawerOpen(false)}
        size="lg"
        title={selectedContact?.name || "Message"}
        description={selectedContact ? `Sent ${formatDate(getRecordDate(selectedContact))}` : undefined}
      >
        <ContactDetails
          key={selectedContactId || "none"}
          contact={selectedContact}
          canWrite={canWrite}
          updating={Boolean(selectedContact) && updatingId === selectedContact?.id}
          onStatusChange={(contact, status) => void updateStatus(contact, status)}
          onSent={async () => {
            await refreshLists();
            setContactDrawerOpen(false);
          }}
        />
      </Drawer>

      <ConfirmDialog
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        onConfirm={() => void removeItem()}
        loading={deleting}
        loadingText="Deleting…"
        title="Delete message"
        description={pendingDelete ? describeDelete(pendingDelete) : ""}
        confirmLabel="Delete message"
        confirmIcon={<Trash2 aria-hidden="true" />}
      />
    </AdminPage>
  );
}
