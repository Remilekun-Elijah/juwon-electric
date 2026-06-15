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
  const data = await response.json();
  if (!response.ok || data?.success === false) {
    throw new Error(data?.message || "Request failed");
  }
  return data;
};

export const getPublicData = async (path, params) =>
  apiRequest(`${path}${toQuery(params)}`);

export const adminRequest = (path, options = {}) => {
  const token = localStorage.getItem("je/admin-session") || "";
  return apiRequest(`/admin${path}`, {
    ...options,
    headers: {
      ...(token ? { "x-admin-token": token } : {}),
      ...(options.headers || {}),
    },
  });
};
