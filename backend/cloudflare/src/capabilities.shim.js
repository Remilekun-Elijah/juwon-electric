// TEMPORARY shim for BE-1's requireCapability (agents/be-platform). Same signature as the
// contract: requireCapability(admin, ...capabilities) throws 403 when the admin lacks any
// of them. Replace the import with BE-1's implementation at integration and delete this file.
import { forbidden } from "../../shared/errors.js";
import { hasCapabilities } from "../../shared/capabilities.js";

export const requireCapability = (admin, ...capabilities) => {
  if (!hasCapabilities(admin?.role, capabilities)) throw forbidden();
};
