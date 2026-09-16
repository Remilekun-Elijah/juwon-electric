/* eslint-disable react/prop-types */
import { useMemo, useState } from "react";
import { Images, Package, Pencil, Plus, SearchX, Trash2, Wrench } from "lucide-react";
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
  toast,
} from "../../../components/ui";
import { adminRequest } from "../../../utils/api";
import { LIMITS, validateUrlField } from "../../../utils/validation";
import {
  emptyPackage,
  emptyPortfolio,
  emptyService,
  packageTypeOptions,
} from "../constants/adminConstants";
import { formatCurrency, matchesQuery, parseMoney } from "../utils/adminFormatters";
import AdminPage from "./AdminPage";
import { PackageForm, PortfolioForm, ServiceForm } from "./ContentForms";
import { useAdmin } from "./adminContext";

const PAGE_SIZE = 20;

const config = {
  packages: {
    initial: emptyPackage,
    Form: PackageForm,
    icon: Package,
    singular: "package",
    plural: "packages",
    listTitle: "All packages",
    emptyDescription: "Add a package to list it on the shop.",
  },
  services: {
    initial: emptyService,
    Form: ServiceForm,
    icon: Wrench,
    singular: "service",
    plural: "services",
    listTitle: "All services",
    emptyDescription: "Add a service to show it on the Services page.",
  },
  portfolio: {
    initial: emptyPortfolio,
    Form: PortfolioForm,
    icon: Images,
    singular: "portfolio item",
    plural: "portfolio items",
    listTitle: "All portfolio items",
    emptyDescription: "Add photos of completed installations to show them on the Portfolio page.",
  },
};

const statusFilterOptions = [
  { value: "all", label: "All statuses" },
  { value: "active", label: "Active" },
  { value: "hidden", label: "Hidden" },
];

const typeFilterOptions = [{ value: "all", label: "All battery types" }, ...packageTypeOptions];

const getTitle = (item) => item.name || item.title || "Untitled";
const capitalize = (value = "") => (value ? value.charAt(0).toUpperCase() + value.slice(1) : "");
const toOptionsText = (options) =>
  typeof options === "string" ? options : JSON.stringify(options || [], null, 2);

const formatNumber = (value) => new Intl.NumberFormat("en-NG").format(value);

// Numeric fields accept a JSON number or a plain decimal string, as the API does (no signs, exponents or padding).
const DECIMAL_PATTERN = /^\d+(\.\d+)?$/;
const toNumber = (value) => {
  if (typeof value === "number") return Number.isFinite(value) ? value : NaN;
  if (typeof value === "string" && DECIMAL_PATTERN.test(value)) return Number(value);
  return NaN;
};
const isBlank = (value) => value === undefined || value === null || String(value).trim() === "";

const validateOption = (option, index) => {
  const label = `Option ${index + 1}`;
  if (!option || typeof option !== "object" || Array.isArray(option)) {
    return `${label} must be an object with "name", "price" and "kits".`;
  }
  if (option.name != null && typeof option.name !== "string") return `${label}: name must be text.`;
  if (!String(option.name ?? "").trim()) return `${label}: name is required.`;
  if (String(option.name).trim().length > LIMITS.optionName) {
    return `${label}: name must be ${LIMITS.optionName} characters or fewer.`;
  }
  if (option.kits != null && typeof option.kits !== "string") return `${label}: kits must be text.`;
  if (!String(option.kits ?? "").trim()) return `${label}: kits is required.`;
  if (String(option.kits).trim().length > LIMITS.optionKits) {
    return `${label}: kits must be ${LIMITS.optionKits} characters or fewer.`;
  }
  const price = toNumber(option.price);
  if (!(price > 0) || price > LIMITS.optionPriceMax) {
    return `${label}: price must be a number greater than 0 and at most ${formatNumber(LIMITS.optionPriceMax)}.`;
  }
  return "";
};

const parseOptions = (text) => {
  let parsed;
  try {
    parsed = JSON.parse(text);
  } catch {
    return { error: "This isn’t valid JSON. Check for missing quotes, commas or brackets." };
  }
  if (!Array.isArray(parsed)) return { error: "Enter a list of options inside square brackets [ ]." };
  if (parsed.length === 0) return { error: "Add at least one price option." };
  if (parsed.length > LIMITS.packageOptions) {
    return { error: `A package can have up to ${LIMITS.packageOptions} options.` };
  }
  const optionError = parsed.map(validateOption).find(Boolean);
  return optionError ? { error: optionError } : { value: parsed };
};

const tooLong = (value, max, label) =>
  String(value ?? "").trim().length > max ? `${label} must be ${max} characters or fewer.` : "";

const positiveNumberError = (value, label, max, { required = false } = {}) => {
  if (isBlank(value)) return required ? `${label} is required.` : "";
  const text = typeof value === "string" ? value.trim() : value;
  if (Number.isNaN(toNumber(text))) return `${label} must be a number.`;
  if (String(text).length > max) return `${label} must be ${max} characters or fewer.`;
  return toNumber(text) > 0 ? "" : `${label} must be greater than 0.`;
};

const LEGACY_ID_MAX = 1_000_000_000;
const legacyIdError = (value) => {
  if (isBlank(value)) return "";
  const text = typeof value === "string" ? value.trim() : value;
  const number = typeof text === "number" ? text : /^\d+$/.test(text) ? Number(text) : NaN;
  return Number.isInteger(number) && number >= 0 && number <= LEGACY_ID_MAX
    ? ""
    : `Shop id must be a whole number from 0 to ${formatNumber(LEGACY_ID_MAX)}.`;
};

/** Package payload in the shape the API validates: blank volt clears it, a blank shop id is left unchanged. */
const toPackagePayload = (model, options) => {
  const payload = { ...model, options };
  const trimmed = (value) => (typeof value === "string" ? value.trim() : value);
  payload.kva = trimmed(model.kva);
  payload.volt = isBlank(model.volt) ? null : trimmed(model.volt);
  if (isBlank(model.legacyId)) delete payload.legacyId;
  else payload.legacyId = Number(trimmed(model.legacyId));
  return payload;
};

// Mirrors the API's limits and URL rule so problems show next to the field before saving.
const validateModel = (type, model) => {
  const errors =
    type === "packages"
      ? {
          name: tooLong(model.name, LIMITS.packageName, "Name"),
          kva: positiveNumberError(model.kva, "Inverter size", LIMITS.packageKva, { required: true }),
          volt: positiveNumberError(model.volt, "Voltage", LIMITS.packageVolt),
          legacyId: legacyIdError(model.legacyId),
          load: tooLong(model.load, LIMITS.packageLoad, "What it can power"),
        }
      : type === "services"
      ? {
          title: tooLong(model.title, LIMITS.serviceTitle, "Title"),
          subtitle: tooLong(model.subtitle, LIMITS.serviceSubtitle, "Description"),
          ctaLabel: tooLong(model.ctaLabel, LIMITS.serviceCtaLabel, "Button label"),
          image: validateUrlField(model.image, "Image"),
          ctaUrl: validateUrlField(model.ctaUrl, "Button link"),
        }
      : {
          name: tooLong(model.name, LIMITS.portfolioName, "Name"),
          image: validateUrlField(model.image, "Image"),
          link: validateUrlField(model.link, "Link"),
        };
  return Object.fromEntries(Object.entries(errors).filter(([, message]) => message));
};

const getPriceRange = (options = []) => {
  const prices = (Array.isArray(options) ? options : []).map((option) => parseMoney(option.price)).filter(Boolean);
  if (!prices.length) return "—";
  const min = Math.min(...prices);
  const max = Math.max(...prices);
  return min === max ? formatCurrency(min) : `${formatCurrency(min)} – ${formatCurrency(max)}`;
};

const PackageCells = ({ item }) => (
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

const ServiceCells = ({ item }) => (
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

const PortfolioCells = ({ item }) => (
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

const columns = {
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

const ContentManager = ({ type, data, reload }) => {
  const { loaded, error: loadError, refresh, loading } = useAdmin();
  const { initial, Form, icon: Icon, singular, plural, listTitle, emptyDescription } = config[type];
  const { Cells, headers } = columns[type];
  const loadKey = type;

  const [model, setModel] = useState(initial);
  const [editingId, setEditingId] = useState("");
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [optionsText, setOptionsText] = useState(toOptionsText(initial.options));
  const [optionsError, setOptionsError] = useState("");
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");
  const [fieldErrors, setFieldErrors] = useState({});
  const [pageError, setPageError] = useState("");
  const [pendingDelete, setPendingDelete] = useState(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [query, setQuery] = useState("");
  const [packageTypeFilter, setPackageTypeFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [page, setPage] = useState(1);

  const items = useMemo(
    () => (type === "services" ? data.services?.offerings || [] : data[type] || []),
    [data, type]
  );

  const visibleItems = useMemo(
    () =>
      items.filter((item) => {
        if (type === "packages" && packageTypeFilter !== "all" && item.type?.toLowerCase() !== packageTypeFilter.toLowerCase()) {
          return false;
        }
        if (statusFilter === "active" && item.isActive === false) return false;
        if (statusFilter === "hidden" && item.isActive !== false) return false;
        return matchesQuery(query, item.name, item.title, item.subtitle, item.load, item.type, item.image, item.kva);
      }),
    [items, packageTypeFilter, statusFilter, query, type]
  );

  const pageData = paginate(visibleItems, page, PAGE_SIZE);
  const firstLoad = !loaded[loadKey];
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

  const edit = (item) => {
    setEditingId(item.id);
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

  const submit = async (event) => {
    event.preventDefault();
    let payload = model;
    const errors = validateModel(type, model);
    setFieldErrors(errors);
    const optionsResult = type === "packages" ? validateOptions() : null;
    if (Object.keys(errors).length || optionsResult?.error) {
      setFormError("");
      return;
    }
    if (optionsResult) payload = toPackagePayload(model, optionsResult.value);

    setSaving(true);
    setFormError("");
    try {
      await adminRequest(`/${type}${editingId ? `/${editingId}` : ""}`, {
        method: editingId ? "PUT" : "POST",
        body: JSON.stringify(payload),
      });
      toast.success(editingId ? `${capitalize(singular)} updated` : `${capitalize(singular)} added`);
      setDrawerOpen(false);
      await reload();
    } catch (event) {
      setFormError(event.message);
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    if (!pendingDelete) return;
    const { id } = pendingDelete;
    setDeleting(true);
    setPageError("");
    try {
      await adminRequest(`/${type}/${id}`, { method: "DELETE" });
      if (id === editingId) {
        setDrawerOpen(false);
        resetEditor();
      }
      toast.success(`${capitalize(singular)} deleted`);
      setConfirmOpen(false);
      await reload();
    } catch (event) {
      setConfirmOpen(false);
      setPageError(`Couldn’t delete “${getTitle(pendingDelete)}”. ${event.message}`);
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

  const renderRows = () => {
    if (firstLoad && loadError) {
      return (
        <TableEmpty colSpan={colSpan}>
          <ErrorState
            title={`${capitalize(plural)} couldn’t be loaded`}
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
          icon={Icon}
          title={`No ${plural} yet`}
          description={emptyDescription}
          action={
            <Button size="sm" onClick={openCreate} icon={<Plus aria-hidden="true" />}>
              Add {singular}
            </Button>
          }
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

    return pageData.items.map((item) => (
      <TR key={item.id} selected={drawerOpen && item.id === editingId}>
        <Cells item={item} />
        <TD>
          <StatusBadge type="catalog" status={item.isActive !== false} />
        </TD>
        <TD align="right">
          <div className="flex justify-end gap-1">
            <Button variant="ghost" size="icon-sm" aria-label={`Edit ${getTitle(item)}`} title="Edit" onClick={() => edit(item)}>
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
        </TD>
      </TR>
    ));
  };

  const formId = `${type}-form`;

  return (
    <AdminPage
      module={type}
      showLoadError={!firstLoad}
      actions={
        <Button onClick={openCreate} icon={<Plus aria-hidden="true" />}>
          Add {singular}
        </Button>
      }
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

      <Drawer
        className="font-sans antialiased"
        open={drawerOpen}
        onClose={closeDrawer}
        size="lg"
        title={editingId ? `Edit ${singular}` : `Add ${singular}`}
        description={editingId ? getTitle(model) : `Fields marked * are required.`}
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
        <form id={formId} onSubmit={submit} className="space-y-5">
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
};

export default ContentManager;
