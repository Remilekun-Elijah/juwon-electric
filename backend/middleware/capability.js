import { ApiError } from "../services/errors.js";
import { FORBIDDEN_MESSAGE, hasCapabilities } from "../services/roles.js";

/** The acting admin's role: the static ADMIN_TOKEN acts as a super admin. */
export const actorRole = (req) => (req.adminStaticToken ? "superadmin" : req.admin?.role);

/**
 * Route guard: `router.get("/orders", requireCapability("orders:read"), handler)`.
 * Must run after adminAuth. Missing capability -> 403.
 */
export const requireCapability =
  (...capabilities) =>
  (req, _res, next) => {
    if (!req.adminStaticToken && !req.admin) {
      return next(new ApiError(401, "Admin authorization is required."));
    }
    if (!hasCapabilities(actorRole(req), ...capabilities)) {
      return next(new ApiError(403, FORBIDDEN_MESSAGE));
    }
    return next();
  };
