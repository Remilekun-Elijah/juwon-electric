"use client";

import { useMemo, useState } from "react";
import { CalendarDays, Mail, Package, Phone, SearchX, ShoppingCart, User } from "lucide-react";
import { AdminPage } from "@/components/admin/AdminPage";
import { useAdminQuery } from "@/components/admin/AdminContext";
import { DetailList } from "@/components/admin/DetailList";
import {
  Badge,
  Button,
  Drawer,
  ErrorState,
  ListCardHeader,
  Pagination,
  SearchInput,
  Skeleton,
  TBody,
  TD,
  TH,
  THead,
  TR,
  Table,
  TableEmpty,
  paginate,
  type Tone,
} from "@/components/admin/kit";
import { formatCurrency, formatDate, formatDateTime, matchesQuery } from "@/lib/admin/format";
import { getCarts } from "@/lib/api/admin";
import type { Cart } from "@/lib/api/types";

const PAGE_SIZE = 20;
const COL_SPAN = 6;

const linkClasses = "text-brand-600 hover:text-brand-700 hover:underline underline-offset-4";

const customerName = (cart: Cart) => cart.name || cart.emailAddress || cart.phoneNumber || "Anonymous";
const isAnonymous = (cart: Cart) => !cart.name && !cart.emailAddress && !cart.phoneNumber;
const itemCount = (cart: Cart) => (cart.items || []).reduce((sum, line) => sum + Number(line.quantity || 0), 0);
const lastUpdated = (cart: Cart) => cart.updatedAt || cart.receivedAt || cart.createdAt;

const statusMeta = (cart: Cart): { tone: Tone; label: string } => {
  const status = (cart.status || (cart.isActive === false ? "inactive" : "active")).toLowerCase();
  const tones: Record<string, Tone> = { active: "info", ordered: "success", converted: "success", abandoned: "warning" };
  const label = status.replace(/[_-]+/g, " ");
  return { tone: tones[status] ?? "neutral", label: label.charAt(0).toUpperCase() + label.slice(1) };
};

export function Carts() {
  const query = useAdminQuery("carts", () => getCarts().then((response) => (Array.isArray(response.data) ? response.data : [])));
  const items = useMemo(() => query.data ?? [], [query.data]);
  const firstLoad = query.data === undefined;

  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const selected = items.find((cart) => cart.id === selectedId) ?? null;

  const visibleItems = useMemo(
    () =>
      items.filter((cart) =>
        matchesQuery(search, cart.name, cart.emailAddress, cart.phoneNumber, ...(cart.items || []).map((line) => line.name))
      ),
    [items, search]
  );
  const pageData = paginate(visibleItems, page, PAGE_SIZE);

  const openCart = (cart: Cart) => {
    setSelectedId(cart.id);
    setDrawerOpen(true);
  };

  const clearSearch = () => {
    setSearch("");
    setPage(1);
  };

  const renderRows = () => {
    if (firstLoad && query.error) {
      return (
        <TableEmpty colSpan={COL_SPAN}>
          <ErrorState title="Carts couldn’t be loaded" description={query.error} onRetry={query.reload} retrying={query.loading} />
        </TableEmpty>
      );
    }

    if (firstLoad) {
      return Array.from({ length: 5 }, (_, index) => (
        <TR key={index}>
          <TD colSpan={COL_SPAN}>
            <Skeleton className="h-9 w-full" />
          </TD>
        </TR>
      ));
    }

    if (!items.length) {
      return (
        <TableEmpty
          colSpan={COL_SPAN}
          icon={ShoppingCart}
          title="No carts yet"
          description="Carts customers save on the shop will show up here."
        />
      );
    }

    if (!visibleItems.length) {
      return (
        <TableEmpty
          colSpan={COL_SPAN}
          icon={SearchX}
          title="No carts match your search"
          description="Try a different name, email, phone number or product."
          action={
            <Button size="sm" variant="outline" onClick={clearSearch}>
              Clear search
            </Button>
          }
        />
      );
    }

    return pageData.items.map((cart) => {
      const status = statusMeta(cart);
      return (
        <TR key={cart.id} interactive selected={drawerOpen && selectedId === cart.id} onClick={() => openCart(cart)}>
          <TD className="max-w-[240px]">
            <p className={isAnonymous(cart) ? "truncate text-slate-500" : "truncate font-medium text-slate-900"}>
              {customerName(cart)}
            </p>
            {!isAnonymous(cart) && (
              <p className="truncate text-sm text-slate-500">
                {[cart.emailAddress, cart.phoneNumber].filter((value) => value && value !== customerName(cart)).join(" · ")}
              </p>
            )}
          </TD>
          <TD className="hidden whitespace-nowrap tabular-nums sm:table-cell">{itemCount(cart)}</TD>
          <TD align="right" className="whitespace-nowrap font-medium tabular-nums text-slate-900">
            {formatCurrency(cart.total)}
          </TD>
          <TD className="hidden md:table-cell">
            <Badge tone={status.tone}>{status.label}</Badge>
          </TD>
          <TD className="hidden whitespace-nowrap lg:table-cell">{formatDate(lastUpdated(cart))}</TD>
          <TD align="right">
            <Button
              variant="outline"
              size="sm"
              onClick={(event) => {
                event.stopPropagation();
                openCart(cart);
              }}
            >
              View
              <span className="sr-only"> cart for {customerName(cart)}</span>
            </Button>
          </TD>
        </TR>
      );
    });
  };

  return (
    <AdminPage module="carts" error={firstLoad ? undefined : query.error} onRetry={query.reload} retrying={query.loading}>
      <Table
        aria-label="All carts"
        header={
          <ListCardHeader title="All carts" count={firstLoad ? undefined : items.length}>
            <div className="flex gap-2 sm:max-w-sm">
              <SearchInput
                aria-label="Search carts"
                placeholder="Search carts"
                value={search}
                onChange={(event) => {
                  setSearch(event.target.value);
                  setPage(1);
                }}
              />
              {search.trim() && (
                <Button variant="ghost" onClick={clearSearch}>
                  Clear
                </Button>
              )}
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
              itemLabel="carts"
            />
          )
        }
      >
        <THead>
          <TH>Customer</TH>
          <TH className="hidden sm:table-cell">Items</TH>
          <TH align="right">Total</TH>
          <TH className="hidden md:table-cell">Status</TH>
          <TH className="hidden lg:table-cell">Last updated</TH>
          <TH align="right" srOnly>
            Actions
          </TH>
        </THead>
        <TBody>{renderRows()}</TBody>
      </Table>

      <Drawer
        open={drawerOpen && Boolean(selected)}
        onClose={() => setDrawerOpen(false)}
        size="lg"
        title={selected ? customerName(selected) : "Cart"}
        description={selected ? `${formatCurrency(selected.total)} · updated ${formatDate(lastUpdated(selected))}` : undefined}
      >
        {selected && <CartDetails cart={selected} />}
      </Drawer>
    </AdminPage>
  );
}

function CartDetails({ cart }: { cart: Cart }) {
  const lines = cart.items || [];
  const status = statusMeta(cart);

  return (
    <>
      <div className="flex flex-wrap items-center gap-2">
        <Badge tone={status.tone} dot>
          {status.label}
        </Badge>
      </div>

      <section aria-labelledby="cart-contact-heading">
        <h3 id="cart-contact-heading" className="text-sm font-semibold text-slate-900">
          Contact
        </h3>
        <DetailList
          className="mt-1"
          items={[
            { label: "Name", icon: User, value: cart.name || "Anonymous" },
            {
              label: "Phone",
              icon: Phone,
              value: cart.phoneNumber ? (
                <a className={linkClasses} href={`tel:${cart.phoneNumber}`}>
                  {cart.phoneNumber}
                </a>
              ) : (
                "Not provided"
              ),
            },
            {
              label: "Email",
              icon: Mail,
              value: cart.emailAddress ? (
                <a className={linkClasses} href={`mailto:${cart.emailAddress}`}>
                  {cart.emailAddress}
                </a>
              ) : (
                "Not provided"
              ),
            },
            { label: "Last updated", icon: CalendarDays, value: formatDateTime(lastUpdated(cart)) },
          ]}
        />
      </section>

      <section aria-labelledby="cart-items-heading">
        <h3 id="cart-items-heading" className="text-sm font-semibold text-slate-900">
          Items <span className="font-normal text-slate-500">({lines.length})</span>
        </h3>
        {lines.length ? (
          <ul className="mt-3 divide-y divide-slate-100 rounded-xl border border-slate-200">
            {lines.map((line, index) => (
              <li key={`${line.packageId}-${line.optionName}-${index}`} className="flex items-start gap-3 px-4 py-3">
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-brand-50 text-brand-700">
                  <Package aria-hidden="true" className="h-4 w-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="break-words text-sm font-medium text-slate-900">{line.name || "Item"}</p>
                  {line.optionName && <p className="text-xs text-slate-500">{line.optionName}</p>}
                </div>
                <div className="shrink-0 text-right">
                  <p className="text-sm font-medium tabular-nums text-slate-900">{formatCurrency(line.lineTotal)}</p>
                  <p className="text-xs tabular-nums text-slate-500">
                    {formatCurrency(line.unitPrice)} × {line.quantity}
                  </p>
                </div>
              </li>
            ))}
            <li className="flex items-center justify-between gap-3 bg-slate-50 px-4 py-3">
              <span className="text-sm font-medium text-slate-700">Total</span>
              <span className="text-base font-bold tabular-nums text-slate-900">{formatCurrency(cart.total)}</span>
            </li>
          </ul>
        ) : (
          <p className="mt-2 text-sm text-slate-500">This cart is empty.</p>
        )}
      </section>
    </>
  );
}
