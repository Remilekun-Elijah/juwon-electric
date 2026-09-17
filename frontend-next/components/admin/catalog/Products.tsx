"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ImageOff, Package, Pencil, Plus, SearchX, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { AdminPage } from "@/components/admin/AdminPage";
import { useAdmin, useAdminQuery } from "@/components/admin/AdminContext";
import {
  Button,
  ConfirmDialog,
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
} from "@/components/ui";
import { deleteProduct, getAdminPackages, getCategories, getProducts } from "@/lib/api/admin";
import type { Product } from "@/lib/api/types";
import { errorMessage, formatCurrency } from "@/lib/admin/format";
import { countProductUsage } from "@/lib/admin/packageOptions";
import { categoryOptions } from "./categoryTree";
import { ProductStatusBadge, productStatusOptions, StockBadge } from "./productBadges";
import { ProductForm } from "./ProductForm";

const PAGE_SIZE = 20;
const COL_SPAN = 6;

function Thumbnail({ product }: { product: Product }) {
  const src = product.images[0];
  if (!src) {
    return (
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-slate-100 text-slate-400">
        <ImageOff aria-hidden="true" className="h-4 w-4" />
      </div>
    );
  }
  return (
    <div
      role="img"
      aria-label={product.name}
      className="h-10 w-10 shrink-0 rounded-md border border-slate-200 bg-slate-100 bg-cover bg-center"
      style={{ backgroundImage: `url(${JSON.stringify(src)})` }}
    />
  );
}

const stockFilterOptions = [
  { value: "", label: "All stock" },
  { value: "low", label: "Low stock" },
  { value: "out", label: "Out of stock" },
];

export function Products() {
  const { can } = useAdmin();
  const canWrite = can("products:write");

  const [category, setCategory] = useState("");
  const [status, setStatus] = useState("");
  const [stock, setStock] = useState<"" | "low" | "out">("");
  const [search, setSearch] = useState("");
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  const qRef = useRef("");

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

  const params = { category, status, stock, q, page, limit: PAGE_SIZE };
  const products = useAdminQuery(`admin-products:${JSON.stringify(params)}`, () => getProducts(params));
  const categoriesQuery = useAdminQuery("admin-categories", getCategories);
  const categories = useMemo(() => categoriesQuery.data ?? [], [categoriesQuery.data]);
  const categoryFilterOptions = useMemo(
    () => [{ value: "", label: "All categories" }, ...categoryOptions(categories)],
    [categories]
  );
  // Package usage for price and archive warnings (Commerce v2 §3). Needs content:read; otherwise no warnings.
  const packagesQuery = useAdminQuery("admin-packages", getAdminPackages, { enabled: can("content:read") });
  const packageUsage = useMemo(() => (packagesQuery.data ? countProductUsage(packagesQuery.data) : null), [packagesQuery.data]);
  const categoryName = (id: string | null) => (id ? (categories.find((item) => item.id === id)?.name ?? "—") : "—");

  const [form, setForm] = useState<{
    open: boolean;
    product: Product | null;
    key: number;
  }>({
    open: false,
    product: null,
    key: 0,
  });
  const [pendingDelete, setPendingDelete] = useState<Product | null>(null);
  const [deleting, setDeleting] = useState(false);

  const data = products.data;
  const items = data?.items ?? [];
  const filtersActive = Boolean(category || status || stock || search);

  const clearFilters = () => {
    setCategory("");
    setStatus("");
    setStock("");
    setSearch("");
    qRef.current = "";
    setQ("");
    setPage(1);
  };

  const openForm = (product: Product | null) => setForm((current) => ({ open: true, product, key: current.key + 1 }));
  const closeForm = () => setForm((current) => ({ ...current, open: false }));

  const remove = async () => {
    if (!pendingDelete) return;
    setDeleting(true);
    try {
      await deleteProduct(pendingDelete.id);
      toast.success("Product deleted.");
      setPendingDelete(null);
      if (items.length === 1 && page > 1) setPage(page - 1);
      else products.reload();
    } catch (error) {
      toast.error(errorMessage(error, "The product couldn’t be deleted."));
    } finally {
      setDeleting(false);
    }
  };

  const renderRows = () => {
    if (products.initialLoading || (products.loading && !items.length && !products.error)) {
      return Array.from({ length: 5 }, (_, index) => (
        <TR key={index}>
          <TD colSpan={COL_SPAN}>
            <Skeleton className="h-10 w-full" />
          </TD>
        </TR>
      ));
    }
    if (!data && products.error) {
      return (
        <TableEmpty colSpan={COL_SPAN}>
          <ErrorState
            title="Products couldn’t be loaded"
            description={products.error}
            onRetry={products.reload}
            retrying={products.loading}
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
          icon={Package}
          title="No products yet"
          description="Products you add here can be listed on the website and tracked in Inventory."
          action={
            canWrite && (
              <Button size="sm" onClick={() => openForm(null)} icon={<Plus aria-hidden="true" />}>
                Add product
              </Button>
            )
          }
        />
      );
    }

    return items.map((product) => (
      <TR key={product.id} selected={form.open && form.product?.id === product.id}>
        <TD className="max-w-[320px]">
          <div className="flex min-w-0 items-center gap-3">
            <Thumbnail product={product} />
            <div className="min-w-0">
              <p className="truncate font-medium text-slate-900">{product.name}</p>
              <p className="truncate font-mono text-xs text-slate-500">{product.sku}</p>
            </div>
          </div>
        </TD>
        <TD className="hidden whitespace-nowrap md:table-cell">{categoryName(product.categoryId)}</TD>
        <TD className="hidden whitespace-nowrap tabular-nums sm:table-cell">{formatCurrency(product.price)}</TD>
        <TD className="whitespace-nowrap">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="tabular-nums">{product.stockQuantity}</span>
            <StockBadge stock={product.stockQuantity} lowStock={product.lowStock} />
          </div>
        </TD>
        <TD className="hidden lg:table-cell">
          <ProductStatusBadge status={product.status} />
        </TD>
        <TD align="right">
          {canWrite && (
            <div className="flex justify-end gap-1">
              <Button
                variant="ghost"
                size="icon-sm"
                aria-label={`Edit ${product.name}`}
                title="Edit"
                onClick={() => openForm(product)}
              >
                <Pencil aria-hidden="true" />
              </Button>
              <Button
                variant="ghost"
                size="icon-sm"
                className="hover:bg-red-50 hover:text-red-700"
                aria-label={`Delete ${product.name}`}
                title="Delete"
                onClick={() => setPendingDelete(product)}
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
    <AdminPage
      module="products"
      previewAreas={["catalog"]}
      error={data ? products.error || categoriesQuery.error : categoriesQuery.error}
      onRetry={() => {
        products.reload();
        categoriesQuery.reload();
      }}
      retrying={products.loading}
      actions={
        canWrite && (
          <Button onClick={() => openForm(null)} icon={<Plus aria-hidden="true" />}>
            Add product
          </Button>
        )
      }
    >
      <Table
        aria-label="Products"
        header={
          <ListCardHeader title="Products" count={data ? data.total : undefined}>
            <div className="flex flex-col gap-3 lg:flex-row">
              <SearchInput
                wrapperClassName="lg:flex-1"
                aria-label="Search products"
                placeholder="Search by name, SKU or brand"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />
              <div className="grid gap-3 sm:grid-cols-3 lg:flex">
                <Select
                  aria-label="Filter by category"
                  className="lg:w-[200px]"
                  value={category}
                  options={categoryFilterOptions}
                  onChange={(event) => {
                    setCategory(event.target.value);
                    setPage(1);
                  }}
                />
                <Select
                  aria-label="Filter by status"
                  className="lg:w-[150px]"
                  value={status}
                  options={[{ value: "", label: "All statuses" }, ...productStatusOptions]}
                  onChange={(event) => {
                    setStatus(event.target.value);
                    setPage(1);
                  }}
                />
                <Select
                  aria-label="Filter by stock"
                  className="lg:w-[150px]"
                  value={stock}
                  options={stockFilterOptions}
                  onChange={(event) => {
                    setStock(event.target.value as "" | "low" | "out");
                    setPage(1);
                  }}
                />
              </div>
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
          <TH className="hidden md:table-cell">Category</TH>
          <TH className="hidden sm:table-cell">Price</TH>
          <TH>Stock</TH>
          <TH className="hidden lg:table-cell">Status</TH>
          <TH align="right" srOnly>
            Actions
          </TH>
        </THead>
        <TBody>{renderRows()}</TBody>
      </Table>

      {form.key > 0 && (
        <ProductForm
          key={form.key}
          open={form.open}
          product={form.product}
          categories={categories}
          usedInOptions={form.product && packageUsage ? (packageUsage.get(form.product.id) ?? 0) : undefined}
          onClose={closeForm}
          onSaved={() => {
            closeForm();
            products.reload();
          }}
        />
      )}

      <ConfirmDialog
        open={Boolean(pendingDelete)}
        onClose={() => {
          if (!deleting) setPendingDelete(null);
        }}
        onConfirm={remove}
        loading={deleting}
        loadingText="Deleting…"
        title="Delete product"
        description={
          pendingDelete
            ? packageUsage?.get(pendingDelete.id)
              ? `“${pendingDelete.name}” (${pendingDelete.sku}) is used in ${packageUsage.get(pendingDelete.id)} package option(s), so the server won’t delete it. Remove it from those packages first, or archive it instead.`
              : `Are you sure you want to delete “${pendingDelete.name}” (${pendingDelete.sku})? Its stock history is kept. This can’t be undone.`
            : ""
        }
        confirmLabel="Delete product"
        confirmIcon={<Trash2 aria-hidden="true" />}
      />
    </AdminPage>
  );
}

export default Products;
