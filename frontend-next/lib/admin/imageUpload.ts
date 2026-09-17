/**
 * Image uploads in the admin (UPLOADS_V1 §5): the shared upload config, client-side resizing and re-encoding, and
 * one `prepareAndUpload` call used by `ImageUpload` and `ImageListUpload`. Browser only.
 *
 * Nothing here reads or shows storage usage or limits (owner rule).
 */
import { useEffect, useSyncExternalStore } from "react";
import { ApiError, getUploadConfig, isUploadAborted, uploadImage } from "@/lib/api/admin";
import type { UploadConfig, UploadPurpose } from "@/lib/api/types";

/** Originals above this are refused before decoding. */
export const MAX_ORIGINAL_BYTES = 15 * 1024 * 1024;
/** Longest side for photos. */
export const MAX_PHOTO_SIDE = 1600;
/** Longest side for transparent PNG logos. */
export const MAX_LOGO_SIDE = 800;
const QUALITY = 0.82;
const DEFAULT_MAX_BYTES = 2_000_000;

/** `photo` re-encodes to WebP (JPEG fallback); `logo` keeps a transparent PNG as PNG at 800 px. */
export type ImageKind = "photo" | "logo";

/* ---------- Upload config (loaded once per page) ---------- */

export type UploadConfigState =
  | { status: "loading" }
  | { status: "ready"; config: UploadConfig }
  | { status: "unavailable" };

const LOADING: UploadConfigState = { status: "loading" };
let configState: UploadConfigState = LOADING;
let configRequest: Promise<void> | null = null;
const listeners = new Set<() => void>();

const setConfigState = (next: UploadConfigState) => {
  configState = next;
  listeners.forEach((listener) => listener());
};

const loadConfig = () => {
  if (configRequest || configState.status === "ready") return;
  configRequest = getUploadConfig().then(
    (config) => {
      setConfigState(config && config.enabled ? { status: "ready", config } : { status: "unavailable" });
    },
    () => {
      // Link field only. The next form that mounts tries once more.
      setConfigState({ status: "unavailable" });
      configRequest = null;
    }
  );
};

const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};

/** `GET /admin/uploads/config`, shared by every upload field. `unavailable` means: show only the link field. */
export function useUploadConfig(): UploadConfigState {
  useEffect(loadConfig, []);
  return useSyncExternalStore(
    subscribe,
    () => configState,
    () => LOADING
  );
}

/* ---------- Checks and processing ---------- */

export class ImageUploadError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ImageUploadError";
  }
}

const IMAGE_NAME = /\.(jpe?g|png|webp|gif|avif|bmp|svg|heic|heif)$/i;

/** Returns an inline message when the original can't be used, or "". */
export const checkOriginal = (file: File): string => {
  const looksLikeImage = file.type ? file.type.startsWith("image/") : IMAGE_NAME.test(file.name);
  if (!looksLikeImage) return "That file isn’t an image. Choose a JPEG, PNG or WebP image.";
  if (file.size === 0) return "That file is empty. Choose another image.";
  if (file.size > MAX_ORIGINAL_BYTES) return "That image is over 15 MB. Choose a smaller image.";
  return "";
};

type Decoded = { source: CanvasImageSource; width: number; height: number; close: () => void };

const UNREADABLE = "Couldn’t read that image. Choose a JPEG, PNG or WebP image.";

async function decode(file: Blob): Promise<Decoded> {
  if (typeof createImageBitmap === "function" && file.type !== "image/svg+xml") {
    try {
      const bitmap = await createImageBitmap(file);
      return { source: bitmap, width: bitmap.width, height: bitmap.height, close: () => bitmap.close() };
    } catch {
      // Fall back to an <img> element (older Safari, some formats).
    }
  }
  const url = URL.createObjectURL(file);
  const img = document.createElement("img");
  img.decoding = "async";
  img.src = url;
  try {
    await img.decode();
  } catch {
    URL.revokeObjectURL(url);
    throw new ImageUploadError(UNREADABLE);
  }
  // An SVG without width and height has no intrinsic size.
  const width = img.naturalWidth || MAX_LOGO_SIDE;
  const height = img.naturalHeight || MAX_LOGO_SIDE;
  return { source: img, width, height, close: () => URL.revokeObjectURL(url) };
}

const fit = (width: number, height: number, longest: number) => {
  const scale = Math.min(1, longest / Math.max(width, height));
  return { width: Math.max(1, Math.round(width * scale)), height: Math.max(1, Math.round(height * scale)) };
};

function draw(image: Decoded, longest: number, background?: string) {
  const size = fit(image.width, image.height, longest);
  const canvas = document.createElement("canvas");
  canvas.width = size.width;
  canvas.height = size.height;
  const context = canvas.getContext("2d");
  if (!context) throw new ImageUploadError(UNREADABLE);
  context.imageSmoothingEnabled = true;
  context.imageSmoothingQuality = "high";
  if (background) {
    context.fillStyle = background;
    context.fillRect(0, 0, size.width, size.height);
  }
  context.drawImage(image.source, 0, 0, size.width, size.height);
  return canvas;
}

function hasTransparency(canvas: HTMLCanvasElement) {
  try {
    const { data } = canvas.getContext("2d")!.getImageData(0, 0, canvas.width, canvas.height);
    for (let index = 3; index < data.length; index += 4) if (data[index] < 255) return true;
    return false;
  } catch {
    return false;
  }
}

const toBlob = (canvas: HTMLCanvasElement, type: string, quality?: number) =>
  new Promise<Blob | null>((resolve) => {
    try {
      canvas.toBlob(resolve, type, quality);
    } catch {
      resolve(null);
    }
  });

const MAY_HAVE_ALPHA = /^image\/(png|webp|gif|avif|svg\+xml)$/;

/**
 * Decodes the original and re-encodes it (which also drops camera metadata):
 * - `logo` with transparency: PNG, longest side at most 800 px.
 * - Otherwise: WebP at quality 0.82, longest side at most 1600 px (or the server's `maxDimension` if smaller).
 *   Browsers without a WebP encoder get JPEG on white, or PNG at 800 px when the image is transparent.
 * Steps down in size if the result is still over the server's byte cap.
 */
export async function processImage(file: File, kind: ImageKind, config: UploadConfig): Promise<Blob> {
  const maxBytes = config.maxBytes > 0 ? config.maxBytes : DEFAULT_MAX_BYTES;
  const longest = Math.min(MAX_PHOTO_SIDE, config.maxDimension > 0 ? config.maxDimension : MAX_PHOTO_SIDE);
  const image = await decode(file);
  try {
    const mayHaveAlpha = !file.type || MAY_HAVE_ALPHA.test(file.type);

    if (kind === "logo" && mayHaveAlpha) {
      const logo = draw(image, Math.min(MAX_LOGO_SIDE, longest));
      if (hasTransparency(logo)) {
        const png = await toBlob(logo, "image/png");
        if (png && png.type === "image/png" && png.size <= maxBytes) return png;
      }
    }

    let transparent: boolean | null = mayHaveAlpha ? null : false;
    for (const side of [longest, 1200, MAX_LOGO_SIDE].filter((value, index, all) => value <= longest && all.indexOf(value) === index)) {
      const canvas = draw(image, side);
      const webp = await toBlob(canvas, "image/webp", QUALITY);
      if (webp && webp.type === "image/webp") {
        if (webp.size <= maxBytes) return webp;
        continue;
      }
      // No WebP encoder in this browser.
      if (transparent === null) transparent = hasTransparency(canvas);
      if (transparent) {
        const png = await toBlob(side > MAX_LOGO_SIDE ? draw(image, MAX_LOGO_SIDE) : canvas, "image/png");
        if (png && png.type === "image/png" && png.size <= maxBytes) return png;
        continue;
      }
      const jpeg = await toBlob(draw(image, side, "#ffffff"), "image/jpeg", QUALITY);
      if (jpeg && jpeg.type === "image/jpeg" && jpeg.size <= maxBytes) return jpeg;
    }
    throw new ImageUploadError("Couldn’t make that image small enough to upload. Choose a different image.");
  } finally {
    image.close();
  }
}

/* ---------- Upload ---------- */

export type UploadStage = "processing" | "uploading";

export type PrepareAndUploadOptions = {
  purpose: UploadPurpose;
  kind?: ImageKind;
  config: UploadConfig;
  signal?: AbortSignal;
  onStage?: (stage: UploadStage) => void;
  onProgress?: (fraction: number) => void;
};

/**
 * Checks, processes and uploads one image. Resolves to the stored URL, or `null` when cancelled.
 * Rejects with an Error whose message is ready to show inline (the server's message for API errors).
 */
export async function prepareAndUpload(file: File, options: PrepareAndUploadOptions): Promise<string | null> {
  const { purpose, kind = "photo", config, signal, onStage, onProgress } = options;
  const problem = checkOriginal(file);
  if (problem) throw new ImageUploadError(problem);
  onStage?.("processing");
  const blob = await processImage(file, kind, config);
  if (signal?.aborted) return null;
  onStage?.("uploading");
  onProgress?.(0);
  try {
    const response = await uploadImage(blob, purpose, { signal, onProgress });
    return response.data.url;
  } catch (error) {
    if (isUploadAborted(error)) return null;
    if (error instanceof ApiError) throw error;
    throw new ImageUploadError("Couldn’t upload the image. Try again.");
  }
}

export const uploadErrorMessage = (error: unknown) =>
  error instanceof Error && error.message ? error.message : "Couldn’t upload the image. Try again.";

/** 507: uploads are off for now, so the form should offer the link field. */
export const isUploadUnavailable = (error: unknown) => error instanceof ApiError && error.status === 507;
