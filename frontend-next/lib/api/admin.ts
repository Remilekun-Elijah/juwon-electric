/**
 * Admin API client (browser only). Ported from frontend/src/utils/api.js.
 * Sends the stored session token as a Bearer token (backend/middleware/adminAuth.js also accepts
 * `x-admin-token`) and routes 401s to a single registered handler.
 * FE-2 owns the login/session UI built on top of this.
 */
import { apiRequest, ApiError, type ApiRequestInit } from "./client";

export const ADMIN_SESSION_KEY = "je/admin-session";

const storage = () => {
  try {
    return typeof window === "undefined" ? null : window.localStorage;
  } catch {
    return null;
  }
};

export const getAdminToken = () => storage()?.getItem(ADMIN_SESSION_KEY) || "";

export const setAdminToken = (token: string) => {
  storage()?.setItem(ADMIN_SESSION_KEY, token);
};

export const clearAdminToken = () => {
  storage()?.removeItem(ADMIN_SESSION_KEY);
};

let unauthorizedHandler: (() => void) | null = null;

/**
 * Register the single handler for admin 401 responses (clear the session, return to sign-in).
 * Returns a function that unregisters it.
 */
export const setAdminUnauthorizedHandler = (handler: () => void) => {
  unauthorizedHandler = handler;
  return () => {
    if (unauthorizedHandler === handler) unauthorizedHandler = null;
  };
};

/** Request `/admin${path}` with the stored session token. */
export async function adminRequest<T = unknown>(path: string, init: ApiRequestInit = {}) {
  const token = getAdminToken();
  try {
    return await apiRequest<T>(`/admin${path}`, {
      cache: "no-store",
      ...init,
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(init.headers as Record<string, string> | undefined),
      },
    });
  } catch (error) {
    // Only act when the rejected token is still the stored one, so a late 401 from an earlier
    // session can't sign out a newer one.
    if (error instanceof ApiError && error.status === 401 && getAdminToken() === token) {
      unauthorizedHandler?.();
    }
    throw error;
  }
}
