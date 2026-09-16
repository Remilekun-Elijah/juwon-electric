// Admin list paging (API_CONTRACT_V3 §0.3), shared by every paged Express endpoint.
import { badRequest } from "./errors.js";

const MAX_LIMIT = 100;
const MAX_PAGE = 100_000;

export const pageParam = (value) => {
  if (value === undefined || value === "") return 1;
  const page = typeof value === "string" && /^\d+$/.test(value) ? Number(value) : Number.NaN;
  if (!Number.isSafeInteger(page) || page < 1 || page > MAX_PAGE) {
    throw badRequest("page must be a whole number from 1 to 100000.");
  }
  return page;
};

export const limitParam = (value) => {
  if (value === undefined || value === "") return 50;
  if (typeof value !== "string" || !/^\d+$/.test(value) || !(Number(value) >= 1)) {
    throw badRequest("limit must be a positive whole number.");
  }
  return Math.min(Number(value), MAX_LIMIT);
};

/** { page, limit } from an Express query object. */
export const pageQuery = (query = {}) => ({
  page: pageParam(query.page),
  limit: limitParam(query.limit),
});
