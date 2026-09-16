/**
 * Core HTTP client shared by the public site (FE-1) and the admin portal (FE-2).
 * Ported from frontend/src/utils/api.js. Works in server components (pass `next: { revalidate }`)
 * and in the browser.
 *
 * Every backend response uses the envelope `{ success, message, data }` (backend/services/http.js).
 * Requests resolve to the whole envelope; use `.data` for the payload.
 */

export const backendUrl = (process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:9000").replace(/\/+$/, "");

export type ApiEnvelope<T = unknown> = {
  success: boolean;
  message?: string;
  data: T;
};

export type QueryParams = Record<string, string | number | boolean | null | undefined>;

export type ApiRequestInit = Omit<RequestInit, "body"> & {
  /** Plain objects/arrays are JSON-encoded; strings, FormData, Blob etc. are sent as-is. */
  body?: unknown;
  /** Appended as a query string; undefined, null and "" values are dropped. */
  query?: QueryParams;
  /** Next.js fetch cache options, e.g. `{ revalidate: 300, tags: ["packages"] }`. */
  next?: { revalidate?: number | false; tags?: string[] };
};

export class ApiError extends Error {
  status: number;
  data: unknown;

  constructor(message: string, status: number, data: unknown = null) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.data = data;
  }
}

export const toQuery = (params: QueryParams = {}) => {
  const entries = Object.entries(params)
    .filter(([, value]) => value !== undefined && value !== null && value !== "")
    .map(([key, value]) => [key, String(value)]);
  const query = new URLSearchParams(entries).toString();
  return query ? `?${query}` : "";
};

const isRawBody = (body: unknown) =>
  typeof body === "string" ||
  (typeof FormData !== "undefined" && body instanceof FormData) ||
  (typeof Blob !== "undefined" && body instanceof Blob) ||
  (typeof URLSearchParams !== "undefined" && body instanceof URLSearchParams) ||
  body instanceof ArrayBuffer;

/**
 * Request `path` (e.g. "/packages") against NEXT_PUBLIC_BACKEND_URL.
 * Throws ApiError on network failure (status 0), non-2xx, non-JSON, or `success: false`.
 */
export async function apiRequest<T = unknown>(path: string, init: ApiRequestInit = {}): Promise<ApiEnvelope<T>> {
  const { body, query, headers, ...rest } = init;
  const hasBody = body !== undefined && body !== null;
  const raw = hasBody && isRawBody(body);

  let response: Response;
  try {
    response = await fetch(`${backendUrl}${path}${toQuery(query)}`, {
      ...rest,
      headers: {
        Accept: "application/json",
        ...(hasBody && !raw ? { "Content-Type": "application/json" } : {}),
        ...(headers as Record<string, string> | undefined),
      },
      body: hasBody ? (raw ? (body as BodyInit) : JSON.stringify(body)) : undefined,
    });
  } catch (cause) {
    throw new ApiError(cause instanceof Error ? cause.message : "Network request failed", 0);
  }

  const data = (await response.json().catch(() => null)) as ApiEnvelope<T> | null;
  if (!response.ok || !data || data.success === false) {
    throw new ApiError(data?.message || "Request failed", response.status, data);
  }
  return data;
}

/** GET helper for public reads. `params` become the query string. */
export const getPublicData = <T = unknown>(path: string, params?: QueryParams, init: ApiRequestInit = {}) =>
  apiRequest<T>(path, { ...init, method: "GET", query: { ...init.query, ...params } });
