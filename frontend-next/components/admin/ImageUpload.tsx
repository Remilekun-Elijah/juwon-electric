"use client";

import { useEffect, useId, useRef, useState, type DragEvent, type ReactNode } from "react";
import { ChevronDown, ImageOff, ImageUp, Link2, RefreshCw, Trash2, Upload as UploadIcon, X } from "lucide-react";
import { Button, Field, Input } from "@/components/ui";
import type { UploadConfig, UploadPurpose } from "@/lib/api/types";
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

/** 44 px tall on phones, the kit's compact height from `sm` up. */
export const touchButton = "h-11 sm:h-9";
export const touchIconButton = "size-11 sm:size-9";

const ACCEPT = "image/*";

/* ---------- Shared pieces (also used by ImageListUpload) ---------- */

export type PreviewShape = "cover" | "contain" | "round";

/** Thumbnail of a stored URL or site path; shows a neutral placeholder when it can't load. */
export function ImagePreview({
  src,
  alt,
  shape = "cover",
  className,
}: {
  src: string;
  alt: string;
  shape?: PreviewShape;
  className?: string;
}) {
  const [failed, setFailed] = useState("");
  const location = src.trim();
  const broken = !location || failed === location || !isUsableImageUrl(location);
  return (
    <div
      className={cn(
        "flex shrink-0 items-center justify-center overflow-hidden border border-slate-200 bg-slate-50 text-slate-400",
        shape === "round" ? "size-20 rounded-full" : shape === "contain" ? "h-20 w-32 rounded-lg p-2" : "size-20 rounded-lg",
        className
      )}
    >
      {broken ? (
        <ImageOff aria-hidden="true" className="size-5" />
      ) : (
        // eslint-disable-next-line @next/next/no-img-element -- admin preview of an arbitrary URL or site path
        <img
          src={location}
          alt={alt}
          className={cn("size-full", shape === "contain" ? "object-contain" : "object-cover")}
          onError={() => setFailed(location)}
        />
      )}
    </div>
  );
}

/** Progress for one image: "Preparing" while resizing, then a determinate bar while sending. */
export function UploadProgress({
  stage,
  progress,
  label,
  onCancel,
}: {
  stage: UploadStage;
  progress: number;
  label?: string;
  onCancel?: () => void;
}) {
  const percent = Math.round(Math.min(1, Math.max(0, progress)) * 100);
  const text = stage === "processing" ? "Preparing image…" : "Uploading…";
  return (
    <div className="flex items-center gap-3" aria-live="polite">
      <div className="min-w-0 flex-1 space-y-1.5">
        <p className="truncate text-sm text-slate-700">
          {text}
          {label && <span className="text-slate-500"> {label}</span>}
        </p>
        <div
          role="progressbar"
          aria-label={text}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={stage === "uploading" ? percent : undefined}
          className="h-1.5 overflow-hidden rounded-full bg-slate-200"
        >
          <div
            className={cn(
              "h-full rounded-full bg-brand-600 transition-[width] duration-200",
              stage === "processing" && "w-1/3 animate-pulse"
            )}
            style={stage === "uploading" ? { width: `${Math.max(4, percent)}%` } : undefined}
          />
        </div>
      </div>
      {onCancel && (
        <Button variant="ghost" size="icon" className={touchIconButton} aria-label="Cancel upload" title="Cancel" onClick={onCancel}>
          <X aria-hidden="true" />
        </Button>
      )}
    </div>
  );
}

/** Drag-and-drop area with a "Choose" button. `onFiles` gets the dropped or chosen files. */
export function ImageDropZone({
  onFiles,
  multiple = false,
  disabled = false,
  hint,
  describedBy,
}: {
  onFiles: (files: File[]) => void;
  multiple?: boolean;
  disabled?: boolean;
  hint?: ReactNode;
  describedBy?: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const hintId = useId();

  const onDragOver = (event: DragEvent<HTMLDivElement>) => {
    if (disabled || !Array.from(event.dataTransfer.types).includes("Files")) return;
    event.preventDefault();
    event.dataTransfer.dropEffect = "copy";
    setDragging(true);
  };

  const onDrop = (event: DragEvent<HTMLDivElement>) => {
    if (disabled) return;
    event.preventDefault();
    setDragging(false);
    const files = Array.from(event.dataTransfer.files);
    if (files.length) onFiles(multiple ? files : files.slice(0, 1));
  };

  return (
    <div
      onDragOver={onDragOver}
      onDragLeave={() => setDragging(false)}
      onDrop={onDrop}
      className={cn(
        "flex flex-col items-center gap-2 rounded-lg border border-dashed px-4 py-5 text-center transition-colors sm:flex-row sm:text-left",
        dragging ? "border-brand-500 bg-brand-50" : "border-slate-300 bg-slate-50",
        disabled && "opacity-60"
      )}
    >
      <ImageUp aria-hidden="true" className="size-6 shrink-0 text-slate-400" />
      <div className="min-w-0 flex-1">
        <p className="text-sm text-slate-700">{multiple ? "Drag images here, or choose them." : "Drag an image here, or choose one."}</p>
        <p id={hintId} className="text-xs text-slate-500">
          {hint ?? "JPEG, PNG or WebP. Large photos are resized before upload."}
        </p>
      </div>
      <Button
        variant="outline"
        className={touchButton}
        icon={<UploadIcon aria-hidden="true" />}
        disabled={disabled}
        aria-describedby={[hintId, describedBy].filter(Boolean).join(" ")}
        onClick={() => inputRef.current?.click()}
      >
        {multiple ? "Choose images" : "Choose image"}
      </Button>
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPT}
        multiple={multiple}
        className="sr-only"
        tabIndex={-1}
        aria-hidden="true"
        onChange={(event) => {
          const files = Array.from(event.target.files ?? []);
          event.target.value = "";
          if (files.length) onFiles(files);
        }}
      />
    </div>
  );
}

/** "Use an image link instead" disclosure button. */
export function LinkToggle({
  open,
  controls,
  onToggle,
  children = "Use an image link instead",
}: {
  open: boolean;
  controls: string;
  onToggle: () => void;
  children?: ReactNode;
}) {
  return (
    <button
      type="button"
      aria-expanded={open}
      aria-controls={controls}
      onClick={onToggle}
      className="inline-flex min-h-11 items-center gap-1.5 rounded-md text-sm font-medium text-brand-700 hover:underline focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2 sm:min-h-8"
    >
      <Link2 aria-hidden="true" className="size-4" />
      {children}
      <ChevronDown aria-hidden="true" className={cn("size-4 transition-transform", open && "rotate-180")} />
    </button>
  );
}

/** One upload's lifecycle: cancel on unmount, stage and progress for the UI. */
export function useUploadTask() {
  const [stage, setStage] = useState<UploadStage | null>(null);
  const [progress, setProgress] = useState(0);
  const controllerRef = useRef<AbortController | null>(null);

  useEffect(() => () => controllerRef.current?.abort(), []);

  const run = async (file: File, options: { purpose: UploadPurpose; kind: ImageKind; config: UploadConfig }) => {
    controllerRef.current?.abort();
    const controller = new AbortController();
    controllerRef.current = controller;
    setProgress(0);
    try {
      return await prepareAndUpload(file, {
        ...options,
        signal: controller.signal,
        onStage: (next) => {
          if (!controller.signal.aborted) setStage(next);
        },
        onProgress: (fraction) => {
          if (!controller.signal.aborted) setProgress(fraction);
        },
      });
    } finally {
      if (controllerRef.current === controller) {
        controllerRef.current = null;
        setStage(null);
      }
    }
  };

  const cancel = () => {
    controllerRef.current?.abort();
    controllerRef.current = null;
    setStage(null);
  };

  return { stage, progress, run, cancel };
}

/* ---------- Single image ---------- */

export type ImageUploadProps = {
  label: string;
  /** Stored URL or site path. "" when empty. */
  value: string;
  onChange: (value: string) => void;
  /** `?purpose=` key prefix on the server. */
  purpose: UploadPurpose;
  /** `logo` keeps a transparent PNG as PNG (800 px). */
  kind?: ImageKind;
  required?: boolean;
  /** Shown under the label. */
  helper?: ReactNode;
  /** Helper for the link field. */
  linkHelper?: ReactNode;
  linkPlaceholder?: string;
  /** Validation message from the form (for the stored value). */
  error?: string;
  preview?: PreviewShape;
  /** Alt text for the preview image. */
  previewAlt?: string;
  className?: string;
};

/**
 * One image field: choose or drop a file (resized in the browser, then uploaded), with preview, Replace and Remove.
 * "Use an image link instead" keeps the plain URL input; it is the only control when uploads are unavailable.
 * The value stays a URL string, so existing records and form validation work unchanged.
 */
export function ImageUpload({
  label,
  value,
  onChange,
  purpose,
  kind = "photo",
  required = false,
  helper,
  linkHelper = "An https:// link or a site path starting with /.",
  linkPlaceholder = "https://",
  error,
  preview = "cover",
  previewAlt,
  className,
}: ImageUploadProps) {
  const configState = useUploadConfig();
  const task = useUploadTask();
  const [uploadError, setUploadError] = useState("");
  const [linkOpen, setLinkOpen] = useState(false);
  const replaceRef = useRef<HTMLInputElement>(null);
  const labelId = useId();
  const helperId = useId();
  const errorId = useId();
  const linkId = useId();

  const location = value.trim();
  const busy = task.stage !== null;
  const uploadsReady = configState.status === "ready";

  const upload = async (file: File) => {
    if (configState.status !== "ready") return;
    setUploadError("");
    try {
      const url = await task.run(file, { purpose, kind, config: configState.config });
      if (url) onChange(url);
    } catch (caught) {
      setUploadError(uploadErrorMessage(caught));
      if (isUploadUnavailable(caught)) setLinkOpen(true);
    }
  };

  const linkField = (asMain: boolean) => (
    <Field
      label={asMain ? label : `${label} link`}
      labelClassName={asMain ? undefined : "sr-only"}
      required={asMain && required}
      helper={linkHelper}
      error={error}
    >
      <Input
        type="text"
        inputMode="url"
        value={value}
        maxLength={LIMITS.url}
        placeholder={linkPlaceholder}
        onChange={(event) => onChange(event.target.value)}
      />
    </Field>
  );

  // Uploads unavailable: exactly the old link field.
  if (configState.status === "unavailable") {
    return (
      <div className={cn("space-y-3", className)}>
        {linkField(true)}
        {location && !error && <ImagePreview src={location} alt={previewAlt ?? ""} shape={preview} />}
      </div>
    );
  }

  // A form error on a typed link shows next to the link field, so open it.
  const showLink = linkOpen || Boolean(error && location);
  const groupError = !showLink ? error : "";
  const message = uploadError || groupError;
  const describedBy = [helper ? helperId : "", message ? errorId : ""].filter(Boolean).join(" ") || undefined;

  const onDropReplace = (event: DragEvent<HTMLDivElement>) => {
    if (!uploadsReady || busy) return;
    const file = event.dataTransfer.files[0];
    if (!file) return;
    event.preventDefault();
    void upload(file);
  };

  return (
    <div role="group" aria-labelledby={labelId} aria-describedby={describedBy} className={cn("space-y-2", className)}>
      <div>
        <p id={labelId} className="text-sm font-medium text-slate-700">
          {label}
          {required && (
            <span className="ml-0.5 text-red-600" aria-hidden="true">
              *
            </span>
          )}
        </p>
        {helper && (
          <p id={helperId} className="mt-0.5 text-xs text-slate-500">
            {helper}
          </p>
        )}
      </div>

      {busy ? (
        <div className="rounded-lg border border-slate-200 bg-white p-3">
          <UploadProgress stage={task.stage!} progress={task.progress} onCancel={task.cancel} />
        </div>
      ) : location ? (
        <div
          className="flex flex-col gap-3 rounded-lg border border-slate-200 bg-white p-3 sm:flex-row sm:items-center"
          onDragOver={(event) => {
            if (uploadsReady && Array.from(event.dataTransfer.types).includes("Files")) event.preventDefault();
          }}
          onDrop={onDropReplace}
        >
          <ImagePreview key={location} src={location} alt={previewAlt ?? `${label} preview`} shape={preview} />
          <p className="min-w-0 flex-1 truncate font-mono text-xs text-slate-500" title={location}>
            {location}
          </p>
          <div className="flex gap-2">
            {uploadsReady && (
              <Button
                variant="outline"
                className={touchButton}
                icon={<RefreshCw aria-hidden="true" />}
                aria-label={`Replace ${label.toLowerCase()}`}
                onClick={() => replaceRef.current?.click()}
              >
                Replace
              </Button>
            )}
            <Button
              variant="ghost"
              className={cn(touchButton, "hover:bg-red-50 hover:text-red-700")}
              icon={<Trash2 aria-hidden="true" />}
              aria-label={`Remove ${label.toLowerCase()}`}
              onClick={() => {
                setUploadError("");
                onChange("");
              }}
            >
              Remove
            </Button>
          </div>
          <input
            ref={replaceRef}
            type="file"
            accept={ACCEPT}
            className="sr-only"
            tabIndex={-1}
            aria-hidden="true"
            onChange={(event) => {
              const file = event.target.files?.[0];
              event.target.value = "";
              if (file) void upload(file);
            }}
          />
        </div>
      ) : (
        <ImageDropZone
          disabled={!uploadsReady}
          describedBy={describedBy}
          hint={kind === "logo" ? "PNG with a transparent background looks best. JPEG and WebP work too." : undefined}
          onFiles={(files) => void upload(files[0])}
        />
      )}

      {message && (
        <p id={errorId} role="alert" className="text-sm text-red-600">
          {message}
        </p>
      )}

      <LinkToggle open={showLink} controls={linkId} onToggle={() => setLinkOpen(!showLink)} />
      <div id={linkId} hidden={!showLink}>
        {showLink && linkField(false)}
      </div>
    </div>
  );
}

export default ImageUpload;
