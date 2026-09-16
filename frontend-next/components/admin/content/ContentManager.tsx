"use client";

import { useMemo, useState, type FormEvent, type ReactNode } from "react";
import { toast } from "sonner";
import { Images, Package, Pencil, Plus, SearchX, Trash2, Wrench, type LucideIcon } from "lucide-react";
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
  paginate,
} from "@/components/admin/kit";
import { useAdmin, useAdminQuery } from "@/components/admin/AdminContext";
import { AdminPage } from "@/components/admin/AdminPage";
import { ApiError, adminFetch, getServicesAdmin } from "@/lib/api/admin";
import { formatCurrency, matchesQuery, parseMoney } from "@/lib/admin/format";
import { PackageForm, PortfolioForm, ServiceForm, type ContentFormProps } from "./ContentForms";
import {
  capitalize,
  emptyPackage,
  emptyPortfolio,
  emptyService,
  getTitle,
  packageTypeOptions,
  parseOptions,
  toOptionsText,
  toPackagePayload,
  validateModel,
  type ContentItem,
  type ContentType,
  type FieldErrors,
} from "./contentConstants";

const PAGE_SIZE = 20;

type TypeConfig = {
  initial: ContentItem;
  Form: (props: ContentFormProps) => ReactNode;
  icon: LucideIcon;
  singular: string;
  plural: string;
  listTitle: string;
  emptyDescription: string;
  load: () => Promise<ContentItem[]>;
};

const config: Record<ContentType, TypeConfig> = {
  packages: {
    initial: emptyPackage,
    Form: PackageForm,
    icon: Package,
    singular: "package",
    plural: "packages",
    listTitle: "All packages",
    emptyDescription: "Add a package to list it on the shop.",
    load: async () => (await adminFetch<ContentItem[]>("/packages")).data || [],
  },
  services: {
    initial: emptyService,
    Form: ServiceForm,
    icon: Wrench,
    singular: "service",
    plural: "services",
    listTitle: "All services",
    emptyDescription: "Add a service to show it on the Services page.",
    load: async () => ((await getServicesAdmin()).data?.offerings as ContentItem[] | undefined) || [],
  },
  portfolio: {
    initial: emptyPortfolio,
    Form: PortfolioForm,
    icon: Images,
    singular: "portfolio item",
    plural: "portfolio items",
    listTitle: "All portfolio items",
    emptyDescription: "Add photos of completed installations to show them on the Portfolio page.",
    load: async () => (await adminFetch<ContentItem[]>("/portfolio")).data || [],
  },
};

const statusFilterOptions = [
  { value: "all", label: "All statuses" },
  { value: "active", label: "Active" },
  { value: "hidden", label: "Hidden" },
];

const typeFilterOptions = [{ value: "all", label: "All battery types" }, ...packageTypeOptions];

const getPriceRange = (options: ContentItem["options"]) => {
  const prices = (Array.isArray(options) ? options : []).map((option) => parseMoney(option?.price)).filter(Boolean);
  if (!prices.length) return "—";
  const min = Math.min(...prices);
  const max = Math.max(...prices);
  return min === max ? formatCurrency(min) : `${formatCurrency(min)} – ${formatCurrency(max)}`;
};

type CellsProps = { item: ContentItem };

function PackageCells({ item }: CellsProps) {
  return (
    <>
      <TD className="max-w-[280px]">
        <p className="truncate font-medium text-slate-900">{getTitle(item)}</p>
        <p className="truncate text-sm text-slate-500">{item.load}</p>
      </TD>
      <TD className="hidden whitespace-nowrap md:table-cell">{capitalize(item.type)}</TD>
      <TD className="hidden whitespace-nowrap tabular-nums sm:table-cell">
        {item.kva ? `${item.kva} kVA` : "—"}
        {item.volt ? <span className="text-slate-400"> · {item.volt} V</span> : null}
      </TD>
      <TD className="hidden whitespace-nowrap tabular-nums lg:table-cell">{getPriceRange(item.options)}</TD>
    </>
  );
}

function ServiceCells({ item }: CellsProps) {
  return (
    <>
      <TD className="max-w-[320px]">
        <p className="truncate font-medium text-slate-900">{getTitle(item)}</p>
        <p className="truncate text-sm text-slate-500">{item.subtitle}</p>
      </TD>
      <TD className="hidden max-w-[200px] md:table-cell">
        <p className="truncate font-mono text-xs text-slate-500">{item.image || "—"}</p>
      </TD>
      <TD className="hidden whitespace-nowrap lg:table-cell">
        {item.ctaLabel ? (
          <>
            {item.ctaLabel} <span className="text-slate-400">→ {item.ctaUrl}</span>
          </>
        ) : (
          "—"
        )}
      </TD>
    </>
  );
}

function PortfolioCells({ item }: CellsProps) {
  return (
    <>
      <TD className="max-w-[280px]">
        <p className="truncate font-medium text-slate-900">{getTitle(item)}</p>
        <p className="truncate font-mono text-xs text-slate-500 md:hidden">{item.image}</p>
      </TD>
      <TD className="hidden max-w-[220px] md:table-cell">
        <p className="truncate font-mono text-xs text-slate-500">{item.image || "—"}</p>
      </TD>
      <TD className="hidden lg:table-cell">
        <div className="flex flex-wrap gap-1.5">
          {item.featured && <StatusBadge type="catalog" status="featured" />}
          <Badge tone="neutral">{item.mobile ? "Mobile and desktop" : "Desktop only"}</Badge>
        </div>
      </TD>
    </>
  );
}

type Header = { label: string; className?: string };

const columns: Record<ContentType, { Cells: (props: CellsProps) => ReactNode; headers: Header[] }> = {
  packages: {
    Cells: PackageCells,
    headers: [
      { label: "Package" },
      { label: "Battery type", className: "hidden md:table-cell" },
      { label: "Size", className: "hidden sm:table-cell" },
      { label: "Price", className: "hidden lg:table-cell" },
    ],
  },
  services: {
    Cells: ServiceCells,
    headers: [
      { label: "Service" },
      { label: "Image", className: "hidden md:table-cell" },
      { label: "Button", className: "hidden lg:table-cell" },
    ],
  },
  portfolio: {
    Cells: PortfolioCells,
    headers: [
      { label: "Project" },
      { label: "Image", className: "hidden md:table-cell" },
      { label: "Placement", className: "hidden lg:table-cell" },
    ],
  },
};

const errorText = (error: unknown) => (error instanceof Error ? error.message : "Something went wrong.");
const isForbidden = (error: unknown) => error instanceof ApiError && error.status === 403;

type ContentManagerProps = {
  type: ContentType;
  /** Extra sections rendered below the list inside the same page (the Services page adds customer segments). */
  children?: ReactNode;
};

/** Packages, services and portfolio list with search, filters, a create/edit drawer and delete confirmation. */
export function ContentManager({ type, children }: ContentManagerProps) {
  const { can } = useAdmin();
  const canWrite = can("content:write");
  const { initial, Form, icon: Icon, singular, plural, listTitle, emptyDescription, load } = config[type];
  const { Cells, headers } = columns[type];
  const list = useAdminQuery<ContentItem[]>(`content:${type}`, load);

  const [model, setModel] = useState<ContentItem>(initial);
  const [editingId, setEditingId] = useState("");
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [optionsText, setOptionsText] = useState(toOptionsText(initial.options));
  const [optionsError, setOptionsError] = useState("");
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [pageError, setPageError] = useState("");
  const [pendingDelete, setPendingDelete] = useState<ContentItem | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [query, setQuery] = useState("");
  const [packageTypeFilter, setPackageTypeFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [page, setPage] = useState(1);

  const items = useMemo(() => list.data ?? [], [list.data]);

  const visibleItems = useMemo(
    () =>
      items.filter((item) => {
        if (
          type === "packages" &&
          packageTypeFilter !== "all" &&
          item.type?.toLowerCase() !== packageTypeFilter.toLowerCase()
        ) {
          return false;
        }
        if (statusFilter === "active" && item.isActive === false) return false;
        if (statusFilter === "hidden" && item.isActive !== false) return false;
        return matchesQuery(query, item.name, item.title, item.subtitle, item.load, item.type, item.image, item.kva);
      }),
    [items, packageTypeFilter, statusFilter, query, type]
  );

  const pageData = paginate(visibleItems, page, PAGE_SIZE);
  const firstLoad = list.data === undefined;
  const filtersActive = Boolean(query.trim()) || packageTypeFilter !== "all" || statusFilter !== "all";
  const colSpan = headers.length + 2;

  const resetEditor = () => {
    setEditingId("");
    setModel(initial);
    setOptionsText(toOptionsText(initial.options));
    setOptionsError("");
    setFormError("");
    setFieldErrors({});
  };

  const openCreate = () => {
    resetEditor();
    setDrawerOpen(true);
  };

  const edit = (item: ContentItem) => {
    setEditingId(item.id ?? "");
    setModel({ ...initial, ...item });
    setOptionsText(toOptionsText(item.options ?? initial.options));
    setOptionsError("");
    setFormError("");
    setFieldErrors({});
    setDrawerOpen(true);
  };

  const closeDrawer = () => {
    if (saving) return;
    setDrawerOpen(false);
  };

  const validateOptions = () => {
    const result = parseOptions(optionsText);
    setOptionsError(result.error || "");
    return result;
  };

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    let payload = model;
    const errors = validateModel(type, model);
    setFieldErrors(errors);
    const optionsResult = type === "packages" ? validateOptions() : null;
    if (Object.keys(errors).length || optionsResult?.error) {
      setFormError("");
      return;
    }
    if (optionsResult?.value) payload = toPackagePayload(model, optionsResult.value);

    setSaving(true);
    setFormError("");
    try {
      const response = await adminFetch<ContentItem>(`/${type}${editingId ? `/${encodeURIComponent(editingId)}` : ""}`, {
        method: editingId ? "PUT" : "POST",
        body: payload,
      });
      toast.success(response.message || (editingId ? `${capitalize(singular)} updated` : `${capitalize(singular)} added`));
      setDrawerOpen(false);
      list.reload();
    } catch (error) {
      if (isForbidden(error)) toast.error(errorText(error));
      setFormError(errorText(error));
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    if (!pendingDelete?.id) return;
    const { id } = pendingDelete;
    setDeleting(true);
    setPageError("");
    try {
      const response = await adminFetch<ContentItem>(`/${type}/${encodeURIComponent(id)}`, { method: "DELETE" });
      if (id === editingId) {
        setDrawerOpen(false);
        resetEditor();
      }
      toast.success(response.message || `${capitalize(singular)} deleted`);
      setConfirmOpen(false);
      list.reload();
    } catch (error) {
      setConfirmOpen(false);
      if (isForbidden(error)) toast.error(errorText(error));
      else setPageError(`Couldn’t delete “${getTitle(pendingDelete)}”. ${errorText(error)}`);
    } finally {
      setDeleting(false);
    }
  };

  const clearFilters = () => {
    setQuery("");
    setPackageTypeFilter("all");
    setStatusFilter("all");
    setPage(1);
  };

  const addButton = (size?: "sm") =>
    canWrite ? (
      <Button size={size} onClick={openCreate} icon={<Plus aria-hidden="true" />}>
        Add {singular}
      </Button>
    ) : undefined;

  const renderRows = () => {
    if (firstLoad && list.error) {
      return (
        <TableEmpty colSpan={colSpan}>
          <ErrorState
            title={`${capitalize(plural)} couldn’t be loaded`}
            description={list.error}
            onRetry={list.reload}
            retrying={list.loading}
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
          icon={Icon}
          title={`No ${plural} yet`}
          description={emptyDescription}
          action={addButton("sm")}
        />
      );
    }

    if (!visibleItems.length) {
      return (
        <TableEmpty
          colSpan={colSpan}
          icon={SearchX}
          title={`No ${plural} match your filters`}
          description="Try a different search or clear the filters."
          action={
            <Button size="sm" variant="outline" onClick={clearFilters}>
              Clear filters
            </Button>
          }
        />
      );
    }

    return pageData.items.map((item, index) => (
      <TR key={item.id ?? index} selected={drawerOpen && item.id === editingId}>
        <Cells item={item} />
        <TD>
          <StatusBadge type="catalog" status={item.isActive !== false} />
        </TD>
        <TD align="right">
          {canWrite && (
            <div className="flex justify-end gap-1">
              <Button
                variant="ghost"
                size="icon-sm"
                aria-label={`Edit ${getTitle(item)}`}
                title="Edit"
                onClick={() => edit(item)}
              >
                <Pencil aria-hidden="true" />
              </Button>
              <Button
                variant="ghost"
                size="icon-sm"
                className="hover:bg-red-50 hover:text-red-700"
                aria-label={`Delete ${getTitle(item)}`}
                title="Delete"
                onClick={() => {
                  setPendingDelete(item);
                  setConfirmOpen(true);
                }}
              >
                <Trash2 aria-hidden="true" />
              </Button>
            </div>
          )}
        </TD>
      </TR>
    ));
  };

  const formId = `${type}-form`;

  return (
    <AdminPage
      module={type}
      actions={addButton()}
      error={firstLoad ? undefined : list.error}
      onRetry={list.reload}
      retrying={list.loading}
    >
      {pageError && (
        <Alert tone="danger" onDismiss={() => setPageError("")}>
          {pageError}
        </Alert>
      )}

      <Table
        aria-label={listTitle}
        header={
          <ListCardHeader title={listTitle} count={firstLoad ? undefined : items.length}>
            <div className="flex flex-col gap-3 sm:flex-row">
              <SearchInput
                wrapperClassName="sm:flex-1"
                aria-label={`Search ${plural}`}
                placeholder={`Search ${plural}`}
                value={query}
                onChange={(event) => {
                  setQuery(event.target.value);
                  setPage(1);
                }}
              />
              {type === "packages" && (
                <Select
                  aria-label="Filter by battery type"
                  className="sm:w-[180px]"
                  value={packageTypeFilter}
                  options={typeFilterOptions}
                  onChange={(event) => {
                    setPackageTypeFilter(event.target.value);
                    setPage(1);
                  }}
                />
              )}
              <Select
                aria-label="Filter by status"
                className="sm:w-[150px]"
                value={statusFilter}
                options={statusFilterOptions}
                onChange={(event) => {
                  setStatusFilter(event.target.value);
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
          !firstLoad && (
            <Pagination
              page={pageData.page}
              totalItems={visibleItems.length}
              pageSize={PAGE_SIZE}
              onChange={setPage}
              itemLabel={plural}
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
          <TH>Status</TH>
          <TH align="right" srOnly>
            Actions
          </TH>
        </THead>
        <TBody>{renderRows()}</TBody>
      </Table>

      {children}

      <Drawer
        className="font-sans antialiased"
        open={drawerOpen}
        onClose={closeDrawer}
        size="lg"
        title={editingId ? `Edit ${singular}` : `Add ${singular}`}
        description={editingId ? getTitle(model) : "Fields marked * are required."}
        footer={
          <>
            <Button variant="outline" onClick={closeDrawer} disabled={saving}>
              Cancel
            </Button>
            <Button type="submit" form={formId} loading={saving} loadingText="Saving…">
              {editingId ? "Save changes" : `Add ${singular}`}
            </Button>
          </>
        }
      >
        <form id={formId} onSubmit={submit} className="space-y-5" noValidate>
          {formError && (
            <Alert tone="danger" title={`Couldn’t save the ${singular}`}>
              {formError}
            </Alert>
          )}
          <Form
            model={model}
            setModel={setModel}
            optionsText={optionsText}
            setOptionsText={setOptionsText}
            optionsError={optionsError}
            validateOptions={validateOptions}
            errors={fieldErrors}
          />
        </form>
      </Drawer>

      <ConfirmDialog
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        onConfirm={remove}
        loading={deleting}
        loadingText="Deleting…"
        title={`Delete ${singular}`}
        description={
          pendingDelete
            ? `Are you sure you want to delete “${getTitle(pendingDelete)}”? It will be removed from the site. This can’t be undone.`
            : ""
        }
        confirmLabel={`Delete ${singular}`}
        confirmIcon={<Trash2 aria-hidden="true" />}
      />
    </AdminPage>
  );
}

export default ContentManager;
