// Errors thrown by the shared commerce/operations logic (backend/shared). Both runtimes
// expose them as { success: false, message, details } with `statusCode`:
// Express through its error handler (statusCode < 500 is exposed), the Worker through
// errorResponse (errors with expose === true).

export class HttpError extends Error {
  constructor(statusCode, message, details) {
    super(message);
    this.statusCode = statusCode;
    this.details = details;
    this.expose = true;
  }
}

export const badRequest = (message, details) => new HttpError(400, message, details);
export const forbidden = (message = "You do not have permission to perform this action.") =>
  new HttpError(403, message);
export const notFound = (message) => new HttpError(404, message);
export const conflict = (message, details) => new HttpError(409, message, details);

// Collection -> label used in "<Label> not found." for the modules added in v3.
export const OPS_NOT_FOUND_LABELS = {
  categories: "Category",
  products: "Product",
  inventoryMovements: "Inventory movement",
  installationJobs: "Job",
  settings: "Settings",
  notifications: "Notification",
};

export const notFoundFor = (collection) =>
  notFound(`${OPS_NOT_FOUND_LABELS[collection] || "Record"} not found.`);
