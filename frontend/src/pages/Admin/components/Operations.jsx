/* eslint-disable react/prop-types */
import { useMemo, useRef, useState } from "react";
import { Mails, MessageSquareText, ReceiptText, SearchX, Trash2 } from "lucide-react";
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
  Switch,
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
  toast,
} from "../../../components/ui";
import { adminRequest } from "../../../utils/api";
import {
  CONTACT_STATUSES,
  NEWSLETTER_STATUSES,
  ORDER_STATUSES,
  PAYMENT_STATUSES,
  contactStatusOptions,
  orderStatusOptions,
} from "../constants/adminConstants";
import { formatCurrency, formatDate, getOrderRevenue, getRecordDate, matchesQuery } from "../utils/adminFormatters";
import AdminPage from "./AdminPage";
import ContactDetails from "./ContactDetails";
import OrderDetails from "./OrderDetails";
import { useAdmin } from "./adminContext";

const PAGE_SIZE = 20;

const normalizeOrderStatus = (status) => (["completed", "cancelled"].includes(status) ? status : "pending");

const config = {
  orders: {
    icon: ReceiptText,
    singular: "order",
    plural: "orders",
    listTitle: "All orders",
    emptyTitle: "No orders yet",
    emptyDescription: "Orders placed on the shop will show up here.",
    getStatus: (item) => normalizeOrderStatus(item.status),
    statusOptions: orderStatusOptions,
    search: (item) => [item.name, item.phoneNumber, item.emailAddress, item.deliveryAddress],
    deleteLabel: "Order",
    describeDelete: (item) =>
      `Are you sure you want to delete the order from “${item.name || "this customer"}”? Its customer, delivery and item details will be permanently removed. This can’t be undone.`,
  },
  contacts: {
    icon: MessageSquareText,
    singular: "message",
    plural: "messages",
    listTitle: "All messages",
    emptyTitle: "No messages yet",
    emptyDescription: "Enquiries from the contact form will appear here.",
    getStatus: (item) => item.status || "new",
    statusOptions: contactStatusOptions,
    search: (item) => [item.name, item.emailAddress, item.phoneNumber, item.message],
    deleteLabel: "Message",
    describeDelete: (item) =>
      `Are you sure you want to delete the message from “${item.name || item.emailAddress || "this sender"}”? The message and its reply history will be permanently removed. This can’t be undone.`,
  },
  newsletter: {
    icon: Mails,
    singular: "subscriber",
    plural: "subscribers",
    listTitle: "All subscribers",
    emptyTitle: "No subscribers yet",
    emptyDescription: "People who sign up for updates in the site footer will appear here.",
    getStatus: (item) => (item.isActive === false ? "inactive" : "active"),
    statusOptions: [
      { value: "active", label: "Active" },
      { value: "inactive", label: "Inactive" },
    ],
    search: (item) => [item.emailAddress, item.name, item.source],
    deleteLabel: "Subscriber",
    describeDelete: (item) =>
      `Are you sure you want to delete “${item.emailAddress || "this subscriber"}”? Their subscription record will be permanently removed. To only stop emails, turn their subscription off instead. This can’t be undone.`,
  },
};

// Only send enum values the API accepts; legacy stored values are left out rather than rejected.
const pickAllowed = (value, allowed) => (allowed.includes(value) ? value : undefined);
const statusEnums = { orders: ORDER_STATUSES, contacts: CONTACT_STATUSES, newsletter: NEWSLETTER_STATUSES };

const buildUpdateBody = (type, item, changes) => {
  const merged = {
    status: item.status,
    paymentStatus: item.paymentStatus,
    note: item.note,
    isActive: item.isActive,
    ...changes,
  };
  return {
    status: pickAllowed(merged.status, statusEnums[type] || []),
    paymentStatus: type === "orders" ? pickAllowed(merged.paymentStatus, PAYMENT_STATUSES) : undefined,
    note: typeof merged.note === "string" ? merged.note : undefined,
    isActive: typeof merged.isActive === "boolean" ? merged.isActive : undefined,
  };
};

const statusLabel = (type, status) =>
  getStatusMeta(type === "orders" ? "order" : type === "contacts" ? "contact" : "newsletter", status).label;

const Operations = ({ type, data, reload, invalidate, removeRecord, unread, onSeen }) => {
  const { loaded, error: loadError, refresh, loading } = useAdmin();
  const settings = config[type];
  const items = useMemo(() => data[type] || [], [data, type]);
  const firstLoad = !loaded[type];

  const [selectedOrder, setSelectedOrder] = useState(null);
  const [orderDrawerOpen, setOrderDrawerOpen] = useState(false);
  const [loadingOrder, setLoadingOrder] = useState(false);
  const [orderError, setOrderError] = useState("");
  const [selectedContactId, setSelectedContactId] = useState(null);
  const [contactDrawerOpen, setContactDrawerOpen] = useState(false);
  const [updatingId, setUpdatingId] = useState("");
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [pendingDelete, setPendingDelete] = useState(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const orderRequest = useRef(null);
  const selectedContact = items.find((item) => item.id === selectedContactId) || null;

  const statusCounts = useMemo(
    () =>
      items.reduce((counts, item) => {
        const status = settings.getStatus(item);
        return { ...counts, [status]: (counts[status] || 0) + 1 };
      }, {}),
    [items, settings]
  );

  const visibleItems = useMemo(
    () =>
      items.filter(
        (item) =>
          (statusFilter === "all" || settings.getStatus(item) === statusFilter) &&
          matchesQuery(query, ...settings.search(item))
      ),
    [items, statusFilter, query, settings]
  );

  const pageData = paginate(visibleItems, page, PAGE_SIZE);
  const filtersActive = Boolean(query.trim()) || statusFilter !== "all";

  const updateRecord = async (item, changes, successMessage) => {
    setError("");
    setUpdatingId(item.id);
    try {
      // The update endpoints overwrite these fields with defaults when omitted.
      await adminRequest(`/${type}/${item.id}`, {
        method: "PUT",
        body: JSON.stringify(buildUpdateBody(type, item, changes)),
      });
      if (type === "orders") {
        invalidate("dashboard");
        setSelectedOrder((order) => (order?.id === item.id ? { ...order, ...changes } : order));
      }
      toast.success(successMessage);
      await reload();
    } catch (event) {
      const message = `Couldn’t update ${item.name || item.emailAddress || `this ${settings.singular}`}. ${event.message}`;
      setError(message);
      // Also toast so the failure is visible while a detail drawer covers the page.
      toast.error(message);
    } finally {
      setUpdatingId("");
    }
  };

  const updateStatus = (item, status) =>
    updateRecord(item, { status }, `${item.name || "Record"} marked as ${statusLabel(type, status).toLowerCase()}`);

  const toggleSubscriber = (item, isActive) =>
    updateRecord(
      item,
      { status: item.status || "new", isActive },
      isActive ? `${item.emailAddress} resubscribed` : `${item.emailAddress} unsubscribed`
    );

  const requestDelete = (item) => {
    setPendingDelete(item);
    setConfirmOpen(true);
  };

  const removeItem = async () => {
    if (!pendingDelete) return;
    const item = pendingDelete;
    setDeleting(true);
    setError("");
    try {
      await adminRequest(`/${type}/${encodeURIComponent(item.id)}`, { method: "DELETE" });
    } catch (event) {
      // 404: already gone, so drop the row anyway.
      if (event.status !== 404) {
        setConfirmOpen(false);
        setDeleting(false);
        const message = `Couldn’t delete ${item.name || item.emailAddress || `this ${settings.singular}`}. ${event.message}`;
        setError(message);
        toast.error(message);
        return;
      }
    }
    if (type === "orders" && orderRequest.current === item.id) closeOrder();
    if (type === "contacts" && selectedContactId === item.id) setContactDrawerOpen(false);
    removeRecord?.(type, item.id);
    if (type !== "newsletter") invalidate?.("dashboard");
    toast.success(`${settings.deleteLabel} deleted`);
    setConfirmOpen(false);
    setDeleting(false);
  };

  const deleteButton = (item) => (
    <Button
      variant="ghost"
      size="icon-sm"
      className="hover:bg-red-50 hover:text-red-700"
      aria-label={`Delete ${item.name || item.emailAddress || settings.singular}`}
      title="Delete"
      disabled={updatingId === item.id}
      onClick={(event) => {
        event.stopPropagation();
        requestDelete(item);
      }}
    >
      <Trash2 aria-hidden="true" />
    </Button>
  );

  const unreadKind = (item) => {
    if (!unread) return null;
    if (unread instanceof Map) return unread.get(item.id) || null;
    return unread.has(item.id) ? "new" : null;
  };

  const openOrder = async (item) => {
    if (type !== "orders") return;
    onSeen?.("orders", item);
    orderRequest.current = item.id;
    setSelectedOrder(null);
    setOrderError("");
    setOrderDrawerOpen(true);
    setLoadingOrder(true);
    try {
      const response = await adminRequest(`/orders/${item.id}`);
      if (orderRequest.current === item.id) setSelectedOrder(response.data || item);
    } catch (event) {
      if (orderRequest.current === item.id) setOrderError(event.message);
    } finally {
      if (orderRequest.current === item.id) setLoadingOrder(false);
    }
  };

  const closeOrder = () => {
    orderRequest.current = null;
    setLoadingOrder(false);
    setOrderDrawerOpen(false);
  };

  const openContact = (item) => {
    if (type !== "contacts") return;
    onSeen?.("contacts", item);
    setSelectedContactId(item.id);
    setContactDrawerOpen(true);
  };

  const openItem = (item) => (type === "orders" ? openOrder(item) : openContact(item));
  const clickable = type !== "newsletter";

  const clearFilters = () => {
    setQuery("");
    setStatusFilter("all");
    setPage(1);
  };

  const tabItems = [
    { value: "all", label: "All", count: firstLoad ? undefined : items.length },
    ...settings.statusOptions.map((option) => ({
      value: option.value,
      label: option.label,
      count: firstLoad ? undefined : statusCounts[option.value] || 0,
    })),
  ];

  const headers =
    type === "orders"
      ? [
          { label: "Customer" },
          { label: "Date", className: "hidden md:table-cell" },
          { label: "Items", className: "hidden lg:table-cell" },
          { label: "Total", align: "right" },
          { label: "Status" },
        ]
      : type === "contacts"
      ? [
          { label: "From" },
          { label: "Message", className: "hidden lg:table-cell" },
          { label: "Received", className: "hidden md:table-cell" },
          { label: "Status" },
        ]
      : [
          { label: "Subscriber" },
          { label: "Source", className: "hidden md:table-cell" },
          { label: "Subscribed", className: "hidden md:table-cell" },
          { label: "Status" },
        ];
  const colSpan = headers.length + 1;

  const renderCells = (item) => {
    if (type === "orders") {
      const count = (item.order || []).reduce((sum, line) => sum + Number(line.quantity || 1), 0);
      return (
        <>
          <TD className="max-w-[240px]">
            <p className="flex items-center gap-2 font-medium text-slate-900">
              <span className="truncate">{item.name || "Unnamed customer"}</span>
              {unreadKind(item) && (
                <Badge tone="brand" dot className="shrink-0">
                  New
                </Badge>
              )}
            </p>
            <p className="truncate text-sm text-slate-500">{item.phoneNumber || item.deliveryAddress}</p>
          </TD>
          <TD className="hidden whitespace-nowrap md:table-cell">{formatDate(getRecordDate(item))}</TD>
          <TD className="hidden whitespace-nowrap tabular-nums lg:table-cell">{count}</TD>
          <TD align="right" className="whitespace-nowrap font-medium tabular-nums text-slate-900">
            {formatCurrency(getOrderRevenue(item))}
          </TD>
          <TD>
            <StatusBadge type="order" status={settings.getStatus(item)} />
          </TD>
        </>
      );
    }

    if (type === "contacts") {
      return (
        <>
          <TD className="max-w-[240px]">
            <p className="flex items-center gap-2 font-medium text-slate-900">
              <span className="truncate">{item.name || "Unnamed"}</span>
              {unreadKind(item) && (
                <Badge tone="brand" dot className="shrink-0">
                  {unreadKind(item) === "reply" ? "New reply" : "New"}
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
            <StatusBadge type="contact" status={settings.getStatus(item)} />
          </TD>
        </>
      );
    }

    return (
      <>
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
      </>
    );
  };

  const renderActions = (item) => {
    if (type === "newsletter") {
      return (
        <div className="flex items-center justify-end gap-2">
          <Switch
            aria-label={`Subscribed: ${item.emailAddress}`}
            checked={item.isActive !== false}
            disabled={updatingId === item.id}
            onChange={(value) => toggleSubscriber(item, value)}
          />
          {deleteButton(item)}
        </div>
      );
    }

    return (
      <div className="flex items-center justify-end gap-2" onClick={(event) => event.stopPropagation()}>
        <Select
          aria-label={`Update status for ${item.name || settings.singular}`}
          className="hidden w-[140px] sm:block"
          selectClassName="h-8 text-xs"
          value={settings.getStatus(item)}
          options={settings.statusOptions}
          disabled={updatingId === item.id}
          onChange={(event) => updateStatus(item, event.target.value)}
        />
        <Button variant="outline" size="sm" onClick={() => openItem(item)}>
          {type === "orders" ? "View" : "Open"}
          <span className="sr-only"> {item.name}</span>
        </Button>
        {deleteButton(item)}
      </div>
    );
  };

  const renderRows = () => {
    if (firstLoad && loadError) {
      return (
        <TableEmpty colSpan={colSpan}>
          <ErrorState
            title={`${settings.plural.charAt(0).toUpperCase()}${settings.plural.slice(1)} couldn’t be loaded`}
            description={loadError}
            onRetry={refresh}
            retrying={loading}
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
          icon={settings.icon}
          title={settings.emptyTitle}
          description={settings.emptyDescription}
        />
      );
    }

    if (!visibleItems.length) {
      return (
        <TableEmpty
          colSpan={colSpan}
          icon={SearchX}
          title={`No ${settings.plural} match your filters`}
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
      const selected =
        (type === "orders" && orderDrawerOpen && orderRequest.current === item.id) ||
        (type === "contacts" && contactDrawerOpen && selectedContactId === item.id);
      return (
        <TR
          key={item.id}
          selected={selected}
          interactive={clickable}
          onClick={clickable ? () => openItem(item) : undefined}
        >
          {renderCells(item)}
          <TD align="right">{renderActions(item)}</TD>
        </TR>
      );
    });
  };

  const drawerTitle = selectedOrder?.name || "Order details";

  return (
    <AdminPage module={type} showLoadError={!firstLoad}>
      {error && (
        <Alert tone="danger" onDismiss={() => setError("")}>
          {error}
        </Alert>
      )}

      <Table
        aria-label={settings.listTitle}
        header={
          <ListCardHeader title={settings.listTitle} count={firstLoad ? undefined : items.length}>
            <div className="flex flex-col gap-3 xl:flex-row xl:items-center">
              <Tabs
                aria-label={`Filter ${settings.plural} by status`}
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
                  aria-label={`Search ${settings.plural}`}
                  placeholder={`Search ${settings.plural}`}
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
              itemLabel={settings.plural}
            />
          )
        }
      >
        <THead>
          {headers.map((header) => (
            <TH key={header.label} align={header.align} className={header.className}>
              {header.label}
            </TH>
          ))}
          <TH align="right" srOnly>
            Actions
          </TH>
        </THead>
        <TBody>{renderRows()}</TBody>
      </Table>

      {type === "orders" && (
        <Drawer
          className="font-sans antialiased"
          open={orderDrawerOpen}
          onClose={closeOrder}
          size="lg"
          title={drawerTitle}
          description={
            selectedOrder
              ? `${formatCurrency(getOrderRevenue(selectedOrder))} · placed ${formatDate(getRecordDate(selectedOrder))}`
              : "Customer, delivery and item details."
          }
        >
          <OrderDetails
            order={selectedOrder}
            loading={loadingOrder}
            error={orderError}
            updating={Boolean(selectedOrder) && updatingId === selectedOrder.id}
            onStatusChange={updateStatus}
          />
        </Drawer>
      )}

      {type === "contacts" && (
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
            updating={Boolean(selectedContact) && updatingId === selectedContact.id}
            onStatusChange={updateStatus}
            onSent={async () => {
              await reload();
              setContactDrawerOpen(false);
            }}
          />
        </Drawer>
      )}
      <ConfirmDialog
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        onConfirm={removeItem}
        loading={deleting}
        loadingText="Deleting…"
        title={`Delete ${settings.singular}`}
        description={pendingDelete ? settings.describeDelete(pendingDelete) : ""}
        confirmLabel={`Delete ${settings.singular}`}
        confirmIcon={<Trash2 aria-hidden="true" />}
      />
    </AdminPage>
  );
};

export default Operations;
