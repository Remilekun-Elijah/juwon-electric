import { asyncHandler } from "../services/asyncHandler.js";
import { badRequest } from "../services/errors.js";
import { ok } from "../services/http.js";
import { pageQuery } from "../services/pagination.js";
import { pageRecords } from "../services/store.js";

const filterValue = (value, label) => {
  if (value === undefined || value === "") return undefined;
  if (typeof value !== "string") throw badRequest(`${label} must be text.`);
  if (value.length > 100) throw badRequest(`${label} must be 100 characters or fewer.`);
  return value.trim() || undefined;
};

// GET /admin/audit-logs?page=1&limit=50&action=&entity=&adminId=
export const adminListAuditLogs = asyncHandler(async (req, res) => {
  const { page, limit } = pageQuery(req.query);
  const filter = {};
  for (const field of ["action", "entity", "adminId"]) {
    const value = filterValue(req.query[field], field);
    if (value !== undefined) filter[field] = value;
  }

  const { items, total } = await pageRecords("auditLogs", { filter, page, limit });
  ok(res, "Audit logs retrieved.", { items, page, limit, total });
});
