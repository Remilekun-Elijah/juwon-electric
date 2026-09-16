import { config } from "@/lib/config";

export type Envelope<T> = { success: boolean; message: string; data: T };

export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

export type Query = Record<string, string | number | boolean | undefined | null>;

export const toQuery = (params: Query = {}) => {
  const entries = Object.entries(params).filter(([, v]) => v !== undefined && v !== null && v !== "");
  const qs = new URLSearchParams(entries.map(([k, v]) => [k, String(v)])).toString();
  return qs ? `?${qs}` : "";
};

export type ApiInit = RequestInit & { next?: { revalidate?: number | false; tags?: string[] } };

export async function apiRequest<T>(path: string, init: ApiInit = {}): Promise<Envelope<T>> {
  const headers = new Headers(init.headers);
  if (init.body !== undefined && !headers.has("Content-Type")) headers.set("Content-Type", "application/json");
  const response = await fetch(`${config.backendUrl}${path}`, { ...init, headers });
  const body = (await response.json().catch(() => null)) as Envelope<T> | { success: false; message: string | string[] } | null;
  if (!response.ok || !body || body.success === false) {
    const raw = body?.message;
    throw new ApiError(response.status, (Array.isArray(raw) ? raw[0] : raw) || "Request failed");
  }
  return body as Envelope<T>;
}
