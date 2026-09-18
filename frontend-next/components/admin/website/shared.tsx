"use client";

import { useMemo, useState, type ReactNode } from "react";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Alert, Badge, Button, ConfirmDialog, Drawer } from "@/components/ui";
import { useAdmin, useAdminQuery } from "@/components/admin/AdminContext";
import { UploadBusyScope } from "@/components/admin/ImageUpload";
import { errorMessage } from "@/lib/admin/format";
import { SAMPLE_BANNER, bySortOrder } from "@/lib/admin/website";
import { ApiError } from "@/lib/api/admin";
import type { ApiEnvelope } from "@/lib/api/client";

/** Neutral "Sample" badge for seeded records and settings sections (LANDING_V1 §0). */
export function SampleBadge({ className }: { className?: string }) {
  return (
    <Badge tone="neutral" className={className} title="Seeded sample content">
      Sample
    </Badge>
  );
}

/** Warning shown above a module while any of its records is still sample content. */
export function SampleBanner() {
  return (
    <Alert tone="warning" title="Sample content">
      <p>{SAMPLE_BANNER}</p>
    </Alert>
  );
}

export type CollectionRecord = {
  id: string;
  sortOrder?: number | null;
  isActive?: boolean;
  sample?: boolean;
  createdAt?: string | null;
};

type CollectionOptions<T extends CollectionRecord> = {
  key: string;
  load: () => Promise<T[]>;
  remove: (id: string) => Promise<ApiEnvelope<T>>;
  save: (id: string | null, sortOrder: number) => Promise<ApiEnvelope<T>>;
  /** Lowercase singular noun for fallback messages, e.g. "review". */
  noun: string;
};

/**
 * List, drawer and delete state shared by the FAQ, review and client logo screens. Data comes back sorted the way
 * the website shows it (sortOrder, then createdAt).
 */
export function useCollection<T extends CollectionRecord>({ key, load, remove, save, noun }: CollectionOptions<T>) {
  const { can } = useAdmin();
  const canRead = can("content:read");
  const canWrite = can("content:write");
  const list = useAdminQuery<T[]>(key, load, { enabled: canRead });
  const items = useMemo(() => [...(list.data ?? [])].sort(bySortOrder), [list.data]);
  const hasSample = items.some((item) => item.sample);

  const [editing, setEditing] = useState<T | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<T | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [pageError, setPageError] = useState("");
  const [moving, setMoving] = useState("");
  const [opened, setOpened] = useState(0);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");

  const open = (item: T | null) => {
    setEditing(item);
    setFormError("");
    setOpened((value) => value + 1);
    setDrawerOpen(true);
  };

  /** Next `sortOrder` for a new record, so it lands at the end of the list. */
  const nextSortOrder = items.reduce((max, item) => Math.max(max, Number(item.sortOrder) || 0), 0) + 1;

  /** Drawer save: a 400 (or any failure) shows inside the drawer; a 403 also shows as a toast. */
  const runSave = async (request: (editingId: string | null) => Promise<ApiEnvelope<T>>) => {
    if (saving) return;
    const created = !editing;
    setSaving(true);
    setFormError("");
    try {
      const response = await request(editing?.id ?? null);
      setDrawerOpen(false);
      toast.success(response.message || (created ? `${capitalize(noun)} created.` : `${capitalize(noun)} updated.`));
      list.reload();
    } catch (error) {
      if (error instanceof ApiError && error.status === 403) toast.error(errorMessage(error));
      setFormError(errorMessage(error));
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = async () => {
    if (!pendingDelete) return;
    setDeleting(true);
    setPageError("");
    try {
      const response = await remove(pendingDelete.id);
      toast.success(response.message || `${capitalize(noun)} deleted.`);
      if (editing?.id === pendingDelete.id) setDrawerOpen(false);
      setPendingDelete(null);
      list.reload();
    } catch (error) {
      setPendingDelete(null);
      if (error instanceof ApiError && error.status === 403) toast.error(errorMessage(error));
      else setPageError(`Couldn’t delete this ${noun}. ${errorMessage(error)}`);
    } finally {
      setDeleting(false);
    }
  };

  /** Saves the new `sortOrder` values one by one, then reloads (a partial failure still shows the real order). */
  const applyOrder = async (itemId: string, updates: { id: string; sortOrder: number }[]) => {
    if (!updates.length || moving) return;
    setMoving(itemId);
    setPageError("");
    try {
      for (const update of updates) await save(update.id, update.sortOrder);
    } catch (error) {
      if (error instanceof ApiError && error.status === 403) toast.error(errorMessage(error));
      else setPageError(`Couldn’t change the order. ${errorMessage(error)}`);
    } finally {
      setMoving("");
      list.reload();
    }
  };

  return {
    canRead,
    canWrite,
    list,
    items,
    hasSample,
    firstLoad: list.data === undefined,
    editing,
    /** Key for the drawer's form so each open starts from the record's current values. */
    formKey: `${editing?.id ?? "new"}-${opened}`,
    drawerOpen,
    closeDrawer: () => !saving && setDrawerOpen(false),
    openCreate: () => open(null),
    openEdit: (item: T) => open(item),
    nextSortOrder,
    saving,
    formError,
    runSave,
    pendingDelete,
    askDelete: setPendingDelete,
    cancelDelete: () => !deleting && setPendingDelete(null),
    confirmDelete,
    deleting,
    pageError,
    clearPageError: () => setPageError(""),
    moving,
    applyOrder,
  };
}

export const capitalize = (value: string) => (value ? value.charAt(0).toUpperCase() + value.slice(1) : "");

type EditorDrawerProps = {
  open: boolean;
  onClose: () => void;
  saving: boolean;
  formId: string;
  title: string;
  description: string;
  submitLabel: string;
  noun: string;
  formError: string;
  sample?: boolean;
  children: ReactNode;
};

/** Create/edit drawer in the content manager's layout. */
export function EditorDrawer({
  open,
  onClose,
  saving,
  formId,
  title,
  description,
  submitLabel,
  noun,
  formError,
  sample,
  children,
}: EditorDrawerProps) {
  // An image still uploading: Save waits for it, or the previous image would be saved.
  const [uploading, setUploading] = useState(false);
  const close = () => {
    if (!saving) onClose();
  };
  return (
    <Drawer
      className="font-sans antialiased"
      open={open}
      onClose={close}
      size="lg"
      title={title}
      description={description}
      footer={
        <>
          <Button variant="outline" onClick={close} disabled={saving}>
            Cancel
          </Button>
          <Button type="submit" form={formId} loading={saving || uploading} loadingText={uploading ? "Uploading…" : "Saving…"}>
            {submitLabel}
          </Button>
        </>
      }
    >
      <UploadBusyScope onChange={setUploading}>
        <div className="space-y-5">
          {sample && (
            <Alert tone="info" title="Sample content">
              <p>Saving your changes turns this into real content and removes the Sample badge.</p>
            </Alert>
          )}
          {formError && (
            <Alert tone="danger" title={`Couldn’t save the ${noun}`}>
              {formError}
            </Alert>
          )}
          {children}
        </div>
      </UploadBusyScope>
    </Drawer>
  );
}

type DeleteDialogProps = {
  open: boolean;
  noun: string;
  /** What is being deleted, as it reads in the sentence, e.g. “Adaeze O.”’s review. */
  subject: string;
  deleting: boolean;
  onClose: () => void;
  onConfirm: () => void;
};

export function DeleteDialog({ open, noun, subject, deleting, onClose, onConfirm }: DeleteDialogProps) {
  return (
    <ConfirmDialog
      open={open}
      onClose={onClose}
      onConfirm={onConfirm}
      loading={deleting}
      loadingText="Deleting…"
      title={`Delete ${noun}`}
      description={
        subject ? `Are you sure you want to delete ${subject}? It will be removed from the website. This can’t be undone.` : ""
      }
      confirmLabel={`Delete ${noun}`}
      confirmIcon={<Trash2 aria-hidden="true" />}
    />
  );
}
