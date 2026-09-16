"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { History, SearchX } from "lucide-react";
import { useAdminQuery } from "@/components/admin/AdminContext";
import {
  Button,
  ErrorState,
  Field,
  Input,
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
} from "@/components/admin/kit";
import { getInventory, getMovements } from "@/lib/api/admin";
import type { MovementReason } from "@/lib/api/types";
import { formatDateTime } from "@/lib/admin/format";
import { cn } from "@/lib/cn";
import { movementReasonLabels } from "./movementReasons";

const PAGE_SIZE = 25;
const COL_SPAN = 7;

const reasonFilterOptions = [
  { value: "", label: "All reasons" },
  ...(Object.keys(movementReasonLabels) as MovementReason[]).map((value) => ({
    value,
    label: movementReasonLabels[value],
  })),
];

/** Local calendar day → ISO bounds, so a date range covers whole days in the admin's time zone. */
const dayStart = (value: string) => (value ? new Date(`${value}T00:00:00`).toISOString() : "");
const dayEnd = (value: string) => (value ? new Date(`${value}T23:59:59.999`).toISOString() : "");

type MovementHistoryProps = {
  initialProductId?: string;
  /** Bumped by the parent after an adjustment so the list refetches. */
  version?: number;
};

export function MovementHistory({ initialProductId = "", version = 0 }: MovementHistoryProps) {
  const [productId, setProductId] = useState(initialProductId);
  const [reason, setReason] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [page, setPage] = useState(1);

  const params = {
    productId,
    reason,
    from: dayStart(from),
    to: dayEnd(to),
    page,
    limit: PAGE_SIZE,
  };
  const movements = useAdminQuery(`admin-movements:${JSON.stringify(params)}:${version}`, () => getMovements(params));
  const productsQuery = useAdminQuery("admin-inventory-products", () => getInventory({ limit: 100 }));

  const productOptions = useMemo(() => {
    const items = [...(productsQuery.data?.items ?? [])].sort((a, b) => a.name.localeCompare(b.name));
    const options = [
      { value: "", label: "All products" },
      ...items.map((item) => ({
        value: item.productId,
        label: `${item.name} (${item.sku})`,
      })),
    ];
    if (productId && !items.some((item) => item.productId === productId)) {
      const fromMovement = movements.data?.items.find((item) => item.productId === productId);
      options.push({
        value: productId,
        label: fromMovement ? `${fromMovement.productName} (${fromMovement.sku})` : "Selected product",
      });
    }
    return options;
  }, [productsQuery.data, movements.data, productId]);

  const data = movements.data;
  const items = data?.items ?? [];
  const rangeInvalid = Boolean(from && to && from > to);
  const filtersActive = Boolean(productId || reason || from || to);

  const update = (apply: () => void) => {
    apply();
    setPage(1);
  };

  const clearFilters = () =>
    update(() => {
      setProductId("");
      setReason("");
      setFrom("");
      setTo("");
    });

  const renderRows = () => {
    if (movements.initialLoading || (movements.loading && !items.length && !movements.error)) {
      return Array.from({ length: 5 }, (_, index) => (
        <TR key={index}>
          <TD colSpan={COL_SPAN}>
            <Skeleton className="h-9 w-full" />
          </TD>
        </TR>
      ));
    }
    if (movements.error && !items.length) {
      return (
        <TableEmpty colSpan={COL_SPAN}>
          <ErrorState
            title="Stock movements couldn’t be loaded"
            description={movements.error}
            onRetry={movements.reload}
            retrying={movements.loading}
          />
        </TableEmpty>
      );
    }
    if (!items.length) {
      return filtersActive ? (
        <TableEmpty
          colSpan={COL_SPAN}
          icon={SearchX}
          title="No movements match your filters"
          description="Try a different product, reason or date range."
          action={
            <Button size="sm" variant="outline" onClick={clearFilters}>
              Clear filters
            </Button>
          }
        />
      ) : (
        <TableEmpty
          colSpan={COL_SPAN}
          icon={History}
          title="No stock movements yet"
          description="Adjustments, opening stock and order stock changes show here."
        />
      );
    }

    return items.map((movement) => (
      <TR key={movement.id}>
        <TD className="whitespace-nowrap text-sm text-slate-600">{formatDateTime(movement.createdAt)}</TD>
        <TD className="max-w-[240px]">
          <p className="truncate font-medium text-slate-900">{movement.productName}</p>
          <p className="truncate font-mono text-xs text-slate-500">{movement.sku}</p>
          {movement.note && <p className="mt-1 line-clamp-2 text-xs text-slate-500 lg:hidden">{movement.note}</p>}
        </TD>
        <TD className="whitespace-nowrap">
          <span className={cn("font-semibold tabular-nums", movement.change > 0 ? "text-emerald-700" : "text-red-700")}>
            {movement.change > 0 ? `+${movement.change}` : `−${Math.abs(movement.change)}`}
          </span>
          <p className="text-xs tabular-nums text-slate-500 sm:hidden">
            {movement.stockBefore} → {movement.stockAfter}
          </p>
        </TD>
        <TD className="hidden whitespace-nowrap tabular-nums text-slate-600 sm:table-cell">
          {movement.stockBefore} <span aria-hidden="true">→</span>
          <span className="sr-only">to</span> {movement.stockAfter}
        </TD>
        <TD className="hidden whitespace-nowrap md:table-cell">
          {movementReasonLabels[movement.reason] ?? movement.reason}
          {movement.referenceType === "order" && movement.referenceId && (
            <p className="text-xs">
              <Link
                href={`/admin/orders?order=${encodeURIComponent(movement.referenceId)}`}
                className="font-mono text-brand-700 hover:underline"
              >
                Order {movement.referenceId.slice(0, 8)}
              </Link>
            </p>
          )}
        </TD>
        <TD className="hidden max-w-[240px] lg:table-cell">
          <p className="line-clamp-2 text-sm text-slate-600">{movement.note || "—"}</p>
        </TD>
        <TD className="hidden max-w-[180px] md:table-cell">
          <p className="truncate text-sm text-slate-600">{movement.createdBy?.email ?? "System"}</p>
        </TD>
      </TR>
    ));
  };

  return (
    <Table
      aria-label="Stock movements"
      header={
        <ListCardHeader title="Stock movements" count={data ? data.total : undefined}>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)_auto] lg:items-end">
            <Field label="Product" labelClassName="text-xs">
              <Select
                value={productId}
                options={productOptions}
                onChange={(event) => update(() => setProductId(event.target.value))}
              />
            </Field>
            <Field label="Reason" labelClassName="text-xs">
              <Select
                value={reason}
                options={reasonFilterOptions}
                onChange={(event) => update(() => setReason(event.target.value))}
              />
            </Field>
            <Field label="From" labelClassName="text-xs">
              <Input
                type="date"
                value={from}
                max={to || undefined}
                onChange={(event) => update(() => setFrom(event.target.value))}
              />
            </Field>
            <Field
              label="To"
              labelClassName="text-xs"
              error={rangeInvalid ? "End date is before the start date." : undefined}
            >
              <Input
                type="date"
                value={to}
                min={from || undefined}
                onChange={(event) => update(() => setTo(event.target.value))}
              />
            </Field>
            {filtersActive && (
              <Button variant="ghost" onClick={clearFilters}>
                Clear
              </Button>
            )}
          </div>
        </ListCardHeader>
      }
      footer={
        data && (
          <Pagination
            page={data.page}
            totalItems={data.total}
            pageSize={data.limit || PAGE_SIZE}
            onChange={setPage}
            itemLabel="movements"
          />
        )
      }
    >
      <THead>
        <TH>Date</TH>
        <TH>Product</TH>
        <TH>Change</TH>
        <TH className="hidden sm:table-cell">Stock</TH>
        <TH className="hidden md:table-cell">Reason</TH>
        <TH className="hidden lg:table-cell">Note</TH>
        <TH className="hidden md:table-cell">By</TH>
      </THead>
      <TBody>{renderRows()}</TBody>
    </Table>
  );
}
