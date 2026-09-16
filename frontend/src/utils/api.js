import config from "./config";

const toQuery = (params = {}) => {
  const query = new URLSearchParams(
    Object.entries(params).filter(([, value]) => value !== undefined && value !== "")
  ).toString();
  return query ? `?${query}` : "";
};

export const apiRequest = async (path, options = {}) => {
  const response = await fetch(`${config.backendUrl}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
  });
  const data = await response.json().catch(() => null);
  if (!response.ok || !data || data.success === false) {
    const error = new Error(data?.message || "Request failed");
    error.status = response.status;
    throw error;
  }
  return data;
};

export const getPublicData = async (path, params) =>
  apiRequest(`${path}${toQuery(params)}`);

const ADMIN_SESSION_KEY = "je/admin-session";
let adminUnauthorizedHandler = null;

/**
 * Registers the single handler for admin 401 responses (AdminApp clears the stored session and
 * returns to the sign-in screen). Returns a function that unregisters it.
 */
export const setAdminUnauthorizedHandler = (handler) => {
  adminUnauthorizedHandler = handler;
  return () => {
    if (adminUnauthorizedHandler === handler) adminUnauthorizedHandler = null;
  };
};

export const adminRequest = async (path, options = {}) => {
  const token = localStorage.getItem(ADMIN_SESSION_KEY) || "";
  try {
    return await apiRequest(`/admin${path}`, {
      ...options,
      headers: {
        ...(token ? { "x-admin-token": token } : {}),
        ...(options.headers || {}),
      },
    });
  } catch (error) {
    // Only act when the rejected token is still the stored one, so a late 401 from an earlier
    // session can't sign out a newer one.
    if (error.status === 401 && (localStorage.getItem(ADMIN_SESSION_KEY) || "") === token) {
      adminUnauthorizedHandler?.();
    }
    throw error;
  }
};
