import { asyncHandler } from "../services/asyncHandler.js";
import { badRequest } from "../services/errors.js";
import { ok } from "../services/http.js";
import { pageRecords } from "../services/store.js";

const MAX_LIMIT = 100;

const MAX_PAGE = 100_000;

const pageParam = (value) => {
  if (value === undefined || value === "") return 1;
  const page = typeof value === "string" && /^\d+$/.test(value) ? Number(value) : Number.NaN;
  if (!Number.isSafeInteger(page) || page < 1 || page > MAX_PAGE) {
    throw badRequest("page must be a whole number from 1 to 100000.");
  }
  return page;
};

const limitParam = (value) => {
  if (value === undefined || value === "") return 50;
  if (typeof value !== "string" || !/^\d+$/.test(value) || !(Number(value) >= 1)) {
    throw badRequest("limit must be a positive whole number.");
  }
  return Math.min(Number(value), MAX_LIMIT);
};

const filterValue = (value, label) => {
  if (value === undefined || value === "") return undefined;
  if (typeof value !== "string") throw badRequest(`${label} must be text.`);
  if (value.length > 100) throw badRequest(`${label} must be 100 characters or fewer.`);
  return value.trim() || undefined;
};

// GET /admin/audit-logs?page=1&limit=50&action=&entity=&adminId=
export const adminListAuditLogs = asyncHandler(async (req, res) => {
  const page = pageParam(req.query.page);
  const limit = limitParam(req.query.limit);
  const filter = {};
  for (const field of ["action", "entity", "adminId"]) {
    const value = filterValue(req.query[field], field);
    if (value !== undefined) filter[field] = value;
  }

  const { items, total } = await pageRecords("auditLogs", { filter, page, limit });
  ok(res, "Audit logs retrieved.", { items, page, limit, total });
});
