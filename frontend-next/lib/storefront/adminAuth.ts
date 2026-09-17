// Server only (used by app/api/storefront/revalidate). Not imported by client code.
import { apiRequest } from "@/lib/api/client";

const VERIFY_TIMEOUT_MS = 5000;

/** The admin session token from `Authorization: Bearer <token>` or `x-admin-token`, or "". */
export function readAdminTokenHeader(headers: Headers): string {
  const authorization = headers.get("authorization") || "";
  const bearer = /^Bearer\s+(.+)$/i.exec(authorization.trim());
  return (bearer?.[1] || headers.get("x-admin-token") || "").trim();
}

/** True when the API accepts the token (`GET /admin/auth/me` answers 200 with `success: true`). */
export async function verifyAdminToken(token: string): Promise<boolean> {
  if (!token) return false;
  try {
    await apiRequest<unknown>("/admin/auth/me", {
      method: "GET",
      cache: "no-store",
      headers: { Authorization: `Bearer ${token}` },
      signal: AbortSignal.timeout(VERIFY_TIMEOUT_MS),
    });
    return true;
  } catch {
    return false;
  }
}
