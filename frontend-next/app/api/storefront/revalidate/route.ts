import { revalidateTag } from "next/cache";
import type { NextRequest } from "next/server";
import { readAdminTokenHeader, verifyAdminToken } from "@/lib/storefront/adminAuth";
import { isStoreTag, type StoreTag } from "@/lib/storefront/data";

/**
 * `POST /api/storefront/revalidate` with `{ tags: string[] }` and the admin session token
 * (`Authorization: Bearer <token>` or `x-admin-token`). Expires the storefront cache tags so the next page view
 * reads fresh data (docs/agents/fe-storefront.md §2.3). Called by lib/storefront/notify.ts after admin writes.
 */

const MAX_BODY_BYTES = 2048;

const json = (status: number, body: { success: boolean; message: string; data?: unknown }, headers?: HeadersInit) =>
  Response.json(body, { status, headers: { "Cache-Control": "no-store", ...headers } });

const unauthorized = () => json(401, { success: false, message: "Unauthorized." });
const badRequest = (message = "Send a JSON body like { \"tags\": [\"products\"] } (max 2 KB).") =>
  json(400, { success: false, message });

async function readTags(request: NextRequest): Promise<string[] | null> {
  const declared = Number(request.headers.get("content-length") || 0);
  if (declared > MAX_BODY_BYTES) return null;
  let text: string;
  try {
    text = await request.text();
  } catch {
    return null;
  }
  if (new TextEncoder().encode(text).length > MAX_BODY_BYTES) return null;
  let body: unknown;
  try {
    body = JSON.parse(text);
  } catch {
    return null;
  }
  if (!body || typeof body !== "object" || Array.isArray(body)) return null;
  const { tags } = body as { tags?: unknown };
  if (!Array.isArray(tags) || !tags.every((tag) => typeof tag === "string")) return null;
  return tags;
}

export async function POST(request: NextRequest) {
  const token = readAdminTokenHeader(request.headers);
  if (!token) return unauthorized();

  const requested = await readTags(request);
  if (!requested) return badRequest();

  if (!(await verifyAdminToken(token))) return unauthorized();

  const tags: StoreTag[] = Array.from(new Set<StoreTag>(["store", ...requested.filter(isStoreTag)]));
  for (const tag of tags) revalidateTag(tag, { expire: 0 });

  return json(200, { success: true, message: "Storefront refreshed.", data: { tags } });
}

const methodNotAllowed = () => json(405, { success: false, message: "Method not allowed." }, { Allow: "POST" });

export const GET = methodNotAllowed;
export const PUT = methodNotAllowed;
export const PATCH = methodNotAllowed;
export const DELETE = methodNotAllowed;
