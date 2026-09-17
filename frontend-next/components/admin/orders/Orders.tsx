"use client";

import { useEffect, useEffectEvent, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { Plus, ReceiptText, SearchX, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { AdminPage } from "@/components/admin/AdminPage";
import { useAdmin, useAdminQuery } from "@/components/admin/AdminContext";
import {
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
  TBody,
  TD,
  TH,
  THead,
  TR,
  Table,
  TableEmpty,
  Tabs,
  paginate,
  type TabItem,
} from "@/components/ui";
import { formatCurrency, formatDate, getOrderRevenue, getRecordDate, matchesQuery } from "@/lib/admin/format";
import { fulfillmentLabels, paymentLabels } from "@/lib/admin/transitions";
import { adminFetch, ApiError, getOrder, getOrders } from "@/lib/api/admin";
import type { FulfillmentStatus, Order, OrderChannel, PaymentStatus } from "@/lib/api/types";
import { OrderDetails } from "./OrderDetails";
import {
  ChannelBadge,
  FulfillmentBadge,
  PaymentBadge,
  channelLabels,
  orderChannel,
  orderFulfillment,
  orderPayment,
  isRefundDue,
  RefundDueBadge,
} from "./orderStatus";

const PAGE_SIZE = 20;

const FULFILLMENT_TABS: FulfillmentStatus[] = [
  "pending",
  "processing",
  "out_for_delivery",
  "delivered",
  "installed",
  "cancelled",
];

type StatusFilter = FulfillmentStatus | "all";

const paymentFilterOptions = [
  { value: "all", label: "All payments" },
  ...(Object.keys(paymentLabels) as PaymentStatus[]).map((value) => ({ value, label: paymentLabels[value] })),
];

const channelFilterOptions = [
  { value: "all", label: "All channels" },
  ...(Object.keys(channelLabels) as OrderChannel[]).map((value) => ({ value, label: channelLabels[value] })),
];

const itemCount = (order: Order) => (order.order || []).reduce((sum, line) => sum + Number(line.quantity || 1), 0);

export function Orders() {
  const { can, notifications } = useAdmin();
  const [channelFilter, setChannelFilter] = useState<OrderChannel | "all">("all");
  const query = useAdminQuery(`orders:${channelFilter}`, () =>
    getOrders(channelFilter === "all" ? {} : { channel: channelFilter }).then((response) => response.data)
  );
  // Deep link: /admin/orders?order=<id> opens that order once the list has loaded. Read after mount: on a client
  // navigation (for example after recording an in-store sale) the URL is only updated once the new page commits.
  const [deepLinkId, setDeepLinkId] = useState<string | null>(null);
  useEffect(() => {
    const id = new URLSearchParams(window.location.search).get("order");
    if (!id) return undefined;
    const timer = window.setTimeout(() => setDeepLinkId(id), 0);
    return () => window.clearTimeout(timer);
  }, []);
  const items = useMemo(() => query.data ?? [], [query.data]);
  const firstLoad = query.data === undefined;
  const canDelete = can("orders:delete");

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [paymentFilter, setPaymentFilter] = useState<PaymentStatus | "all">("all");
  const [page, setPage] = useState(1);

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selected, setSelected] = useState<Order | null>(null);
  const [loadingOrder, setLoadingOrder] = useState(false);
  const [orderError, setOrderError] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const orderRequest = useRef<string | null>(null);

  const [pendingDelete, setPendingDelete] = useState<Order | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const statusCounts = useMemo(
    () =>
      items.reduce<Partial<Record<FulfillmentStatus, number>>>((counts, item) => {
        const status = orderFulfillment(item);
        return { ...counts, [status]: (counts[status] || 0) + 1 };
      }, {}),
    [items]
  );

  const visibleItems = useMemo(
    () =>
      items.filter(
        (item) =>
          (statusFilter === "all" || orderFulfillment(item) === statusFilter) &&
          (paymentFilter === "all" || orderPayment(item) === paymentFilter) &&
          (channelFilter === "all" || orderChannel(item) === channelFilter) &&
          matchesQuery(search, item.name, item.phoneNumber, item.emailAddress, item.deliveryAddress)
      ),
    [items, statusFilter, paymentFilter, channelFilter, search]
  );

  const pageData = paginate(visibleItems, page, PAGE_SIZE);
  const filtersActive =
    Boolean(search.trim()) || statusFilter !== "all" || paymentFilter !== "all" || channelFilter !== "all";

  const clearFilters = () => {
    setSearch("");
    setStatusFilter("all");
    setPaymentFilter("all");
    setChannelFilter("all");
    setPage(1);
  };

  /** Puts a changed order into the drawer and the list without refetching. */
  const applyOrder = (updated: Order) => {
    setSelected((current) =>
      current?.id === updated.id ? { ...current, ...updated, jobs: updated.jobs ?? current.jobs } : current
    );
    query.setData((current) =>
      current?.map((item) => (item.id === updated.id ? { ...item, ...updated, jobs: item.jobs } : item))
    );
  };

  const applyOrderFromServer = (order: Order) => {
    setSelected(order);
    query.setData((current) => current?.map((item) => (item.id === order.id ? { ...item, ...order, jobs: item.jobs } : item)));
  };

  const loadOrder = async (order: Order, { quiet = false } = {}) => {
    orderRequest.current = order.id;
    if (!quiet) {
      setSelected(null);
      setLoadingOrder(true);
    }
    setOrderError("");
    try {
      const response = await getOrder(order.id);
      if (orderRequest.current === order.id) applyOrderFromServer(response.data || order);
    } catch (error) {
      if (orderRequest.current === order.id) {
        if (quiet) toast.error(error instanceof Error ? error.message : "Couldn’t reload this order.");
        else setOrderError(error instanceof Error ? error.message : "Couldn’t load this order.");
      }
    } finally {
      if (orderRequest.current === order.id) setLoadingOrder(false);
    }
  };

  const openOrder = (order: Order) => {
    notifications.markSeen("orders", order);
    setSelectedId(order.id);
    setDrawerOpen(true);
    void loadOrder(order);
  };

  const openDeepLinked = useEffectEvent((order: Order) => openOrder(order));

  useEffect(() => {
    if (!deepLinkId || !query.data) return undefined;
    const order = query.data.find((item) => item.id === deepLinkId);
    const timer = window.setTimeout(() => {
      setDeepLinkId(null);
      if (order) openDeepLinked(order);
      else toast.error("That order couldn’t be found. It may have been deleted.");
    }, 0);
    return () => window.clearTimeout(timer);
  }, [deepLinkId, query.data]);

  const closeOrder = () => {
    orderRequest.current = null;
    setLoadingOrder(false);
    setDrawerOpen(false);
  };

  const requestDelete = (order: Order) => {
    setPendingDelete(order);
    setConfirmOpen(true);
  };

  const removeOrder = async () => {
    if (!pendingDelete) return;
    const order = pendingDelete;
    setDeleting(true);
    try {
      await adminFetch<Order>(`/orders/${encodeURIComponent(order.id)}`, { method: "DELETE" });
    } catch (error) {
      // 404: already gone, so drop the row anyway.
      if (!(error instanceof ApiError && error.status === 404)) {
        setConfirmOpen(false);
        setDeleting(false);
        toast.error(`Couldn’t delete the order from ${order.name || "this customer"}. ${error instanceof Error ? error.message : ""}`.trim());
        return;
      }
    }
    query.setData((current) => current?.filter((item) => item.id !== order.id));
    if (selectedId === order.id) closeOrder();
    toast.success("Order deleted");
    setConfirmOpen(false);
    setDeleting(false);
  };

  const tabItems: TabItem<StatusFilter>[] = [
    { value: "all", label: "All", count: firstLoad ? undefined : items.length },
    ...FULFILLMENT_TABS.map((value) => ({
      value,
      label: fulfillmentLabels[value],
      count: firstLoad ? undefined : statusCounts[value] || 0,
    })),
  ];

  const colSpan = 7;

  const newSaleButton = (size?: "sm") =>
    can("orders:create") ? (
      <Button as={Link} href="/admin/orders/new" size={size} icon={<Plus aria-hidden="true" />}>
        New in-store sale
      </Button>
    ) : undefined;

  const renderRows = () => {
    if (firstLoad && query.error) {
      return (
        <TableEmpty colSpan={colSpan}>
          <ErrorState
            title="Orders couldn’t be loaded"
            description={query.error}
            onRetry={query.reload}
            retrying={query.loading}
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
          icon={ReceiptText}
          title="No orders yet"
          description="Orders placed on the shop and sales recorded in the store will show up here."
          action={newSaleButton("sm")}
        />
      );
    }

    if (!visibleItems.length) {
      return (
        <TableEmpty
          colSpan={colSpan}
          icon={SearchX}
          title="No orders match your filters"
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
      const unread = notifications.unread.orders.has(item.id);
      return (
        <TR
          key={item.id}
          interactive
          selected={drawerOpen && selectedId === item.id}
          onClick={() => openOrder(item)}
        >
          <TD className="max-w-[240px]">
            <p className="flex items-center gap-2 font-medium text-slate-900">
              <span className="truncate">{item.name || "Unnamed customer"}</span>
              {unread && (
                <Badge tone="brand" dot className="shrink-0">
                  New
                </Badge>
              )}
            </p>
            <p className="flex min-w-0 items-center gap-2 text-sm text-slate-500">
              <span className="truncate">{item.phoneNumber || item.deliveryAddress}</span>
              <ChannelBadge channel={orderChannel(item)} />
            </p>
          </TD>
          <TD className="hidden whitespace-nowrap md:table-cell">{formatDate(getRecordDate(item))}</TD>
          <TD className="hidden whitespace-nowrap tabular-nums lg:table-cell">{itemCount(item)}</TD>
          <TD align="right" className="whitespace-nowrap font-medium tabular-nums text-slate-900">
            {formatCurrency(getOrderRevenue(item))}
          </TD>
          <TD>
            <div className="flex flex-col items-start gap-1">
              <FulfillmentBadge status={orderFulfillment(item)} />
              <span className="text-xs text-slate-500 sm:hidden">Payment: {paymentLabels[orderPayment(item)]}</span>
              {isRefundDue(item) && (
                <span className="sm:hidden">
                  <RefundDueBadge />
                </span>
              )}
            </div>
          </TD>
          <TD className="hidden sm:table-cell">
            <div className="flex flex-col items-start gap-1">
              <PaymentBadge status={orderPayment(item)} />
              {isRefundDue(item) && <RefundDueBadge />}
            </div>
          </TD>
          <TD align="right">
            <div className="flex items-center justify-end gap-2" onClick={(event) => event.stopPropagation()}>
              <Button variant="outline" size="sm" onClick={() => openOrder(item)}>
                View
                <span className="sr-only"> {item.name}</span>
              </Button>
              {canDelete && (
                <Button
                  variant="ghost"
                  size="icon-sm"
                  className="hover:bg-red-50 hover:text-red-700"
                  aria-label={`Delete ${item.name || "order"}`}
                  title="Delete"
                  onClick={() => requestDelete(item)}
                >
                  <Trash2 aria-hidden="true" />
                </Button>
              )}
            </div>
          </TD>
        </TR>
      );
    });
  };

  return (
    <AdminPage
      module="orders"
      actions={newSaleButton()}
      error={firstLoad ? undefined : query.error}
      onRetry={query.reload}
      retrying={query.loading}
      previewAreas={["orders"]}
    >
      <Table
        aria-label="All orders"
        header={
          <ListCardHeader title="All orders" count={firstLoad ? undefined : items.length}>
            <div className="flex flex-col gap-3">
              <Tabs
                aria-label="Filter orders by fulfilment status"
                value={statusFilter}
                onChange={(value) => {
                  setStatusFilter(value);
                  setPage(1);
                }}
                items={tabItems}
                className="w-full"
              />
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                <SearchInput
                  aria-label="Search orders"
                  placeholder="Search orders"
                  value={search}
                  wrapperClassName="sm:max-w-xs"
                  onChange={(event) => {
                    setSearch(event.target.value);
                    setPage(1);
                  }}
                />
                <Select
                  aria-label="Filter orders by channel"
                  className="sm:w-44"
                  value={channelFilter}
                  options={channelFilterOptions}
                  onChange={(event) => {
                    setChannelFilter(event.target.value as OrderChannel | "all");
                    setPage(1);
                  }}
                />
                <Select
                  aria-label="Filter orders by payment status"
                  className="sm:w-48"
                  value={paymentFilter}
                  options={paymentFilterOptions}
                  onChange={(event) => {
                    setPaymentFilter(event.target.value as PaymentStatus | "all");
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
              itemLabel="orders"
            />
          )
        }
      >
        <THead>
          <TH>Customer</TH>
          <TH className="hidden md:table-cell">Date</TH>
          <TH className="hidden lg:table-cell">Items</TH>
          <TH align="right">Total</TH>
          <TH>Fulfilment</TH>
          <TH className="hidden sm:table-cell">Payment</TH>
          <TH align="right" srOnly>
            Actions
          </TH>
        </THead>
        <TBody>{renderRows()}</TBody>
      </Table>

      <Drawer
        open={drawerOpen}
        onClose={closeOrder}
        size="lg"
        title={selected?.name || "Order details"}
        description={
          selected
            ? `${formatCurrency(getOrderRevenue(selected))} · ${orderChannel(selected) === "in_store" ? "sold in store" : "placed"} ${formatDate(getRecordDate(selected))}`
            : "Customer, delivery and item details."
        }
      >
        <OrderDetails
          order={selected}
          loading={loadingOrder}
          error={orderError}
          onChange={applyOrder}
          onReload={() => (selected ? loadOrder(selected, { quiet: true }) : Promise.resolve())}
          onDelete={canDelete && selected ? () => requestDelete(selected) : undefined}
        />
      </Drawer>

      <ConfirmDialog
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        onConfirm={removeOrder}
        loading={deleting}
        loadingText="Deleting…"
        title="Delete order"
        description={
          pendingDelete
            ? `Are you sure you want to delete the order from “${pendingDelete.name || "this customer"}”? Its customer, delivery and item details will be permanently removed. This can’t be undone.`
            : ""
        }
        confirmLabel="Delete order"
        confirmIcon={<Trash2 aria-hidden="true" />}
      />
    </AdminPage>
  );
}
