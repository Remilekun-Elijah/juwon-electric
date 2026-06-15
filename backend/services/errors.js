export class ApiError extends Error {
  constructor(statusCode, message, details) {
    super(message);
    this.statusCode = statusCode;
    this.details = details;
  }
}

export const notFound = (resource = "Resource") =>
  new ApiError(404, `${resource} not found.`);

export const badRequest = (message, details) =>
  new ApiError(400, message, details);
