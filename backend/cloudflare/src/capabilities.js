// Capability guard for Worker admin routes (API_CONTRACT_V3 §1.3).
// The map itself is shared with Express: backend/shared/capabilities.js.
import { FORBIDDEN_MESSAGE, hasCapability } from "../../shared/capabilities.js";
import { ApiError } from "./http.js";

/**
 * Throws 403 unless `admin` (the stored admin record from requireAdmin, or the
 * static-token identity) holds every listed capability.
 */
export const requireCapability = (admin, ...caps) => {
  if (!caps.every((capability) => hasCapability(admin, capability))) {
    throw new ApiError(403, FORBIDDEN_MESSAGE);
  }
};
