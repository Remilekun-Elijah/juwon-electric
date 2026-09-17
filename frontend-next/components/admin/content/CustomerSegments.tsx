"use client";

import { useMemo, useState, type FormEvent } from "react";
import { toast } from "sonner";
import { ImageOff, Pencil, Plus, SearchX, Trash2, UsersRound } from "lucide-react";
import {
  Alert,
  Button,
  ConfirmDialog,
  Drawer,
  ErrorState,
  Field,
  Input,
  ListCardHeader,
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
  Textarea,
} from "@/components/ui";
import { useAdmin, useAdminQuery } from "@/components/admin/AdminContext";
import { ImageUpload } from "@/components/admin/ImageUpload";
import {
  ApiError,
  deleteCustomerSegment,
  getServicesAdmin,
  saveCustomerSegment,
  type CustomerSegmentInput,
} from "@/lib/api/admin";
import type { CustomerSegment } from "@/lib/api/types";
import { matchesQuery } from "@/lib/admin/format";
import { isImageLocation } from "@/lib/admin/website";
import { validateImageUrl } from "@/lib/admin/imageUpload";
import { LIMITS } from "@/lib/validation";

type SegmentModel = Pick<CustomerSegment, "title" | "subtitle" | "image" | "isActive">;
type SegmentErrors = Partial<Record<keyof SegmentModel, string>>;

const emptySegment: SegmentModel = { title: "", subtitle: "", image: "", isActive: true };
const FORM_ID = "customer-segment-form";

const textError = (value: string, max: number, label: string) => {
  const text = value.trim();
  if (!text) return `${label} is required.`;
  return text.length > max ? `${label} must be ${max} characters or fewer.` : "";
};

// Mirrors the API (backend/controllers/services.js segmentPayload): title and subtitle required, image a required URL.
const validateSegment = (model: SegmentModel): SegmentErrors => {
  const errors: SegmentErrors = {
    title: textError(model.title, LIMITS.serviceTitle, "Title"),
    subtitle: textError(model.subtitle, LIMITS.serviceSubtitle, "Subtitle"),
    image: validateImageUrl(model.image, "Image", { required: true }),
  };
  return Object.fromEntries(Object.entries(errors).filter(([, message]) => message)) as SegmentErrors;
};

const errorText = (error: unknown) => (error instanceof Error ? error.message : "Something went wrong.");
const isForbidden = (error: unknown) => error instanceof ApiError && error.status === 403;

function Thumbnail({ src, title }: { src: string; title: string }) {
  const valid = isImageLocation(src);
  return (
    <span
      role="img"
      aria-label={valid ? `Image for ${title}` : `No image for ${title}`}
      className="flex size-12 shrink-0 items-center justify-center overflow-hidden rounded-md border border-slate-200 bg-slate-100 bg-cover bg-center text-slate-400"
      style={valid ? { backgroundImage: `url(${JSON.stringify(src.trim())})` } : undefined}
    >
      {!valid && <ImageOff className="size-4" aria-hidden="true" />}
    </span>
  );
}

/** Customer segments ("Who we serve") shown on the Services page. No Vite screen existed; built with the kit patterns. */
export function CustomerSegments() {
  const { can } = useAdmin();
  const canWrite = can("content:write");
  const list = useAdminQuery<CustomerSegment[]>(
    "content:customer-segments",
    async () => (await getServicesAdmin()).data?.customerSegments || []
  );

  const [model, setModel] = useState<SegmentModel>(emptySegment);
  const [editing, setEditing] = useState<CustomerSegment | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<SegmentErrors>({});
  const [pageError, setPageError] = useState("");
  const [pendingDelete, setPendingDelete] = useState<CustomerSegment | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [query, setQuery] = useState("");

  const items = useMemo(() => list.data ?? [], [list.data]);
  const visibleItems = useMemo(
    () => items.filter((item) => matchesQuery(query, item.title, item.subtitle, item.image)),
    [items, query]
  );
  const firstLoad = list.data === undefined;
  const colSpan = 4;

  const openCreate = () => {
    setEditing(null);
    setModel(emptySegment);
    setFormError("");
    setFieldErrors({});
    setDrawerOpen(true);
  };

  const edit = (item: CustomerSegment) => {
    setEditing(item);
    setModel({ title: item.title ?? "", subtitle: item.subtitle ?? "", image: item.image ?? "", isActive: item.isActive !== false });
    setFormError("");
    setFieldErrors({});
    setDrawerOpen(true);
  };

  const closeDrawer = () => {
    if (saving) return;
    setDrawerOpen(false);
  };

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const errors = validateSegment(model);
    setFieldErrors(errors);
    setFormError("");
    if (Object.keys(errors).length) return;

    const input: CustomerSegmentInput = {
      title: model.title.trim(),
      subtitle: model.subtitle.trim(),
      image: model.image.trim(),
      isActive: model.isActive,
    };
    setSaving(true);
    try {
      const response = await saveCustomerSegment(editing?.id ?? null, input);
      toast.success(response.message || (editing ? "Customer segment updated." : "Customer segment created."));
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
    if (!pendingDelete) return;
    const target = pendingDelete;
    setDeleting(true);
    setPageError("");
    try {
      const response = await deleteCustomerSegment(target.id);
      if (editing?.id === target.id) setDrawerOpen(false);
      toast.success(response.message || "Customer segment deleted.");
      setConfirmOpen(false);
      list.reload();
    } catch (error) {
      setConfirmOpen(false);
      if (isForbidden(error)) toast.error(errorText(error));
      else setPageError(`Couldn’t delete “${target.title}”. ${errorText(error)}`);
    } finally {
      setDeleting(false);
    }
  };

  const addButton = canWrite ? (
    <Button size="sm" onClick={openCreate} icon={<Plus aria-hidden="true" />}>
      Add segment
    </Button>
  ) : undefined;

  const renderRows = () => {
    if (firstLoad && list.error) {
      return (
        <TableEmpty colSpan={colSpan}>
          <ErrorState
            title="Customer segments couldn’t be loaded"
            description={list.error}
            onRetry={list.reload}
            retrying={list.loading}
          />
        </TableEmpty>
      );
    }

    if (firstLoad) {
      return Array.from({ length: 3 }, (_, index) => (
        <TR key={index}>
          <TD colSpan={colSpan}>
            <Skeleton className="h-12 w-full" />
          </TD>
        </TR>
      ));
    }

    if (!items.length) {
      return (
        <TableEmpty
          colSpan={colSpan}
          icon={UsersRound}
          title="No customer segments yet"
          description="Add the kinds of customers you serve, such as homes or businesses, to show them on the Services page."
          action={addButton}
        />
      );
    }

    if (!visibleItems.length) {
      return (
        <TableEmpty
          colSpan={colSpan}
          icon={SearchX}
          title="No customer segments match your search"
          description="Try a different search."
          action={
            <Button size="sm" variant="outline" onClick={() => setQuery("")}>
              Clear search
            </Button>
          }
        />
      );
    }

    return visibleItems.map((item) => (
      <TR key={item.id} selected={drawerOpen && editing?.id === item.id}>
        <TD className="max-w-[360px]">
          <div className="flex min-w-0 items-center gap-3">
            <Thumbnail src={item.image} title={item.title} />
            <div className="min-w-0">
              <p className="truncate font-medium text-slate-900">{item.title}</p>
              <p className="truncate text-sm text-slate-500">{item.subtitle}</p>
            </div>
          </div>
        </TD>
        <TD className="hidden max-w-[220px] md:table-cell">
          <p className="truncate font-mono text-xs text-slate-500">{item.image || "—"}</p>
        </TD>
        <TD>
          <StatusBadge type="catalog" status={item.isActive !== false} />
        </TD>
        <TD align="right">
          {canWrite && (
            <div className="flex justify-end gap-1">
              <Button
                variant="ghost"
                size="icon-sm"
                aria-label={`Edit ${item.title}`}
                title="Edit"
                onClick={() => edit(item)}
              >
                <Pencil aria-hidden="true" />
              </Button>
              <Button
                variant="ghost"
                size="icon-sm"
                className="hover:bg-red-50 hover:text-red-700"
                aria-label={`Delete ${item.title}`}
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

  return (
    <section className="space-y-4">
      {pageError && (
        <Alert tone="danger" onDismiss={() => setPageError("")}>
          {pageError}
        </Alert>
      )}
      {!firstLoad && list.error && (
        <Alert tone="danger" title="Couldn’t load the latest customer segments">
          <p>{list.error}</p>
          <Button variant="link" size="sm" className="mt-1 text-red-700" onClick={list.reload} disabled={list.loading}>
            Try again
          </Button>
        </Alert>
      )}

      <Table
        aria-label="Customer segments"
        header={
          <ListCardHeader
            title="Customer segments"
            description="The kinds of customers listed under “Who we serve” on the Services page."
            count={firstLoad ? undefined : items.length}
            actions={addButton}
          >
            {items.length > 0 && (
              <SearchInput
                aria-label="Search customer segments"
                placeholder="Search customer segments"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
              />
            )}
          </ListCardHeader>
        }
      >
        <THead>
          <TH>Segment</TH>
          <TH className="hidden md:table-cell">Image</TH>
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
        title={editing ? "Edit customer segment" : "Add customer segment"}
        description={editing ? editing.title : "Fields marked * are required."}
        footer={
          <>
            <Button variant="outline" onClick={closeDrawer} disabled={saving}>
              Cancel
            </Button>
            <Button type="submit" form={FORM_ID} loading={saving} loadingText="Saving…">
              {editing ? "Save changes" : "Add segment"}
            </Button>
          </>
        }
      >
        <form id={FORM_ID} onSubmit={submit} className="space-y-5" noValidate>
          {formError && (
            <Alert tone="danger" title="Couldn’t save the customer segment">
              {formError}
            </Alert>
          )}
          <Field label="Title" required error={fieldErrors.title}>
            <Input
              value={model.title}
              onChange={(event) => setModel({ ...model, title: event.target.value })}
              placeholder="Homes"
              maxLength={LIMITS.serviceTitle}
            />
          </Field>
          <Field label="Subtitle" required error={fieldErrors.subtitle}>
            <Textarea
              rows={4}
              value={model.subtitle}
              onChange={(event) => setModel({ ...model, subtitle: event.target.value })}
              maxLength={LIMITS.serviceSubtitle}
            />
          </Field>
          <ImageUpload
            label="Image"
            required
            value={model.image}
            onChange={(image) => setModel((current) => ({ ...current, image }))}
            purpose="segments"
            error={fieldErrors.image}
            linkHelper="A photo in the site’s public folder, e.g. /panel-4.webp, or a full https:// URL."
            linkPlaceholder="/panel-4.webp"
            previewAlt={model.title ? `Image for ${model.title}` : "Segment image"}
          />
          <Switch
            label="Show on the Services page"
            description="Hidden segments stay here but aren’t shown to customers."
            checked={model.isActive}
            onChange={(value) => setModel({ ...model, isActive: value })}
          />
        </form>
      </Drawer>

      <ConfirmDialog
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        onConfirm={remove}
        loading={deleting}
        loadingText="Deleting…"
        title="Delete customer segment"
        description={
          pendingDelete
            ? `Are you sure you want to delete “${pendingDelete.title}”? It will be removed from the site. This can’t be undone.`
            : ""
        }
        confirmLabel="Delete segment"
        confirmIcon={<Trash2 aria-hidden="true" />}
      />
    </section>
  );
}

export default CustomerSegments;
