"use client";

import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { ChevronDown, ChevronUp, Link2, Pencil, Plus, RefreshCw, Trash2, X } from "lucide-react";
import { Badge, Button, Field, Input } from "@/components/ui";
import type { AdminUploadPurpose } from "@/lib/api/admin";
import { cn } from "@/lib/cn";
import {
  isUploadUnavailable,
  isUsableImageUrl,
  prepareAndUpload,
  uploadErrorMessage,
  useUploadConfig,
  type ImageKind,
  type UploadStage,
} from "@/lib/admin/imageUpload";
import { LIMITS } from "@/lib/validation";
import { ImageDropZone, ImagePreview, UploadProgress, touchButton, touchIconButton } from "./ImageUpload";

/** One stored image. `rowId` is a stable React key; `value` is the URL or site path. */
export type ImageRow = { rowId: string; value: string };

type Pending = {
  key: string;
  name: string;
  /** Set when replacing an existing row. */
  rowId?: string;
  stage: UploadStage | "queued";
  progress: number;
  controller: AbortController;
};

type Failure = { key: string; name: string; message: string };

export type ImageListUploadProps = {
  label: string;
  helper?: ReactNode;
  rows: ImageRow[];
  /** Receives an updater so uploads that finish later never overwrite newer edits. */
  onChange: (update: (rows: ImageRow[]) => ImageRow[]) => void;
  newRowId: () => string;
  purpose: AdminUploadPurpose;
  kind?: ImageKind;
  max?: number;
  /** Form validation messages by `rowId`. */
  rowErrors?: Record<string, string | undefined>;
  /** Form validation message for the whole list. */
  error?: string;
  linkHelper?: ReactNode;
};

let pendingSeq = 0;

/** Row actions: a 44 px icon button on phones (aria-label and tooltip), icon plus visible text from `sm` up. */
const rowActionButton = "h-11 w-11 px-0 sm:h-9 sm:w-auto sm:px-3";
const RowActionText = ({ children }: { children: ReactNode }) => <span className="hidden sm:inline">{children}</span>;

/**
 * Up to `max` images (products). Drop or choose several files at once; each is resized in the browser and uploaded
 * in order. Rows reorder with up and down buttons (the first is the main image), and each can be replaced, removed
 * or edited as a link. When uploads are unavailable, every row is a link field, as before.
 */
export function ImageListUpload({
  label,
  helper,
  rows,
  onChange,
  newRowId,
  purpose,
  kind = "photo",
  max = LIMITS.productImages,
  rowErrors = {},
  error,
  linkHelper = "An https:// link or a site path starting with /.",
}: ImageListUploadProps) {
  const configState = useUploadConfig();
  const uploadsReady = configState.status === "ready";
  const uploadsOff = configState.status === "unavailable";
  const [pending, setPending] = useState<Pending[]>([]);
  const [failures, setFailures] = useState<Failure[]>([]);
  const [editing, setEditing] = useState<Set<string>>(() => new Set());
  const [announcement, setAnnouncement] = useState("");
  const labelId = useId();
  const helperId = useId();
  const queueRef = useRef<Promise<void>>(Promise.resolve());
  const pendingRef = useRef<Pending[]>([]);
  const replaceInputRef = useRef<HTMLInputElement>(null);
  const replaceTargetRef = useRef("");
  /** Row whose link input should take focus once it renders ("Use an image link instead"). */
  const focusRowRef = useRef("");

  useEffect(() => {
    pendingRef.current = pending;
  }, [pending]);
  useEffect(() => () => pendingRef.current.forEach((item) => item.controller.abort()), []);

  const newUploads = pending.filter((item) => !item.rowId);
  const room = Math.max(0, max - rows.length - newUploads.length);

  const patchPending = (key: string, patch: Partial<Pending>) =>
    setPending((current) => current.map((item) => (item.key === key ? { ...item, ...patch } : item)));

  const enqueue = (files: File[], rowId?: string) => {
    if (configState.status !== "ready") return;
    const config = configState.config;
    const items: Pending[] = files.map((file) => ({
      key: `upload-${++pendingSeq}`,
      name: file.name,
      rowId,
      stage: "queued",
      progress: 0,
      controller: new AbortController(),
    }));
    setPending((current) => [...current, ...items]);
    files.forEach((file, index) => {
      const item = items[index];
      // One at a time keeps memory low while decoding large photos, and keeps the chosen order.
      queueRef.current = queueRef.current.then(async () => {
        if (item.controller.signal.aborted) return;
        try {
          const url = await prepareAndUpload(file, {
            purpose,
            kind,
            config,
            signal: item.controller.signal,
            onStage: (stage) => patchPending(item.key, { stage }),
            onProgress: (progress) => patchPending(item.key, { progress }),
          });
          if (!url || item.controller.signal.aborted) return;
          if (item.rowId) {
            onChange((current) => current.map((row) => (row.rowId === item.rowId ? { ...row, value: url } : row)));
          } else {
            onChange((current) => (current.length >= max ? current : [...current, { rowId: newRowId(), value: url }]));
          }
        } catch (caught) {
          if (!item.controller.signal.aborted) {
            setFailures((current) => [...current, { key: item.key, name: file.name, message: uploadErrorMessage(caught) }]);
            if (isUploadUnavailable(caught)) {
              // The rest would fail the same way; the message points to the link option.
              pendingRef.current.forEach((entry) => {
                if (entry.key !== item.key) entry.controller.abort();
              });
              setPending((current) => current.filter((entry) => entry.key === item.key));
            }
          }
        } finally {
          setPending((current) => current.filter((entry) => entry.key !== item.key));
        }
      });
    });
  };

  const addFiles = (files: File[]) => {
    setFailures([]);
    const accepted = files.slice(0, room);
    if (files.length > room) {
      setFailures([
        {
          key: `limit-${++pendingSeq}`,
          name: "",
          message: room
            ? `Only ${room} more ${room === 1 ? "image fits" : "images fit"}, so the first ${room} ${room === 1 ? "was" : "were"} added.`
            : `A product can have up to ${max} images. Remove one to add another.`,
        },
      ]);
    }
    if (accepted.length) enqueue(accepted);
  };

  const cancel = (item: Pending) => {
    item.controller.abort();
    setPending((current) => current.filter((entry) => entry.key !== item.key));
  };

  const move = (index: number, offset: -1 | 1) => {
    const target = index + offset;
    onChange((current) => {
      if (target < 0 || target >= current.length) return current;
      const next = [...current];
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
    setAnnouncement(`Image moved to position ${target + 1} of ${rows.length}.`);
  };

  const remove = (row: ImageRow, index: number) => {
    pending.filter((item) => item.rowId === row.rowId).forEach(cancel);
    onChange((current) => current.filter((item) => item.rowId !== row.rowId));
    setAnnouncement(`Image ${index + 1} removed.`);
  };

  const toggleEditing = (rowId: string, open: boolean) =>
    setEditing((current) => {
      const next = new Set(current);
      if (open) next.add(rowId);
      else next.delete(rowId);
      return next;
    });

  const addLinkRow = () => {
    const rowId = newRowId();
    onChange((current) => (current.length >= max ? current : [...current, { rowId, value: "" }]));
    toggleEditing(rowId, true);
    focusRowRef.current = rowId;
  };

  const full = room === 0;

  return (
    <div
      role="group"
      aria-labelledby={labelId}
      aria-describedby={helper ? helperId : undefined}
      className="space-y-3"
    >
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h3 id={labelId} className="text-sm font-medium text-slate-900">
            {label}
          </h3>
          {helper && (
            <p id={helperId} className="text-xs text-slate-500">
              {helper}
            </p>
          )}
        </div>
        {uploadsOff && (
          <Button
            variant="outline"
            size="sm"
            className={touchButton}
            icon={<Plus aria-hidden="true" />}
            disabled={full}
            onClick={addLinkRow}
          >
            Add image
          </Button>
        )}
      </div>

      {error && (
        <p role="alert" className="text-sm text-red-600">
          {error}
        </p>
      )}

      {rows.length > 0 && (
        <ol className="space-y-2">
          {rows.map((row, index) => {
            const location = row.value.trim();
            const rowError = rowErrors[row.rowId];
            const replacing = pending.find((item) => item.rowId === row.rowId);
            const showLink =
              uploadsOff || !isUsableImageUrl(location) || Boolean(rowError) || editing.has(row.rowId);
            const name = `image ${index + 1}`;
            return (
              <li key={row.rowId} className="rounded-lg border border-slate-200 bg-white p-3">
                <div className="flex flex-wrap items-center gap-3">
                  <ImagePreview key={location} src={location} alt={`Image ${index + 1}`} className="size-16" />
                  <div className="min-w-0 flex-1 basis-40">
                    <p className="flex items-center gap-2 text-sm font-medium text-slate-900">
                      Image {index + 1}
                      {index === 0 && <Badge tone="brand">Main</Badge>}
                    </p>
                    <p className="truncate font-mono text-xs text-slate-500" title={location}>
                      {location || "No link yet"}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-1">
                    <Button
                      variant="ghost"
                      className={rowActionButton}
                      aria-label={`Move up: ${name}`}
                      title="Move up"
                      icon={<ChevronUp aria-hidden="true" />}
                      disabled={index === 0}
                      onClick={() => move(index, -1)}
                    >
                      <RowActionText>Move up</RowActionText>
                    </Button>
                    <Button
                      variant="ghost"
                      className={rowActionButton}
                      aria-label={`Move down: ${name}`}
                      title="Move down"
                      icon={<ChevronDown aria-hidden="true" />}
                      disabled={index === rows.length - 1}
                      onClick={() => move(index, 1)}
                    >
                      <RowActionText>Move down</RowActionText>
                    </Button>
                    {uploadsReady && (
                      <Button
                        variant="ghost"
                        className={rowActionButton}
                        aria-label={`Replace: ${name}`}
                        title="Replace"
                        icon={<RefreshCw aria-hidden="true" />}
                        disabled={Boolean(replacing)}
                        onClick={() => {
                          replaceTargetRef.current = row.rowId;
                          replaceInputRef.current?.click();
                        }}
                      >
                        <RowActionText>Replace</RowActionText>
                      </Button>
                    )}
                    {!uploadsOff && location && (
                      <Button
                        variant="ghost"
                        className={rowActionButton}
                        aria-label={`Edit link: ${name}`}
                        aria-expanded={showLink}
                        title="Edit link"
                        icon={<Pencil aria-hidden="true" />}
                        onClick={() => toggleEditing(row.rowId, !editing.has(row.rowId))}
                      >
                        <RowActionText>Edit link</RowActionText>
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      className={cn(rowActionButton, "hover:bg-red-50 hover:text-red-700")}
                      aria-label={`Remove: ${name}`}
                      title="Remove"
                      icon={<Trash2 aria-hidden="true" />}
                      onClick={() => remove(row, index)}
                    >
                      <RowActionText>Remove</RowActionText>
                    </Button>
                  </div>
                </div>
                {replacing && (
                  <div className="mt-3">
                    <UploadProgress
                      stage={replacing.stage === "queued" ? "processing" : replacing.stage}
                      progress={replacing.progress}
                      label={replacing.name}
                      onCancel={() => cancel(replacing)}
                    />
                  </div>
                )}
                {showLink && (
                  <Field
                    label={`Image ${index + 1} link`}
                    labelClassName="sr-only"
                    helper={uploadsOff ? undefined : linkHelper}
                    error={rowError}
                    className="mt-3"
                  >
                    <Input
                      ref={(node) => {
                        if (node && focusRowRef.current === row.rowId) {
                          focusRowRef.current = "";
                          node.focus();
                        }
                      }}
                      type="text"
                      inputMode="url"
                      placeholder="https://"
                      maxLength={LIMITS.url}
                      value={row.value}
                      onChange={(event) => {
                        const value = event.target.value;
                        onChange((current) => current.map((item) => (item.rowId === row.rowId ? { ...item, value } : item)));
                      }}
                    />
                  </Field>
                )}
              </li>
            );
          })}
        </ol>
      )}

      {newUploads.length > 0 && (
        <ul className="space-y-2" aria-label="Images uploading">
          {newUploads.map((item) => (
            <li key={item.key} className="rounded-lg border border-slate-200 bg-white p-3">
              {item.stage === "queued" ? (
                <div className="flex items-center gap-3">
                  <p className="min-w-0 flex-1 truncate text-sm text-slate-500">Waiting… {item.name}</p>
                  <Button
                    variant="ghost"
                    size="icon"
                    className={touchIconButton}
                    aria-label={`Cancel ${item.name}`}
                    title="Cancel"
                    onClick={() => cancel(item)}
                  >
                    <X aria-hidden="true" />
                  </Button>
                </div>
              ) : (
                <UploadProgress stage={item.stage} progress={item.progress} label={item.name} onCancel={() => cancel(item)} />
              )}
            </li>
          ))}
        </ul>
      )}

      {failures.length > 0 && (
        <ul role="alert" className="space-y-1">
          {failures.map((failure) => (
            <li key={failure.key} className="text-sm text-red-600">
              {failure.name && <span className="font-medium">{failure.name}: </span>}
              {failure.message}
            </li>
          ))}
        </ul>
      )}

      {!uploadsOff && !full && (
        <ImageDropZone multiple disabled={!uploadsReady} onFiles={addFiles} />
      )}

      {!uploadsOff && (
        <Button
          variant="link"
          className="min-h-11 text-brand-700 sm:min-h-8"
          icon={<Link2 aria-hidden="true" />}
          disabled={full}
          onClick={addLinkRow}
        >
          Use an image link instead
        </Button>
      )}

      <input
        ref={replaceInputRef}
        type="file"
        accept="image/*"
        className="sr-only"
        tabIndex={-1}
        aria-hidden="true"
        onChange={(event) => {
          const file = event.target.files?.[0];
          event.target.value = "";
          const rowId = replaceTargetRef.current;
          if (file && rowId) {
            setFailures([]);
            enqueue([file], rowId);
          }
        }}
      />

      <p className="sr-only" aria-live="polite">
        {announcement}
      </p>
    </div>
  );
}

export default ImageListUpload;
