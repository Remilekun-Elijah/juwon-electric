"use client";

import { useEffect, useRef, useState } from "react";
import { BellRing, Boxes, History, SearchX, SlidersHorizontal } from "lucide-react";
import { toast } from "sonner";
import { AdminPage } from "@/components/admin/AdminPage";
import { useAdmin, useAdminQuery } from "@/components/admin/AdminContext";
import {
  Button,
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
  TabPanel,
  Table,
  TableEmpty,
  Tabs,
} from "@/components/ui";
import { ProductStatusBadge, StockBadge } from "@/components/admin/catalog/productBadges";
import { getInventory, runLowStockCheck } from "@/lib/api/admin";
import type { InventoryItem, Product } from "@/lib/api/types";
import { errorMessage, formatDateTime } from "@/lib/admin/format";
import { AdjustStockDialog } from "./AdjustStockDialog";
import { MovementHistory } from "./MovementHistory";

const PAGE_SIZE = 25;
const COL_SPAN = 6;
const TABS_ID = "inventory";

type Tab = "stock" | "movements";
type StockFilter = "all" | "low" | "out";

const stockFilterOptions = [
  { value: "all", label: "All stock" },
  { value: "low", label: "Low stock" },
  { value: "out", label: "Out of stock" },
];

/** `?product=<id>` (linked from the product form). Read once on the client; no `useSearchParams` Suspense boundary needed. */
const readProductParam = () =>
  typeof window === "undefined" ? "" : (new URLSearchParams(window.location.search).get("product") ?? "");

export function Inventory() {
  const { can } = useAdmin();
  const canAdjust = can("inventory:adjust");

  const [initialProductId] = useState(readProductParam);
  const [tab, setTab] = useState<Tab>(() => (initialProductId ? "movements" : "stock"));
  const [stock, setStock] = useState<StockFilter>("all");
  const [search, setSearch] = useState("");
  const [q, setQ] = useState("");
  const qRef = useRef("");
  const [page, setPage] = useState(1);
  const [version, setVersion] = useState(0);
  const [adjusting, setAdjusting] = useState<{
    item: InventoryItem;
    open: boolean;
    key: number;
  } | null>(null);
  const [checking, setChecking] = useState(false);

  useEffect(() => {
    const next = search.trim();
    const timer = window.setTimeout(() => {
      if (next === qRef.current) return;
      qRef.current = next;
      setQ(next);
      setPage(1);
    }, 300);
    return () => window.clearTimeout(timer);
  }, [search]);

  const params = { stock, q, page, limit: PAGE_SIZE };
  const inventory = useAdminQuery(`admin-inventory:${JSON.stringify(params)}`, () => getInventory(params));
  const lowCount = useAdminQuery(`admin-inventory-low:${version}`, () => getInventory({ stock: "low", limit: 1 }));

  const data = inventory.data;
  const items = data?.items ?? [];
  const filtersActive = stock !== "all" || Boolean(search);

  const clearFilters = () => {
    setStock("all");
    setSearch("");
    qRef.current = "";
    setQ("");
    setPage(1);
  };

  const openAdjust = (item: InventoryItem) =>
    setAdjusting((current) => ({
      item,
      open: true,
      key: (current?.key ?? 0) + 1,
    }));
  const closeAdjust = () => setAdjusting((current) => (current ? { ...current, open: false } : current));

  const applyAdjustment = (product: Product) => {
    inventory.setData((current) =>
      current
        ? {
            ...current,
            items: current.items.map((item) =>
              item.productId === product.id
                ? {
                    ...item,
                    stockQuantity: product.stockQuantity,
                    reorderLevel: product.reorderLevel,
                    lowStock: product.lowStock,
                    status: product.status,
                    updatedAt: product.updatedAt,
                  }
                : item
            ),
          }
        : current
    );
    setVersion((value) => value + 1);
  };

  const checkLowStock = async () => {
    setChecking(true);
    try {
      const result = await runLowStockCheck();
      const products = result.lowStock === 1 ? "1 low-stock product" : `${result.lowStock} low-stock products`;
      toast.success(`${products}, email ${result.emailed ? "sent" : "not sent"}.`);
      setVersion((value) => value + 1);
    } catch (error) {
      toast.error(errorMessage(error, "The low-stock check couldn’t run."));
    } finally {
      setChecking(false);
    }
  };

  const renderRows = () => {
    if (inventory.initialLoading || (inventory.loading && !items.length && !inventory.error)) {
      return Array.from({ length: 5 }, (_, index) => (
        <TR key={index}>
          <TD colSpan={COL_SPAN}>
            <Skeleton className="h-9 w-full" />
          </TD>
        </TR>
      ));
    }
    if (!data && inventory.error) {
      return (
        <TableEmpty colSpan={COL_SPAN}>
          <ErrorState
            title="Stock levels couldn’t be loaded"
            description={inventory.error}
            onRetry={inventory.reload}
            retrying={inventory.loading}
          />
        </TableEmpty>
      );
    }
    if (!items.length) {
      return filtersActive ? (
        <TableEmpty
          colSpan={COL_SPAN}
          icon={SearchX}
          title="No products match your filters"
          description="Try a different search or clear the filters."
          action={
            <Button size="sm" variant="outline" onClick={clearFilters}>
              Clear filters
            </Button>
          }
        />
      ) : (
        <TableEmpty
          colSpan={COL_SPAN}
          icon={Boxes}
          title="No products to track yet"
          description="Products added in the catalog show their stock here."
        />
      );
    }

    return items.map((item) => (
      <TR key={item.productId} selected={Boolean(adjusting?.open && adjusting.item.productId === item.productId)}>
        <TD className="max-w-[280px]">
          <p className="truncate font-medium text-slate-900">{item.name}</p>
          <p className="truncate font-mono text-xs text-slate-500">{item.sku}</p>
        </TD>
        <TD className="whitespace-nowrap">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="font-semibold tabular-nums text-slate-900">{item.stockQuantity}</span>
            <StockBadge stock={item.stockQuantity} lowStock={item.lowStock} />
          </div>
          <p className="text-xs tabular-nums text-slate-500 sm:hidden">Reorder at {item.reorderLevel}</p>
        </TD>
        <TD className="hidden whitespace-nowrap tabular-nums sm:table-cell">{item.reorderLevel}</TD>
        <TD className="hidden md:table-cell">
          <ProductStatusBadge status={item.status} />
        </TD>
        <TD className="hidden whitespace-nowrap text-sm text-slate-600 lg:table-cell">
          {formatDateTime(item.updatedAt)}
        </TD>
        <TD align="right">
          {canAdjust && (
            <Button
              variant="outline"
              size="sm"
              aria-label={`Adjust stock for ${item.name}`}
              icon={<SlidersHorizontal aria-hidden="true" />}
              onClick={() => openAdjust(item)}
            >
              Adjust
            </Button>
          )}
        </TD>
      </TR>
    ));
  };

  const lowStockTotal = lowCount.data?.total;

  return (
    <AdminPage
      module="inventory"
      previewAreas={["inventory"]}
      error={data ? inventory.error : undefined}
      onRetry={inventory.reload}
      retrying={inventory.loading}
      actions={
        canAdjust && (
          <Button
            variant="outline"
            onClick={checkLowStock}
            loading={checking}
            loadingText="Checking…"
            icon={<BellRing aria-hidden="true" />}
          >
            Run low-stock check
          </Button>
        )
      }
    >
      <Tabs<Tab>
        id={TABS_ID}
        withPanels
        aria-label="Inventory views"
        value={tab}
        onChange={setTab}
        items={[
          {
            value: "stock",
            label: "Stock levels",
            icon: Boxes,
            count: lowStockTotal ? lowStockTotal : undefined,
          },
          { value: "movements", label: "Movements", icon: History },
        ]}
      />
      {lowStockTotal ? (
        <p className="-mt-3 text-xs text-slate-500">
          {lowStockTotal === 1 ? "1 product is" : `${lowStockTotal} products are`} at or below the reorder level.
        </p>
      ) : null}

      <TabPanel id={TABS_ID} value="stock" active={tab === "stock"}>
        <Table
          aria-label="Stock levels"
          header={
            <ListCardHeader title="Stock levels" count={data ? data.total : undefined}>
              <div className="flex flex-col gap-3 sm:flex-row">
                <SearchInput
                  wrapperClassName="sm:flex-1"
                  aria-label="Search stock"
                  placeholder="Search by name or SKU"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                />
                <Select
                  aria-label="Filter by stock"
                  className="sm:w-[170px]"
                  value={stock}
                  options={stockFilterOptions}
                  onChange={(event) => {
                    setStock(event.target.value as StockFilter);
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
            data && (
              <Pagination
                page={data.page}
                totalItems={data.total}
                pageSize={data.limit || PAGE_SIZE}
                onChange={setPage}
                itemLabel="products"
              />
            )
          }
        >
          <THead>
            <TH>Product</TH>
            <TH>Stock</TH>
            <TH className="hidden sm:table-cell">Reorder level</TH>
            <TH className="hidden md:table-cell">Status</TH>
            <TH className="hidden lg:table-cell">Updated</TH>
            <TH align="right" srOnly>
              Actions
            </TH>
          </THead>
          <TBody>{renderRows()}</TBody>
        </Table>
      </TabPanel>

      <TabPanel id={TABS_ID} value="movements" active={tab === "movements"}>
        <MovementHistory initialProductId={initialProductId} version={version} />
      </TabPanel>

      {adjusting && (
        <AdjustStockDialog
          key={adjusting.key}
          open={adjusting.open}
          item={adjusting.item}
          onClose={closeAdjust}
          onAdjusted={({ product }) => {
            applyAdjustment(product);
            closeAdjust();
          }}
        />
      )}
    </AdminPage>
  );
}

export default Inventory;
