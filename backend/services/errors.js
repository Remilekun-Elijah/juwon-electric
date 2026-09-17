import { OPS_NOT_FOUND_LABELS } from "../shared/errors.js";

export class ApiError extends Error {
  constructor(statusCode, message, details) {
    super(message);
    this.statusCode = statusCode;
    this.details = details;
  }
}

// Collection name -> label used in "<Label> not found." (kept identical to the Worker).
const NOT_FOUND_LABELS = {
  packages: "Package",
  services: "Service",
  portfolio: "Portfolio item",
  customerSegments: "Customer segment",
  orders: "Order",
  contacts: "Contact",
  newsletters: "Subscriber",
  admins: "User",
  carts: "Cart",
  vacancies: "Vacancy",
  ...OPS_NOT_FOUND_LABELS,
};

export const notFound = (resource = "Resource") =>
  new ApiError(404, `${NOT_FOUND_LABELS[resource] || resource} not found.`);

export const badRequest = (message, details) =>
  new ApiError(400, message, details);

export const tooManyRequests = (res, message, remainingMs) => {
  const seconds = Math.max(Math.ceil(remainingMs / 1000), 1);
  res?.set?.("Retry-After", String(seconds));
  return new ApiError(429, message);
};

export const SERVICE_UNAVAILABLE_MESSAGE = "Service temporarily unavailable.";
export const serviceUnavailable = () => new ApiError(503, SERVICE_UNAVAILABLE_MESSAGE);

/** "N minutes" (singular for 1), N = remaining minutes rounded up, at least 1. */
export const minutesText = (remainingMs) => {
  const minutes = Math.max(Math.ceil(remainingMs / 60000), 1);
  return `${minutes} ${minutes === 1 ? "minute" : "minutes"}`;
};
