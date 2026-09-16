// TEMPORARY shim for BE-1's requireCapability (agents/be-platform). Same signature:
// router.get("/path", requireCapability("orders:read"), handler). Replace the import with
// BE-1's middleware at integration and delete this file.
import { forbidden } from "../shared/errors.js";
import { hasCapabilities } from "../shared/capabilities.js";

/** Role of the authenticated request: the static ADMIN_TOKEN acts as super admin. */
export const requestRole = (req) => (req.adminStaticToken ? "super_admin" : req.admin?.role);

export const requireCapability =
  (...capabilities) =>
  (req, _res, next) =>
    next(hasCapabilities(requestRole(req), capabilities) ? undefined : forbidden());
