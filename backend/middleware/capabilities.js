import { FORBIDDEN_MESSAGE, STATIC_ADMIN, hasCapability } from "../shared/capabilities.js";
import { ApiError } from "../services/errors.js";

/**
 * The acting admin: the stored admin record loaded per request by adminAuth,
 * or the static ADMIN_TOKEN identity (superadmin). Never the token payload,
 * a header or the body.
 */
export const actingAdmin = (req) => (req.adminStaticToken ? STATIC_ADMIN : req.admin);

/**
 * `router.get("/orders", requireCapability("orders:read"), handler)`.
 * Runs after adminAuth and requires every listed capability (403 otherwise).
 */
export const requireCapability =
  (...caps) =>
  (req, _res, next) => {
    const admin = actingAdmin(req);
    if (!admin) return next(new ApiError(401, "Admin authorization is required."));
    if (!caps.every((capability) => hasCapability(admin, capability))) {
      return next(new ApiError(403, FORBIDDEN_MESSAGE));
    }
    return next();
  };
