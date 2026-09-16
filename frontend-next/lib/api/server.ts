/**
 * Server-component read helpers (import only from server components, route handlers and metadata files). Public pages must build and render when the API is down
 * (FE_CONVENTIONS §3.4, FE_ACCEPTANCE §A), so every read has a timeout, logs failures and returns a fallback.
 */
import { ApiError, type ApiEnvelope, type ApiRequestInit } from "./client";

/** Public ISR window in seconds (FE_CONVENTIONS §4). Segment configs must still export the literal `300`. */
export const PUBLIC_REVALIDATE = 300;

/** Abort slow reads so an unreachable host can't stall `next build`. */
const TIMEOUT_MS = 8000;

/** Fetch options for a public ISR read. */
export const isr = (tags?: string[]): ApiRequestInit => ({
  next: { revalidate: PUBLIC_REVALIDATE, ...(tags ? { tags } : {}) },
  signal: AbortSignal.timeout(TIMEOUT_MS),
});

export type ReadResult<T> = { data: T; fromFallback: boolean; notFound: boolean };

/**
 * Run a read and return its `data`, or `fallback` when it fails or `isEmpty(data)` is true.
 * A 404 is reported through `notFound` so detail pages can call `notFound()` instead of showing stale fallback data.
 */
export async function readOr<T>(
  label: string,
  request: () => Promise<ApiEnvelope<T>>,
  fallback: T,
  isEmpty: (data: T) => boolean = () => false
): Promise<ReadResult<T>> {
  try {
    const { data } = await request();
    if (data == null || isEmpty(data)) return { data: fallback, fromFallback: true, notFound: false };
    return { data, fromFallback: false, notFound: false };
  } catch (error) {
    const status = error instanceof ApiError ? error.status : 0;
    if (status !== 404) {
      const message = error instanceof Error ? error.message : String(error);
      console.warn(`[public] ${label} unavailable (${status || "network"}): ${message}; using fallback`);
    }
    return { data: fallback, fromFallback: true, notFound: status === 404 };
  }
}
